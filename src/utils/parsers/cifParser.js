// Minimal CIF parser with Corrected Matrix Orientation

// Helper to parse a single symmetry operation string into a function
function parseSymmetryFunction(opString) {
    // opString e.g. "-x, y+1/2, -z"
    // Remove quotes and spaces
    const parts = opString.toLowerCase().replace(/['"]/g, '').split(',').map(s => s.trim());
    
    const parsePart = (part) => {
        let scaleX = 0, scaleY = 0, scaleZ = 0, offset = 0;
        
        // Regex to match terms: +/- x/y/z or numbers
        // We handle terms like: -x, +y, z, 1/2, -0.5
        const terms = part.match(/([+-]?\s*(\d+(\.\d+)?(\/\d+)?|[xyz]))/g);
        
        if (terms) {
            for (let term of terms) {
                term = term.replace(/\s+/g, '');
                let sign = 1;
                if (term.startsWith('-')) { sign = -1; term = term.substring(1); }
                else if (term.startsWith('+')) { term = term.substring(1); }
                
                if (term === 'x') scaleX += sign;
                else if (term === 'y') scaleY += sign;
                else if (term === 'z') scaleZ += sign;
                else {
                    // Number
                    if (term.includes('/')) {
                        const [n, d] = term.split('/');
                        offset += sign * (parseFloat(n) / parseFloat(d));
                    } else {
                        offset += sign * parseFloat(term);
                    }
                }
            }
        }
        return { x: scaleX, y: scaleY, z: scaleZ, c: offset };
    };
    
    const opX = parsePart(parts[0] || 'x');
    const opY = parsePart(parts[1] || 'y');
    const opZ = parsePart(parts[2] || 'z');
    
    return (x, y, z) => {
        const nx = opX.x * x + opX.y * y + opX.z * z + opX.c;
        const ny = opY.x * x + opY.y * y + opY.z * z + opY.c;
        const nz = opZ.x * x + opZ.y * y + opZ.z * z + opZ.c;
        return [nx, ny, nz];
    };
}

/**
 * Parses a CIF file content.
 * @param {string} text - The content of the CIF file.
 * @returns {Promise<{atoms: Array<{element: string, x: number, y: number, z: number}>, lattice: number[][]}>} The parsed atoms and lattice.
 */
export async function parse(text) {
    const lines = text.split(/\r?\n/);
    
    // 1. Parse Cell Parameters
    const cell = { a: null, b: null, c: null, alpha: null, beta: null, gamma: null };
    
    const cleanFloat = (str) => {
        if (!str) return 0;
        const idx = str.indexOf('(');
        if (idx !== -1) return parseFloat(str.substring(0, idx));
        return parseFloat(str);
    };

    // Store symmetry operations strings
    const symmetryStrings = [];
    // Store base atoms (fractional)
    const baseAtoms = [];

    let lattice = null;
    let currentLoopHeaders = [];
    let insideLoop = false;
    
    // Loop state
    let loopType = null; // 'atom', 'sym', 'other'

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;

        // Handle loop_
        if (line.startsWith('loop_')) {
            currentLoopHeaders = [];
            insideLoop = true;
            loopType = null;
            continue;
        }

        // If inside loop, check if it's a header or data
        if (insideLoop) {
            if (line.startsWith('_')) {
                currentLoopHeaders.push(line);
                // Identify loop type
                if (line.startsWith('_atom_site_fract_x')) loopType = 'atom';
                if (line.startsWith('_symmetry_equiv_pos_as_xyz') || line.startsWith('_space_group_symop_operation_xyz')) loopType = 'sym';
            } else {
                // Data line
                // Use regex to handle quoted strings correctly
                const parts = line.match(/('[^']*'|"[^"]*"|\S+)/g); 
                if (!parts) continue;
                
                // If we hit a new tag or loop, break loop (though standard CIF shouldn't do this without loop_)
                if (line.startsWith('_') || line.startsWith('loop_')) {
                    insideLoop = false;
                    i--; // Reprocess this line
                    continue;
                }

                if (loopType === 'atom') {
                    const xIdx = currentLoopHeaders.indexOf('_atom_site_fract_x');
                    const yIdx = currentLoopHeaders.indexOf('_atom_site_fract_y');
                    const zIdx = currentLoopHeaders.indexOf('_atom_site_fract_z');
                    const lblIdx = currentLoopHeaders.indexOf('_atom_site_label');
                    const symIdx = currentLoopHeaders.indexOf('_atom_site_type_symbol');

                    if (xIdx !== -1 && yIdx !== -1 && zIdx !== -1 && parts.length >= 3) { // Relaxed length check
                         // Ensure indices are within bounds of parts
                         const fx = cleanFloat(parts[xIdx]);
                         const fy = cleanFloat(parts[yIdx]);
                         const fz = cleanFloat(parts[zIdx]);
                         
                         if (!isNaN(fx) && !isNaN(fy) && !isNaN(fz)) {
                             let element = (symIdx >= 0 && parts[symIdx]) ? parts[symIdx] : '';
                             const label = (lblIdx >= 0 && parts[lblIdx]) ? parts[lblIdx] : '';
                             
                             if (!element && label) {
                                const raw = label.replace(/[^A-Za-z]/g, '');
                                if (raw.length > 1 && raw[1] === raw[1].toLowerCase()) element = raw.substring(0, 2);
                                else element = raw.substring(0, 1) || 'X';
                             }
                             
                             baseAtoms.push({ element, fx, fy, fz, label });
                         }
                    }
                } else if (loopType === 'sym') {
                    // Find the index of the symmetry tag
                    let symIdx = currentLoopHeaders.indexOf('_symmetry_equiv_pos_as_xyz');
                    if (symIdx === -1) symIdx = currentLoopHeaders.indexOf('_space_group_symop_operation_xyz');
                    
                    if (symIdx !== -1 && parts.length > symIdx) {
                        let op = parts[symIdx];
                        // Remove quotes
                        if ((op.startsWith("'") && op.endsWith("'")) || (op.startsWith('"') && op.endsWith('"'))) {
                            op = op.substring(1, op.length - 1);
                        }
                        symmetryStrings.push(op);
                    }
                }
            }
        } else {
            // Non-loop tags
            const parts = line.split(/\s+/);
            const tag = parts[0];
            const val = parts[1];

            if (tag === '_cell_length_a') cell.a = cleanFloat(val);
            else if (tag === '_cell_length_b') cell.b = cleanFloat(val);
            else if (tag === '_cell_length_c') cell.c = cleanFloat(val);
            else if (tag === '_cell_angle_alpha') cell.alpha = cleanFloat(val);
            else if (tag === '_cell_angle_beta') cell.beta = cleanFloat(val);
            else if (tag === '_cell_angle_gamma') cell.gamma = cleanFloat(val);
            
            // Handle single line symmetry (rare but possible)
            if (tag === '_symmetry_equiv_pos_as_xyz' || tag === '_space_group_symop_operation_xyz') {
                 let op = line.substring(tag.length).trim();
                 if ((op.startsWith("'") && op.endsWith("'")) || (op.startsWith('"') && op.endsWith('"'))) {
                    op = op.substring(1, op.length - 1);
                 }
                 symmetryStrings.push(op);
            }
        }
    }

    // 2. Calculate Lattice Vectors
    let vA, vB, vC;
    if (cell.a && cell.b && cell.c && cell.alpha) {
        const toRad = Math.PI / 180;
        const alpha = cell.alpha * toRad;
        const beta = cell.beta * toRad;
        const gamma = cell.gamma * toRad;

        const cosAlpha = Math.cos(alpha);
        const cosBeta = Math.cos(beta);
        const cosGamma = Math.cos(gamma);
        const sinGamma = Math.sin(gamma);

        const term = (cosAlpha - cosBeta * cosGamma) / sinGamma;
        const v3zValue = Math.sqrt(Math.max(0, 1 - cosBeta * cosBeta - term * term));

        vA = [cell.a, 0, 0];
        vB = [cell.b * cosGamma, cell.b * sinGamma, 0];
        vC = [cell.c * cosBeta, cell.c * term, cell.c * v3zValue];
        lattice = [vA, vB, vC];
    }

    // 3. Apply Symmetry
    if (symmetryStrings.length === 0) {
        symmetryStrings.push('x, y, z');
    }
    
    const symOps = symmetryStrings.map(parseSymmetryFunction);
    const finalAtoms = [];
    
    const normalize = (val) => ((val % 1) + 1) % 1;
    const isDuplicate = (p1, p2) => {
        let dx = Math.abs(p1.fx - p2.fx); if (dx > 0.5) dx = 1 - dx;
        let dy = Math.abs(p1.fy - p2.fy); if (dy > 0.5) dy = 1 - dy;
        let dz = Math.abs(p1.fz - p2.fz); if (dz > 0.5) dz = 1 - dz;
        return (dx*dx + dy*dy + dz*dz) < 0.000001;
    };

    for (const atom of baseAtoms) {
        const siteAtoms = [];
        for (const op of symOps) {
            const [nx, ny, nz] = op(atom.fx, atom.fy, atom.fz);
            const newAtom = {
                element: atom.element,
                fx: normalize(nx),
                fy: normalize(ny),
                fz: normalize(nz)
            };
            
            let dup = false;
            for (const existing of siteAtoms) {
                if (isDuplicate(newAtom, existing)) {
                    dup = true;
                    break;
                }
            }
            if (!dup) {
                siteAtoms.push(newAtom);
            }
        }
        finalAtoms.push(...siteAtoms);
    }

    // 4. Convert to Cartesian
    const cartesianAtoms = finalAtoms.map(atom => {
        let x = 0, y = 0, z = 0;
        if (lattice) {
            x = atom.fx * vA[0] + atom.fy * vB[0] + atom.fz * vC[0];
            y = atom.fx * vA[1] + atom.fy * vB[1] + atom.fz * vC[1];
            z = atom.fx * vA[2] + atom.fy * vB[2] + atom.fz * vC[2];
        } else {
            x = atom.fx; y = atom.fy; z = atom.fz;
        }
        return { element: atom.element, x, y, z };
    });

    if (cartesianAtoms.length === 0) {
        throw new Error('CIF parsing failed');
    }

    return { atoms: cartesianAtoms, lattice };
}

export default { parse };