import { MathUtils } from './math';

/**
 * Checks if the structure is in its initial empty state.
 * @param {Array} layers - List of layers.
 * @param {Array} atoms - List of atoms.
 * @returns {boolean} True if initial empty state.
 */
export const isInitialEmptyStructure = (layers = [], atoms = []) => {
    if (!layers || layers.length !== 1) return false;
    const base = layers[0];
    if (!base || base.id !== 'layer-0') return false;
    const atomsInBase = (atoms || []).filter(a => (a.layerId || base.id) === base.id);
    return atomsInBase.length === 0;
};

/**
 * Builds a POSCAR string from atoms and lattice.
 * @param {Array} atoms - List of atoms.
 * @param {Array} lattice - 3x3 lattice matrix.
 * @returns {string|null} The POSCAR string or null if invalid.
 */
export const buildPoscar = (atoms = [], lattice) => {
    if (!Array.isArray(lattice) || lattice.length !== 3) return null;
    if (!atoms || atoms.length === 0) return null;

    const lines = [];
    lines.push('AtomClay');
    lines.push('1.0');
    lattice.forEach(v => lines.push(`${v[0]} ${v[1]} ${v[2]}`));

    const groups = {};
    atoms.forEach(a => {
        const el = a.element || 'X';
        if (!groups[el]) groups[el] = [];
        groups[el].push(a);
    });
    const elements = Object.keys(groups);
    if (elements.length === 0) return null;

    lines.push(elements.join(' '));
    lines.push(elements.map(e => groups[e].length).join(' '));
    lines.push('Direct');

    const invL = MathUtils.inv3x3(lattice);
    const invLT = MathUtils.transpose3x3(invL);
    const wrap = (v) => (v - Math.floor(v + 1e-6)).toFixed(6);

    elements.forEach(e => {
        groups[e].forEach(a => {
            const [fx, fy, fz] = MathUtils.multiplyMatrixVector(invLT, [a.x, a.y, a.z]);
            lines.push(`${wrap(fx)} ${wrap(fy)} ${wrap(fz)}`);
        });
    });

    return lines.join('\n');
};

