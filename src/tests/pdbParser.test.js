import { describe, it, expect } from 'vitest';
import { parse } from '../utils/parsers/pdbParser';

describe('pdbParser', () => {
    it('should parse a valid PDB file', async () => {
        // Minimal PDB line format
        // ATOM      1  N   ALA A   1      11.104   6.134  -6.504  1.00  0.00           N
        const pdbContent = `ATOM      1  N   ALA A   1      11.104   6.134  -6.504  1.00  0.00           N
HETATM    2  CA  ALA A   1      11.639   6.071  -5.147  1.00  0.00           C
`;
        const { atoms, lattice } = await parse(pdbContent);
        
        expect(atoms.length).toBe(2);
        expect(atoms[0].element).toBe('N');
        expect(atoms[0].x).toBe(11.104);
        expect(atoms[1].element).toBe('C');
        expect(atoms[1].x).toBe(11.639);
        expect(lattice).toBeNull();
    });

    it('should throw error if no atoms found', async () => {
        const invalidContent = `HEADER    PROTEIN`;
        await expect(parse(invalidContent)).rejects.toThrow('PDB parsing failed');
    });
});
