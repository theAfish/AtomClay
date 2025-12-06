import * as THREE from 'three';

export function createResizeHandler(container, camera, renderer) {
    return () => {
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width));
        const h = Math.max(1, Math.floor(rect.height));
        if (w === 0 || h === 0) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h, true);
        try {
            renderer.domElement.style.display = 'block';
            renderer.domElement.style.width = '100%';
            renderer.domElement.style.height = '100%';
        } catch (e) {}
    };
}

export function createAnimateLoop({ controls, renderer, scene, camera, drawGizmoRef, threeRef, extraUpdate } = {}) {
    let animationId = null;

    const loop = () => {
        animationId = requestAnimationFrame(loop);
        try { if (controls && controls.update) controls.update(); } catch (e) {}

        // Smooth theme transition for background
        try {
            if (threeRef && threeRef.currentBackgroundColor && threeRef.targetBackgroundColor && !threeRef.currentBackgroundColor.equals(threeRef.targetBackgroundColor)) {
                threeRef.currentBackgroundColor.lerp(threeRef.targetBackgroundColor, threeRef.themeTransitionSpeed || 0.05);
                if (scene && scene.background) scene.background.copy(threeRef.currentBackgroundColor);
            }
        } catch (e) {}

        // lattice color
        try {
            if (threeRef && threeRef.latticeMaterial && threeRef.currentLatticeColor && threeRef.targetLatticeColor && !threeRef.currentLatticeColor.equals(threeRef.targetLatticeColor)) {
                threeRef.currentLatticeColor.lerp(threeRef.targetLatticeColor, threeRef.themeTransitionSpeed || 0.05);
                threeRef.latticeMaterial.color.copy(threeRef.currentLatticeColor);
            }
        } catch (e) {}

        // any renderer-specific updates (eg. outlineMaterials)
        try { if (typeof extraUpdate === 'function') extraUpdate(threeRef); } catch (e) {}

        try { renderer.render(scene, camera); } catch (e) {}
        try { if (drawGizmoRef && drawGizmoRef.current) drawGizmoRef.current(); } catch (e) {}
    };

    return {
        start() { if (!animationId) loop(); },
        stop() { if (animationId) cancelAnimationFrame(animationId); animationId = null; }
    };
}

export function setupClickHandlers(domElement, camera, transformControl, threeRef, api, onAtomClick) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let mouseDownPos = { x: 0, y: 0 };

    const onMouseDownClickCheck = (e) => { mouseDownPos = { x: e.clientX, y: e.clientY }; };

    const onClick = (e) => {
        const dist = Math.sqrt((e.clientX - mouseDownPos.x) ** 2 + (e.clientY - mouseDownPos.y) ** 2);
        const clickThreshold = (api && api._clickThreshold) || (api && api._latestProps && api._latestProps.clickThreshold) || 5;
        if (dist > clickThreshold) return;
        if (transformControl && transformControl.dragging) return;
        if (threeRef.isDragging) return;
        if (threeRef.isBoxSelecting) return;

        const rect = domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        let intersects = [];
        if (threeRef.isInstanced && threeRef.atomInstancedMesh) intersects = raycaster.intersectObject(threeRef.atomInstancedMesh);
        else intersects = raycaster.intersectObjects(Array.from(threeRef.atomMeshes.values()));

        const currentAtoms = api._latestProps ? api._latestProps.atoms || [] : [];
        const currentLayerId = api._latestProps ? api._latestProps.activeLayerId : null;
        const activeLayerAtomIds = new Set(currentAtoms.filter(a => a.layerId === currentLayerId).map(a => a.id));

        const validIntersects = [];
        for (let hit of intersects) {
            let atomId;
            if (threeRef.isInstanced) atomId = threeRef.instanceIdToAtomId[hit.instanceId];
            else atomId = hit.object.userData && hit.object.userData.id;
            if (activeLayerAtomIds.has(atomId)) validIntersects.push(atomId);
        }

        if (validIntersects.length > 0) {
            if (onAtomClick) onAtomClick(validIntersects[0], e.ctrlKey || e.metaKey);
        } else {
            if (onAtomClick) onAtomClick(null, e.ctrlKey || e.metaKey);
        }
    };

    domElement.addEventListener('mousedown', onMouseDownClickCheck);
    domElement.addEventListener('click', onClick);

    return {
        raycaster,
        mouse,
        removeListeners() {
            try { domElement.removeEventListener('mousedown', onMouseDownClickCheck); } catch (e) {}
            try { domElement.removeEventListener('click', onClick); } catch (e) {}
        }
    };
}
