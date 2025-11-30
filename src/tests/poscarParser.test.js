import { describe, it, expect } from 'vitest';
import { parse } from '../utils/parsers/poscarParser';

describe('poscarParser', () => {
    it('should parse a valid POSCAR file', async () => {
        const poscarContent = `Cubic BN
   3.57
 1.0 0.0 0.0
 0.0 1.0 0.0
 0.0 0.0 1.0
 B N
 1 1
Direct
 0.0 0.0 0.0
 0.5 0.5 0.5
`;
        const { atoms, lattice } = await parse(poscarContent);
        
        expect(lattice).toEqual([
            [3.57, 0, 0],
            [0, 3.57, 0],
            [0, 0, 3.57]
        ]);
        expect(atoms.length).toBe(2);
        expect(atoms[0].element).toBe('B');
        expect(atoms[1].element).toBe('N');
    });

    it('should throw error for invalid format', async () => {
        const invalidContent = `Invalid
File
Content`;
        await expect(parse(invalidContent)).rejects.toThrow('Unrecognized file format');
    });
});
