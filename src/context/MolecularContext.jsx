import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMolecularState } from '../hooks/useMolecularState';
import { useFileImportExport } from '../hooks/useFileImportExport';
import { useAgentReview } from '../hooks/useAgentReview';
import { useClipboard } from '../hooks/useClipboard';
import { useUIContext } from './UIContext';
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

    // Agent Review State (extracted hook)
    const agentReview = useAgentReview({
        layers, setLayers,
        atoms, lattice,
        activeLayerId, setActiveLayerId,
        setLattice,
        addAtoms,
        setSelectedAtomIds,
        setFileError,
        recordOp,
    });

    // Initial Load
    useEffect(() => {
        setAtoms([]);
    }, [setAtoms]);

    // Clipboard & Selection Logic (extracted hook)
    const clipboardOps = useClipboard({
        atoms,
        layers,
        selectedAtomIds,
        activeLayerId,
        updateAtoms,
        setLayers,
        setSelectedAtomIds,
        recordOp,
    });

    const value = {
        ...molecularState,
        ...uiContext,
        ...fileImportExport,
        ...agentReview,
        ...clipboardOps,
        
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
        handleDragOver,
        handleDrop,
        changeLanguage,
        changeRenderer,
        renderers: RENDERERS,
    };

    return (
        <MolecularContext.Provider value={value}>
            {children}
        </MolecularContext.Provider>
    );
};
