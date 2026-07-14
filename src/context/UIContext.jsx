import React, { createContext, useContext, useState, useCallback } from 'react';
import { DEFAULTS } from '../constants/defaults';

const UIContext = createContext(null);

export const useUIContext = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUIContext must be used within a UIProvider');
    }
    return context;
};

export const UIProvider = ({ children }) => {
    const DEFAULT_RENDER_SETTINGS = {
        atomScale: DEFAULTS.VISUALS?.ATOM_SCALE || 0.4,
        vdwScale: 1,
        atomColorMode: 'element', // 'element' | 'single'
        atomColor: DEFAULTS.VISUALS?.DEFAULT_ATOM_COLOR || '#8aa0ff'
    };

    // Selection
    const [selectedAtomIds, setSelectedAtomIds] = useState([]);
    
    // Interaction Modes
    const [editMode, setEditMode] = useState('SELECT');
    const [transformMode, setTransformMode] = useState('translate'); // translate | rotate | scale
    const [targetElement, setTargetElement] = useState('O');
    
    // File/View State
    const [fileError, setFileError] = useState(null);
    const [pdbContent, setPdbContent] = useState(null);
    const [viewMode, setViewMode] = useState('default'); // 'default' | 'protein'
    
    // Toggle States
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [showRendererDropdown, setShowRendererDropdown] = useState(false);
    
    // Renderer selection
    const [currentRenderer, setCurrentRenderer] = useState('three'); // 'three' | 'molstar' | 'canvas'

    // Render settings
    const [renderSettings, setRenderSettings] = useState(DEFAULT_RENDER_SETTINGS);
    const resetRenderSettings = useCallback(() => {
        setRenderSettings(DEFAULT_RENDER_SETTINGS);
    }, [DEFAULT_RENDER_SETTINGS]);

    // Options
    const [moveAtomsWithLattice, setMoveAtomsWithLattice] = useState(true);

    const value = {
        selectedAtomIds, setSelectedAtomIds,
        editMode, setEditMode,
        transformMode, setTransformMode,
        targetElement, setTargetElement,
        fileError, setFileError,
        pdbContent, setPdbContent,
        viewMode, setViewMode,
        showLangDropdown, setShowLangDropdown,
        currentRenderer, setCurrentRenderer,
        showRendererDropdown, setShowRendererDropdown,
        renderSettings, setRenderSettings, resetRenderSettings,
        moveAtomsWithLattice, setMoveAtomsWithLattice
    };

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    );
};
