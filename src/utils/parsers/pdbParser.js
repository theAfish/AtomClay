// Minimal PDB parser that returns a normalized structure shape
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

    return { atoms, lattice: null };
}

export default { parse };
