import { describe, it, expect } from 'vitest';
import { calculateSupercell, calculateVacuum, calculateScaleLattice } from '../utils/structureOperations';

describe('structureOperations', () => {
    const mockAtoms = [
        { id: 1, element: 'H', x: 0, y: 0, z: 0, f: [0, 0, 0] }
    ];
    const mockLattice = [
        [10, 0, 0],
        [0, 10, 0],
        [0, 0, 10]
    ];

    describe('calculateSupercell', () => {
        it('should create a 2x2x2 supercell', () => {
            const diag = [2, 2, 2];
            const { newAtoms, newLattice } = calculateSupercell(mockAtoms, mockLattice, 'diag', diag, null);
            
            expect(newLattice).toEqual([
                [20, 0, 0],
                [0, 20, 0],
                [0, 0, 20]
            ]);
            // 1 atom * 2 * 2 * 2 = 8 atoms
            expect(newAtoms.length).toBe(8);
        });

        it('should throw error for invalid lattice', () => {
            expect(() => calculateSupercell(mockAtoms, null, 'diag', [2, 2, 2], null)).toThrow('Lattice is required');
        });
    });

    describe('calculateVacuum', () => {
        it('should add vacuum along the Z axis', () => {
            const size = 10;
            const { newLattice } = calculateVacuum(mockAtoms, mockLattice, size, 2);
            
            // Original Z is 10, adding 10 vacuum -> 20
            // Ratio is (10+10)/10 = 2
            // New Z vector should be [0, 0, 20]
            expect(newLattice[2]).toEqual([0, 0, 20]);
        });
    });

    describe('calculateScaleLattice', () => {
        it('should scale the lattice', () => {
            const { newLattice } = calculateScaleLattice(mockAtoms, mockLattice, 2, 2, 2);
            
            expect(newLattice).toEqual([
                [20, 0, 0],
                [0, 20, 0],
                [0, 0, 20]
            ]);
        });

        it('should throw error for invalid scale factors', () => {
            expect(() => calculateScaleLattice(mockAtoms, mockLattice, -1, 1, 1)).toThrow('Scale factors must be > 0');
        });
    });
});
