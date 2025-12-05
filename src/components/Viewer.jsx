import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { createThreeRenderer, createCustomRenderer } from '../renderers';
import { getElementProp } from '../constants/elements';
import { getVdw } from '../constants/atomParams';
import { COLORS } from '../constants/theme';
import { DEFAULTS } from '../constants/defaults';
import { MathUtils } from '../utils/math';
import { useMolecularContext } from '../context/MolecularContext';
import { useGizmo } from '../hooks/useGizmo';
import { useBoxSelection } from '../hooks/useBoxSelection';

const Viewer = () => {
    const {
        atoms, lattice, layers, activeLayerId,
        selectedAtomIds, onAtomClick, onAtomsMoveEnd, onBoxSelect,
        transformMode, editMode, theme, currentRenderer
    } = useMolecularContext();

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

    const latestProps = useRef({ atoms, activeLayerId, theme });
    useEffect(() => {
        latestProps.current = { atoms, activeLayerId, theme };
        if (rendererRef.current) rendererRef.current._latestProps = latestProps.current;
    }, [atoms, activeLayerId, theme]);

    const visibleAtoms = useMemo(() => {
        try {
            const vis = new Set((layers || []).filter(l => l && l.visible).map(l => l.id));
            return (atoms || []).filter(a => !a.layerId || vis.has(a.layerId));
        } catch (e) { return atoms || []; }
    }, [atoms, layers]);

    // Custom Hooks
    const drawGizmo = useGizmo(containerRef, threeRef, theme, lattice);
    const selectionBox = useBoxSelection(containerRef, threeRef, atoms, activeLayerId, onBoxSelect);

    // Keep a ref to the latest drawGizmo function so the renderer's animate loop can call it
    const drawGizmoRef = useRef(drawGizmo);
    useEffect(() => {
        drawGizmoRef.current = drawGizmo;
        if (rendererRef.current && rendererRef.current._drawGizmoRef) rendererRef.current._drawGizmoRef.current = drawGizmo;
    }, [drawGizmo]);

    // Initialize renderer (three-based) and wire up callbacks (re-init when `currentRenderer` changes)
    useEffect(() => {
        if (!containerRef.current) return;
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

        // Provide the drawGizmo function to renderer's animate loop
        if (rendererApi._drawGizmoRef) rendererApi._drawGizmoRef.current = drawGizmoRef.current;

        // Forward latestProps for click filtering inside renderer
        rendererApi._latestProps = latestProps.current;

        // Sync initial scene to renderer
        try { if (rendererApi.syncScene) rendererApi.syncScene({ atoms, lattice, layers, activeLayerId, theme }); } catch(e) {}

        return () => {
            try { rendererApi.dispose(); } catch (e) {}
        };
    }, [currentRenderer]); // Re-init when renderer changes


    // 响应 TransformControls 拖拽结束，通知 App 更新坐标
    useEffect(() => {
        const { transformControl, controlAnchor, atomMeshes, dragStartPos, initialAtomPositions, controls, atomInstancedMesh, isInstanced, atomIdToInstanceId } = threeRef.current;
        // Ensure we have additional tracking for rotation/scale
        if (!threeRef.current.initialAnchorQuaternion) threeRef.current.initialAnchorQuaternion = new THREE.Quaternion();
        if (!threeRef.current.initialAtomPositionsRelative) threeRef.current.initialAtomPositionsRelative = new Map();
        
        const onDragChange = (event) => {
            if (event.value) {
                // Drag Start
                threeRef.current.isDragging = true;
                controls.enabled = false;
                dragStartPos.copy(controlAnchor.position);
                threeRef.current.initialAnchorPos = controlAnchor.position.clone();
                threeRef.current.initialAnchorQuaternion.copy(controlAnchor.quaternion);
                threeRef.current.initialAnchorScale.copy(controlAnchor.scale);
                initialAtomPositions.clear();
                threeRef.current.initialAtomPositionsRelative.clear();
                threeRef.current.initialAtomPositionsRelativeLocal = new Map();
                
                const dummy = new THREE.Object3D();

                selectedAtomIds.forEach(id => {
                    let pos = null;
                    if (isInstanced && atomInstancedMesh && atomIdToInstanceId.has(id)) {
                        const idx = atomIdToInstanceId.get(id);
                        atomInstancedMesh.getMatrixAt(idx, dummy.matrix);
                        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                        pos = dummy.position.clone();
                    } else if (atomMeshes.has(id)) {
                        pos = atomMeshes.get(id).position.clone();
                    }

                    if (pos) {
                        initialAtomPositions.set(id, pos);
                        // Store relative position in world space (for translate) and local space (for rotate/scale)
                        const relWorld = pos.clone().sub(controlAnchor.position);
                        threeRef.current.initialAtomPositionsRelative.set(id, relWorld);
                        // Convert to local (relative to initial anchor quaternion)
                        const invQ = threeRef.current.initialAnchorQuaternion.clone().invert();
                        const relLocal = relWorld.clone().applyQuaternion(invQ);
                        threeRef.current.initialAtomPositionsRelativeLocal.set(id, relLocal);
                    }
                });
            } else {
                // Drag End
                controls.enabled = true;
                const delta = new THREE.Vector3().subVectors(controlAnchor.position, dragStartPos);
                
                const moves = [];
                // Compute final positions depending on transform mode
                const mode = (threeRef.current.transformMode) || 'translate';
                selectedAtomIds.forEach(id => {
                    if (initialAtomPositions.has(id)) {
                        const initPos = initialAtomPositions.get(id);
                        let newPos = initPos.clone();
                        if (mode === 'translate') {
                            newPos.add(delta);
                        } else if (mode === 'rotate') {
                            const q1 = controlAnchor.quaternion.clone();
                            const relLocal = threeRef.current.initialAtomPositionsRelativeLocal.get(id).clone();
                            const relNewWorld = relLocal.applyQuaternion(q1);
                            newPos = controlAnchor.position.clone().add(relNewWorld);
                        } else if (mode === 'scale') {
                            const s0 = threeRef.current.initialAnchorScale.clone();
                            const s1 = controlAnchor.scale.clone();
                            const scaleVec = new THREE.Vector3(s1.x / s0.x, s1.y / s0.y, s1.z / s0.z);
                            const relLocal = threeRef.current.initialAtomPositionsRelativeLocal.get(id).clone();
                            const relLocalScaled = new THREE.Vector3(relLocal.x * scaleVec.x, relLocal.y * scaleVec.y, relLocal.z * scaleVec.z);
                            const relNewWorld = relLocalScaled.applyQuaternion(controlAnchor.quaternion);
                            newPos = controlAnchor.position.clone().add(relNewWorld);
                        }
                        moves.push({ id, x: newPos.x, y: newPos.y, z: newPos.z });
                    }
                });
                
                if (moves.length > 0) {
                    onAtomsMoveEnd(moves);
                }
                
                setTimeout(() => {
                    threeRef.current.isDragging = false;
                }, DEFAULTS.INTERACTION.DRAG_DELAY);
            }
        };

        // Real-time update during drag
        const onChange = () => {
            if (transformControl.dragging) {
                const mode = (threeRef.current.transformMode) || 'translate';
                const dummy = new THREE.Object3D();
                
                selectedAtomIds.forEach(id => {
                    let newPos = null;
                    if (initialAtomPositions.has(id)) {
                        if (mode === 'translate') {
                            const delta = new THREE.Vector3().subVectors(controlAnchor.position, dragStartPos);
                            const initPos = initialAtomPositions.get(id);
                            newPos = new THREE.Vector3().addVectors(initPos, delta);
                        } else if (mode === 'rotate') {
                            const q1 = controlAnchor.quaternion.clone();
                            if (threeRef.current.initialAtomPositionsRelativeLocal.has(id)) {
                                const relLocal = threeRef.current.initialAtomPositionsRelativeLocal.get(id).clone();
                                const relNewWorld = relLocal.applyQuaternion(q1);
                                newPos = controlAnchor.position.clone().add(relNewWorld);
                            }
                        } else if (mode === 'scale') {
                            const s0 = threeRef.current.initialAnchorScale.clone();
                            const s1 = controlAnchor.scale.clone();
                            const scaleVec = new THREE.Vector3(s1.x / s0.x, s1.y / s0.y, s1.z / s0.z);
                            if (threeRef.current.initialAtomPositionsRelativeLocal.has(id)) {
                                const relLocal = threeRef.current.initialAtomPositionsRelativeLocal.get(id).clone();
                                const relLocalScaled = new THREE.Vector3(relLocal.x * scaleVec.x, relLocal.y * scaleVec.y, relLocal.z * scaleVec.z);
                                const relNewWorld = relLocalScaled.applyQuaternion(controlAnchor.quaternion);
                                newPos = controlAnchor.position.clone().add(relNewWorld);
                            }
                        }
                    }

                    if (newPos) {
                        if (isInstanced && atomInstancedMesh && atomIdToInstanceId.has(id)) {
                            const idx = atomIdToInstanceId.get(id);
                            atomInstancedMesh.getMatrixAt(idx, dummy.matrix);
                            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                            dummy.position.copy(newPos);
                            dummy.updateMatrix();
                            atomInstancedMesh.setMatrixAt(idx, dummy.matrix);
                        } else if (atomMeshes.has(id)) {
                            atomMeshes.get(id).position.copy(newPos);
                        }
                    }
                });
                
                if (isInstanced && atomInstancedMesh) {
                    atomInstancedMesh.instanceMatrix.needsUpdate = true;
                }
            }
        };

        transformControl.addEventListener('dragging-changed', onDragChange);
        transformControl.addEventListener('change', onChange);
        
        return () => {
            transformControl.removeEventListener('dragging-changed', onDragChange);
            transformControl.removeEventListener('change', onChange);
        };
    }, [onAtomsMoveEnd, selectedAtomIds]); // Re-bind when selection changes

    // Update transform mode
    useEffect(() => {
        const { transformControl } = threeRef.current;
        if (transformControl && transformControl.setMode) {
            transformControl.setMode(transformMode || 'translate');
            threeRef.current.transformMode = transformMode;
            if (editMode !== 'SELECT') {
                transformControl.enabled = false;
                try { transformControl.detach(); } catch (e) {}
            } else {
                transformControl.enabled = true;
            }

            // Set transform space to world for translate/scale and local for rotate
            try {
                if (transformMode === 'rotate') transformControl.setSpace('local');
                else transformControl.setSpace('world');
            } catch (e) {}
        }
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
        if (rendererRef.current && rendererRef.current.syncScene) {
            try { rendererRef.current.syncScene({ atoms, lattice, layers, activeLayerId, theme }); } catch (e) {}
        }
    }, [atoms, lattice, layers, theme, currentRenderer]);

    // Update Selection Visuals — delegate to renderer API if available
    useEffect(() => {
        if (rendererRef.current && rendererRef.current.updateSelection) {
            try { rendererRef.current.updateSelection(selectedAtomIds, atoms); } catch (e) {}
        } else {
            const { atomMeshes, atomInstancedMesh, isInstanced, atomIdToInstanceId } = threeRef.current;
            if (isInstanced && atomInstancedMesh) {
                visibleAtoms.forEach((atom) => {
                    const idx = atomIdToInstanceId.get(atom.id);
                    if (idx !== undefined) {
                        const prop = getElementProp(atom.element);
                        const isSelected = selectedAtomIds.includes(atom.id);
                        const color = new THREE.Color(prop.color);
                        if (isSelected) color.add(new THREE.Color(COLORS.selection.emissive));
                        atomInstancedMesh.setColorAt(idx, color);
                    }
                });
                if (atomInstancedMesh.instanceColor) atomInstancedMesh.instanceColor.needsUpdate = true;
            } else {
                atomMeshes.forEach((mesh, id) => {
                    const isSelected = selectedAtomIds.includes(id);
                    if (mesh.material.emissive) mesh.material.emissive.set(isSelected ? COLORS.selection.emissive : COLORS.general.black);
                });
            }
        }
    }, [selectedAtomIds, atoms, currentRenderer]);

    // 处理选中逻辑和 TransformControls 绑定
    useEffect(() => {
        const { transformControl, atomMeshes, scene, controlAnchor } = threeRef.current;
        
        if (selectedAtomIds.length > 0 && editMode === 'SELECT') {
            // Calculate centroid
            const center = new THREE.Vector3();
            let count = 0;
            selectedAtomIds.forEach(id => {
                if (atomMeshes.has(id)) {
                    center.add(atomMeshes.get(id).position);
                    count++;
                }
            });
            
            if (count > 0) {
                center.divideScalar(count);
                controlAnchor.position.copy(center);
                controlAnchor.quaternion.identity();
                controlAnchor.scale.set(1, 1, 1);
                controlAnchor.updateMatrixWorld();
                
                transformControl.attach(controlAnchor);
                scene.add(transformControl);
            }
        } else {
            transformControl.detach();
        }
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

    // Keep lattice available to the render loop / gizmo
    useEffect(() => {
        threeRef.current.lattice = lattice;
    }, [lattice]);

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
