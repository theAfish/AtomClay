import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
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
        transformMode, editMode, theme
    } = useMolecularContext();

    const containerRef = useRef(null);
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
        isInstanced: false
    });

    const latestProps = useRef({ atoms, activeLayerId, theme });
    useEffect(() => {
        latestProps.current = { atoms, activeLayerId, theme };
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

    // Keep a ref to the latest drawGizmo function so the animation loop can call it
    const drawGizmoRef = useRef(drawGizmo);
    useEffect(() => {
        drawGizmoRef.current = drawGizmo;
    }, [drawGizmo]);

    // 初始化 Three.js
    useEffect(() => {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        const scene = new THREE.Scene();
        // Ensure scene uses Z as up
        scene.up.set(0, 0, 1);
        // Use Z as the global "up" axis instead of the default Y-up
        if (THREE.Object3D && THREE.Object3D.DefaultUp && THREE.Object3D.DefaultUp.set) {
            THREE.Object3D.DefaultUp.set(0, 0, 1);
        }
        scene.background = new THREE.Color(COLORS.background.dark);
        scene.add(new THREE.AmbientLight(COLORS.general.white, DEFAULTS.LIGHTING.AMBIENT_INTENSITY));
        const dirLight = new THREE.DirectionalLight(COLORS.general.white, DEFAULTS.LIGHTING.DIRECTIONAL_INTENSITY);
        dirLight.position.set(...DEFAULTS.LIGHTING.DIRECTIONAL_POSITION);
        scene.add(dirLight);

        const camera = new THREE.PerspectiveCamera(DEFAULTS.CAMERA.FOV, width/height, DEFAULTS.CAMERA.NEAR, DEFAULTS.CAMERA.FAR);
        // Make camera use Z as up as well
        camera.up.set(0, 0, 1);
        camera.position.set(...DEFAULTS.CAMERA.POSITION);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(...DEFAULTS.CAMERA.TARGET);

        // Transform Controls for Dragging
        const transformControl = new TransformControls(camera, renderer.domElement);
        transformControl.addEventListener('dragging-changed', (event) => {
            controls.enabled = !event.value; // 拖拽时禁用视角旋转
        });
        scene.add(transformControl);

        threeRef.current = { 
            scene, camera, renderer, controls, transformControl, 
            atomMeshes: new Map(),
            controlAnchor: new THREE.Object3D(),
            dragStartPos: new THREE.Vector3(),
            initialAtomPositions: new Map(),
            isDragging: false,
            atomInstancedMesh: null,
            instanceIdToAtomId: [],
            atomIdToInstanceId: new Map(),
            isInstanced: false
        };

        const handleResize = () => {
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            camera.aspect = w/h;
            camera.updateProjectionMatrix();
            renderer.setSize(w,h);
        };
        window.addEventListener('resize', handleResize);



        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
            try { 
                if (drawGizmoRef.current) drawGizmoRef.current(); 
            } catch (e) {}
        };
        animate();

        // Click Handler (Raycasting)
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        let mouseDownPos = { x: 0, y: 0 };
        const onMouseDownClickCheck = (e) => {
            mouseDownPos = { x: e.clientX, y: e.clientY };
        };
        renderer.domElement.addEventListener('mousedown', onMouseDownClickCheck);
        
        const onClick = (e) => {
            const dist = Math.sqrt((e.clientX - mouseDownPos.x)**2 + (e.clientY - mouseDownPos.y)**2);
            if (dist > DEFAULTS.INTERACTION.CLICK_DISTANCE_THRESHOLD) return;

            // 忽略拖拽结束时的点击
            if (transformControl.dragging || threeRef.current.isDragging) return;
            // Ignore if box selection just happened
            if (threeRef.current.isBoxSelecting) return;

            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            
            raycaster.setFromCamera(mouse, camera);
            
            let intersects = [];
            if (threeRef.current.isInstanced && threeRef.current.atomInstancedMesh) {
                intersects = raycaster.intersectObject(threeRef.current.atomInstancedMesh);
            } else {
                const meshes = Array.from(threeRef.current.atomMeshes.values());
                intersects = raycaster.intersectObjects(meshes);
            }
            
            // Filter intersects to only include atoms in active layer
            const { atoms: currentAtoms, activeLayerId: currentLayerId } = latestProps.current;
            const activeLayerAtomIds = new Set(currentAtoms.filter(a => a.layerId === currentLayerId).map(a => a.id));
            
            const validIntersects = [];
            for (let hit of intersects) {
                let atomId;
                if (threeRef.current.isInstanced) {
                    atomId = threeRef.current.instanceIdToAtomId[hit.instanceId];
                } else {
                    atomId = hit.object.userData.id;
                }
                
                if (activeLayerAtomIds.has(atomId)) {
                    validIntersects.push(atomId);
                }
            }

            if (validIntersects.length > 0) {
                onAtomClick(validIntersects[0], e.ctrlKey || e.metaKey);
            } else {
                onAtomClick(null, e.ctrlKey || e.metaKey); // Deselect or clear
            }
        };
        renderer.domElement.addEventListener('click', onClick);

        return () => {
            window.removeEventListener('resize', handleResize);
            renderer.domElement.removeEventListener('click', onClick);
            renderer.domElement.removeEventListener('mousedown', onMouseDownClickCheck);
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, []); // Run once



    // 响应 TransformControls 拖拽结束，通知 App 更新坐标
    useEffect(() => {
        const { transformControl, controlAnchor, atomMeshes, dragStartPos, initialAtomPositions, controls, atomInstancedMesh, isInstanced, atomIdToInstanceId } = threeRef.current;
        // Ensure we have additional tracking for rotation/scale
        if (!threeRef.current.initialAnchorQuaternion) threeRef.current.initialAnchorQuaternion = new THREE.Quaternion();
        if (!threeRef.current.initialAnchorScale) threeRef.current.initialAnchorScale = new THREE.Vector3(1,1,1);
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
            threeRef.current.scene.background = new THREE.Color(theme === 'dark' ? COLORS.background.dark : COLORS.background.light);
            // Also update fog or other theme related things if needed
        }
    }, [theme]);

    // Sync Scene (Geometry: Atoms, Bonds, Lattice)
    useEffect(() => {
        const { scene, atomMeshes, controlAnchor } = threeRef.current;

        // 1. Clear old objects
        const toRemove = [];
        scene.traverse(c => {
            if(c.userData.type === 'atom' || c.userData.type === 'bond' || c.userData.type === 'box' || c.userData.type === 'atom-instanced') toRemove.push(c);
        });
        toRemove.forEach(c => {
            scene.remove(c);
            if(c.geometry) c.geometry.dispose();
        });
        atomMeshes.clear();
        threeRef.current.atomInstancedMesh = null;
        threeRef.current.instanceIdToAtomId = [];
        threeRef.current.atomIdToInstanceId.clear();
        
        if (!scene.children.includes(controlAnchor)) scene.add(controlAnchor);

        // 2. Draw Lattice
        const hasLattice = Array.isArray(lattice) && lattice.length === 3 && lattice.every(v => Array.isArray(v) && v.length === 3);
        if (hasLattice) {
            const boxGeo = new THREE.BufferGeometry();
            const o=[0,0,0];
            const [a,b,c] = lattice;
            const ab=[a[0]+b[0],a[1]+b[1],a[2]+b[2]], ac=[a[0]+c[0],a[1]+c[1],a[2]+c[2]], bc=[b[0]+c[0],b[1]+c[1],b[2]+c[2]];
            const abc=[ab[0]+c[0],ab[1]+c[1],ab[2]+c[2]];
            const pts = [];
            [[o,a],[o,b],[o,c],[a,ab],[a,ac],[b,ab],[b,bc],[c,ac],[c,bc],[ab,abc],[ac,abc],[bc,abc]].forEach(pair=>{
                pts.push(...pair[0], ...pair[1]);
            });
            boxGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts,3));
            const boxLine = new THREE.LineSegments(boxGeo, new THREE.LineBasicMaterial({color: theme === 'dark' ? COLORS.lattice.dark : COLORS.lattice.light}));
            boxLine.userData.type='box';
            scene.add(boxLine);
        }

        // 3. Draw Atoms
        const isLargeSystem = visibleAtoms.length > DEFAULTS.PERFORMANCE.INSTANCED_MESH_THRESHOLD;
        threeRef.current.isInstanced = isLargeSystem;

        if (isLargeSystem) {
            const sphereGeo = new THREE.SphereGeometry(1, DEFAULTS.VISUALS.SPHERE_SEGMENTS, DEFAULTS.VISUALS.SPHERE_SEGMENTS);
            const mat = new THREE.MeshStandardMaterial({
                roughness: 0.3, metalness: 0.2,
                color: COLORS.general.white
            });
            const instMesh = new THREE.InstancedMesh(sphereGeo, mat, visibleAtoms.length);
            const dummy = new THREE.Object3D();
            
            visibleAtoms.forEach((atom, i) => {
                const prop = getElementProp(atom.element);
                dummy.position.set(atom.x, atom.y, atom.z);
                dummy.scale.setScalar(prop.radius * DEFAULTS.VISUALS.ATOM_SCALE);
                dummy.updateMatrix();
                instMesh.setMatrixAt(i, dummy.matrix);
                instMesh.setColorAt(i, new THREE.Color(prop.color));
                
                threeRef.current.instanceIdToAtomId[i] = atom.id;
                threeRef.current.atomIdToInstanceId.set(atom.id, i);
            });
            
            instMesh.userData = { type: 'atom-instanced' };
            scene.add(instMesh);
            threeRef.current.atomInstancedMesh = instMesh;
        } else {
            const sphereGeo = new THREE.SphereGeometry(1, DEFAULTS.VISUALS.SPHERE_SEGMENTS, DEFAULTS.VISUALS.SPHERE_SEGMENTS);
            visibleAtoms.forEach(atom => {
                const prop = getElementProp(atom.element);
                const mat = new THREE.MeshStandardMaterial({
                    color: prop.color, roughness: 0.3, metalness: 0.2,
                    emissive: COLORS.general.black
                });
                const mesh = new THREE.Mesh(sphereGeo, mat);
                mesh.position.set(atom.x, atom.y, atom.z);
                mesh.scale.setScalar(prop.radius * DEFAULTS.VISUALS.ATOM_SCALE);
                mesh.userData = { type: 'atom', id: atom.id };
                scene.add(mesh);
                atomMeshes.set(atom.id, mesh);
            });
        }

        // 4. Draw Bonds
        if(visibleAtoms.length < 500) {
            const bondMat = new THREE.MeshStandardMaterial({color: COLORS.general.white}); 
            const bondGeo = new THREE.CylinderGeometry(DEFAULTS.VISUALS.BOND_RADIUS, DEFAULTS.VISUALS.BOND_RADIUS, 1, DEFAULTS.VISUALS.BOND_SEGMENTS);
            bondGeo.translate(0,0.5,0); bondGeo.rotateX(Math.PI/2);
            
            const dummy = new THREE.Object3D();
            const bondSegments = []; 

            let latMat = null;
            let invLatMat = null;
            if (hasLattice) {
                const [va, vb, vc] = lattice;
                latMat = [
                    [va[0], vb[0], vc[0]],
                    [va[1], vb[1], vc[1]],
                    [va[2], vb[2], vc[2]]
                ];
                invLatMat = MathUtils.inv3x3(latMat);
            }

            for(let i=0; i<visibleAtoms.length; i++){
                for(let j=i+1; j<visibleAtoms.length; j++){
                    const p1 = [visibleAtoms[i].x, visibleAtoms[i].y, visibleAtoms[i].z];
                    const p2 = [visibleAtoms[j].x, visibleAtoms[j].y, visibleAtoms[j].z];
                    
                    let distVector = [p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]];
                    
                    if (invLatMat && latMat) {
                        const frac = MathUtils.multiplyMatrixVector(invLatMat, distVector);
                        const fracMic = [
                            frac[0] - Math.round(frac[0]),
                            frac[1] - Math.round(frac[1]),
                            frac[2] - Math.round(frac[2])
                        ];
                        distVector = MathUtils.multiplyMatrixVector(latMat, fracMic);
                    }

                    const distSq = distVector[0]**2 + distVector[1]**2 + distVector[2]**2;
                    const r1 = getVdw(visibleAtoms[i].element);
                    const r2 = getVdw(visibleAtoms[j].element);
                    const threshold = (r1 + r2) * DEFAULTS.VISUALS.BOND_THRESHOLD_FACTOR; 

                    if(distSq < threshold**2){
                        const halfVec = [distVector[0]*0.5, distVector[1]*0.5, distVector[2]*0.5];
                        
                        bondSegments.push({
                            start: new THREE.Vector3(...p1),
                            end: new THREE.Vector3(p1[0]+halfVec[0], p1[1]+halfVec[1], p1[2]+halfVec[2]),
                            color: new THREE.Color(getElementProp(visibleAtoms[i].element).color)
                        });

                        bondSegments.push({
                            start: new THREE.Vector3(...p2),
                            end: new THREE.Vector3(p2[0]-halfVec[0], p2[1]-halfVec[1], p2[2]-halfVec[2]),
                            color: new THREE.Color(getElementProp(visibleAtoms[j].element).color)
                        });
                    }
                }
            }

            const instMesh = new THREE.InstancedMesh(bondGeo, bondMat, bondSegments.length);
            bondSegments.forEach((seg, idx) => {
                dummy.position.copy(seg.start);
                dummy.lookAt(seg.end);
                const len = seg.start.distanceTo(seg.end);
                dummy.scale.set(1, 1, len);
                dummy.updateMatrix();
                instMesh.setMatrixAt(idx, dummy.matrix);
                instMesh.setColorAt(idx, seg.color);
            });
            
            if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
            instMesh.userData.type='bond';
            scene.add(instMesh);
        }

    }, [atoms, lattice, layers, theme]);

    // Update Selection Visuals
    useEffect(() => {
        const { atomMeshes, atomInstancedMesh, isInstanced, atomIdToInstanceId } = threeRef.current;
        
        if (isInstanced && atomInstancedMesh) {
            visibleAtoms.forEach((atom) => {
                const idx = atomIdToInstanceId.get(atom.id);
                if (idx !== undefined) {
                    const prop = getElementProp(atom.element);
                    const isSelected = selectedAtomIds.includes(atom.id);
                    const color = new THREE.Color(prop.color);
                    if (isSelected) {
                        color.add(new THREE.Color(COLORS.selection.emissive)); 
                    }
                    atomInstancedMesh.setColorAt(idx, color);
                }
            });
            if (atomInstancedMesh.instanceColor) atomInstancedMesh.instanceColor.needsUpdate = true;
        } else {
            atomMeshes.forEach((mesh, id) => {
                const isSelected = selectedAtomIds.includes(id);
                if (mesh.material.emissive) {
                    mesh.material.emissive.set(isSelected ? COLORS.selection.emissive : COLORS.general.black);
                }
            });
        }
    }, [selectedAtomIds, atoms]);

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
    }, [lattice, atoms, layers]);

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
