import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { MathUtils } from '../utils/math';

export const useLatticeGizmo = (threeRef, lattice, setLattice, editMode, rendererVersion, moveAtomsWithLattice = false, setAtoms = null, atoms = []) => {
    const gizmoRef = useRef(new THREE.Group());
    const [isDragging, setIsDragging] = useState(false);
    const [hoveredHandle, setHoveredHandle] = useState(null);
    
    // Refs for interaction state
    const stateRef = useRef({
        isDragging: false,
        activeHandle: null,
        startMouse: new THREE.Vector2(),
        startLattice: null, // Copy of lattice matrix at start of drag
        startAtomFracs: [], // Cached fractional coordinates of atoms at drag start
        raycaster: new THREE.Raycaster(),
        proxies: [], // Array of meshes to raycast against
        dragMode: null, // 'PARALLEL' or 'ORTHOGONAL' for edges
    });

    const latticeRef = useRef(lattice);
    useEffect(() => { latticeRef.current = lattice; }, [lattice]);

    // Update Gizmo Visuals
    useEffect(() => {
        // Ensure gizmo is in the current scene
        if (threeRef.current && threeRef.current.scene) {
            const scene = threeRef.current.scene;
            if (gizmoRef.current.parent !== scene) {
                scene.add(gizmoRef.current);
            }
        }
        
        const group = gizmoRef.current;
        // Clear previous children
        while(group.children.length > 0){ 
            const child = group.children[0];
            group.remove(child);
            if(child.geometry) child.geometry.dispose();
            if(child.material) child.material.dispose();
        }
        stateRef.current.proxies = [];

        if (editMode !== 'LATTICE' || !lattice) {
            group.visible = false;
            return;
        }
        group.visible = true;

        // Create Lattice Box Visuals
        // Lattice vectors
        const va = new THREE.Vector3(...lattice[0]);
        const vb = new THREE.Vector3(...lattice[1]);
        const vc = new THREE.Vector3(...lattice[2]);
        const origin = new THREE.Vector3(0,0,0);

        // 8 Corners
        const corners = [
            origin.clone(), // 0
            va.clone(), // 1 (Tip of A)
            vb.clone(), // 2 (Tip of B)
            vc.clone(), // 3 (Tip of C)
            va.clone().add(vb), // 4
            va.clone().add(vc), // 5
            vb.clone().add(vc), // 6
            va.clone().add(vb).add(vc) // 7
        ];

        // Draw Edges (Wireframe)
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            corners[0], corners[1], corners[1], corners[4], corners[4], corners[2], corners[2], corners[0], // Bottom face
            corners[3], corners[5], corners[5], corners[7], corners[7], corners[6], corners[6], corners[3], // Top face
            corners[0], corners[3], corners[1], corners[5], corners[4], corners[7], corners[2], corners[6]  // Vertical edges
        ]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xffff00, depthTest: false, transparent: true, opacity: 0.8 });
        const lines = new THREE.LineSegments(lineGeo, lineMat);
        group.add(lines);

        // --- HANDLES ---
        const handleGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const handleMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5, depthTest: false });
        
        // 1. CORNER HANDLES (Tips of A, B, C) - Free Move
        // Enable all corners for uniform scaling logic
        corners.forEach((pos, idx) => {
            if (idx === 0) return; // Skip origin
            const handle = new THREE.Mesh(handleGeo, handleMat.clone());
            handle.position.copy(pos);
            handle.userData = { type: 'CORNER', index: idx, originalPos: pos.clone() };
            group.add(handle);
            stateRef.current.proxies.push(handle);
        });

        // 2. FACE HANDLES (Centers of faces "at" A, B, C) - Axial Scale
        // Face A (Right): Center of face spanned by B and C, offset by A.
        // Center = A + 0.5(B + C)
        const faceCenters = [
            { pos: va.clone().add(vb.clone().add(vc).multiplyScalar(0.5)), vecIndex: 0, label: 'Face A' },
            { pos: vb.clone().add(va.clone().add(vc).multiplyScalar(0.5)), vecIndex: 1, label: 'Face B' },
            { pos: vc.clone().add(va.clone().add(vb).multiplyScalar(0.5)), vecIndex: 2, label: 'Face C' }
        ];

        const faceHandleGeo = new THREE.PlaneGeometry(1, 1);
        const faceHandleMat = new THREE.MeshBasicMaterial({ color: 0x0000ff, side: THREE.DoubleSide, transparent: true, opacity: 0.3, depthTest: false });

        faceCenters.forEach((fc, i) => {
            const handle = new THREE.Mesh(faceHandleGeo, faceHandleMat.clone());
            handle.position.copy(fc.pos);
            // Orient face handle to be perpendicular to the vector?
            // Or just billboard? Let's align with the face plane.
            // Face A is spanned by B and C. Normal is B x C.
            const normal = new THREE.Vector3();
            if (i === 0) normal.crossVectors(vb, vc).normalize();
            if (i === 1) normal.crossVectors(va, vc).normalize(); // Note: order matters for direction but DoubleSide handles it
            if (i === 2) normal.crossVectors(va, vb).normalize();
            
            handle.lookAt(fc.pos.clone().add(normal));
            
            handle.userData = { type: 'FACE', index: fc.vecIndex, originalPos: fc.pos.clone(), normal: normal };
            group.add(handle);
            stateRef.current.proxies.push(handle);
        });

        // 3. EDGE HANDLES (Midpoints of edges parallel to A, B, C) - Shear
        // Edge A (at C): Midpoint of segment from C to C+A. Center = C + 0.5A.
        // This edge is "parallel to A". Dragging it moves C? No, dragging it moves the "C-offset" of the A-vector?
        // Actually, dragging the edge "A at C" usually means shearing C in the direction of A.
        // Let's implement visual handles for now.
        const edgeCenters = [
            // Edges parallel to A
            { pos: vc.clone().add(va.clone().multiplyScalar(0.5)), vecIndex: 2, shearAxisIndex: 0, label: 'Edge A at C' }, // Modifies C (shear along A)
            { pos: vb.clone().add(va.clone().multiplyScalar(0.5)), vecIndex: 1, shearAxisIndex: 0, label: 'Edge A at B' }, // Modifies B (shear along A)
            
            // Edges parallel to B
            { pos: vc.clone().add(vb.clone().multiplyScalar(0.5)), vecIndex: 2, shearAxisIndex: 1, label: 'Edge B at C' }, // Modifies C (shear along B)
            { pos: va.clone().add(vb.clone().multiplyScalar(0.5)), vecIndex: 0, shearAxisIndex: 1, label: 'Edge B at A' }, // Modifies A (shear along B)

            // Edges parallel to C
            { pos: va.clone().add(vc.clone().multiplyScalar(0.5)), vecIndex: 0, shearAxisIndex: 2, label: 'Edge C at A' }, // Modifies A (shear along C)
            { pos: vb.clone().add(vc.clone().multiplyScalar(0.5)), vecIndex: 1, shearAxisIndex: 2, label: 'Edge C at B' }, // Modifies B (shear along C)
        ];

        const edgeHandleGeo = new THREE.CylinderGeometry(0.1, 0.1, 1);
        const edgeHandleMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5, depthTest: false });

        edgeCenters.forEach((ec) => {
            const handle = new THREE.Mesh(edgeHandleGeo, edgeHandleMat.clone());
            handle.position.copy(ec.pos);
            // Align cylinder with the shear axis
            // If shearAxisIndex is 0 (A), align with A.
            const axisVec = [va, vb, vc][ec.shearAxisIndex].clone().normalize();
            // Cylinder default is Y axis. Quaternion from Y to axisVec.
            handle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axisVec);
            
            handle.userData = { type: 'EDGE', index: ec.vecIndex, shearAxisIndex: ec.shearAxisIndex, originalPos: ec.pos.clone() };
            group.add(handle);
            stateRef.current.proxies.push(handle);
        });

    }, [lattice, editMode, threeRef, rendererVersion]);

    // Interaction Logic
    useEffect(() => {
        if (!threeRef.current || !threeRef.current.renderer) return;
        const canvas = threeRef.current.renderer.domElement;

        const onPointerDown = (e) => {
            if (editMode !== 'LATTICE') return;
            
            const rect = canvas.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            
            stateRef.current.raycaster.setFromCamera({x, y}, threeRef.current.camera);
            const intersects = stateRef.current.raycaster.intersectObjects(stateRef.current.proxies);

            if (intersects.length > 0) {
                e.preventDefault();
                e.stopPropagation(); // Prevent other controls
                
                const handle = intersects[0].object;
                stateRef.current.isDragging = true;
                stateRef.current.activeHandle = handle;
                stateRef.current.startMouse.set(x, y);
                stateRef.current.startLattice = JSON.parse(JSON.stringify(latticeRef.current)); // Deep copy
                stateRef.current.dragMode = null; // Reset drag mode
                stateRef.current.startAtomFracs = [];

                // Cache fractional coordinates of atoms at drag start (so updates do not compound)
                if (moveAtomsWithLattice && typeof setAtoms === 'function' && Array.isArray(atoms)) {
                    try {
                        const invOld = MathUtils.inv3x3(stateRef.current.startLattice);
                        const invOldT = invOld ? MathUtils.transpose3x3(invOld) : null;
                        if (invOldT) {
                            stateRef.current.startAtomFracs = atoms.map(a => ({ id: a.id, f: MathUtils.multiplyMatrixVector(invOldT, [a.x, a.y, a.z]) }));
                        }
                    } catch (e) {
                        stateRef.current.startAtomFracs = [];
                    }
                }

                // Save history state before starting drag
                // We re-set the current lattice but with skipHistory=false to trigger a save
                setLattice(latticeRef.current, null, false);

                // Lock controls
                if (threeRef.current.controls) threeRef.current.controls.enabled = false;
                
                setIsDragging(true);
            }
        };

        const onPointerMove = (e) => {
            if (editMode !== 'LATTICE') return;

            const rect = canvas.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            if (stateRef.current.isDragging) {
                const handle = stateRef.current.activeHandle;
                const type = handle.userData.type;
                
                // Raycast from camera to a plane at the handle's original position
                stateRef.current.raycaster.setFromCamera({x, y}, threeRef.current.camera);
                const ray = stateRef.current.raycaster.ray;
                
                // Plane facing camera
                const planeNormal = threeRef.current.camera.getWorldDirection(new THREE.Vector3()).negate();
                const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, handle.userData.originalPos);
                const target = new THREE.Vector3();
                
                if (ray.intersectPlane(plane, target)) {
                    const startLat = stateRef.current.startLattice;
                    const newLattice = startLat.map(row => [...row]);

                    if (type === 'CORNER') {
                        // CONSTRAINED MOVE: Move along the diagonal line (Origin -> Handle)
                        // This scales the vectors contributing to this corner uniformly.
                        const idx = handle.userData.index;
                        const originalPos = handle.userData.originalPos;
                        const diagonalDir = originalPos.clone().normalize();
                        
                        if (diagonalDir.lengthSq() > 0.0001) {
                            const projectionLength = target.dot(diagonalDir);
                            const originalLength = originalPos.length();
                            
                            if (projectionLength > 0.1 && originalLength > 0.0001) {
                                const scaleFactor = projectionLength / originalLength;
                                
                                // Apply scale to all vectors involved in this corner
                                // Corner 1 (A): Scale A
                                // Corner 4 (A+B): Scale A and B
                                // Corner 7 (A+B+C): Scale A, B, C
                                
                                // Determine which vectors contribute to this corner index
                                // Index is bitmask: 1=A, 2=B, 4=C? No, corners array order is:
                                // 0:000, 1:A, 2:B, 3:C, 4:A+B, 5:A+C, 6:B+C, 7:A+B+C
                                // Let's map index to vector indices
                                const contributingVectors = [];
                                if ([1, 4, 5, 7].includes(idx)) contributingVectors.push(0); // A
                                if ([2, 4, 6, 7].includes(idx)) contributingVectors.push(1); // B
                                if ([3, 5, 6, 7].includes(idx)) contributingVectors.push(2); // C
                                
                                contributingVectors.forEach(vIdx => {
                                    const originalVec = new THREE.Vector3(...startLat[vIdx]);
                                    const newVec = originalVec.multiplyScalar(scaleFactor);
                                    newLattice[vIdx] = [newVec.x, newVec.y, newVec.z];
                                });
                            }
                        }
                    } 
                    else if (type === 'FACE') {
                        // AXIAL SCALE: Project target onto the vector line
                        const vecIndex = handle.userData.index;
                        const axis = new THREE.Vector3(...startLat[vecIndex]);
                        const axisDir = axis.clone().normalize();
                        
                        if (axisDir.lengthSq() > 0.0001) {
                            const projectionLength = target.dot(axisDir);
                            if (projectionLength > 0.1) {
                                const newVector = axisDir.multiplyScalar(projectionLength);
                                newLattice[vecIndex] = [newVector.x, newVector.y, newVector.z];
                            }
                        }
                    }
                    else if (type === 'EDGE') {
                        // DUAL MODE: Shear (Parallel) or Scale (Orthogonal)
                        // Determine mode on first significant move if not set
                        const vecIndex = handle.userData.index; // The vector perpendicular to the edge (that defines the face)
                        const shearAxisIndex = handle.userData.shearAxisIndex; // The vector parallel to the edge
                        
                        const parallelVec = new THREE.Vector3(...startLat[shearAxisIndex]);
                        const orthogonalVec = new THREE.Vector3(...startLat[vecIndex]);
                        
                        const delta = target.clone().sub(handle.userData.originalPos);
                        
                        if (!stateRef.current.dragMode) {
                            // Determine mode based on projection of delta
                            const projParallel = Math.abs(delta.dot(parallelVec.clone().normalize()));
                            const projOrthogonal = Math.abs(delta.dot(orthogonalVec.clone().normalize()));
                            
                            // Threshold to lock mode
                            if (delta.length() > 0.1) {
                                if (projParallel > projOrthogonal) {
                                    stateRef.current.dragMode = 'PARALLEL';
                                } else {
                                    stateRef.current.dragMode = 'ORTHOGONAL';
                                }
                            }
                        }
                        
                        if (stateRef.current.dragMode === 'PARALLEL') {
                            // SHEAR: Move vector (vecIndex) along shear axis (shearAxisIndex)
                            // Project delta onto parallel vector
                            const axisDir = parallelVec.clone().normalize();
                            const shearAmount = delta.dot(axisDir);
                            const shearVec = axisDir.multiplyScalar(shearAmount);
                            
                            const originalVec = new THREE.Vector3(...startLat[vecIndex]);
                            const newVec = originalVec.add(shearVec);
                            newLattice[vecIndex] = [newVec.x, newVec.y, newVec.z];
                        } 
                        else if (stateRef.current.dragMode === 'ORTHOGONAL') {
                            // SCALE: Scale vector (vecIndex) along itself
                            // Project delta onto orthogonal vector
                            const axisDir = orthogonalVec.clone().normalize();
                            const scaleAmount = delta.dot(axisDir);
                            
                            // New length = Original Length + Scale Amount
                            // Or rather, new vector tip = old tip + projected delta
                            const originalVec = new THREE.Vector3(...startLat[vecIndex]);
                            // We are moving the edge, which is at the END of vecIndex.
                            // So the movement of the edge directly maps to the change in vecIndex.
                            const newVec = originalVec.add(axisDir.multiplyScalar(scaleAmount));
                            
                            // Prevent inversion/zero
                            if (newVec.dot(axisDir) > 0.1) {
                                newLattice[vecIndex] = [newVec.x, newVec.y, newVec.z];
                            }
                        }
                    }

                    setLattice(newLattice, null, true);

                    // If user wants atoms to move with lattice, update atom positions preserving fractional coords
                    if (moveAtomsWithLattice && typeof setAtoms === 'function' && Array.isArray(stateRef.current.startAtomFracs) && stateRef.current.startAtomFracs.length > 0) {
                        try {
                            const newLatT = MathUtils.transpose3x3(newLattice);
                            // Build a map for fast lookup
                            const fracMap = new Map(stateRef.current.startAtomFracs.map(f => [f.id, f.f]));
                            setAtoms(prev => prev.map(a => {
                                const f = fracMap.get(a.id);
                                if (!f) return a;
                                const [cx, cy, cz] = MathUtils.multiplyMatrixVector(newLatT, f);
                                return { ...a, x: cx, y: cy, z: cz };
                            }));
                        } catch (e) {
                            // ignore transform errors
                        }
                    }
                }
                
            } else {
                // Handle Hover
                stateRef.current.raycaster.setFromCamera({x, y}, threeRef.current.camera);
                const intersects = stateRef.current.raycaster.intersectObjects(stateRef.current.proxies);
                
                if (intersects.length > 0) {
                    const handle = intersects[0].object;
                    if (hoveredHandle !== handle) {
                        setHoveredHandle(handle);
                        handle.material.color.set(0xffff00); // Highlight yellow
                        canvas.style.cursor = 'pointer';
                    }
                } else {
                    if (hoveredHandle) {
                        // Restore original color
                        const type = hoveredHandle.userData.type;
                        if (type === 'CORNER') hoveredHandle.material.color.set(0xff0000);
                        else if (type === 'FACE') hoveredHandle.material.color.set(0x0000ff);
                        else if (type === 'EDGE') hoveredHandle.material.color.set(0x00ffff);
                        
                        setHoveredHandle(null);
                        canvas.style.cursor = 'default';
                    }
                }
            }
        };

        const onPointerUp = (e) => {
            if (stateRef.current.isDragging) {
                stateRef.current.isDragging = false;
                stateRef.current.activeHandle = null;
                
                // Unlock controls
                if (threeRef.current.controls) threeRef.current.controls.enabled = true;
                
                setIsDragging(false);
                // Finalize: commit lattice change to history (ensure latest lattice saved)
                try { setLattice(latticeRef.current, null, false); } catch (e) {}            }
        };

        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointerleave', onPointerUp);

        return () => {
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointerleave', onPointerUp);
        };
    }, [editMode, threeRef, setLattice, hoveredHandle, rendererVersion]); // Dependencies need to be managed carefully

    return null;
};
