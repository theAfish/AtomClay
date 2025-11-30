// Minimal XYZ parser that returns normalized structure shape
/**
 * Parses an XYZ file content.
 * @param {string} text - The content of the XYZ file.
 * @returns {Promise<{atoms: Array<{id: number, element: string, x: number, y: number, z: number}>, lattice: number[][]|null}>} The parsed atoms and lattice (if found in comment).
 */
export async function parse(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
    if (lines.length < 2) {
        throw new Error("XYZ parsing failed: File too short (needs at least atom count and comment line).");
    }

    const count = parseInt(lines[0], 10);
    if (isNaN(count)) {
        throw new Error("XYZ parsing failed: First line must be the atom count.");
    }
    const comment = lines[1] || '';

    // Try to extract lattice/cell information from comment line
    let lattice = null;
    const latticeMatch = comment.match(/Lattice\s*=\s*"?([^"\n]+)"?/i) || comment.match(/CELL\s*=\s*"?([^"\n]+)"?/i) || comment.match(/cell[:=]\s*([0-9eE.+\-\s]+)/i);
    if (latticeMatch) {
        const nums = latticeMatch[1].trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
        if (nums.length >= 9) {
            lattice = [
                [nums[0], nums[1], nums[2]],
                [nums[3], nums[4], nums[5]],
                [nums[6], nums[7], nums[8]]
            ];
        }
    }

    const atoms = [];
    const start = 2;
    for (let i = 0; i < count && (start + i) < lines.length; i++) {
        const parts = lines[start + i].split(/\s+/).filter(x => x !== '');
        if (parts.length < 4) continue;
        const element = parts[0];
        const x = parseFloat(parts[1]);
        const y = parseFloat(parts[2]);
        const z = parseFloat(parts[3]);
        if ([x, y, z].some(v => Number.isNaN(v))) continue;
        atoms.push({ id: i, element, x, y, z });
    }

    if (atoms.length === 0) {
        throw new Error("XYZ parsing failed: No valid atom lines found.");
    }

    return { atoms, lattice };
}

export default { parse };
