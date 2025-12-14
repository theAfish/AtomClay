// Minimal PDB parser that returns a normalized structure shape
/**
 * Parses a PDB file content.
 * @param {string} text - The content of the PDB file.
 * @returns {Promise<{atoms: Array<{id: number, element: string, x: number, y: number, z: number}>, lattice: null}>} The parsed atoms and lattice (null for PDB).
 */
export async function parse(text) {
    const lines = text.split(/\r?\n/);
    const atoms = [];
    let id = 0;

    for (const line of lines) {
        if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
            const x = parseFloat(line.substring(30, 38));
            const y = parseFloat(line.substring(38, 46));
            const z = parseFloat(line.substring(46, 54));
            if (isNaN(x) || isNaN(y) || isNaN(z)) continue;

            let element = line.substring(76, 78).trim();
            if (!element) {
                const name = line.substring(12, 16).trim();
                element = name.replace(/[^A-Za-z]/g, '').charAt(0) || 'X';
            }

            atoms.push({ id: id++, element, x, y, z });
        }
    }

    if (atoms.length === 0) {
        throw new Error("PDB parsing failed: No valid ATOM or HETATM lines found.");
    }

    return { atoms, lattice: null };
}

/**
 * Converts a structure object to a PDB string.
 * @param {Object} s - The structure object containing atoms.
 * @returns {string|null} The PDB string or null if invalid.
 */
export function toPDB(s) {
    if (!s || !Array.isArray(s.atoms)) return null;
    const lines = [];
    let idx = 1;
    for (const a of s.atoms) {
        const el = (a.element || 'X').toUpperCase().slice(0,2).padStart(2, ' ');
        const serial = String(idx).padStart(5, ' ');
        const name = el.padEnd(4, ' ');
        const resName = 'UNK';
        const chain = 'A';
        const resSeq = '1'.padStart(4, ' ');
        const x = (a.x || 0).toFixed(3).toString().padStart(8, ' ');
        const y = (a.y || 0).toFixed(3).toString().padStart(8, ' ');
        const z = (a.z || 0).toFixed(3).toString().padStart(8, ' ');
        const line = `ATOM  ${serial} ${name}${resName} ${chain}${resSeq}   ${x}${y}${z}  1.00  0.00          ${el}`;
        lines.push(line);
        idx++;
    }
    lines.push('END');
    return lines.join('\n');
}

export default { parse, toPDB };
