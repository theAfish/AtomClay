import { MathUtils } from './math';

/**
 * Calculates the supercell of a structure.
 * @param {Array} atoms - List of atoms (objects with x, y, z, element).
 * @param {Array} lattice - 3x3 matrix representing the lattice.
 * @param {string} mode - 'diag' or 'matrix'.
 * @param {Array} diag - [dx, dy, dz] for diagonal scaling.
 * @param {Array} matrix - 3x3 transformation matrix (if mode is 'matrix').
 * @param {number} startId - The starting ID for new atoms.
 * @returns {Object} { newAtoms, newLattice }
 */
export function calculateSupercell(atoms, lattice, mode, diag, matrix, startId = 0) {
    if (!lattice) throw new Error('Lattice is required');

    let M = mode === 'diag' ? [[diag[0], 0, 0], [0, diag[1], 0], [0, 0, diag[2]]] : matrix;
    if (Math.abs(MathUtils.det3x3(M)) < 1e-3) {
        throw new Error('Invalid Matrix');
    }

    const newLattice = MathUtils.matMul3x3(M, lattice);
    const invM = MathUtils.inv3x3(M);

    const newAtoms = [];
    let currentId = startId;

    const range = Math.ceil(Math.max(...M.flat().map(Math.abs))) + 1;
    const invOldL = MathUtils.inv3x3(lattice);
    if (!invOldL) {
        throw new Error('Invalid lattice: determinant is zero or near zero');
    }
    const invOldLT = MathUtils.transpose3x3(invOldL);

    // Pre-calc fractional for atoms
    const oldFracs = atoms.map(a => ({ ...a, f: MathUtils.multiplyMatrixVector(invOldLT, [a.x, a.y, a.z]) }));

    for (let i = -range; i <= range; i++) {
        for (let j = -range; j <= range; j++) {
            for (let k = -range; k <= range; k++) {
                oldFracs.forEach(atom => {
                    const fOldShift = [atom.f[0] + i, atom.f[1] + j, atom.f[2] + k];
                    // f_new = (M^-1)^T * f_old
                    // We need transpose of invM because multiplyMatrixVector does A*v
                    const [fx, fy, fz] = MathUtils.multiplyMatrixVector(MathUtils.transpose3x3(invM), fOldShift);

                    if (fx >= -0.001 && fx < 0.999 && fy >= -0.001 && fy < 0.999 && fz >= -0.001 && fz < 0.999) {
                        // r = L_new^T * f_new
                        const [cx, cy, cz] = MathUtils.multiplyMatrixVector(MathUtils.transpose3x3(newLattice), [fx, fy, fz]);
                        // Preserve other properties of atom, but update id and coords
                        const { f, id, x, y, z, ...rest } = atom; 
                        newAtoms.push({ ...rest, id: ++currentId, x: cx, y: cy, z: cz });
                    }
                });
            }
        }
    }

    return { newAtoms, newLattice };
}

/**
 * Adds vacuum to the lattice.
 * @param {Array} atoms - List of atoms.
 * @param {Array} lattice - 3x3 matrix.
 * @param {number} size - Size of vacuum to add (in Angstroms usually).
 * @param {number} axis - Axis index (0, 1, or 2).
 * @returns {Object} { newAtoms, newLattice }
 */
export function calculateVacuum(atoms, lattice, size, axis = 2) {
    if (!lattice) throw new Error('Lattice is required');
    
    const oldLen = Math.sqrt(lattice[axis][0] ** 2 + lattice[axis][1] ** 2 + lattice[axis][2] ** 2);
    if (oldLen < 1e-6) throw new Error('Lattice vector is too small');

    const ratio = (oldLen + size) / oldLen;
    const newLattice = [...lattice];
    newLattice[axis] = lattice[axis].map(v => v * ratio);
    
    // Atoms remain unchanged in Cartesian coordinates
    const newAtoms = atoms.map(a => ({ ...a }));

    return { newAtoms, newLattice };
}

/**
 * Scales the lattice.
 * @param {Array} atoms - List of atoms.
 * @param {Array} lattice - 3x3 matrix.
 * @param {number} scaleX 
 * @param {number} scaleY 
 * @param {number} scaleZ 
 * @returns {Object} { newAtoms, newLattice }
 */
export function calculateScaleLattice(atoms, lattice, scaleX = 1, scaleY = 1, scaleZ = 1) {
    if (!lattice) throw new Error('Lattice is required');
    if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY) || !Number.isFinite(scaleZ)) throw new Error('Invalid scale factors');
    if (scaleX <= 0 || scaleY <= 0 || scaleZ <= 0) throw new Error('Scale factors must be > 0');
    
    const newLattice = [
        [lattice[0][0] * scaleX, lattice[0][1] * scaleX, lattice[0][2] * scaleX],
        [lattice[1][0] * scaleY, lattice[1][1] * scaleY, lattice[1][2] * scaleY],
        [lattice[2][0] * scaleZ, lattice[2][1] * scaleZ, lattice[2][2] * scaleZ]
    ];
    
    // Atoms remain unchanged in Cartesian coordinates
    const newAtoms = atoms.map(a => ({ ...a }));

    return { newAtoms, newLattice };
}

/**
 * Wraps atoms into the unit cell.
 * @param {Array} atoms - List of atoms.
 * @param {Array} lattice - 3x3 matrix.
 * @returns {Array} newAtoms
 */
export function calculateWrapAtoms(atoms, lattice) {
    if (!lattice) return atoms;
    const invLattice = MathUtils.inv3x3(lattice);
    if (!invLattice) return atoms;

    const invLatticeT = MathUtils.transpose3x3(invLattice);
    const latticeT = MathUtils.transpose3x3(lattice);

    return atoms.map(atom => {
        const frac = MathUtils.multiplyMatrixVector(invLatticeT, [atom.x, atom.y, atom.z]);
        const wrappedFrac = frac.map(c => {
            const r = c % 1;
            return r < 0 ? r + 1 : r;
        });
        const [nx, ny, nz] = MathUtils.multiplyMatrixVector(latticeT, wrappedFrac);
        return { ...atom, x: nx, y: ny, z: nz };
    });
}

