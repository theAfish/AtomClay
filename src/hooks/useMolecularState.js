import { useState, useRef, useCallback, useEffect } from 'react';
import { DEFAULTS } from '../constants/defaults';
import { handleSupercell as doSupercell, handleVacuum as doVacuum, handleScaleLattice as doScaleLattice, handleSetLattice as doSetLattice } from '../components/operations/latticeHandlers';
import { createOperationRecorder } from '../utils/operationRecorder';
import { logOperation as sendOperationEntry } from '../services/loggerService';

export function useMolecularState() {
    // Layers State
    const [layers, setLayers] = useState([{ id: 'layer-0', name: 'Layer 1', visible: true, selected: true, opacity: 1, lattice: DEFAULTS.LATTICE }]);
    const [activeLayerId, setActiveLayerId] = useState('layer-0');
    const [atoms, setAtoms] = useState([]);

    // Independent Lattice State (decoupled from active layer)
    const [currentLattice, setCurrentLattice] = useState(DEFAULTS.LATTICE);
    const [currentLatticeSourceId, setCurrentLatticeSourceId] = useState('layer-0');
    const lattice = currentLattice;

    // Undo history: stack of { atoms, layers, lattice, activeLayerId, latticeSourceId }
    const historyRef = useRef([]);
    const redoStackRef = useRef([]);
    const isUndoingRef = useRef(false);
    const MAX_HISTORY = DEFAULTS.HISTORY.MAX_LENGTH;

    // Operation log for replay/export (separate from undo/redo snapshots)
    const operationRecorderRef = useRef(createOperationRecorder(DEFAULTS.HISTORY?.OPERATION_MAX_LENGTH || 1000));

    const recordOperation = useCallback((type, params = {}, metadata = {}) => {
        if (isUndoingRef.current) return null;
        const entry = operationRecorderRef.current.record(type, params, {
            ...metadata,
            activeLayerId,
            latticeSourceId: currentLatticeSourceId
        });
        // Best-effort async send to middleware
        try { if (entry) sendOperationEntry(entry); } catch {}
        return entry;
    }, [activeLayerId, currentLatticeSourceId]);

    const getOperationLog = useCallback(() => operationRecorderRef.current.getLog(), []);
    const clearOperationLog = useCallback(() => operationRecorderRef.current.clear(), []);
    const exportOperationLog = useCallback((indent = 2) => operationRecorderRef.current.exportAsJson(indent), []);

    const saveStateToHistory = useCallback((prevAtoms, prevLattice, prevLayers, prevActiveId, prevSourceId) => {
        if (isUndoingRef.current) return;
        
        // Clear redo stack when a new action is performed
        redoStackRef.current = [];

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

        // Save current state to Redo
        const currentSnap = {
            atoms: atoms ? atoms.map(a => ({ ...a })) : [],
            layers: layers ? JSON.parse(JSON.stringify(layers)) : [],
            lattice: lattice,
            activeLayerId: activeLayerId,
            latticeSourceId: currentLatticeSourceId
        };
        redoStackRef.current.push(currentSnap);

        const last = h.pop();
        isUndoingRef.current = true;
        setAtoms(last.atoms || []);
        if (last.layers) setLayers(last.layers);
        if (last.lattice !== undefined) setCurrentLattice(last.lattice);
        if (last.activeLayerId) setActiveLayerId(last.activeLayerId);
        if (last.latticeSourceId) setCurrentLatticeSourceId(last.latticeSourceId);
        
        // allow state push suppression to end on next tick
        setTimeout(() => { isUndoingRef.current = false; }, 0);
    }, [atoms, layers, lattice, activeLayerId, currentLatticeSourceId]);

    const redo = useCallback(() => {
        const r = redoStackRef.current;
        if (!r || r.length === 0) return;

        // Save current state to History
        const currentSnap = {
            atoms: atoms ? atoms.map(a => ({ ...a })) : [],
            layers: layers ? JSON.parse(JSON.stringify(layers)) : [],
            lattice: lattice,
            activeLayerId: activeLayerId,
            latticeSourceId: currentLatticeSourceId
        };
        historyRef.current.push(currentSnap);

        const next = r.pop();
        isUndoingRef.current = true;
        setAtoms(next.atoms || []);
        if (next.layers) setLayers(next.layers);
        if (next.lattice !== undefined) setCurrentLattice(next.lattice);
        if (next.activeLayerId) setActiveLayerId(next.activeLayerId);
        if (next.latticeSourceId) setCurrentLatticeSourceId(next.latticeSourceId);
        
        setTimeout(() => { isUndoingRef.current = false; }, 0);
    }, [atoms, layers, lattice, activeLayerId, currentLatticeSourceId]);

    // Keyboard handler for Ctrl+Z and Ctrl+Y (or Ctrl+Shift+Z)
    useEffect(() => {
        const handler = (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' || e.key === 'Z') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        redo();
                    } else {
                        undo();
                    }
                } else if (e.key === 'y' || e.key === 'Y') {
                    e.preventDefault();
                    redo();
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [undo, redo]);

    const setLattice = useCallback((newLattice, sourceId = null, skipHistory = false) => {
        if (!skipHistory) {
            saveStateToHistory(atoms, lattice, layers, activeLayerId, currentLatticeSourceId);
        }
        setCurrentLattice(newLattice);
        if (sourceId) setCurrentLatticeSourceId(sourceId);

        if (!skipHistory) {
            recordOperation('SET_LATTICE', { sourceId: sourceId || currentLatticeSourceId }, { lattice: newLattice });
        }
    }, [atoms, lattice, layers, activeLayerId, currentLatticeSourceId, saveStateToHistory, recordOperation]);

    // Operations

    const handleSupercell = useCallback((mode, diag, matrix) => {
        recordOperation('SUPERCELL', { mode, diag, matrix }, { lattice });
        doSupercell(atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId, setLayers, setCurrentLattice, setAtoms, mode, diag, matrix);
    }, [atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId, setLayers, setCurrentLattice, setAtoms, recordOperation]);

    const handleVacuum = useCallback((size, axis = 2) => {
        recordOperation('VACUUM', { size, axis }, { lattice });
        doVacuum(atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId, setLayers, setCurrentLattice, size, axis);
    }, [atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId, setLayers, setCurrentLattice, recordOperation]);

    const handleScaleLattice = useCallback((scaleX = 1, scaleY = 1, scaleZ = 1) => {
        recordOperation('SCALE_LATTICE', { scaleX, scaleY, scaleZ }, { lattice });
        doScaleLattice(atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId, setLayers, setCurrentLattice, scaleX, scaleY, scaleZ);
    }, [atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId, setLayers, setCurrentLattice, recordOperation]);

    const handleSetLattice = useCallback((newLattice) => {
        recordOperation('SET_LATTICE_MANUAL', { fromOperation: true }, { lattice: newLattice });
        doSetLattice(atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId, setLayers, setCurrentLattice, newLattice);
    }, [atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId, setLayers, setCurrentLattice, recordOperation]);

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

        recordOperation('ADD_ATOMS', {
            count: mapped.length,
            createNewLayer,
            targetLayerId,
            hasLattice: Boolean(newLat)
        }, { lattice: newLat || lattice });
        
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
        
        const resultIds = mapped.map(m => m.id);
        resultIds.layerId = targetLayerId;
        return resultIds; // Return new IDs for selection
    }, [atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId, recordOperation]);

    const updateAtoms = useCallback((updater, reason = 'custom', operationParams = {}) => {
        recordOperation('UPDATE_ATOMS', { reason, ...operationParams });
        setAtoms(prev => {
            saveStateToHistory(prev, lattice, layers, activeLayerId, currentLatticeSourceId);
            return updater(prev);
        });
    }, [lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId, recordOperation]);

    const renameLayer = useCallback((layerId, newName) => {
        recordOperation('RENAME_LAYER', { layerId, newName });
        setLayers(prev => {
            saveStateToHistory(atoms, lattice, prev, activeLayerId, currentLatticeSourceId);
            return prev.map(l => l.id === layerId ? { ...l, name: newName } : l);
        });
    }, [atoms, lattice, activeLayerId, saveStateToHistory, currentLatticeSourceId, recordOperation]);

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
        redo,
        handleSupercell,
        handleVacuum,
        handleScaleLattice,
        handleSetLattice,
        addAtoms,
        updateAtoms,
        renameLayer,
        saveStateToHistory,
        currentLatticeSourceId,
        recordOperation,
        getOperationLog,
        clearOperationLog,
        exportOperationLog
    };
}
