import React, { useEffect } from 'react';
import * as THREE from 'three';
import { useMolecularContext } from '../../../context/MolecularContext';
import { useViewerContext } from './ViewerContext';
import { useBoxSelection } from '../../../hooks/useBoxSelection';
import { handleDraggingChanged, handleTransformChange } from '../../../logic/transformHandlers';
import { updateControlAttachment } from '../../../logic/transformAttachment';
import { applyTransformMode } from '../../../logic/transformMode';

const ViewerControls = () => {
    const { 
        atoms, activeLayerId, selectedAtomIds, onBoxSelect, onAtomsMoveEnd,
        transformMode, editMode 
    } = useMolecularContext();
    const { threeRef, containerRef } = useViewerContext();

    // Box Selection Hook
    const selectionBox = useBoxSelection(containerRef, threeRef, atoms, activeLayerId, onBoxSelect);

    // Transform Controls Events
    useEffect(() => {
        const { transformControl, controls } = threeRef.current;
        
        // Ensure tracking objects exist (should be handled by context init, but double check)
        if (!threeRef.current.initialAnchorQuaternion) threeRef.current.initialAnchorQuaternion = new THREE.Quaternion();
        
        if (!transformControl) return;

        const onDragChange = (event) => handleDraggingChanged(event, { threeRef, controls, onAtomsMoveEnd, selectedAtomIds });
        const onChange = () => handleTransformChange({ threeRef, selectedAtomIds });

        transformControl.addEventListener('dragging-changed', onDragChange);
        transformControl.addEventListener('change', onChange);

        return () => {
            try { transformControl.removeEventListener('dragging-changed', onDragChange); } catch (e) {}
            try { transformControl.removeEventListener('change', onChange); } catch (e) {}
        };
    }, [onAtomsMoveEnd, selectedAtomIds, threeRef]);

    // Apply Transform Mode
    useEffect(() => {
        applyTransformMode({ threeRef, transformMode, editMode });
    }, [transformMode, editMode, threeRef]);

    // Update Control Attachment
    useEffect(() => {
        updateControlAttachment({ threeRef, selectedAtomIds, editMode, atoms });
    }, [selectedAtomIds, atoms, editMode, threeRef]);

    if (!selectionBox) return null;

    return (
        <div
            className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none z-50"
            style={{
                left: selectionBox.left,
                top: selectionBox.top,
                width: selectionBox.width,
                height: selectionBox.height
            }}
        />
    );
};

export default ViewerControls;
