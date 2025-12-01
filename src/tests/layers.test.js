import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react-hooks';
import { useMolecularState } from '../hooks/useMolecularState';

describe('layers rename', () => {
    it('should rename a layer', () => {
        const { result } = renderHook(() => useMolecularState());
        const { layers, renameLayer } = result.current;
        const layer = layers[0];
        expect(layer.name).toBe('Layer 1');

        act(() => {
            renameLayer(layer.id, 'New Name');
        });

        expect(result.current.layers.find(l => l.id === layer.id).name).toBe('New Name');
    });
});
