import * as THREE from 'three';
import { createThreeRenderer, createCustomRenderer } from '../renderers';

export const initializeRenderer = (containerRef, currentRenderer, onAtomClick, onAtomsMoveEnd, onBoxSelect, theme, lattice, drawGizmoRef, latestProps, atoms, layers, activeLayerId, rendererRef, threeRef, transformMode = 'translate', editMode = 'SELECT') => {
    if (!containerRef.current) return;
    // Capture previous camera/controls state so we can preserve viewport when
    // switching renderers. This avoids jumps when swapping implementations.
    let prevCameraState = null;
    let prevControlsTarget = null;
    if (threeRef.current && threeRef.current.camera) {
        try {
            prevCameraState = {
                position: threeRef.current.camera.position.clone(),
                quaternion: threeRef.current.camera.quaternion.clone(),
                up: threeRef.current.camera.up ? threeRef.current.camera.up.clone() : null,
            };
        } catch (e) { prevCameraState = null; }
    }
    if (threeRef.current && threeRef.current.controls && threeRef.current.controls.target) {
        try { prevControlsTarget = threeRef.current.controls.target.clone(); } catch (e) { prevControlsTarget = null; }
    }

    // Dispose previous renderer if present
    if (rendererRef.current) {
        try { rendererRef.current.dispose(); } catch (e) {}
        rendererRef.current = null;
    }

    const rendererApi = currentRenderer === 'custom' ? createCustomRenderer() : createThreeRenderer();
    rendererRef.current = rendererApi;
    rendererApi.init(containerRef.current, { onAtomClick, onAtomsMoveEnd, onBoxSelect, theme, lattice });

    // Replace our threeRef.current with renderer's internal threeRef object so
    // existing hooks and logic continue to work.
    threeRef.current = rendererApi.threeRef;

    // Restore previous camera/controls state (if available) so switching
    // renderers does not reset the user's viewport. Apply position,
    // orientation and controls target then update controls.
    try {
        if (prevCameraState && threeRef.current && threeRef.current.camera) {
            const cam = threeRef.current.camera;
            cam.position.copy(prevCameraState.position);
            if (prevCameraState.quaternion) cam.quaternion.copy(prevCameraState.quaternion);
            if (prevCameraState.up && cam.up) cam.up.copy(prevCameraState.up);
        }
        if (prevControlsTarget && threeRef.current && threeRef.current.controls) {
            threeRef.current.controls.target.copy(prevControlsTarget);
            if (typeof threeRef.current.controls.update === 'function') threeRef.current.controls.update();
        }
    } catch (e) {
        // Non-fatal: if renderer doesn't expose expected fields, silently continue
    }

    // Provide the drawGizmo function to renderer's animate loop
    if (rendererApi._drawGizmoRef) rendererApi._drawGizmoRef.current = drawGizmoRef.current;

    // Forward latestProps for click filtering inside renderer
    rendererApi._latestProps = latestProps.current;

    // Sync initial scene to renderer
    try { if (rendererApi.syncScene) rendererApi.syncScene({ atoms, lattice, layers, activeLayerId, theme }); } catch(e) {}

    // Configure transform controls to match current UI state
    try {
        if (typeof rendererApi.setTransformMode === 'function') {
            rendererApi.setTransformMode(transformMode, editMode);
        }
    } catch (e) {}

    return () => {
        try { rendererApi.dispose(); } catch (e) {}
    };
};

export const syncRendererScene = (rendererRef, atoms, lattice, layers, activeLayerId, theme) => {
    if (rendererRef.current && rendererRef.current.syncScene) {
        try { rendererRef.current.syncScene({ atoms, lattice, layers, activeLayerId, theme }); } catch (e) {}
    }
};