import * as THREE from 'three';
import { DEFAULTS } from '../../constants/defaults';

// Handles the dragging-changed event for TransformControls
export function handleDraggingChanged(event, { threeRef, controls, onAtomsMoveEnd, selectedAtomIds }) {
    const current = threeRef.current;
    const { controlAnchor, atomMeshes, dragStartPos, initialAtomPositions } = current;

    if (event.value) {
        // Drag Start
        current.isDragging = true;
        if (controls) controls.enabled = false;
        dragStartPos.copy(controlAnchor.position);
        current.initialAnchorPos = controlAnchor.position.clone();
        if (!current.initialAnchorQuaternion) current.initialAnchorQuaternion = new THREE.Quaternion();
        if (!current.initialAnchorScale) current.initialAnchorScale = new THREE.Vector3(1,1,1);
        current.initialAnchorQuaternion.copy(controlAnchor.quaternion);
        current.initialAnchorScale.copy(controlAnchor.scale);
        initialAtomPositions.clear();
        current.initialAtomPositionsRelative = new Map();
        current.initialAtomPositionsRelativeLocal = new Map();

        const dummy = new THREE.Object3D();
        const { atomInstancedMesh, isInstanced, atomIdToInstanceId } = current;

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
                const relWorld = pos.clone().sub(controlAnchor.position);
                current.initialAtomPositionsRelative.set(id, relWorld);
                const invQ = current.initialAnchorQuaternion.clone().invert();
                const relLocal = relWorld.clone().applyQuaternion(invQ);
                current.initialAtomPositionsRelativeLocal.set(id, relLocal);
            }
        });
    } else {
        // Drag End
        if (controls) controls.enabled = true;
        const delta = new THREE.Vector3().subVectors(controlAnchor.position, dragStartPos);
        const moves = [];
        const mode = (current.transformMode) || 'translate';

        selectedAtomIds.forEach(id => {
            if (initialAtomPositions.has(id)) {
                const initPos = initialAtomPositions.get(id);
                let newPos = initPos.clone();
                if (mode === 'translate') {
                    newPos.add(delta);
                } else if (mode === 'rotate') {
                    const q1 = controlAnchor.quaternion.clone();
                    const relLocal = current.initialAtomPositionsRelativeLocal.get(id).clone();
                    const relNewWorld = relLocal.applyQuaternion(q1);
                    newPos = controlAnchor.position.clone().add(relNewWorld);
                } else if (mode === 'scale') {
                    const s0 = current.initialAnchorScale.clone();
                    const s1 = controlAnchor.scale.clone();
                    const scaleVec = new THREE.Vector3(s1.x / s0.x, s1.y / s0.y, s1.z / s0.z);
                    const relLocal = current.initialAtomPositionsRelativeLocal.get(id).clone();
                    const relLocalScaled = new THREE.Vector3(relLocal.x * scaleVec.x, relLocal.y * scaleVec.y, relLocal.z * scaleVec.z);
                    const relNewWorld = relLocalScaled.applyQuaternion(controlAnchor.quaternion);
                    newPos = controlAnchor.position.clone().add(relNewWorld);
                }
                moves.push({ id, x: newPos.x, y: newPos.y, z: newPos.z });
            }
        });

        if (moves.length > 0 && typeof onAtomsMoveEnd === 'function') {
            onAtomsMoveEnd(moves);
        }

        setTimeout(() => {
            current.isDragging = false;
        }, DEFAULTS.INTERACTION.DRAG_DELAY);
    }
}

// Handles the 'change' event while dragging; updates positions in real-time
export function handleTransformChange({ threeRef, selectedAtomIds }) {
    const current = threeRef.current;
    const { transformControl, controlAnchor, dragStartPos, initialAtomPositions } = current;
    if (!transformControl || !transformControl.dragging) return;

    const mode = (current.transformMode) || 'translate';
    const dummy = new THREE.Object3D();
    const { atomInstancedMesh, isInstanced, atomIdToInstanceId, atomMeshes } = current;

    selectedAtomIds.forEach(id => {
        let newPos = null;
        if (initialAtomPositions.has(id)) {
            if (mode === 'translate') {
                const delta = new THREE.Vector3().subVectors(controlAnchor.position, dragStartPos);
                const initPos = initialAtomPositions.get(id);
                newPos = new THREE.Vector3().addVectors(initPos, delta);
            } else if (mode === 'rotate') {
                const q1 = controlAnchor.quaternion.clone();
                if (current.initialAtomPositionsRelativeLocal.has(id)) {
                    const relLocal = current.initialAtomPositionsRelativeLocal.get(id).clone();
                    const relNewWorld = relLocal.applyQuaternion(q1);
                    newPos = controlAnchor.position.clone().add(relNewWorld);
                }
            } else if (mode === 'scale') {
                const s0 = current.initialAnchorScale.clone();
                const s1 = controlAnchor.scale.clone();
                const scaleVec = new THREE.Vector3(s1.x / s0.x, s1.y / s0.y, s1.z / s0.z);
                if (current.initialAtomPositionsRelativeLocal.has(id)) {
                    const relLocal = current.initialAtomPositionsRelativeLocal.get(id).clone();
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
