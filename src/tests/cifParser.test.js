import { describe, it, expect } from 'vitest';
import { parse } from '../utils/parsers/cifParser';

describe('cifParser', () => {
    it('should parse a valid CIF file', async () => {
        const cifContent = `
data_test
_cell_length_a 10.0
_cell_length_b 10.0
_cell_length_c 10.0
_cell_angle_alpha 90.0
_cell_angle_beta 90.0
_cell_angle_gamma 90.0

loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
Si1 Si 0.0 0.0 0.0
O1 O 0.5 0.5 0.5
`;
        const { atoms, lattice } = await parse(cifContent);
        
        expect(lattice).toBeDefined();
        // For cubic 10x10x10, lattice vectors should be along axes
        expect(lattice[0]).toEqual([10, 0, 0]);
        expect(lattice[1][0]).toBeCloseTo(0); // b vector x
        expect(lattice[1][1]).toBeCloseTo(10); // b vector y
        
        expect(atoms.length).toBe(2);
        expect(atoms[0].element).toBe('Si');
        expect(atoms[0].x).toBe(0);
        expect(atoms[1].element).toBe('O');
        // 0.5 * 10 = 5
        expect(atoms[1].x).toBeCloseTo(5);
        expect(atoms[1].y).toBeCloseTo(5);
        expect(atoms[1].z).toBeCloseTo(5);
    });

    it('should throw error if no atoms found', async () => {
        const invalidContent = `data_empty`;
        await expect(parse(invalidContent)).rejects.toThrow('CIF parsing failed');
    });
});
