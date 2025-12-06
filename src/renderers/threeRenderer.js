import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { getElementProp } from '../constants/elements';
import { getVdw } from '../constants/atomParams';
import { COLORS } from '../constants/theme';
import { DEFAULTS } from '../constants/defaults';
import { MathUtils } from '../utils/math';
import { createResizeHandler, createAnimateLoop, setupClickHandlers } from './rendererCommon';

/**
 * Creates a Three-based renderer instance. The instance encapsulates scene,
 * camera, renderer, controls, transform controls and provides methods to
 * synchronize atoms/bonds/lattice, update selection and dispose.
 *
 * Usage:
 *   const renderer = createThreeRenderer();
 *   renderer.init(container, { onAtomClick, onAtomsMoveEnd, onBoxSelect, theme, lattice });
 *   renderer.syncScene({ atoms, lattice, layers, activeLayerId });
 */
export function createThreeRenderer() {
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
        themeTransitionSpeed: 0.05 // Adjust for smoothness
    };

    let animationId = null;
    let resizeHandler = null;
    let animateController = null;

    const api = {
        threeRef,

        init(container, { onAtomClick, onAtomsMoveEnd, onBoxSelect, theme, lattice } = {}) {
            const rectInit = container.getBoundingClientRect();
            const width = Math.max(1, Math.floor(rectInit.width));
            const height = Math.max(1, Math.floor(rectInit.height));

            const scene = new THREE.Scene();
            scene.up.set(0, 0, 1);
            if (THREE.Object3D && THREE.Object3D.DefaultUp && THREE.Object3D.DefaultUp.set) {
                THREE.Object3D.DefaultUp.set(0, 0, 1);
            }
            scene.background = new THREE.Color(theme === 'dark' ? COLORS.background.dark : COLORS.background.light);
            threeRef.currentBackgroundColor.copy(scene.background);
            threeRef.targetBackgroundColor.copy(scene.background);
            threeRef.currentLatticeColor.set(theme === 'dark' ? COLORS.lattice.dark : COLORS.lattice.light);
            threeRef.targetLatticeColor.copy(threeRef.currentLatticeColor);
            scene.add(new THREE.AmbientLight(COLORS.general.white, DEFAULTS.LIGHTING.AMBIENT_INTENSITY));
            const dirLight = new THREE.DirectionalLight(COLORS.general.white, DEFAULTS.LIGHTING.DIRECTIONAL_INTENSITY);
            dirLight.position.set(...DEFAULTS.LIGHTING.DIRECTIONAL_POSITION);
            scene.add(dirLight);
            const dirLight2 = new THREE.DirectionalLight(COLORS.general.white, DEFAULTS.LIGHTING.DIRECTIONAL_INTENSITY * 0.5);
            dirLight2.position.set(-10, -10, -10);
            scene.add(dirLight2);

            const camera = new THREE.PerspectiveCamera(DEFAULTS.CAMERA.FOV, width/height, DEFAULTS.CAMERA.NEAR, DEFAULTS.CAMERA.FAR);
            camera.up.set(0, 0, 1);
            camera.position.set(...DEFAULTS.CAMERA.POSITION);

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            const dprInit = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
            renderer.setPixelRatio(dprInit);
            renderer.setSize(width, height, true);
            try {
                renderer.domElement.style.display = 'block';
                renderer.domElement.style.width = '100%';
                renderer.domElement.style.height = '100%';
            } catch (e) {}
            container.appendChild(renderer.domElement);

            const controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.target.set(...DEFAULTS.CAMERA.TARGET);

            const transformControl = new TransformControls(camera, renderer.domElement);
            transformControl.addEventListener('dragging-changed', (event) => {
                controls.enabled = !event.value;
            });
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
            threeRef.atomIdToInstanceId = new Map();
            threeRef.isInstanced = false;
            threeRef.lattice = lattice || null;

            resizeHandler = createResizeHandler(container, camera, renderer);
            window.addEventListener('resize', resizeHandler);

            // animation loop
            const drawGizmoRef = { current: () => {} };
            animateController = createAnimateLoop({ controls, renderer, scene, camera, drawGizmoRef, threeRef, extraUpdate: null });
            animateController.start();

            const clickHandlers = setupClickHandlers(renderer.domElement, camera, transformControl, threeRef, api, onAtomClick);

            api._raycaster = clickHandlers.raycaster;
            api._mouse = clickHandlers.mouse;
            api._clickRemover = clickHandlers.removeListeners;

            // store callbacks for later events
            api._callbacks = { onAtomClick, onAtomsMoveEnd, onBoxSelect };
            api._drawGizmoRef = drawGizmoRef;

            // Keep ref for latest props
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
            const atomMeshes = threeRef.atomMeshes;
            const controlAnchor = threeRef.controlAnchor;

            // Clear previous atom/bond/box objects
            const toRemove = [];
            scene.traverse(c => {
                if (c.userData && (c.userData.type === 'atom' || c.userData.type === 'bond' || c.userData.type === 'box' || c.userData.type === 'atom-instanced')) toRemove.push(c);
            });
            toRemove.forEach(c => {
                scene.remove(c);
                if (c.geometry) c.geometry.dispose();
            });
            atomMeshes.clear();
            threeRef.atomInstancedMesh = null;
            threeRef.instanceIdToAtomId = [];
            threeRef.atomIdToInstanceId.clear && threeRef.atomIdToInstanceId.clear();

            if (!scene.children.includes(controlAnchor)) scene.add(controlAnchor);

            const visibleSet = new Set((layers || []).filter(l => l && l.visible).map(l => l.id));
            const visibleAtoms = (atoms || []).filter(a => !a.layerId || visibleSet.has(a.layerId));

            // Lattice
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

            // Atoms (instanced when large)
            const isLargeSystem = visibleAtoms.length > DEFAULTS.PERFORMANCE.INSTANCED_MESH_THRESHOLD;
            threeRef.isInstanced = isLargeSystem;

            if (isLargeSystem) {
                const sphereGeo = new THREE.SphereGeometry(1, DEFAULTS.VISUALS.SPHERE_SEGMENTS, DEFAULTS.VISUALS.SPHERE_SEGMENTS);
                const mat = new THREE.MeshStandardMaterial({ roughness:0.1, metalness:0.1, color: COLORS.general.white });
                const instMesh = new THREE.InstancedMesh(sphereGeo, mat, visibleAtoms.length);
                const dummy = new THREE.Object3D();
                visibleAtoms.forEach((atom, i) => {
                    const prop = getElementProp(atom.element);
                    dummy.position.set(atom.x, atom.y, atom.z);
                    dummy.scale.setScalar(prop.radius * DEFAULTS.VISUALS.ATOM_SCALE);
                    dummy.updateMatrix();
                    instMesh.setMatrixAt(i, dummy.matrix);
                    try { instMesh.setColorAt(i, new THREE.Color(prop.color)); } catch(e){}
                    threeRef.instanceIdToAtomId[i] = atom.id;
                    threeRef.atomIdToInstanceId.set && threeRef.atomIdToInstanceId.set(atom.id, i);
                });
                instMesh.userData = { type: 'atom-instanced' };
                scene.add(instMesh);
                threeRef.atomInstancedMesh = instMesh;
            } else {
                const sphereGeo = new THREE.SphereGeometry(1, DEFAULTS.VISUALS.SPHERE_SEGMENTS, DEFAULTS.VISUALS.SPHERE_SEGMENTS);
                visibleAtoms.forEach(atom => {
                    const prop = getElementProp(atom.element);
                    const mat = new THREE.MeshStandardMaterial({ color: prop.color, roughness:0.1, metalness:0.1, emissive: COLORS.general.black });
                    const mesh = new THREE.Mesh(sphereGeo, mat);
                    mesh.position.set(atom.x, atom.y, atom.z);
                    mesh.scale.setScalar(prop.radius * DEFAULTS.VISUALS.ATOM_SCALE);
                    mesh.userData = { type: 'atom', id: atom.id };
                    scene.add(mesh);
                    atomMeshes.set(atom.id, mesh);
                });
            }

            // Bonds (simple instanced cylinders for small systems)
            // Only attempt naive O(N^2) bond detection for relatively small systems.
            if (visibleAtoms.length < DEFAULTS.PERFORMANCE.BOND_MESH_THRESHOLD) {
                const bondMat = new THREE.MeshStandardMaterial({color: COLORS.general.white, roughness:0.1, metalness:0.1});
                const bondGeo = new THREE.CylinderGeometry(DEFAULTS.VISUALS.BOND_RADIUS, DEFAULTS.VISUALS.BOND_RADIUS, 1, DEFAULTS.VISUALS.BOND_SEGMENTS);
                // Align geometry to Z axis (cylinder extends along Y by default in Three.js)
                bondGeo.rotateX(Math.PI/2);
                const dummy = new THREE.Object3D();
                const bondSegments = [];

                let latMat = null;
                let invLatMat = null;
                if (hasLattice) {
                    const [va, vb, vc] = lattice;
                    latMat = [ [va[0], vb[0], vc[0]], [va[1], vb[1], vc[1]], [va[2], vb[2], vc[2]] ];
                    invLatMat = MathUtils.inv3x3(latMat);
                }

                for (let i=0;i<visibleAtoms.length;i++){
                    for (let j=i+1;j<visibleAtoms.length;j++){
                        const p1=[visibleAtoms[i].x,visibleAtoms[i].y,visibleAtoms[i].z];
                        const p2=[visibleAtoms[j].x,visibleAtoms[j].y,visibleAtoms[j].z];
                        let distVector=[p2[0]-p1[0],p2[1]-p1[1],p2[2]-p1[2]];
                        if (invLatMat && latMat) {
                            const frac = MathUtils.multiplyMatrixVector(invLatMat, distVector);
                            const fracMic = [ frac[0]-Math.floor(frac[0]+0.5), frac[1]-Math.floor(frac[1]+0.5), frac[2]-Math.floor(frac[2]+0.5) ];
                            distVector = MathUtils.multiplyMatrixVector(latMat, fracMic);
                        }
                        const distSq = distVector[0]**2 + distVector[1]**2 + distVector[2]**2;
                        if (distSq < 1e-6) continue;
                        const r1 = getVdw(visibleAtoms[i].element);
                        const r2 = getVdw(visibleAtoms[j].element);
                        const threshold = (r1 + r2) * DEFAULTS.VISUALS.BOND_THRESHOLD_FACTOR;
                        if (distSq < threshold**2) {
                            const halfVec = [distVector[0]*0.5, distVector[1]*0.5, distVector[2]*0.5];
                            bondSegments.push({ start: new THREE.Vector3(...p1), end: new THREE.Vector3(p1[0]+halfVec[0], p1[1]+halfVec[1], p1[2]+halfVec[2]), color: new THREE.Color(getElementProp(visibleAtoms[i].element).color) });
                            bondSegments.push({ start: new THREE.Vector3(...p2), end: new THREE.Vector3(p2[0]-halfVec[0], p2[1]-halfVec[1], p2[2]-halfVec[2]), color: new THREE.Color(getElementProp(visibleAtoms[j].element).color) });
                        }
                    }
                }

                const instMesh = new THREE.InstancedMesh(bondGeo, bondMat, bondSegments.length);
                bondSegments.forEach((seg, idx) => {
                    const v = new THREE.Vector3().subVectors(seg.end, seg.start);
                    const len = v.length();
                    const mid = new THREE.Vector3().addVectors(seg.start, seg.end).multiplyScalar(0.5);
                    // orient Z (0,0,1) to vector v
                    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), v.clone().normalize());
                    dummy.position.copy(mid);
                    dummy.quaternion.copy(quat);
                    dummy.scale.set(1,1,len);
                    dummy.updateMatrix();
                    instMesh.setMatrixAt(idx, dummy.matrix);
                    try { instMesh.setColorAt(idx, seg.color); } catch(e){}
                });
                if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
                instMesh.userData.type='bond';
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
                        const isSelected = selectedAtomIds.includes(atom.id);
                        const color = new THREE.Color(prop.color);
                        if (isSelected) color.add(new THREE.Color(COLORS.selection.emissive));
                        try { atomInstancedMesh.setColorAt(idx, color); } catch(e){}
                    }
                });
                if (atomInstancedMesh.instanceColor) atomInstancedMesh.instanceColor.needsUpdate = true;
            } else {
                atomMeshes.forEach((mesh, id) => {
                    const isSelected = selectedAtomIds.includes(id);
                    if (mesh.material && mesh.material.emissive) mesh.material.emissive.set(isSelected ? COLORS.selection.emissive : COLORS.general.black);
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
                    try { transformControl.detach(); } catch (e) {}
                } else {
                    transformControl.enabled = true;
                }
                try { if (transformMode === 'rotate') transformControl.setSpace('local'); else transformControl.setSpace('world'); } catch(e){}
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
            // TODO: dispose geometries/materials if needed
        }
    };

    return api;
}
