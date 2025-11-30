import { useState, useEffect } from 'react';
import * as THREE from 'three';

export const useBoxSelection = (containerRef, threeRef, atoms, activeLayerId, onBoxSelect) => {
    const [selectionBox, setSelectionBox] = useState(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let isSelecting = false;
        let startPos = { x: 0, y: 0 };

        const onMouseDown = (e) => {
            if (e.shiftKey && e.button === 0) { // Shift + Left Click
                isSelecting = true;
                threeRef.current.isBoxSelecting = true;
                if (threeRef.current.controls) threeRef.current.controls.enabled = false;
                
                const rect = container.getBoundingClientRect();
                startPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                setSelectionBox({ left: startPos.x, top: startPos.y, width: 0, height: 0 });
                e.preventDefault(); 
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
            if (threeRef.current.controls) threeRef.current.controls.enabled = true;
            
            const rect = container.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            const left = Math.min(startPos.x, currentX);
            const top = Math.min(startPos.y, currentY);
            const width = Math.abs(currentX - startPos.x);
            const height = Math.abs(currentY - startPos.y);
            const right = left + width;
            const bottom = top + height;

            if (width < 5 && height < 5) {
                setSelectionBox(null);
                threeRef.current.isBoxSelecting = false;
                return;
            }

            const { camera, atomMeshes } = threeRef.current;
            const selectedIds = [];
            
            // Filter atoms in active layer
            const activeLayerAtomIds = new Set(atoms.filter(a => a.layerId === activeLayerId).map(a => a.id));
            
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
    }, [containerRef, threeRef, atoms, activeLayerId, onBoxSelect]);

    return selectionBox;
};
