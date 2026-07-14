import { useState, useCallback } from 'react';

/**
 * Encapsulates clipboard operations for molecular editing:
 * - Copy selected atoms or selected layers (with their atoms)
 * - Paste copied atoms / layers with proper ID remapping
 * - Delete selected atoms
 *
 * Extracted from MolecularContext for clarity and reuse.
 */
export function useClipboard({
    atoms,
    layers,
    selectedAtomIds,
    activeLayerId,
    updateAtoms,
    setLayers,
    setSelectedAtomIds,
    recordOp,
}) {
    const [clipboard, setClipboard] = useState(null);

    const copySelection = useCallback(() => {
        if (selectedAtomIds.length > 0) {
            const selectedAtoms = atoms.filter(a => selectedAtomIds.includes(a.id));
            setClipboard({ type: 'atoms', data: selectedAtoms.map(a => ({ ...a })) });
        } else {
            const selectedLayers = layers.filter(l => l.selected);
            if (selectedLayers.length > 0) {
                const layerIds = selectedLayers.map(l => l.id);
                const layersCopy = selectedLayers.map(l => ({ ...l }));
                const associatedAtoms = atoms.filter(a => layerIds.includes(a.layerId)).map(a => ({ ...a }));
                setClipboard({ type: 'layers', data: layersCopy, atoms: associatedAtoms });
            }
        }
    }, [selectedAtomIds, atoms, layers]);

    const pasteSelection = useCallback(() => {
        if (!clipboard) return;

        if (clipboard.type === 'atoms') {
            const atomsToPaste = clipboard.data;
            if (atomsToPaste.length === 0) return;
            const maxId = atoms.length > 0 ? Math.max(...atoms.map(a => a.id)) : -1;
            const newAtoms = atomsToPaste.map((a, i) => ({
                ...a,
                id: maxId + 1 + i,
                layerId: activeLayerId,
            }));
            updateAtoms(prev => [...prev, ...newAtoms], 'paste-atoms');
            setSelectedAtomIds(newAtoms.map(a => a.id));
            recordOp('PASTE_ATOMS', { count: atomsToPaste.length, targetLayerId: activeLayerId });
        } else if (clipboard.type === 'layers') {
            const { data: layersToPaste, atoms: atomsToPaste } = clipboard;
            const idMap = {};
            const newLayers = layersToPaste.map((l) => {
                const newId = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                idMap[l.id] = newId;
                return {
                    ...l,
                    id: newId,
                    name: `${l.name} (Copy)`,
                    selected: false,
                    visible: true,
                };
            });
            const maxId = atoms.length > 0 ? Math.max(...atoms.map(a => a.id)) : -1;
            const newAtoms = atomsToPaste.map((a, i) => ({
                ...a,
                id: maxId + 1 + i,
                layerId: idMap[a.layerId],
            }));
            setLayers(prev => [...prev, ...newLayers]);
            updateAtoms(prev => [...prev, ...newAtoms], 'paste-layers');
            recordOp('PASTE_LAYERS', { count: newLayers.length });
        }
    }, [clipboard, atoms, activeLayerId, updateAtoms, setLayers, recordOp, setSelectedAtomIds]);

    const deleteSelectedAtoms = useCallback(() => {
        if (!selectedAtomIds || selectedAtomIds.length === 0) return;
        recordOp('DELETE_ATOMS', { ids: selectedAtomIds.slice(), count: selectedAtomIds.length });
        updateAtoms(prev => prev.filter(a => !selectedAtomIds.includes(a.id)), 'delete-selected');
        setSelectedAtomIds([]);
    }, [selectedAtomIds, updateAtoms, setSelectedAtomIds, recordOp]);

    return {
        clipboard,
        copySelection,
        pasteSelection,
        deleteSelectedAtoms,
    };
}
