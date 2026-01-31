import * as THREE from 'three';

// Update controlAnchor attachment based on current selection
export function updateControlAttachment({ threeRef, selectedAtomIds, editMode, atoms }) {
    const { transformControl, atomMeshes, scene, controlAnchor, atomInstancedMesh, isInstanced, atomIdToInstanceId } = threeRef.current;

    if (!transformControl) return;

    if (selectedAtomIds.length > 0 && editMode === 'SELECT') {
        const center = new THREE.Vector3();
        let count = 0;
        const tmp = new THREE.Object3D();

        selectedAtomIds.forEach(id => {
            if (atomMeshes.has(id)) {
                center.add(atomMeshes.get(id).position);
                count++;
            } else if (isInstanced && atomInstancedMesh && atomIdToInstanceId.has(id)) {
                const idx = atomIdToInstanceId.get(id);
                try {
                    atomInstancedMesh.getMatrixAt(idx, tmp.matrix);
                    tmp.matrix.decompose(tmp.position, tmp.quaternion, tmp.scale);
                    center.add(tmp.position);
                    count++;
                } catch (e) {}
            }
        });

        if (count > 0) {
            center.divideScalar(count);
            controlAnchor.position.copy(center);
            controlAnchor.quaternion.identity();
            controlAnchor.scale.set(1, 1, 1);
            controlAnchor.updateMatrixWorld();

            try { transformControl.attach(controlAnchor); } catch (e) {}
            try { if (!scene.children.includes(transformControl)) scene.add(transformControl); } catch (e) {}
        }
    } else {
        try { transformControl.detach(); } catch (e) {}
    }
}
