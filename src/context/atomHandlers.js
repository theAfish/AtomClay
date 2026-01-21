// Handlers related to atom selection and creation, extracted from MolecularContext
const round6 = (v) => (Number.isFinite(v) ? Number(v.toFixed(6)) : v);
const vecToArr = (v) => (v && typeof v === 'object' && v.x !== undefined ? [round6(v.x), round6(v.y), round6(v.z)] : null);

const normalizeMove = (move) => {
    const toVec = move.to || (move.x !== undefined ? { x: move.x, y: move.y, z: move.z } : null);
    const fromVec = move.from || (move.x0 !== undefined ? { x: move.x0, y: move.y0, z: move.z0 } : null);
    const to = vecToArr(toVec) || [0, 0, 0];
    const from = vecToArr(fromVec);
    return { id: move.id, to, from };
};

const normalizeMovesPayload = (payload) => {
    if (Array.isArray(payload)) {
        return {
            moves: payload.map(m => normalizeMove({ id: m.id, to: { x: m.x, y: m.y, z: m.z } })),
            meta: { reason: 'drag-move', mode: 'translate', selectedAtomIds: [], anchor: null, delta: null, rotation: null, scale: null }
        };
    }

    const meta = payload || {};
    const normalizedMoves = (meta.moves || []).map(normalizeMove);
    return {
        moves: normalizedMoves,
        meta: {
            reason: meta.reason || 'drag-move',
            mode: meta.mode || 'translate',
            selectedAtomIds: meta.selectedAtomIds || [],
            anchor: meta.anchor ? { start: vecToArr(meta.anchor.start), end: vecToArr(meta.anchor.end) } : null,
            delta: vecToArr(meta.delta),
            rotation: meta.rotation ? { axis: vecToArr(meta.rotation.axis), angleRad: round6(meta.rotation.angleRad), angleDeg: round6(meta.rotation.angleDeg) } : null,
            scale: meta.scale ? { factors: vecToArr(meta.scale.factors || meta.scale) } : null
        }
    };
};

export function createAtomHandlers({ lattice, updateAtoms, targetElement, setSelectedAtomIds, setEditMode, setTransformMode, activeLayerId, recordOperation }) {
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

    const onAtomsMoveEnd = (payload) => {
        const { moves, meta } = normalizeMovesPayload(payload);
        if (!moves || moves.length === 0) return;

        const op = {
            reason: meta.reason,
            mode: meta.mode,
            moved: moves.length,
            selected: meta.selectedAtomIds,
            anchor: meta.anchor,
            delta: meta.delta,
            rotation: meta.rotation,
            scale: meta.scale
            // omit per-atom moves in the persisted log to keep entries compact
        };

        // Drop null/undefined fields to keep entries clean
        Object.keys(op).forEach(k => {
            const v = op[k];
            if (v === null || v === undefined) delete op[k];
        });

        recordOperation?.('UPDATE_ATOMS', op);

        updateAtoms(prev => {
            const moveMap = new Map(moves.map(m => [m.id, m.to]));
            return prev.map(a => {
                if (moveMap.has(a.id)) {
                    const pos = moveMap.get(a.id);
                    return { ...a, x: pos[0], y: pos[1], z: pos[2] };
                }
                return a;
            });
        }, meta.reason || 'drag-move');
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
            }, 'create-atom-center');

            recordOperation?.('ADD_ATOMS', {
                count: 1,
                createNewLayer: false,
                targetLayerId: activeLayerId,
                hasLattice: Boolean(lattice)
            }, { lattice });

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
