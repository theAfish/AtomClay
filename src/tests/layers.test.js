import { describe, it, expect } from 'vitest';
import React, { useEffect } from 'react';
import { render } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { useMolecularState } from '../hooks/useMolecularState';

describe('layers rename', () => {
    it('should rename a layer', async () => {
        // Use a small wrapper component to get access to the hook's returned value
        let hookValue = null;
        function HookWrapper() {
            hookValue = useMolecularState();
            // Keep value in a ref via effect to ensure it updates across renders
            useEffect(() => {
                // no-op; having effect ensures hookValue updates after render
            });
            return null;
        }

        render(React.createElement(HookWrapper));

        // Initial assertion
        expect(hookValue).toBeTruthy();
        const layer = hookValue.layers[0];
        expect(layer.name).toBe('Layer 1');

        act(() => {
            hookValue.renameLayer(layer.id, 'New Name');
        });

        // After act, the hookValue should have updated
        expect(hookValue.layers.find(l => l.id === layer.id).name).toBe('New Name');
    });
});
