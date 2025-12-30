import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { getElementProp, getVdw } from '../constants/elements';
import { COLORS } from '../constants/theme';
import { DEFAULTS } from '../constants/defaults';
import { MathUtils } from '../utils/math';
import { createAtomMaterial, createBondMaterial, createOutlineMaterial } from './customShaders';
import { createResizeHandler, createAnimateLoop, setupClickHandlers } from './rendererCommon';

export function createCustomRenderer() {
    const threeRef = {
        scene: null,
        camera: null,
        renderer: null,
        controls: null,
        transformControl: null,
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
        lattice: null,
        transformMode: 'translate',
        currentBackgroundColor: new THREE.Color(),
        targetBackgroundColor: new THREE.Color(),
        currentLatticeColor: new THREE.Color(),
        targetLatticeColor: new THREE.Color(),
        latticeMaterial: null,
        currentOutlineColor: new THREE.Color(),
        targetOutlineColor: new THREE.Color(),
        outlineMaterials: [],
        themeTransitionSpeed: 0.05 // Adjust for smoothness
    };

    let animationId = null;
    let resizeHandler = null;
    let animateController = null;

    const api = {
        threeRef,

        init(container, { onAtomClick, onAtomsMoveEnd, onBoxSelect, theme, lattice } = {}) {
            const width = container.clientWidth;
            const height = container.clientHeight;

            const scene = new THREE.Scene();
            scene.up.set(0,0,1);
            scene.background = new THREE.Color(theme === 'dark' ? COLORS.background.dark : COLORS.background.light);
            threeRef.currentBackgroundColor.copy(scene.background);
            threeRef.targetBackgroundColor.copy(scene.background);
            threeRef.currentLatticeColor.set(theme === 'dark' ? COLORS.lattice.dark : COLORS.lattice.light);
            threeRef.targetLatticeColor.copy(threeRef.currentLatticeColor);
            threeRef.currentOutlineColor.set(theme === 'dark' ? 0xffffff : 0x111111);
            threeRef.targetOutlineColor.copy(threeRef.currentOutlineColor);
            scene.add(new THREE.AmbientLight(COLORS.general.white, DEFAULTS.LIGHTING.AMBIENT_INTENSITY));
            const dirLight = new THREE.DirectionalLight(COLORS.general.white, DEFAULTS.LIGHTING.DIRECTIONAL_INTENSITY);
            dirLight.position.set(...DEFAULTS.LIGHTING.DIRECTIONAL_POSITION);
            scene.add(dirLight);

            const camera = new THREE.PerspectiveCamera(DEFAULTS.CAMERA.FOV, width/height, DEFAULTS.CAMERA.NEAR, DEFAULTS.CAMERA.FAR);
            camera.up.set(0,0,1);
            camera.position.set(...DEFAULTS.CAMERA.POSITION);

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(width, height);
            renderer.setPixelRatio(window.devicePixelRatio);
            container.appendChild(renderer.domElement);

            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.target.set(...DEFAULTS.CAMERA.TARGET);

            const transformControl = new TransformControls(camera, renderer.domElement);
            transformControl.addEventListener('dragging-changed', (event) => { controls.enabled = !event.value; });
            scene.add(transformControl);

            threeRef.scene = scene;
            threeRef.camera = camera;
            threeRef.renderer = renderer;
            threeRef.controls = controls;
            threeRef.transformControl = transformControl;
            threeRef.atomMeshes = new Map();
            threeRef.controlAnchor = new THREE.Object3D();
            threeRef.dragStartPos = new THREE.Vector3();
            threeRef.initialAtomPositions = new Map();
            threeRef.isDragging = false;
            threeRef.atomInstancedMesh = null;
            threeRef.instanceIdToAtomId = [];
            threeRef.atomIdToInstanceId.clear && threeRef.atomIdToInstanceId.clear();
            threeRef.lattice = lattice || null;

            resizeHandler = createResizeHandler(container, camera, renderer);
            window.addEventListener('resize', resizeHandler);

            // animate loop
            const drawGizmoRef = { current: () => {} };
            const extraUpdate = (tr) => {
                try {
                    if (tr && tr.outlineMaterials && tr.outlineMaterials.length > 0 && tr.currentOutlineColor && tr.targetOutlineColor && !tr.currentOutlineColor.equals(tr.targetOutlineColor)) {
                        tr.currentOutlineColor.lerp(tr.targetOutlineColor, tr.themeTransitionSpeed || 0.05);
                        tr.outlineMaterials.forEach(mat => {
                            if (mat.uniforms && mat.uniforms.uColor) mat.uniforms.uColor.value.copy(tr.currentOutlineColor);
                            else if (mat.color && typeof mat.color.copy === 'function') mat.color.copy(tr.currentOutlineColor);
                        });
                    }
                } catch (e) {}
            };
            animateController = createAnimateLoop({ controls, renderer, scene, camera, drawGizmoRef, threeRef, extraUpdate });
            animateController.start();

            const clickHandlers = setupClickHandlers(renderer.domElement, camera, transformControl, threeRef, api, onAtomClick);
            api._raycaster = clickHandlers.raycaster;
            api._mouse = clickHandlers.mouse;
            api._clickRemover = clickHandlers.removeListeners;

            api._callbacks = { onAtomClick, onAtomsMoveEnd, onBoxSelect };
            api._drawGizmoRef = drawGizmoRef;

            api._latestProps = { atoms: [], activeLayerId: null, theme };
            return threeRef;
        },

        syncScene({ atoms = [], lattice = null, layers = [], activeLayerId = null, theme = 'dark' } = {}) {
            if (!threeRef.scene) return;
            api._latestProps = { atoms, activeLayerId, theme };
            threeRef.lattice = lattice;
            const scene = threeRef.scene;

            // Update scene background target based on theme
            threeRef.targetBackgroundColor.set(theme === 'dark' ? COLORS.background.dark : COLORS.background.light);
            threeRef.targetLatticeColor.set(theme === 'dark' ? COLORS.lattice.dark : COLORS.lattice.light);
            threeRef.targetOutlineColor.set(theme === 'dark' ? 0xffffff : 0x111111);

            // Clear previous atom/bond/box
            const toRemove = [];
            scene.traverse(c => {
                if (c.userData && (c.userData.type === 'atom' || c.userData.type === 'bond' || c.userData.type === 'box' || c.userData.type === 'atom-instanced' || c.userData.type === 'atom-outline' || c.userData.type === 'bond-outline')) toRemove.push(c);
            });
            toRemove.forEach(c => {
                scene.remove(c);
                if (c.geometry) c.geometry.dispose();
                if (c.material) c.material.dispose();
            });
            threeRef.atomMeshes.clear && threeRef.atomMeshes.clear();
            threeRef.atomInstancedMesh = null;
            threeRef.instanceIdToAtomId = [];
            threeRef.atomIdToInstanceId.clear && threeRef.atomIdToInstanceId.clear();
            threeRef.outlineMaterials = [];
            threeRef.latticeMaterial = null;

            if (!scene.children.includes(threeRef.controlAnchor)) scene.add(threeRef.controlAnchor);

            const visibleSet = new Set((layers || []).filter(l => l && l.visible).map(l => l.id));
            const visibleAtoms = (atoms || []).filter(a => !a.layerId || visibleSet.has(a.layerId));

            // lattice
            const hasLattice = Array.isArray(lattice) && lattice.length === 3 && lattice.every(v => Array.isArray(v) && v.length === 3);
            if (hasLattice) {
                const boxGeo = new THREE.BufferGeometry();
                const o=[0,0,0];
                const [a,b,c] = lattice;
                const ab=[a[0]+b[0],a[1]+b[1],a[2]+b[2]], ac=[a[0]+c[0],a[1]+c[1],a[2]+c[2]], bc=[b[0]+c[0],b[1]+c[1],b[2]+c[2]];
                const abc=[ab[0]+c[0],ab[1]+c[1],ab[2]+c[2]];
                const pts = [];
                [[o,a],[o,b],[o,c],[a,ab],[a,ac],[b,ab],[b,bc],[c,ac],[c,bc],[ab,abc],[ac,abc],[bc,abc]].forEach(pair=>{ pts.push(...pair[0], ...pair[1]); });
                boxGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts,3));
                const boxLine = new THREE.LineSegments(boxGeo, new THREE.LineBasicMaterial({color: threeRef.currentLatticeColor}));
                boxLine.userData.type='box';
                scene.add(boxLine);
                threeRef.latticeMaterial = boxLine.material;
            }

            // Atoms
            const isLargeSystem = visibleAtoms.length > DEFAULTS.PERFORMANCE.INSTANCED_MESH_THRESHOLD;
            threeRef.isInstanced = isLargeSystem;

            const atomColorMatCache = new Map();

            if (isLargeSystem) {
                const sphereGeo = new THREE.SphereGeometry(1, DEFAULTS.VISUALS.SPHERE_SEGMENTS, DEFAULTS.VISUALS.SPHERE_SEGMENTS);
                const outlineInstMesh = new THREE.InstancedMesh(sphereGeo, createOutlineMaterial({ color: threeRef.currentOutlineColor }), visibleAtoms.length);
                outlineInstMesh.material.defines = { USE_INSTANCING: 1 };
                outlineInstMesh.material.needsUpdate = true;
                threeRef.outlineMaterials.push(outlineInstMesh.material);

                const instMesh = new THREE.InstancedMesh(sphereGeo, createAtomMaterial({}), visibleAtoms.length);
                // Tell material to support instancing via define
                instMesh.material.defines = Object.assign({}, instMesh.material.defines, { USE_INSTANCING: 1 });
                instMesh.material.needsUpdate = true;

                const dummy = new THREE.Object3D();
                visibleAtoms.forEach((atom, i) => {
                    const prop = getElementProp(atom.element);
                    dummy.position.set(atom.x, atom.y, atom.z);
                    const scale = prop.radius * DEFAULTS.VISUALS.ATOM_SCALE;
                    dummy.scale.setScalar(scale);
                    dummy.updateMatrix();
                    instMesh.setMatrixAt(i, dummy.matrix);
                    const color = new THREE.Color(prop.color);
                    try { instMesh.setColorAt(i, color); } catch(e) {}
                    threeRef.instanceIdToAtomId[i] = atom.id;
                    threeRef.atomIdToInstanceId.set && threeRef.atomIdToInstanceId.set(atom.id, i);

                    // For outline
                    dummy.scale.setScalar(scale * 1.05);
                    dummy.updateMatrix();
                    outlineInstMesh.setMatrixAt(i, dummy.matrix);
                });
                outlineInstMesh.userData = { type: 'atom-outline' };
                scene.add(outlineInstMesh);
                instMesh.userData = { type: 'atom-instanced' };
                scene.add(instMesh);
                threeRef.atomInstancedMesh = instMesh;
            } else {
                const sphereGeo = new THREE.SphereGeometry(1, DEFAULTS.VISUALS.SPHERE_SEGMENTS, DEFAULTS.VISUALS.SPHERE_SEGMENTS);
                visibleAtoms.forEach(atom => {
                    const prop = getElementProp(atom.element);
                    const scale = prop.radius * DEFAULTS.VISUALS.ATOM_SCALE;
                    const outlineMat = createOutlineMaterial({ color: threeRef.currentOutlineColor });
                    const outlineMesh = new THREE.Mesh(sphereGeo, outlineMat);
                    outlineMesh.position.set(atom.x, atom.y, atom.z);
                    outlineMesh.scale.setScalar(scale * 1.05);
                    outlineMesh.userData = { type: 'atom-outline' };
                    scene.add(outlineMesh);
                    threeRef.outlineMaterials.push(outlineMat);

                    const mat = createAtomMaterial({ color: new THREE.Color(prop.color) });
                    const mesh = new THREE.Mesh(sphereGeo, mat);
                    mesh.position.set(atom.x, atom.y, atom.z);
                    mesh.scale.setScalar(scale);
                    mesh.userData = { type: 'atom', id: atom.id };
                    scene.add(mesh);
                    threeRef.atomMeshes.set(atom.id, mesh);
                });
            }

            // bonds
            if (visibleAtoms.length < 500) {
                const bondGeo = new THREE.CylinderGeometry(DEFAULTS.VISUALS.BOND_RADIUS, DEFAULTS.VISUALS.BOND_RADIUS, 1, DEFAULTS.VISUALS.BOND_SEGMENTS);
                // Align geometry to Z axis
                bondGeo.rotateX(Math.PI/2);
                const bondMat = createBondMaterial({ color: new THREE.Color(0x999999) });
                // Enable instancing defines so the shader uses `instanceMatrix` and `instanceColor`
                bondMat.defines = Object.assign({}, bondMat.defines, { USE_INSTANCING: 1 });
                bondMat.needsUpdate = true;
                const dummy = new THREE.Object3D();
                const bondSegments = [];

                let latMat = null;
                let invLatMat = null;
                if (hasLattice) {
                    const [va,vb,vc] = lattice;
                    latMat = [ [va[0], vb[0], vc[0]], [va[1], vb[1], vc[1]],[va[2], vb[2], vc[2]] ];
                    invLatMat = MathUtils.inv3x3(latMat);
                }

                for (let i = 0; i < visibleAtoms.length; i++) {
                    const p1 = [visibleAtoms[i].x, visibleAtoms[i].y, visibleAtoms[i].z];
                    const r1 = getVdw(visibleAtoms[i].element);
                    for (let j = i; j < visibleAtoms.length; j++) {
                        const p2Base = [visibleAtoms[j].x, visibleAtoms[j].y, visibleAtoms[j].z];
                        const r2 = getVdw(visibleAtoms[j].element);
                        // enumerate nearby periodic images to capture multiple periodic-image bonds
                        const maxOffset = 1;
                        for (let nx=-maxOffset; nx<=maxOffset; nx++){
                            for (let ny=-maxOffset; ny<=maxOffset; ny++){
                                for (let nz=-maxOffset; nz<=maxOffset; nz++){
                                    if (i === j && nx === 0 && ny === 0 && nz === 0) continue;
                                    let p2 = p2Base.slice();
                                    if (latMat) {
                                        p2 = [
                                            p2Base[0] + nx * lattice[0][0] + ny * lattice[1][0] + nz * lattice[2][0],
                                            p2Base[1] + nx * lattice[0][1] + ny * lattice[1][1] + nz * lattice[2][1],
                                            p2Base[2] + nx * lattice[0][2] + ny * lattice[1][2] + nz * lattice[2][2]
                                        ];
                                    } else {
                                        if (nx !== 0 || ny !== 0 || nz !== 0) continue;
                                    }
                                    const distVector = [p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]];
                                    const distSq = distVector[0]**2 + distVector[1]**2 + distVector[2]**2;
                                    if (distSq < 1e-6) continue;
                                    const threshold = (r1 + r2) * DEFAULTS.VISUALS.BOND_THRESHOLD_FACTOR;
                                    if (distSq < threshold**2) {
                                        const halfVec = [distVector[0]*0.5, distVector[1]*0.5, distVector[2]*0.5];
                                        // midpoint on i-side (toward the image of j)
                                        const midI = new THREE.Vector3(p1[0] + halfVec[0], p1[1] + halfVec[1], p1[2] + halfVec[2]);
                                        // compute translation vector T used to move p2Base -> p2
                                        const T = [p2[0] - p2Base[0], p2[1] - p2Base[1], p2[2] - p2Base[2]];
                                        // corresponding image of p1 in j's cell: p1_image = p1 - T
                                        const p1Image = [p1[0] - T[0], p1[1] - T[1], p1[2] - T[2]];
                                        // midpoint on j-side (toward the image of i)
                                        const midJ = new THREE.Vector3(p2Base[0] + 0.5*(p1Image[0] - p2Base[0]), p2Base[1] + 0.5*(p1Image[1] - p2Base[1]), p2Base[2] + 0.5*(p1Image[2] - p2Base[2]));
                                        // attach first half to displayed position of atom i
                                        bondSegments.push({ start: new THREE.Vector3(...p1), end: midI.clone(), color: new THREE.Color(getElementProp(visibleAtoms[i].element).color) });
                                        // attach second half to the displayed position of atom j (p2Base), pointing toward the boundary
                                        bondSegments.push({ start: new THREE.Vector3(...p2Base), end: midJ.clone(), color: new THREE.Color(getElementProp(visibleAtoms[j].element).color) });
                                    }
                                }
                            }
                        }
                    }
                }

                const instMesh = new THREE.InstancedMesh(bondGeo, bondMat, bondSegments.length);
                bondSegments.forEach((seg, idx) => {
                    const v = new THREE.Vector3().subVectors(seg.end, seg.start);
                    const len = v.length();
                    const mid = new THREE.Vector3().addVectors(seg.start, seg.end).multiplyScalar(0.5);
                    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), v.clone().normalize());
                    dummy.position.copy(mid);
                    dummy.quaternion.copy(quat);
                    dummy.scale.set(1,1,len);
                    dummy.updateMatrix();
                    instMesh.setMatrixAt(idx, dummy.matrix);
                    try { instMesh.setColorAt(idx, seg.color); } catch(e) {}
                });
                if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
                if (instMesh.instanceMatrix) instMesh.instanceMatrix.needsUpdate = true;

                // Outline for bonds
                const outlineBondMat = createOutlineMaterial({ color: threeRef.currentOutlineColor });
                outlineBondMat.defines = { USE_INSTANCING: 1 };
                outlineBondMat.needsUpdate = true;
                threeRef.outlineMaterials.push(outlineBondMat);
                const outlineInstMesh = new THREE.InstancedMesh(bondGeo, outlineBondMat, bondSegments.length);
                bondSegments.forEach((seg, idx) => {
                    const v = new THREE.Vector3().subVectors(seg.end, seg.start);
                    const len = v.length();
                    const mid = new THREE.Vector3().addVectors(seg.start, seg.end).multiplyScalar(0.5);
                    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), v.clone().normalize());
                    dummy.position.copy(mid);
                    dummy.quaternion.copy(quat);
                    dummy.scale.set(1.05, 1.05, len);
                    dummy.updateMatrix();
                    outlineInstMesh.setMatrixAt(idx, dummy.matrix);
                });
                outlineInstMesh.userData.type = 'bond-outline';
                scene.add(outlineInstMesh);

                instMesh.userData.type = 'bond';
                scene.add(instMesh);
            }
        },

        updateSelection(selectedAtomIds = [], atoms = []) {
            const { atomMeshes, atomInstancedMesh, isInstanced, atomIdToInstanceId } = threeRef;
            if (isInstanced && atomInstancedMesh) {
                atoms.forEach(atom => {
                    const idx = atomIdToInstanceId.get && atomIdToInstanceId.get(atom.id);
                    if (idx !== undefined) {
                        const prop = getElementProp(atom.element);
                        const base = new THREE.Color(prop.color);
                        const isSelected = selectedAtomIds.includes(atom.id);
                        const color = base.clone();
                        if (isSelected) color.add(new THREE.Color(COLORS.selection.emissive));
                        try { atomInstancedMesh.setColorAt(idx, color); } catch(e) {}
                    }
                });
                if (atomInstancedMesh.instanceColor) atomInstancedMesh.instanceColor.needsUpdate = true;
            } else {
                atomMeshes.forEach((mesh, id) => {
                    const isSelected = selectedAtomIds.includes(id);
                    if (mesh.material && mesh.material.uniforms && mesh.material.uniforms.uSelectionFactor) {
                        mesh.material.uniforms.uSelectionFactor.value = isSelected ? 1.0 : 0.0;
                        mesh.material.needsUpdate = true;
                    } else if (mesh.material && mesh.material.emissive) {
                        mesh.material.emissive.set(isSelected ? COLORS.selection.emissive : COLORS.general.black);
                    }
                });
            }
        },

        setTransformMode(transformMode, editMode) {
            const { transformControl } = threeRef;
            if (transformControl && transformControl.setMode) {
                transformControl.setMode(transformMode || 'translate');
                threeRef.transformMode = transformMode;
                if (editMode !== 'SELECT') {
                    transformControl.enabled = false;
                    try { transformControl.detach(); } catch(e) {}
                } else {
                    transformControl.enabled = true;
                }
                try { if (transformMode === 'rotate') transformControl.setSpace('local'); else transformControl.setSpace('world'); } catch(e) {}
            }
        },

        resize() {
            if (resizeHandler) resizeHandler();
        },

        dispose() {
            try { if (animateController && animateController.stop) animateController.stop(); } catch (e) {}
            if (resizeHandler) try { window.removeEventListener('resize', resizeHandler); } catch(e) {}
            if (api._clickRemover) try { api._clickRemover(); } catch(e) {}
            try {
                if (threeRef.renderer && threeRef.renderer.domElement && threeRef.renderer.domElement.parentNode) {
                    threeRef.renderer.domElement.parentNode.removeChild(threeRef.renderer.domElement);
                }
            } catch (e) {}
        }
    };

    return api;
}
