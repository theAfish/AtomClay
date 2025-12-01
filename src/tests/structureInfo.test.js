import { describe, it, expect } from 'vitest';
import { StructureInfo } from '../utils/structureInfo';

describe('StructureInfo', () => {
    it('generates an empty composition for no atoms', () => {
        expect(StructureInfo.getCompositionString([])).toBe('');
    });

    it('generates element counts and string', () => {
        const atoms = [
            { element: 'C' },
            { element: 'H' },
            { element: 'H' }
        ];
        expect(StructureInfo.getCompositionString(atoms)).toBe('C H2');
    });

    it('handles unknown or empty element names', () => {
        const atoms = [
            { element: '' },
            { element: null },
            { element: 'O' },
        ];
        // Should use placeholder '?' for empty/invalid element
        const comp = StructureInfo.getCompositionFromAtoms(atoms);
        expect(comp['?']).toBe(2);
        expect(comp['O']).toBe(1);
    });
});
