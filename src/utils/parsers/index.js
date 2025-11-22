// Parser registry and detection utilities
import * as pdb from './pdbParser';
import * as xyz from './xyzParser';
import * as cif from './cifParser';

const parsers = new Map();

export function registerParser(name, impl) {
    parsers.set(name.toLowerCase(), impl);
}

export function getParser(name) {
    if (!name) return null;
    return parsers.get(name.toLowerCase()) || null;
}

export function detectFormat(text = '', filename = '') {
    const sample = (text || '').slice(0, 1000);
    const name = (filename || '').toLowerCase();

    if (name.endsWith('.xyz')) return 'xyz';
    if (name.endsWith('.pdb')) return 'pdb';
    if (name.endsWith('.cif')) return 'cif';

    if (/^\s*\d+\s*$/m.test(sample.split(/\r?\n/)[0] || '')) return 'xyz';
    if (/^\s*(ATOM|HETATM|CRYST1)/im.test(sample)) return 'pdb';
    if (/^data_|^loop_/im.test(sample)) return 'cif';

    return null;
}

export async function parse(text, format) {
    const fmt = format || detectFormat(text);
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

// Backwards compatibility helpers
export async function parsePDB(text) { return (await parse(text, 'pdb')); }
export async function parseXYZ(text) { return (await parse(text, 'xyz')); }
export async function parseCIF(text) { return (await parse(text, 'cif')); }

export default { registerParser, getParser, detectFormat, parse };
