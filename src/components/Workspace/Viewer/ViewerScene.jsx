import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { COLORS } from '../../../constants/theme';
import { useMolecularContext } from '../../../context/MolecularContext';
import { useTheme } from '../../../context/ThemeContext';
import { useViewerContext } from './ViewerContext';
import { useGizmo } from '../../../hooks/useGizmo';
import { useLatticeGizmo } from '../../../hooks/useLatticeGizmo';
import { syncRendererScene } from '../../../utils/rendererUtils';
import { updateSelectionVisuals } from '../../../utils/selectionUtils';

const ViewerScene = () => {
    const { 
        atoms, lattice, setLattice, setAtoms, layers, activeLayerId, 
        selectedAtomIds, transformMode, editMode, currentRenderer, renderSettings,
        moveAtomsWithLattice 
    } = useMolecularContext();
    const { theme } = useTheme();
    const { threeRef, rendererRef, containerRef, rendererVersion, drawGizmoRef } = useViewerContext();

    const visibleAtoms = useMemo(() => {
        try {
            const vis = new Set((layers || []).filter(l => l && l.visible).map(l => l.id));
            return (atoms || []).filter(a => !a.layerId || vis.has(a.layerId));
        } catch (e) { return atoms || []; }
    }, [atoms, layers]);

    // Gizmos
    const drawGizmo = useGizmo(containerRef, threeRef, theme, lattice);
    useLatticeGizmo(threeRef, lattice, setLattice, editMode, rendererVersion, moveAtomsWithLattice, setAtoms, atoms);

    // Keep global ref to drawGizmo updated
    useEffect(() => {
        drawGizmoRef.current = drawGizmo;
        if (rendererRef.current && rendererRef.current._drawGizmoRef) {
            rendererRef.current._drawGizmoRef.current = drawGizmo;
        }
    }, [drawGizmo, rendererRef, drawGizmoRef]);

    // Background Color Sync
    useEffect(() => {
        if (threeRef.current.scene) {
            const scene = threeRef.current.scene;
            const targetColor = new THREE.Color(theme === 'dark' ? COLORS.background.dark : COLORS.background.light);
            // Animate scene background color
            const duration = 300; 
            const startTime = performance.now();
            const startColor = scene.background && scene.background.isColor ? scene.background.clone() : new THREE.Color(targetColor.getHex());
            let rafId = null;

            const step = (t) => {
                const elapsed = Math.max(0, t - startTime);
                const v = Math.min(1, elapsed / duration);
                const c = startColor.clone().lerp(targetColor, v);
                scene.background = c;
                if (v < 1) rafId = requestAnimationFrame(step);
            };
            rafId = requestAnimationFrame(step);
            return () => { if (rafId) cancelAnimationFrame(rafId); };
        }
    }, [theme, rendererVersion, threeRef]);

    // Sync Scene Content
    useEffect(() => {
        syncRendererScene(rendererRef, atoms, lattice, layers, activeLayerId, theme, renderSettings);
    }, [atoms, lattice, layers, theme, currentRenderer, renderSettings, rendererRef]);

    // Update Selection Visuals
    useEffect(() => {
        updateSelectionVisuals(rendererRef, threeRef, selectedAtomIds, atoms, currentRenderer, visibleAtoms);
    }, [selectedAtomIds, atoms, currentRenderer, visibleAtoms, rendererRef, threeRef]);

    return null; // Logic only component
};

export default ViewerScene;
