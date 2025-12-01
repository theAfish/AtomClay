export const StructureInfo = {
    getCompositionFromAtoms: (atoms = []) => {
        const comp = {};
        (atoms || []).forEach(a => {
            const el = (a.element || '').trim() || '?';
            comp[el] = (comp[el] || 0) + 1;
        });
        return comp;
    },
    getCompositionString: (atoms = []) => {
        const comp = StructureInfo.getCompositionFromAtoms(atoms);
        const arr = Object.entries(comp).sort(([a], [b]) => a.localeCompare(b));
        return arr.map(([el, n]) => `${el}${n>1? n : ''}`).join(' ');
    }
};
