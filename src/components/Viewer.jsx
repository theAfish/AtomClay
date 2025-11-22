import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { getElementProp } from '../constants/elements';
import { getVdw } from '../constants/atomParams';
import { MathUtils } from '../utils/math';

const Viewer = ({ atoms, lattice, layers = [], activeLayerId, selectedAtomIds, onAtomClick, onAtomsMoveEnd, onBoxSelect }) => {
    const containerRef = useRef(null);
    const [selectionBox, setSelectionBox] = useState(null);
    const threeRef = useRef({ 
        scene: null, camera: null, renderer: null, 
        controls: null, transformControl: null,
        atomMeshes: new Map(), // Map<atomId, Mesh>
        controlAnchor: new THREE.Object3D(), // Anchor for multi-selection
        dragStartPos: new THREE.Vector3(),
        initialAtomPositions: new Map() // Map<atomId, {x,y,z}>
    });

    const latestProps = useRef({ atoms, activeLayerId });
    useEffect(() => {
        latestProps.current = { atoms, activeLayerId };
    }, [atoms, activeLayerId]);

    const visibleAtoms = useMemo(() => {
        try {
            const vis = new Set((layers || []).filter(l => l && l.visible).map(l => l.id));
            return (atoms || []).filter(a => !a.layerId || vis.has(a.layerId));
        } catch (e) { return atoms || []; }
    }, [atoms, layers]);

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
        scene.background = new THREE.Color(0x0f172a);
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(10, 10, 10);
        scene.add(dirLight);

        const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 1000);
        // Make camera use Z as up as well
        camera.up.set(0, 0, 1);
        camera.position.set(25, 30, 20);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(5, 5, 5);

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
            isDragging: false
        };

        const handleResize = () => {
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            camera.aspect = w/h;
            camera.updateProjectionMatrix();
            renderer.setSize(w,h);
        };
        window.addEventListener('resize', handleResize);

        // Gizmo canvas (bottom-left overlay)
        const gizmoSize = 120;
        const gizmoCanvas = document.createElement('canvas');
        gizmoCanvas.style.position = 'absolute';
        gizmoCanvas.style.left = '10px';
        gizmoCanvas.style.bottom = '10px';
        gizmoCanvas.style.width = gizmoSize + 'px';
        gizmoCanvas.style.height = gizmoSize + 'px';
        gizmoCanvas.style.pointerEvents = 'none';
        gizmoCanvas.style.zIndex = 20;
        const dpr = window.devicePixelRatio || 1;
        gizmoCanvas.width = Math.round(gizmoSize * dpr);
        gizmoCanvas.height = Math.round(gizmoSize * dpr);
        gizmoCanvas.style.background = 'transparent';
        const gizmoCtx = gizmoCanvas.getContext('2d');
        containerRef.current.appendChild(gizmoCanvas);

        threeRef.current.gizmoCanvas = gizmoCanvas;
        threeRef.current.gizmoCtx = gizmoCtx;

        const drawGizmo = () => {
            const ctx = threeRef.current.gizmoCtx;
            const canvas = threeRef.current.gizmoCanvas;
            if (!ctx || !canvas) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.scale(dpr, dpr);

            const w = gizmoSize, h = gizmoSize;
            const cx = w / 2, cy = h / 2;
            // 将半径稍微调小一点，留出文字标签的空间
            const radius = Math.min(w, h) * 0.32; 

            // 1. 绘制背景球体 (保持不变)
            ctx.beginPath();
            ctx.fillStyle = 'rgba(15,23,42,0.6)';
            ctx.strokeStyle = 'rgba(148,163,184,0.15)';
            ctx.lineWidth = 1;
            ctx.arc(cx, cy, Math.min(w, h) / 2 - 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            const latticeLocal = threeRef.current.lattice;
            const cameraLocal = threeRef.current.camera;
            if (!latticeLocal || !Array.isArray(latticeLocal) || latticeLocal.length !== 3 || !cameraLocal) {
                ctx.restore();
                return;
            }

            // 2. 准备数据
            // 这里的关键是先 Normalize 向量，保证它们是标准的方向向量
            // 如果你希望 Gizmo 反映 lattice 的真实长短比例，可以去掉 .normalize()
            const axesData = [
                { vec: new THREE.Vector3(...latticeLocal[0]).normalize(), color: '#ef4444', label: 'a' },
                { vec: new THREE.Vector3(...latticeLocal[1]).normalize(), color: '#10b981', label: 'b' },
                { vec: new THREE.Vector3(...latticeLocal[2]).normalize(), color: '#3b82f6', label: 'c' }
            ];

            const rotMat = new THREE.Matrix3().setFromMatrix4(cameraLocal.matrixWorldInverse);
            
            ctx.lineWidth = 2;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '12px sans-serif';

            // 3. 计算投影并排序
            const projectedAxes = axesData.map(ax => {
                const v = ax.vec.clone().applyMatrix3(rotMat);
                // v.x 是屏幕右方向，v.y 是屏幕上方向，v.z 是深度（在 Camera Space 中，负数通常朝前，但在 applyMatrix3 后要看具体坐标系）
                // 我们直接用 v.x 和 v.y 作为投影长度，因为 v 已经是单位向量了
                // v.x^2 + v.y^2 的长度自然就是透视短缩后的长度
                
                return {
                    ...ax,
                    x: v.x,
                    y: v.y,
                    z: v.z // 保留 Z 用于排序
                };
            });

            // 按 Z 轴排序：从小到大画（假设 Z 越小越远，或者根据 THREE 的坐标系调整）
            // 在 THREE.js 默认坐标系中，Camera 看向 -Z。所以 Z 越小（越负）离相机越远。
            // 我们先画远的，再画近的，这样近的轴会盖住远的轴，3D感更强。
            projectedAxes.sort((a, b) => a.z - b.z);

            // 4. 绘制
            projectedAxes.forEach(p => {
                // 如果轴几乎垂直于屏幕（指向用户或背向用户），长度会接近0
                const len = Math.sqrt(p.x * p.x + p.y * p.y);
                if (len < 0.001) return;

                // 核心修改：直接使用投影后的分量乘以半径，不再除以 maxLen
                // 注意：Canvas 的 Y 轴是向下的，而 3D 空间 Y 通常向上，所以这里用 -p.y
                const ex = cx + p.x * radius; 
                const ey = cy - p.y * radius; 

                // 设置透明度：如果轴是指向屏幕里面的（背对用户），可以稍微画淡一点，增强立体感
                // p.z > 0 意味着指向相机背后（屏幕外），p.z < 0 意味着指向屏幕里
                ctx.globalAlpha = p.z > 0 ? 1.0 : 0.35; 

                ctx.beginPath();
                ctx.strokeStyle = p.color;
                ctx.moveTo(cx, cy);
                ctx.lineTo(ex, ey);
                ctx.stroke();

                // 箭头绘制 (保持你的逻辑)
                const angle = Math.atan2(ey - cy, ex - cx);
                ctx.save();
                ctx.translate(ex, ey);
                ctx.rotate(angle);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-6, -4);
                ctx.lineTo(-6, 4);
                ctx.closePath();
                ctx.fill();
                ctx.restore();

                // 文字标签
                ctx.save();
                ctx.globalAlpha = 1.0; // 文字始终不透明
                ctx.fillStyle = '#e6edf3';
                // 文字位置稍微往外推一点
                ctx.fillText(p.label, ex + Math.cos(angle) * 10, ey + Math.sin(angle) * 10);
                ctx.restore();
            });

            ctx.restore();
        };

        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
            try { drawGizmo(); } catch (e) {}
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
            if (dist > 5) return;

            // 忽略拖拽结束时的点击
            if (transformControl.dragging || threeRef.current.isDragging) return;
            // Ignore if box selection just happened
            if (threeRef.current.isBoxSelecting) return;

            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            
            raycaster.setFromCamera(mouse, camera);
            // 仅检测原子
            const meshes = Array.from(threeRef.current.atomMeshes.values());
            const intersects = raycaster.intersectObjects(meshes);
            
            // Filter intersects to only include atoms in active layer
            const { atoms: currentAtoms, activeLayerId: currentLayerId } = latestProps.current;
            const activeLayerAtomIds = new Set(currentAtoms.filter(a => a.layerId === currentLayerId).map(a => a.id));
            
            const validIntersects = intersects.filter(hit => activeLayerAtomIds.has(hit.object.userData.id));

            if (validIntersects.length > 0) {
                onAtomClick(validIntersects[0].object.userData.id, e.ctrlKey || e.metaKey);
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

    // Box Selection Logic
    useEffect(() => {
        // Container reference
        const container = containerRef.current;
        let isSelecting = false;
        let startPos = { x: 0, y: 0 };

        const onMouseDown = (e) => {
            if (e.shiftKey && e.button === 0) { // Shift + Left Click
                isSelecting = true;
                threeRef.current.isBoxSelecting = true;
                threeRef.current.controls.enabled = false;
                const rect = container.getBoundingClientRect();
                startPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                setSelectionBox({ left: startPos.x, top: startPos.y, width: 0, height: 0 });
                e.preventDefault(); // Prevent text selection
            }
        };

        const onMouseMove = (e) => {
            if (!isSelecting) return;
            const rect = container.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            
            const left = Math.min(startPos.x, currentX);
            const top = Math.min(startPos.y, currentY);
            const width = Math.abs(currentX - startPos.x);
            const height = Math.abs(currentY - startPos.y);
            
            setSelectionBox({ left, top, width, height });
        };

        const onMouseUp = (e) => {
            if (!isSelecting) return;
            isSelecting = false;
            threeRef.current.controls.enabled = true;
            
            // Calculate selection
            const rect = container.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            const left = Math.min(startPos.x, currentX);
            const top = Math.min(startPos.y, currentY);
            const width = Math.abs(currentX - startPos.x);
            const height = Math.abs(currentY - startPos.y);
            const right = left + width;
            const bottom = top + height;

            // If box is too small, treat as click (handled by click listener)
            if (width < 5 && height < 5) {
                setSelectionBox(null);
                threeRef.current.isBoxSelecting = false;
                return;
            }

            const { camera, atomMeshes } = threeRef.current;
            const selectedIds = [];
            const { atoms: currentAtoms, activeLayerId: currentLayerId } = latestProps.current;
            const activeLayerAtomIds = new Set(currentAtoms.filter(a => a.layerId === currentLayerId).map(a => a.id));
            
            atomMeshes.forEach((mesh, id) => {
                const vector = new THREE.Vector3();
                vector.setFromMatrixPosition(mesh.matrixWorld);
                vector.project(camera);
                const x = (vector.x * .5 + .5) * rect.width;
                const y = (-(vector.y * .5) + .5) * rect.height;
                
                if (x >= left && x <= right && y >= top && y <= bottom) {
                    if (activeLayerAtomIds.has(id)) {
                        selectedIds.push(id);
                    }
                }
            });
            
            onBoxSelect(selectedIds, e.ctrlKey || e.metaKey);
            setSelectionBox(null);
            
            // Reset flag after a short delay to allow click event to be ignored
            setTimeout(() => {
                threeRef.current.isBoxSelecting = false;
            }, 100);
        };

        container.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            container.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [onBoxSelect]);

    // 响应 TransformControls 拖拽结束，通知 App 更新坐标
    useEffect(() => {
        const { transformControl, controlAnchor, atomMeshes, dragStartPos, initialAtomPositions, controls } = threeRef.current;
        
        const onDragChange = (event) => {
            if (event.value) {
                // Drag Start
                threeRef.current.isDragging = true;
                controls.enabled = false;
                dragStartPos.copy(controlAnchor.position);
                initialAtomPositions.clear();
                selectedAtomIds.forEach(id => {
                    if (atomMeshes.has(id)) {
                        const mesh = atomMeshes.get(id);
                        initialAtomPositions.set(id, mesh.position.clone());
                    }
                });
            } else {
                // Drag End
                controls.enabled = true;
                const delta = new THREE.Vector3().subVectors(controlAnchor.position, dragStartPos);
                
                const moves = [];
                selectedAtomIds.forEach(id => {
                    if (initialAtomPositions.has(id)) {
                        const initPos = initialAtomPositions.get(id);
                        const newPos = new THREE.Vector3().addVectors(initPos, delta);
                        moves.push({ id, x: newPos.x, y: newPos.y, z: newPos.z });
                    }
                });
                
                if (moves.length > 0) {
                    onAtomsMoveEnd(moves);
                }
                
                setTimeout(() => {
                    threeRef.current.isDragging = false;
                }, 100);
            }
        };

        // Real-time update during drag
        const onChange = () => {
            if (transformControl.dragging) {
                const delta = new THREE.Vector3().subVectors(controlAnchor.position, dragStartPos);
                selectedAtomIds.forEach(id => {
                    if (atomMeshes.has(id) && initialAtomPositions.has(id)) {
                        const mesh = atomMeshes.get(id);
                        const initPos = initialAtomPositions.get(id);
                        mesh.position.addVectors(initPos, delta);
                    }
                });
            }
        };

        transformControl.addEventListener('dragging-changed', onDragChange);
        transformControl.addEventListener('change', onChange);
        
        return () => {
            transformControl.removeEventListener('dragging-changed', onDragChange);
            transformControl.removeEventListener('change', onChange);
        };
    }, [onAtomsMoveEnd, selectedAtomIds]); // Re-bind when selection changes


    // 同步 Scene (Atom & Lattice)
    useEffect(() => {
        const { scene, atomMeshes, controlAnchor } = threeRef.current;

        // 1. 清理旧物体
        const toRemove = [];
        scene.traverse(c => {
            if(c.userData.type === 'atom' || c.userData.type === 'bond' || c.userData.type === 'box') toRemove.push(c);
        });
        toRemove.forEach(c => {
            scene.remove(c);
            if(c.geometry) c.geometry.dispose();
        });
        atomMeshes.clear();
        
        // Ensure control anchor is in scene (it might have been removed if we cleared everything, but usually we don't clear non-atoms)
        // Actually traverse above removes based on userData.type. controlAnchor doesn't have type set yet.
        // Let's make sure controlAnchor is added if not present.
        if (!scene.children.includes(controlAnchor)) scene.add(controlAnchor);

        // 2. 绘制晶胞（仅当 lattice 可用时）
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
            const boxLine = new THREE.LineSegments(boxGeo, new THREE.LineBasicMaterial({color:0x475569}));
            boxLine.userData.type='box';
            scene.add(boxLine);
        }

        // 3. 绘制原子
        const sphereGeo = new THREE.SphereGeometry(1, 24, 24);
        visibleAtoms.forEach(atom => {
            const prop = getElementProp(atom.element);
            const isSelected = selectedAtomIds.includes(atom.id);
            const mat = new THREE.MeshStandardMaterial({
                color: prop.color, roughness: 0.3, metalness: 0.2,
                emissive: isSelected ? 0x666666 : 0x000000
            });
            const mesh = new THREE.Mesh(sphereGeo, mat);
            mesh.position.set(atom.x, atom.y, atom.z);
            mesh.scale.setScalar(prop.radius * 0.4);
            mesh.userData = { type: 'atom', id: atom.id };
            scene.add(mesh);
            atomMeshes.set(atom.id, mesh);
        });

        // 4. 绘制键 (考虑 PBC，如果没有 lattice 则不应用周期性)
        if(visibleAtoms.length < 500) {
            // Use white color so we can tint with instanceColor
            const bondMat = new THREE.MeshStandardMaterial({color:0xffffff}); 
            const bondGeo = new THREE.CylinderGeometry(0.1,0.1,1,6);
            bondGeo.translate(0,0.5,0); bondGeo.rotateX(Math.PI/2);
            
            const dummy = new THREE.Object3D();
            const bondSegments = []; // { start, end, color }

            // Prepare lattice matrices (only if lattice present)
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
                    
                    // Apply PBC if lattice is valid; otherwise keep direct vector
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
                    const threshold = (r1 + r2) * 0.6; 

                    if(distSq < threshold**2){
                        const halfVec = [distVector[0]*0.5, distVector[1]*0.5, distVector[2]*0.5];
                        
                        // Segment 1: Atom i -> Midpoint
                        bondSegments.push({
                            start: new THREE.Vector3(...p1),
                            end: new THREE.Vector3(p1[0]+halfVec[0], p1[1]+halfVec[1], p1[2]+halfVec[2]),
                            color: new THREE.Color(getElementProp(visibleAtoms[i].element).color)
                        });

                        // Segment 2: Atom j -> Midpoint (from j's perspective, vector is -distVector)
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

    }, [atoms, lattice, selectedAtomIds, layers]);

    // 处理选中逻辑和 TransformControls 绑定
    useEffect(() => {
        const { transformControl, atomMeshes, scene, controlAnchor } = threeRef.current;
        
        if (selectedAtomIds.length > 0) {
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
                        border: '1px solid rgba(100, 149, 237, 0.8)',
                        backgroundColor: 'rgba(100, 149, 237, 0.2)',
                        pointerEvents: 'none',
                        zIndex: 10
                    }}
                />
            )}
        </div>
    );
};

export default Viewer;
