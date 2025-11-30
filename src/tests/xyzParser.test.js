import { describe, it, expect } from 'vitest';
import { parse } from '../utils/parsers/xyzParser';

describe('xyzParser', () => {
    it('should parse a valid XYZ file', async () => {
        const xyzContent = `2
Lattice="10.0 0.0 0.0 0.0 10.0 0.0 0.0 0.0 10.0"
H 0.0 0.0 0.0
O 1.0 1.0 1.0
`;
        const { atoms, lattice } = await parse(xyzContent);
        
        expect(atoms.length).toBe(2);
        expect(atoms[0].element).toBe('H');
        expect(atoms[0].x).toBe(0);
        expect(atoms[1].element).toBe('O');
        expect(atoms[1].x).toBe(1);

        expect(lattice).toEqual([
            [10, 0, 0],
            [0, 10, 0],
            [0, 0, 10]
        ]);
    });

    it('should parse XYZ without lattice', async () => {
        const xyzContent = `1
Comment line
H 0.0 0.0 0.0
`;
        const { atoms, lattice } = await parse(xyzContent);
        
        expect(atoms.length).toBe(1);
        expect(lattice).toBeNull();
    });

    it('should throw error for invalid format', async () => {
        const invalidContent = `Invalid`;
        await expect(parse(invalidContent)).rejects.toThrow('XYZ parsing failed');
    });
});
