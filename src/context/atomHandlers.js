// Handlers related to atom selection and creation, extracted from MolecularContext
export function createAtomHandlers({ lattice, updateAtoms, targetElement, setSelectedAtomIds, setEditMode, setTransformMode, activeLayerId }) {
    const onAtomClick = (id, isMulti) => {
        // Selection only; deletion is handled by explicit delete action
        if (id === null) {
            if (!isMulti) setSelectedAtomIds([]);
        } else {
            if (isMulti) {
                setSelectedAtomIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
            } else {
                setSelectedAtomIds([id]);
            }
        }
    };

    const onBoxSelect = (ids, isMulti) => {
        if (isMulti) {
            setSelectedAtomIds(prev => [...new Set([...prev, ...ids])]);
        } else {
            setSelectedAtomIds(ids);
        }
    };

    const onAtomsMoveEnd = (moves) => {
        updateAtoms(prev => {
            const moveMap = new Map(moves.map(m => [m.id, m]));
            return prev.map(a => {
                if (moveMap.has(a.id)) {
                    const m = moveMap.get(a.id);
                    return { ...a, x: m.x, y: m.y, z: m.z };
                }
                return a;
            });
        });
    };

    const createAtomAtCenter = (elementOverride) => {
        try {
            const lat = lattice || [[10,0,0],[0,10,0],[0,0,10]];
            const cx = (lat[0][0] + lat[1][0] + lat[2][0]) / 2;
            const cy = (lat[0][1] + lat[1][1] + lat[2][1]) / 2;
            const cz = (lat[0][2] + lat[1][2] + lat[2][2]) / 2;

            let newId = null;
            updateAtoms(prev => {
                const maxId = prev && prev.length ? Math.max(...prev.map(a => a.id)) : -1;
                newId = maxId + 1;
                const newAtom = { id: newId, element: elementOverride || targetElement, x: cx, y: cy, z: cz, layerId: activeLayerId };
                return [...prev, newAtom];
            });

            if (newId !== null) {
                setSelectedAtomIds([newId]);
                setEditMode('SELECT');
                setTransformMode('translate');
            }
        } catch (e) {
            console.error('Failed to create atom at center', e);
            alert('Could not add atom: ' + (e.message || e));
        }
    };

    return { onAtomClick, onBoxSelect, onAtomsMoveEnd, createAtomAtCenter };
}
