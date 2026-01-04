// Parser registry and detection utilities
import * as pdb from './pdbParser';
import * as xyz from './xyzParser';
import * as cif from './cifParser';
import * as poscar from './poscarParser';
import * as mol from './molParser';

const parsers = new Map();

/**
 * Registers a parser implementation for a specific format.
 * @param {string} name - The format name (e.g., 'pdb', 'xyz').
 * @param {Object} impl - The parser implementation object containing a `parse` function.
 */
export function registerParser(name, impl) {
    parsers.set(name.toLowerCase(), impl);
}

/**
 * Retrieves a registered parser by name.
 * @param {string} name - The format name.
 * @returns {Object|null} The parser implementation or null if not found.
 */
export function getParser(name) {
    if (!name) return null;
    return parsers.get(name.toLowerCase()) || null;
}

/**
 * Detects the file format based on content or filename.
 * @param {string} text - The file content.
 * @param {string} filename - The file name.
 * @returns {string} The detected format ('xyz', 'pdb', 'cif', 'poscar').
 */
export function detectFormat(text = '', filename = '') {
    const sample = (text || '').slice(0, 1000);
    const name = (filename || '').toLowerCase();

    if (name.endsWith('.xyz')) return 'xyz';
    if (name.endsWith('.pdb')) return 'pdb';
    if (name.endsWith('.cif')) return 'cif';
    if (name.endsWith('.mol')) return 'mol';
    if (name.endsWith('.vasp') || name.includes('poscar') || name.includes('contcar')) return 'poscar';

    if (/^\s*\d+\s*$/m.test(sample.split(/\r?\n/)[0] || '')) return 'xyz';
    if (/^\s*(ATOM|HETATM|CRYST1)/im.test(sample)) return 'pdb';
    if (/^data_|^loop_/im.test(sample)) return 'cif';
    if (lines.length >= 4 && /^\s*\d+\s+\d+/.test(lines[3])) return 'mol';
    
    // POSCAR heuristic: 2nd line is a scale factor (number)
    if (lines.length >= 2 && !Number.isNaN(parseFloat(lines[1]))) return 'poscar';

    return 'poscar'; // Default fallback
}

/**
 * Parses the file content using the appropriate parser.
 * @param {string} text - The file content.
 * @param {string} [format] - The format to use (optional, will be detected if not provided).
 * @param {string} [filename] - The file name (optional, used for detection).
 * @returns {Promise<{atoms: Array, lattice: Array|null, metadata: Object}>} The parsed structure.
 * @throws {Error} If no parser is found for the format.
 */
export async function parse(text, format, filename) {
    const fmt = format || detectFormat(text, filename);
    const parser = getParser(fmt);
    if (!parser || typeof parser.parse !== 'function') {
        throw new Error(`No parser registered for format: ${fmt}`);
    }
    const structure = await parser.parse(text);
    return { ...structure, metadata: { format: fmt } };
}

// Register built-ins
registerParser('pdb', pdb);
registerParser('xyz', xyz);
registerParser('cif', cif);
registerParser('poscar', poscar);
registerParser('mol', mol);

// Backwards compatibility helpers
export async function parsePDB(text) { return (await parse(text, 'pdb')); }
export async function parseXYZ(text) { return (await parse(text, 'xyz')); }
export async function parseCIF(text) { return (await parse(text, 'cif')); }
export async function parsePOSCAR(text) { return (await parse(text, 'poscar')); }
export async function parseMOL(text) { return (await parse(text, 'mol')); }

export default { registerParser, getParser, detectFormat, parse };
