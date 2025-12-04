import { describe, test, expect, beforeEach } from 'vitest';
import { createCustomRenderer } from '../src/renderers/customRenderer';
import * as THREE from 'three';

// Basic test for bond instancing positions in custom renderer
describe('customRenderer bonds', () => {
    let container;
    let rendererApi;
    beforeEach(() => {
        // Create a container element for the renderer to attach a canvas to
        container = global.document.createElement('div');
        // Mock client dimensions used by the renderer
        Object.defineProperty(container, 'clientWidth', { get: () => 800, configurable: true });
        Object.defineProperty(container, 'clientHeight', { get: () => 600, configurable: true });
        document.body.appendChild(container);
        rendererApi = createCustomRenderer();
    });

    test('bond instances are positioned away from origin', () => {
        // Avoid creating WebGLRenderer in test (jsdom has no webgl). Create minimal scene/camera instead.
        rendererApi.threeRef.scene = new THREE.Scene();
        rendererApi.threeRef.camera = new THREE.PerspectiveCamera();
        const atoms = [
            { id: 'a1', x: 0, y: 0, z: 0, element: 'C' },
            { id: 'a2', x: 0, y: 0, z: 1.2, element: 'C' }
        ];
        rendererApi.syncScene({ atoms, lattice: null, layers: [], activeLayerId: null, theme: 'dark' });

        const scene = rendererApi.threeRef.scene;
        const bondMeshes = [];
        scene.traverse(c => {
            if (c.userData && c.userData.type === 'bond') bondMeshes.push(c);
        });
        expect(bondMeshes.length).toBeGreaterThan(0);

        const instMesh = bondMeshes[0];
        expect(instMesh).toBeDefined();
        expect(instMesh.instanceMatrix).toBeDefined();

        // Inspect first instance matrix to ensure translation is not 0,0,0
        const m = new THREE.Matrix4();
        instMesh.getMatrixAt(0, m);
        const pos = new THREE.Vector3();
        pos.setFromMatrixPosition(m);
        expect(pos.length()).toBeGreaterThan(0.1); // bond should be located away from origin
    });
});
