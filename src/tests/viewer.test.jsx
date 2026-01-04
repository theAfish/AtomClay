import React, { useEffect } from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { MolecularProvider, useMolecularContext } from '../context/MolecularContext';
import { ThemeProvider } from '../context/ThemeContext';
import { DEFAULTS } from '../constants/defaults';
import Viewer from '../components/Viewer';

// Mock renderers so we can inspect controls.target without creating a real WebGL renderer
let createdThree = null;
let createdCustom = null;
vi.mock('../renderers', async () => {
    const actual = await vi.importActual('../renderers');
    // We'll replace createThreeRenderer/createCustomRenderer implementations below in the test file to allow stateful access
    return {
        ...actual,
        createThreeRenderer: () => {
            const inst = {
                threeRef: { scene: null, camera: null, controls: null },
                init(container, opts) {
                    this.threeRef.scene = new THREE.Scene();
                    this.threeRef.camera = new THREE.PerspectiveCamera();
                    this.threeRef.controls = { target: new THREE.Vector3(), update: () => {} };
                    this.threeRef.transformControl = {
                        addEventListener: () => {}, removeEventListener: () => {}, setMode: () => {}, setSpace: () => {}, attach: () => {}, detach: () => {}, enabled: false, dragging: false
                    };
                    this.threeRef.atomMeshes = new Map();
                    this.threeRef.controlAnchor = new THREE.Object3D();
                    createdThree = this;
                    return this.threeRef;
                },
                syncScene() {},
                dispose() {}
            };
            return inst;
        },
        createCustomRenderer: () => {
            const inst = {
                threeRef: { scene: null, camera: null, controls: null },
                init(container, opts) {
                    this.threeRef.scene = new THREE.Scene();
                    this.threeRef.camera = new THREE.PerspectiveCamera();
                    this.threeRef.controls = { target: new THREE.Vector3(), update: () => {} };
                    this.threeRef.transformControl = {
                        addEventListener: () => {}, removeEventListener: () => {}, setMode: () => {}, setSpace: () => {}, attach: () => {}, detach: () => {}, enabled: false, dragging: false
                    };
                    this.threeRef.atomMeshes = new Map();
                    this.threeRef.controlAnchor = new THREE.Object3D();
                    createdCustom = this;
                    return this.threeRef;
                },
                syncScene() {},
                dispose() {}
            };
            return inst;
        }
    };
});

const atoms = [
    { id: '1', x: 1, y: 1, z: 1, element: 'C' },
    { id: '2', x: 3, y: 3, z: 3, element: 'C' }
];

// Helper component used by test to set atoms and switch renderer
const SetAtomsThenSwitch = () => {
    const { setAtoms, changeRenderer } = useMolecularContext();
    useEffect(() => {
        setAtoms(atoms);
        // switch renderer to 'custom-plastic' after atoms set
        changeRenderer('custom-plastic');
    }, []);
    return null;
};

describe('Viewer center update on renderer switch', () => {
    test('preserves center of scene (centroid) when switching renderers', async () => {
            const { container } = render(
                <ThemeProvider>
                    <MolecularProvider>
                        <>
                            <Viewer />
                            <SetAtomsThenSwitch />
                        </>
                    </MolecularProvider>
                </ThemeProvider>
            );

            // Wait for the initial renderer to be created
            await waitFor(() => expect(createdThree).not.toBeNull());

            const lat = DEFAULTS.LATTICE;
            const expected = new THREE.Vector3((lat[0][0]+lat[1][0]+lat[2][0])*0.5, (lat[0][1]+lat[1][1]+lat[2][1])*0.5, (lat[0][2]+lat[1][2]+lat[2][2])*0.5);
            // Wait for the initial renderer's camera target to update
            await waitFor(() => expect(createdThree).not.toBeNull());
            await waitFor(() => expect(createdThree.threeRef.controls.target.equals(expected)).toBeTruthy());
            // Wait for renderer to switch to custom via SetAtomsThenSwitch
            await waitFor(() => expect(createdCustom).not.toBeNull());
            // Wait for the custom renderer's camera target to be updated as well
            await waitFor(() => expect(createdCustom.threeRef.controls.target.equals(expected)).toBeTruthy());

        // At this point our mocked renderers set controls.target to centroid via Viewer effect
        // Already validated above via waitFor assertions
        expect(createdThree).not.toBeNull();
        expect(createdCustom).not.toBeNull();
    });
});
