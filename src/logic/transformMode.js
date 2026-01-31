// Apply transform mode and configure TransformControls
export function applyTransformMode({ threeRef, transformMode, editMode }) {
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

        try {
            if (transformMode === 'rotate') transformControl.setSpace('local');
            else transformControl.setSpace('world');
        } catch (e) {}
    }
}
