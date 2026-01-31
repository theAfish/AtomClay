import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useMolecularContext } from '../../../context/MolecularContext';
import { useTheme } from '../../../context/ThemeContext';
import { initializeRenderer } from '../../../utils/rendererUtils';

const ViewerContext = createContext(null);

export const useViewerContext = () => {
    const context = useContext(ViewerContext);
    if (!context) {
        throw new Error('useViewerContext must be used within a ViewerProvider');
    }
    return context;
};

export const ViewerProvider = ({ children }) => {
    const {
        atoms, lattice, layers, activeLayerId,
        onAtomClick, onAtomsMoveEnd, onBoxSelect,
        transformMode, editMode, currentRenderer, renderSettings
    } = useMolecularContext();
    const { theme } = useTheme();

    const containerRef = useRef(null);
    const rendererRef = useRef(null);
    
    // valid default structure for threeRef 
    const threeRef = useRef({ 
        scene: null, camera: null, renderer: null, 
        controls: null, transformControl: null,
        atomMeshes: new Map(), // Map<atomId, Mesh>
        controlAnchor: new THREE.Object3D(), // Anchor for multi-selection
        dragStartPos: new THREE.Vector3(),
        initialAtomPositions: new Map(), // Map<atomId, {x,y,z}>
        atomInstancedMesh: null,
        instanceIdToAtomId: [],
        atomIdToInstanceId: new Map(),
        isInstanced: false,
        isDragging: false,
        isBoxSelecting: false,
        // Ensure sub-objects exist
        initialAnchorQuaternion: new THREE.Quaternion(),
        initialAnchorScale: new THREE.Vector3(1,1,1),
        initialAnchorPos: new THREE.Vector3(),
        initialAtomPositionsRelative: new Map(),
    });

    const [rendererVersion, setRendererVersion] = useState(0);
    const drawGizmoRef = useRef(() => {}); 
    const latestProps = useRef({ atoms, activeLayerId, theme, renderSettings });

    useEffect(() => {
        latestProps.current = { atoms, activeLayerId, theme, renderSettings };
        if (rendererRef.current) rendererRef.current._latestProps = latestProps.current;
    }, [atoms, activeLayerId, theme, renderSettings]);

    // Initialize renderer (three-based) when container is ready or renderer type changes
    useEffect(() => {
        if(!containerRef.current) return;

        const cleanup = initializeRenderer(
            containerRef, currentRenderer, onAtomClick, onAtomsMoveEnd, onBoxSelect, 
            theme, lattice, renderSettings, drawGizmoRef, latestProps, 
            atoms, layers, activeLayerId, rendererRef, threeRef, transformMode, editMode
        );
        
        setRendererVersion(v => v + 1);
        return cleanup;
    }, [currentRenderer]); 

    const value = {
        containerRef,
        rendererRef,
        threeRef,
        rendererVersion,
        drawGizmoRef
    };

    return (
        <ViewerContext.Provider value={value}>
            {children}
        </ViewerContext.Provider>
    );
};
