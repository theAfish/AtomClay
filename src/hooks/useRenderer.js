import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createThreeRenderer, createCustomRenderer } from '../renderers';

export const useRenderer = (containerRef, currentRenderer, onAtomClick, onAtomsMoveEnd, onBoxSelect, theme, lattice, drawGizmoRef, latestProps, atoms, layers, activeLayerId) => {
    const rendererRef = useRef(null);
    const threeRef = useRef({
        scene: null, camera: null, renderer: null,
        controls: null, transformControl: null,
        atomMeshes: new Map(),
        controlAnchor: new THREE.Object3D(),
        dragStartPos: new THREE.Vector3(),
        initialAtomPositions: new Map(),
        atomInstancedMesh: null,
        instanceIdToAtomId: [],
        atomIdToInstanceId: new Map(),
        isInstanced: false,
        isDragging: false,
        isBoxSelecting: false,
    });

    // Initialize renderer
    useEffect(() => {
        if (!containerRef.current) return;
        // Dispose previous renderer if present
        if (rendererRef.current) {
            try { rendererRef.current.dispose(); } catch (e) {}
            rendererRef.current = null;
        }

        // Map renderer id to atom style for shader variants
        let atomStyle;
        if (currentRenderer === 'custom-toon' || currentRenderer === 'custom-cartoon') atomStyle = 'toon';
        else if (currentRenderer === 'custom-plastic') atomStyle = 'plastic';
        else if (currentRenderer === 'custom') atomStyle = 'plastic'; // legacy

        const rendererApi = currentRenderer && currentRenderer.startsWith('custom') ? createCustomRenderer() : createThreeRenderer();
        rendererRef.current = rendererApi;
        rendererApi.init(containerRef.current, { onAtomClick, onAtomsMoveEnd, onBoxSelect, theme, lattice, atomStyle });

        // Replace our threeRef.current with renderer's internal threeRef object
        threeRef.current = rendererApi.threeRef;

        // Provide the drawGizmo function to renderer's animate loop
        if (rendererApi._drawGizmoRef) rendererApi._drawGizmoRef.current = drawGizmoRef.current;

        // Forward latestProps for click filtering inside renderer
        rendererApi._latestProps = latestProps.current;

        // Sync initial scene to renderer
        try { if (rendererApi.syncScene) rendererApi.syncScene({ atoms, lattice, layers, activeLayerId, theme }); } catch(e) {}

        return () => {
            try { rendererApi.dispose(); } catch (e) {}
        };
    }, [currentRenderer, containerRef, onAtomClick, onAtomsMoveEnd, onBoxSelect, theme, lattice, drawGizmoRef, latestProps, atoms, layers, activeLayerId]);

    // Sync scene
    useEffect(() => {
        if (rendererRef.current && rendererRef.current.syncScene) {
            try { rendererRef.current.syncScene({ atoms, lattice, layers, activeLayerId, theme }); } catch (e) {}
        }
    }, [atoms, lattice, layers, theme, currentRenderer]);

    return { rendererRef, threeRef };
};