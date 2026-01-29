import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { COLORS } from '../constants/theme';
import { DEFAULTS } from '../constants/defaults';
import { MathUtils } from '../utils/math';
import { useMolecularContext } from '../context/MolecularContext';
import { useTheme } from '../context/ThemeContext';
import { useGizmo } from '../hooks/useGizmo';
import { useLatticeGizmo } from '../hooks/useLatticeGizmo';
import { useBoxSelection } from '../hooks/useBoxSelection';
import { handleDraggingChanged, handleTransformChange } from './operations/transformHandlers';
import { updateControlAttachment } from './operations/transformAttachment';
import { applyTransformMode } from './operations/transformMode';
import { initializeRenderer, syncRendererScene } from '../utils/rendererUtils';
import { updateSelectionVisuals } from '../utils/selectionUtils';

const Viewer = () => {
    const {
        atoms, lattice, setLattice, setAtoms, layers, activeLayerId,
        selectedAtomIds, onAtomClick, onAtomsMoveEnd, onBoxSelect,
        transformMode, editMode, currentRenderer, isChatOpen, moveAtomsWithLattice,
        renderSettings
    } = useMolecularContext();
    const { theme } = useTheme();

    const [rendererVersion, setRendererVersion] = useState(0);

    const containerRef = useRef(null);
    const rendererRef = useRef(null);
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
    });

    const latestProps = useRef({ atoms, activeLayerId, theme, renderSettings });
    useEffect(() => {
        latestProps.current = { atoms, activeLayerId, theme, renderSettings };
        if (rendererRef.current) rendererRef.current._latestProps = latestProps.current;
    }, [atoms, activeLayerId, theme, renderSettings]);

    const visibleAtoms = useMemo(() => {
        try {
            const vis = new Set((layers || []).filter(l => l && l.visible).map(l => l.id));
            return (atoms || []).filter(a => !a.layerId || vis.has(a.layerId));
        } catch (e) { return atoms || []; }
    }, [atoms, layers]);

    // Custom Hooks
    const drawGizmo = useGizmo(containerRef, threeRef, theme, lattice);
    useLatticeGizmo(threeRef, lattice, setLattice, editMode, rendererVersion, moveAtomsWithLattice, setAtoms, atoms);
    const selectionBox = useBoxSelection(containerRef, threeRef, atoms, activeLayerId, onBoxSelect);

    // Keep a ref to the latest drawGizmo function so the renderer's animate loop can call it
    const drawGizmoRef = useRef(drawGizmo);
    useEffect(() => {
        drawGizmoRef.current = drawGizmo;
        if (rendererRef.current && rendererRef.current._drawGizmoRef) rendererRef.current._drawGizmoRef.current = drawGizmo;
    }, [drawGizmo]);

    // Initialize renderer (three-based) and wire up callbacks (re-init when `currentRenderer` changes)
    useEffect(() => {
        const cleanup = initializeRenderer(containerRef, currentRenderer, onAtomClick, onAtomsMoveEnd, onBoxSelect, theme, lattice, renderSettings, drawGizmoRef, latestProps, atoms, layers, activeLayerId, rendererRef, threeRef, transformMode, editMode);
        setRendererVersion(v => v + 1);
        return cleanup;
    }, [currentRenderer]); // Re-init when renderer changes


    // Wire TransformControls events to extracted handlers
    useEffect(() => {
        const { transformControl, controls } = threeRef.current;
        // Ensure we have additional tracking for rotation/scale
        if (!threeRef.current.initialAnchorQuaternion) threeRef.current.initialAnchorQuaternion = new THREE.Quaternion();
        if (!threeRef.current.initialAnchorScale) threeRef.current.initialAnchorScale = new THREE.Vector3(1,1,1);
        if (!threeRef.current.initialAnchorPos) threeRef.current.initialAnchorPos = new THREE.Vector3();
        if (!threeRef.current.initialAtomPositionsRelative) threeRef.current.initialAtomPositionsRelative = new Map();

        if (!transformControl) return;

        const onDragChange = (event) => handleDraggingChanged(event, { threeRef, controls, onAtomsMoveEnd, selectedAtomIds });
        const onChange = () => handleTransformChange({ threeRef, selectedAtomIds });

        transformControl.addEventListener('dragging-changed', onDragChange);
        transformControl.addEventListener('change', onChange);

        return () => {
            try { transformControl.removeEventListener('dragging-changed', onDragChange); } catch (e) {}
            try { transformControl.removeEventListener('change', onChange); } catch (e) {}
        };
    }, [onAtomsMoveEnd, selectedAtomIds]); // Re-bind when selection changes

    // Update transform mode (delegated to helper)
    useEffect(() => {
        applyTransformMode({ threeRef, transformMode, editMode });
    }, [transformMode, editMode]);


    // Update background color based on theme
    useEffect(() => {
        if (threeRef.current.scene) {
            const scene = threeRef.current.scene;
            const targetColor = new THREE.Color(theme === 'dark' ? COLORS.background.dark : COLORS.background.light);
            // Animate scene background color over ~300ms for a smooth transition
            const duration = 300; // ms
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

            return () => {
                if (rafId) cancelAnimationFrame(rafId);
            };
        }
    }, [theme]);

    // Sync scene via renderer API (use renderer-specific logic instead of manual creation)
    useEffect(() => {
        syncRendererScene(rendererRef, atoms, lattice, layers, activeLayerId, theme, renderSettings);
    }, [atoms, lattice, layers, theme, currentRenderer, renderSettings]);

    // Update Selection Visuals — delegate to renderer API if available
    useEffect(() => {
        updateSelectionVisuals(rendererRef, threeRef, selectedAtomIds, atoms, currentRenderer, visibleAtoms);
    }, [selectedAtomIds, atoms, currentRenderer]);

    // Handle selection centroid and TransformControls attachment
    useEffect(() => {
        updateControlAttachment({ threeRef, selectedAtomIds, editMode, atoms });
    }, [selectedAtomIds, atoms]); // Re-attach if atoms rebuild

    // Update Camera Target
    useEffect(() => {
        const { controls } = threeRef.current;
        if (!controls) return; // controls may be undefined during renderer init
        const hasLattice = Array.isArray(lattice) && lattice.length === 3 && lattice.every(v => Array.isArray(v) && v.length === 3);
        if (hasLattice) {
            const cx = (lattice[0][0]+lattice[1][0]+lattice[2][0])*0.5;
            const cy = (lattice[0][1]+lattice[1][1]+lattice[2][1])*0.5;
            const cz = (lattice[0][2]+lattice[1][2]+lattice[2][2])*0.5;
            controls.target.set(cx,cy,cz);
        } else {
            // Fallback to visible atoms centroid / bbox center
            if (visibleAtoms && visibleAtoms.length > 0) {
                let minX = Infinity, minY = Infinity, minZ = Infinity;
                let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
                visibleAtoms.forEach(a => {
                    minX = Math.min(minX, a.x); minY = Math.min(minY, a.y); minZ = Math.min(minZ, a.z);
                    maxX = Math.max(maxX, a.x); maxY = Math.max(maxY, a.y); maxZ = Math.max(maxZ, a.z);
                });
                const cx = (minX + maxX) / 2;
                const cy = (minY + maxY) / 2;
                const cz = (minZ + maxZ) / 2;
                controls.target.set(cx, cy, cz);
            }
        }
        controls.update();
    }, [lattice, atoms, layers, currentRenderer]);

    // Handle container resize (e.g., when chat panel opens/closes)
    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver(() => {
            if (rendererRef.current && rendererRef.current.resize) {
                rendererRef.current.resize();
            }
        });
        resizeObserver.observe(containerRef.current);

        // Also react to window resize and devicePixelRatio changes (zoom)
        const onWinResize = () => {
            if (rendererRef.current && rendererRef.current.resize) rendererRef.current.resize();
        };
        window.addEventListener('resize', onWinResize);

        // Some browsers don't fire resize on zoom/zoom-level changes reliably.
        // Poll devicePixelRatio at a low frequency and trigger resize when it changes.
        let lastDPR = window.devicePixelRatio || 1;
        const dprInterval = setInterval(() => {
            const dpr = window.devicePixelRatio || 1;
            if (dpr !== lastDPR) {
                lastDPR = dpr;
                if (rendererRef.current && rendererRef.current.resize) rendererRef.current.resize();
            }
        }, 300);

        // Observe body as well to catch layout changes that may not directly resize the viewer container
        try {
            resizeObserver.observe(document.body);
        } catch (e) {}

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', onWinResize);
            clearInterval(dprInterval);
        };
    }, []);

    return (
        <div ref={containerRef} className="w-full h-full relative">
            {selectionBox && (
                <div 
                    style={{
                        position: 'absolute',
                        left: selectionBox.left,
                        top: selectionBox.top,
                        width: selectionBox.width,
                        height: selectionBox.height,
                        border: `1px solid ${COLORS.selection.boxBorder}`,
                        backgroundColor: COLORS.selection.boxBackground,
                        pointerEvents: 'none',
                        zIndex: 10
                    }}
                />
            )}
        </div>
    );
};

export default Viewer;
