import { MathUtils } from '../math';

/**
 * Parses a POSCAR file content.
 * @param {string} text - The content of the POSCAR file.
 * @returns {Promise<{atoms: Array<{id: number, element: string, x: number, y: number, z: number}>, lattice: number[][]}>} The parsed atoms and lattice.
 * @throws {Error} If the file format is invalid or parsing fails.
 */
export async function parse(text) {
    const lines = text.trim().split('\n').map(l=>l.trim()).filter(l=>l!=='');
    if (lines.length < 6) {
        throw new Error(`Unrecognized file format. Supported formats: .xyz, .pdb, .cif, POSCAR-like text`);
    }
    const scale = parseFloat(lines[1]);
    if (!Number.isFinite(scale) || isNaN(scale)) {
        throw new Error('POSCAR-like parse failed: missing numeric scale on line 2.');
    }
    const lat = [];
    let latOk = true;
    for(let i=2;i<=4;i++){
        const row = lines[i].split(/\s+/).map(x=>parseFloat(x)*scale);
        if (row.length < 3 || row.some(v => !Number.isFinite(v))) { latOk = false; break; }
        lat.push(row);
    }
    if (!latOk) { throw new Error('POSCAR-like parse failed: invalid lattice vectors.'); }

    let elems = [];
    try { elems = lines[5].split(/\s+/).filter(x=>x!=='' && isNaN(parseFloat(x))); } catch(e) { elems = []; }
    let idx = elems.length ? 6 : 5;
    const countsLine = lines[idx] || '';
    const counts = countsLine.split(/\s+/).map(n => parseInt(n,10)).filter(n => Number.isFinite(n));
    if (!counts || counts.length === 0) {
        throw new Error('POSCAR-like parse failed: element counts line missing or invalid.');
    }
    let typeLine = lines[idx+1] || '';
    let start = idx+2;
    if(typeLine.toLowerCase().startsWith('s')) { start++; typeLine=lines[idx+2] || ''; }
    const isDirect = /direct|fractional/i.test(typeLine);

    let newAtoms = [];
    let gId = 0;
    let cursor = start;
    let totalExpected = counts.reduce((a,b)=>a+b,0);
    if (lines.length < cursor + totalExpected) {
        throw new Error('POSCAR-like parse failed: not enough coordinate lines for declared atom counts.');
    }
    elems = elems.length ? elems : new Array(counts.length).fill('X');
    elems.forEach((el, i) => {
        for(let c=0; c<counts[i]; c++){
            const line = lines[cursor++] || '';
            const cds = line.split(/\s+/).slice(0,3).map(Number);
            if (cds.length < 3 || cds.some(v => !Number.isFinite(v))) { throw new Error('POSCAR-like parse failed: invalid coordinates.'); }
            let x,y,z;
            if(isDirect) [x,y,z] = MathUtils.multiplyMatrixVector(lat, cds);
            else [x,y,z] = cds;
            newAtoms.push({id: gId++, element: el, x, y, z});
        }
    });
    if (!newAtoms || newAtoms.length === 0) { throw new Error('No atoms found in file.'); }
    
    return { atoms: newAtoms, lattice: lat };
}

export default { parse };
