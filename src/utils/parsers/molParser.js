// Minimal MOL parser that returns normalized structure shape
/**
 * Parses a MOL file content.
 * @param {string} text - The content of the MOL file.
 * @returns {Promise<{atoms: Array<{id: number, element: string, x: number, y: number, z: number}>, lattice: null}>} The parsed atoms and lattice (null for MOL).
 */
export async function parse(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');

    if (lines.length < 4) {
        throw new Error("MOL parsing failed: File too short (needs header and counts line).");
    }

    // Find the counts line (contains V2000)
    const countsLineIndex = lines.findIndex(line => line.includes('V2000'));
    if (countsLineIndex === -1) {
        throw new Error("MOL parsing failed: Could not find counts line (V2000).");
    }
    const countsLine = lines[countsLineIndex];
    const countsParts = countsLine.trim().split(/\s+/);
    const atomCount = parseInt(countsParts[0], 10);
    if (isNaN(atomCount) || atomCount <= 0) {
        throw new Error("MOL parsing failed: Invalid atom count in counts line.");
    }

    // Atom block starts after counts line
    const atomLines = lines.slice(countsLineIndex + 1, countsLineIndex + 1 + atomCount);
    if (atomLines.length < atomCount) {
        throw new Error("MOL parsing failed: Not enough atom lines.");
    }

    const atoms = [];
    for (let i = 0; i < atomCount; i++) {
        const line = atomLines[i];
        if (line.length < 34) continue; // Atom line too short

        const x = parseFloat(line.substring(0, 10));
        const y = parseFloat(line.substring(10, 20));
        const z = parseFloat(line.substring(20, 30));
        const element = line.substring(30, 33).trim();

        if (isNaN(x) || isNaN(y) || isNaN(z) || !element) continue;

        atoms.push({ id: i, element, x, y, z });
    }

    if (atoms.length === 0) {
        throw new Error("MOL parsing failed: No valid atom lines found.");
    }

    return { atoms, lattice: null };
}