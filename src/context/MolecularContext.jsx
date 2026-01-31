import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMolecularState } from '../hooks/useMolecularState';
import { useFileImportExport } from '../hooks/useFileImportExport';
import { useUIContext } from './UIContext';
import { parse } from '../utils/parsers';
import { createAtomHandlers } from './atomHandlers';
import { DEFAULTS } from '../constants/defaults';

const MolecularContext = createContext(null);

export const useMolecularContext = () => {
    const context = useContext(MolecularContext);
    if (!context) {
        throw new Error('useMolecularContext must be used within a MolecularProvider');
    }
    return context;
};

export const MolecularProvider = ({ children }) => {
    const { i18n } = useTranslation();
    
    // 1. Domain State
    const molecularState = useMolecularState();
    const {
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
        handleSupercell: handleSupercellOp,
        handleVacuum: handleVacuumOp,
        handleScaleLattice: handleScaleLatticeOp,
        handleSetLattice: handleSetLatticeOp,
        handleWrapAtoms: handleWrapAtomsOp,
        addAtoms,
        updateAtoms,
        renameLayer,
        recordOperation,
        getOperationLog,
        clearOperationLog,
        exportOperationLog
    } = molecularState;

    // Helper to also ship logs to middleware
    const recordOp = useCallback((type, params, metadata) => recordOperation(type, params, metadata), [recordOperation]);

    // 2. UI State
    const uiContext = useUIContext();
    const {
        selectedAtomIds, setSelectedAtomIds,
        editMode, setEditMode,
        transformMode, setTransformMode,
        targetElement,
        setShowLangDropdown,
        setShowRendererDropdown,
        setCurrentRenderer, renderers // Assume renderers passed or locally defined
        // ... state needed for internal functions
    } = uiContext;

    // 3. File I/O Logic
    const fileImportExport = useFileImportExport(molecularState, uiContext);
    const { importFile, setFileError, handleLoad, handleDownload, loadStructureFromText } = fileImportExport;

    // --- Operation Wrappers ---
    const handleSupercell = (u, v, w) => {
        try {
            handleSupercellOp(u, v, w);
        } catch (e) {
            alert(e.message);
        }
    };

    const handleVacuum = (size, axis = 2) => {
        try {
            handleVacuumOp(size, axis);
        } catch (e) {
            alert(e.message);
        }
    };

    const handleScaleLattice = (scaleX, scaleY, scaleZ) => {
        try {
            handleScaleLatticeOp(scaleX, scaleY, scaleZ);
        } catch (e) {
            alert(e.message);
        }
    };

    const handleSetLattice = (newLat) => {
        try {
            handleSetLatticeOp(newLat);
        } catch (e) {
            alert(e.message);
        }
    };

    const handleWrapAtoms = () => {
        try {
            handleWrapAtomsOp();
        } catch (e) {
            alert(e.message);
        }
    };

    // Atom-related handlers
    const { onAtomClick, onBoxSelect, onAtomsMoveEnd, createAtomAtCenter } = createAtomHandlers({
        lattice,
        updateAtoms,
        targetElement,
        setSelectedAtomIds,
        setEditMode,
        setTransformMode,
        activeLayerId,
        recordOperation
    });

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files);
        let isFirst = layers.length === 1 && layers[0].id === 'layer-0' && atoms.filter(a => a.layerId === 'layer-0').length === 0;
        for (const file of files) {
            const createNew = !isFirst;
            try {
                await importFile(file, createNew);
                isFirst = false;
            } catch (err) {
                setFileError(err.message);
            }
        }
    };

    const changeLanguage = (code) => {
        i18n.changeLanguage(code);
        setShowLangDropdown(false);
    };

    const changeRenderer = (id) => {
         // Pass through to UI context
         setCurrentRenderer(id);
         setShowRendererDropdown(false);
    };
    
    // Constant for local use if UIContext doesn't provide the list (it doesn't, usually defined in UI component, but here we expose it)
    const RENDERERS = DEFAULTS.UI.RENDERERS;

    // Agent Review State (Domain/Workflow State)
    const [agentReviewState, setAgentReviewState] = useState({ status: 'idle', originalLayers: [], resultLayerId: null, originalLattice: null, originalLatticeSource: null });

    const handleAgentResult = async (content, fileName) => {
        const selectedLayers = layers.filter(l => l.selected);
        const selectedLayerIds = selectedLayers.map(l => l.id);

        setLayers(prev => prev.map(l => {
            if (selectedLayerIds.includes(l.id)) {
                return { ...l, visible: false, isAgentInput: true };
            }
            return l;
        }));

        try {
            console.log('Parsing structure:', fileName);
            const { atoms: newAtoms, lattice: newLat } = await parse(content, undefined, fileName);
            
            const newIds = addAtoms(newAtoms, newLat, true);
            const newLayerId = newIds.layerId;
            
            setLayers(prev => prev.map(l => {
                if (l.id === newLayerId) {
                    return { ...l, isAgentResult: true };
                }
                return l;
            }));
            
            if (newLat) {
                setLattice(newLat, newLayerId);
            }
            
            setAgentReviewState({
                status: 'reviewing',
                originalLayers: selectedLayerIds,
                resultLayerId: newLayerId,
                originalLattice: lattice,
                originalLatticeSource: activeLayerId
            });

            recordOp('AGENT_RESULT_RECEIVED', {
                fileName,
                atomCount: newAtoms.length,
                resultLayerId: newLayerId,
                originalLayers: selectedLayerIds
            }, { lattice: newLat });
            
            setSelectedAtomIds(newIds);
            setFileError(null);
            console.log('Structure loaded into new layer for review');
        } catch (e) {
            console.error('Error loading structure:', e);
            setFileError(e.message);
        }
    };

    const acceptAgentResult = () => {
        const { originalLayers, resultLayerId } = agentReviewState;
        setLayers(prev => prev.filter(l => !originalLayers.includes(l.id)).map(l => {
             if (l.id === resultLayerId) {
                 const { isAgentResult, ...rest } = l;
                 return rest;
             }
             return l;
        }));
        setAgentReviewState({ status: 'idle', originalLayers: [], resultLayerId: null, originalLattice: null, originalLatticeSource: null });

        recordOp('AGENT_RESULT_ACCEPT', { resultLayerId });
    };

    const denyAgentResult = () => {
        const { originalLayers, resultLayerId, originalLattice, originalLatticeSource } = agentReviewState;
        setLayers(prev => {
            const next = prev.filter(l => l.id !== resultLayerId).map(l => {
                if (originalLayers.includes(l.id)) {
                    const { isAgentInput, visible, ...rest } = l;
                    return { ...rest, visible: true };
                }
                return l;
            });
            if (activeLayerId === resultLayerId) {
                const firstOriginal = originalLayers.find(id => next.some(l => l.id === id));
                if (firstOriginal) {
                    setActiveLayerId(firstOriginal);
                }
            }
            return next;
        });
        setLattice(originalLattice, originalLatticeSource);
        setAgentReviewState({ status: 'idle', originalLayers: [], resultLayerId: null, originalLattice: null, originalLatticeSource: null });

        recordOp('AGENT_RESULT_DENY', { resultLayerId, restoredLayers: originalLayers });
    };

    const handleLayerReviewAction = (layerId, action) => {
        setLayers(prev => {
            const nextLayers = prev.map(l => {
                if (l.id !== layerId) return l;
                
                if (action === 'keep') {
                    const { isAgentInput, isAgentResult, visible, ...rest } = l;
                    const kept = { ...rest, visible: true };
                    if (l.isAgentResult && l.lattice) {
                        setLattice(l.lattice, layerId);
                    }
                    return kept;
                } else if (action === 'discard') {
                    if (l.isAgentResult) {
                        setLattice(agentReviewState.originalLattice, agentReviewState.originalLatticeSource);
                    }
                    return null;
                }
                return l;
            }).filter(Boolean);

            if (action === 'discard' && activeLayerId === layerId) {
                const remaining = nextLayers.filter(l => l.visible);
                if (remaining.length > 0) {
                    setActiveLayerId(remaining[0].id);
                } else {
                    setActiveLayerId(null);
                }
            }

            const hasFlagged = nextLayers.some(l => l.isAgentInput || l.isAgentResult);
            if (!hasFlagged) {
                setAgentReviewState({ status: 'idle', originalLayers: [], resultLayerId: null, originalLattice: null, originalLatticeSource: null });
            }

            recordOp('AGENT_LAYER_ACTION', { layerId, action });

            return nextLayers;
        });
    };

    // Initial Load
    useEffect(() => {
        setAtoms([]);
    }, [setAtoms]);

    // Clipboard & Selection Logic
    const deleteSelectedAtoms = () => {
        if (!selectedAtomIds || selectedAtomIds.length === 0) return;
        recordOp('DELETE_ATOMS', { ids: selectedAtomIds.slice(), count: selectedAtomIds.length });
        updateAtoms(prev => prev.filter(a => !selectedAtomIds.includes(a.id)), 'delete-selected');
        setSelectedAtomIds([]);
    };

    const [clipboard, setClipboard] = useState(null);

    const copySelection = useCallback(() => {
        if (selectedAtomIds.length > 0) {
            const selectedAtoms = atoms.filter(a => selectedAtomIds.includes(a.id));
            setClipboard({ type: 'atoms', data: selectedAtoms.map(a => ({...a})) });
            console.log('Copied atoms:', selectedAtoms.length);
        } else {
            const selectedLayers = layers.filter(l => l.selected);
            if (selectedLayers.length > 0) {
                const layerIds = selectedLayers.map(l => l.id);
                const layersCopy = selectedLayers.map(l => ({ ...l }));
                const associatedAtoms = atoms.filter(a => layerIds.includes(a.layerId)).map(a => ({ ...a }));
                setClipboard({ type: 'layers', data: layersCopy, atoms: associatedAtoms });
                console.log('Copied layers:', selectedLayers.length);
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
                layerId: activeLayerId
            }));

            updateAtoms(prev => [...prev, ...newAtoms], 'paste-atoms');
            setSelectedAtomIds(newAtoms.map(a => a.id));
            recordOp('PASTE_ATOMS', { count: atomsToPaste.length, targetLayerId: activeLayerId });

        } else if (clipboard.type === 'layers') {
            const { data: layersToPaste, atoms: atomsToPaste } = clipboard;
            
            const idMap = {};
            const newLayers = layersToPaste.map((l, i) => {
                const newId = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                idMap[l.id] = newId;
                return {
                    ...l,
                    id: newId,
                    name: `${l.name} (Copy)`,
                    selected: false,
                    isAgentInput: false,
                    isAgentResult: false,
                    visible: true
                };
            });

            const maxId = atoms.length > 0 ? Math.max(...atoms.map(a => a.id)) : -1;
            
            const newAtoms = atomsToPaste.map((a, i) => ({
                ...a,
                id: maxId + 1 + i,
                layerId: idMap[a.layerId]
            }));

            setLayers(prev => [...prev, ...newLayers]);
            updateAtoms(prev => [...prev, ...newAtoms], 'paste-layers');
            recordOp('PASTE_LAYERS', { count: newLayers.length });
        }
    }, [clipboard, atoms, activeLayerId, updateAtoms, setLayers, recordOp, setSelectedAtomIds]);

    const value = {
        ...molecularState,
        ...uiContext,
        ...fileImportExport,
        
        // Wrapped Handlers
        handleSupercell,
        handleVacuum,
        handleScaleLattice,
        handleSetLattice,
        handleWrapAtoms,
        createAtomAtCenter,
        onAtomClick,
        onBoxSelect,
        onAtomsMoveEnd,
        deleteSelectedAtoms,
        copySelection,
        pasteSelection,
        handleDragOver,
        handleDrop,
        changeLanguage,
        changeRenderer,
        renderers: RENDERERS,
        
        // Agent Review
        agentReviewState,
        handleAgentResult,
        acceptAgentResult,
        denyAgentResult,
        handleLayerReviewAction,
    };

    return (
        <MolecularContext.Provider value={value}>
            {children}
        </MolecularContext.Provider>
    );
};
