import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { MathUtils } from '../utils/math';
import { parse } from '../utils/parsers';
import { calculateSupercell, calculateVacuum, calculateScaleLattice } from '../utils/structureOperations';
import { DEFAULTS } from '../constants/defaults';

export function useMolecularState() {
    // Layers State
    const [layers, setLayers] = useState([{ id: 'layer-0', name: 'Layer 1', visible: true, opacity: 1, lattice: DEFAULTS.LATTICE }]);
    const [activeLayerId, setActiveLayerId] = useState('layer-0');
    const [atoms, setAtoms] = useState([]);

    // Independent Lattice State (decoupled from active layer)
    const [currentLattice, setCurrentLattice] = useState(DEFAULTS.LATTICE);
    const [currentLatticeSourceId, setCurrentLatticeSourceId] = useState('layer-0');
    const lattice = currentLattice;

    const setLattice = useCallback((newLattice, sourceId = null) => {
        setCurrentLattice(newLattice);
        if (sourceId) setCurrentLatticeSourceId(sourceId);
    }, []);

    // Undo history: stack of { atoms, layers, lattice, activeLayerId, latticeSourceId }
    const historyRef = useRef([]);
    const isUndoingRef = useRef(false);
    const MAX_HISTORY = DEFAULTS.HISTORY.MAX_LENGTH;

    const saveStateToHistory = useCallback((prevAtoms, prevLattice, prevLayers, prevActiveId, prevSourceId) => {
        if (isUndoingRef.current) return;
        const snap = {
            atoms: prevAtoms ? prevAtoms.map(a => ({ ...a })) : [],
            layers: prevLayers ? JSON.parse(JSON.stringify(prevLayers)) : [],
            lattice: prevLattice,
            activeLayerId: prevActiveId,
            latticeSourceId: prevSourceId
        };
        historyRef.current.push(snap);
        if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    }, []);

    const undo = useCallback(() => {
        const h = historyRef.current;
        if (!h || h.length === 0) return;
        const last = h.pop();
        isUndoingRef.current = true;
        setAtoms(last.atoms || []);
        if (last.layers) setLayers(last.layers);
        if (last.lattice !== undefined) setCurrentLattice(last.lattice);
        if (last.activeLayerId) setActiveLayerId(last.activeLayerId);
        if (last.latticeSourceId) setCurrentLatticeSourceId(last.latticeSourceId);
        
        // allow state push suppression to end on next tick
        setTimeout(() => { isUndoingRef.current = false; }, 0);
    }, []);

    // Keyboard handler for Ctrl+Z
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                undo();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [undo]);

    // Operations

    const handleSupercell = useCallback((mode, diag, matrix) => {
        const currentLatticeVal = lattice;
        if (!currentLatticeVal) return;

        // Filter atoms
        const activeAtoms = atoms.filter(a => a.layerId === activeLayerId);
        const otherAtoms = atoms.filter(a => a.layerId !== activeLayerId);
        
        let maxId = atoms.length > 0 ? Math.max(...atoms.map(a => a.id)) : -1;

        const { newAtoms, newLattice } = calculateSupercell(activeAtoms, currentLatticeVal, mode, diag, matrix, maxId);
        
        saveStateToHistory(atoms, lattice, layers, activeLayerId, currentLatticeSourceId);
        setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, lattice: newLattice } : l));
        setCurrentLattice(newLattice);
        setAtoms([...otherAtoms, ...newAtoms]);
    }, [atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId]);

    const handleVacuum = useCallback((size, axis = 2) => {
        const currentLatticeVal = lattice;
        if (!currentLatticeVal) return;
        
        // Filter atoms for active layer if needed, but vacuum usually applies to the whole cell or active layer's cell
        // Here we pass all atoms but we might only want to affect active layer's atoms if we were modifying them.
        // Since calculateVacuum returns identity for atoms, it's safe.
        const activeAtoms = atoms.filter(a => a.layerId === activeLayerId);
        const otherAtoms = atoms.filter(a => a.layerId !== activeLayerId);

        const { newAtoms, newLattice } = calculateVacuum(activeAtoms, currentLatticeVal, size, axis);
        
        saveStateToHistory(atoms, lattice, layers, activeLayerId, currentLatticeSourceId);
        setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, lattice: newLattice } : l));
        setCurrentLattice(newLattice);
        // If atoms were modified, we would update them here:
        // setAtoms([...otherAtoms, ...newAtoms]);
    }, [atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId]);

    const handleScaleLattice = useCallback((scaleX = 1, scaleY = 1, scaleZ = 1) => {
        const currentLatticeVal = lattice;
        if (!currentLatticeVal) return;
        
        const activeAtoms = atoms.filter(a => a.layerId === activeLayerId);
        const otherAtoms = atoms.filter(a => a.layerId !== activeLayerId);

        const { newAtoms, newLattice } = calculateScaleLattice(activeAtoms, currentLatticeVal, scaleX, scaleY, scaleZ);
        
        saveStateToHistory(atoms, lattice, layers, activeLayerId, currentLatticeSourceId);
        setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, lattice: newLattice } : l));
        setCurrentLattice(newLattice);
        // If atoms were modified:
        // setAtoms([...otherAtoms, ...newAtoms]);
    }, [atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId]);

    const handleSetLattice = useCallback((newLattice) => {
        const currentLatticeVal = lattice;
        if (!currentLatticeVal || !newLattice) return;

        // Validate newLattice shape
        if (!Array.isArray(newLattice) || newLattice.length !== 3 || !Array.isArray(newLattice[0])) {
            throw new Error('Invalid lattice matrix');
        }

        // Atoms remain unchanged in Cartesian coordinates when replacing lattice matrix
        saveStateToHistory(atoms, lattice, layers, activeLayerId, currentLatticeSourceId);
        setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, lattice: newLattice } : l));
        setCurrentLattice(newLattice);
    }, [atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId]);

    const addAtoms = useCallback((newAtoms, newLat, createNewLayer = false) => {
        let targetLayerId = activeLayerId;
        const isFirstImport = atoms.length === 0;
        
        if (createNewLayer) {
            const id = `layer-${Date.now()}`;
            const nameLayer = `Layer ${layers.length + 1}`;
            const newLayer = { id, name: nameLayer, visible: true, opacity: 1, lattice: newLat || null };
            setLayers(prev => [newLayer, ...prev]);
            setActiveLayerId(id);
            targetLayerId = id;

            if (isFirstImport && newLat) {
                setCurrentLattice(newLat);
                setCurrentLatticeSourceId(id);
            }
        }

        const maxId = atoms && atoms.length ? Math.max(...atoms.map(a => a.id)) : -1;
        const mapped = (newAtoms || []).map((a, i) => ({ ...a, id: maxId + 1 + i, layerId: targetLayerId }));
        
        setAtoms(prev => {
            saveStateToHistory(prev, lattice, layers, activeLayerId, currentLatticeSourceId);
            if (createNewLayer) {
                return [...prev, ...mapped];
            } else {
                const others = prev.filter(a => a.layerId !== targetLayerId);
                return [...others, ...mapped];
            }
        });

        if (!createNewLayer) {
            setLayers(prev => prev.map(l => l.id === targetLayerId ? { ...l, lattice: newLat || null } : l));
            if (isFirstImport && newLat) {
                setCurrentLattice(newLat);
                setCurrentLatticeSourceId(targetLayerId);
            } else if (newLat && currentLatticeSourceId === targetLayerId) {
                setCurrentLattice(newLat);
            }
        }
        
        return mapped.map(m => m.id); // Return new IDs for selection
    }, [atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId]);

    const updateAtoms = useCallback((updater) => {
        setAtoms(prev => {
            saveStateToHistory(prev, lattice, layers, activeLayerId, currentLatticeSourceId);
            return updater(prev);
        });
    }, [lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId]);

    const renameLayer = useCallback((layerId, newName) => {
        setLayers(prev => {
            saveStateToHistory(atoms, lattice, prev, activeLayerId, currentLatticeSourceId);
            return prev.map(l => l.id === layerId ? { ...l, name: newName } : l);
        });
    }, [atoms, lattice, activeLayerId, saveStateToHistory, currentLatticeSourceId]);

    return {
        atoms,
        lattice,
        layers,
        activeLayerId,
        setAtoms,
        setLattice,
        setLayers,
        setActiveLayerId,
        undo,
        handleSupercell,
        handleVacuum,
        handleScaleLattice,
        handleSetLattice,
        addAtoms,
        updateAtoms,
        renameLayer,
        saveStateToHistory
    };
}
