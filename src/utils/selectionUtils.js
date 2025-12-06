import * as THREE from 'three';
import { getElementProp } from '../constants/elements';
import { COLORS } from '../constants/theme';

export const updateSelectionVisuals = (rendererRef, threeRef, selectedAtomIds, atoms, currentRenderer, visibleAtoms) => {
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
};