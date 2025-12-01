import { describe, it, expect } from 'vitest';
import { MathUtils } from '../utils/math';

describe('MathUtils', () => {
    describe('multiplyMatrixVector', () => {
        it('should correctly multiply a 3x3 matrix by a 3D vector', () => {
            const matrix = [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]
            ];
            const vector = [1, 2, 3];
            const result = MathUtils.multiplyMatrixVector(matrix, vector);
            expect(result).toEqual([1, 2, 3]);
        });

        it('should handle non-identity matrices', () => {
            const matrix = [
                [2, 0, 0],
                [0, 2, 0],
                [0, 0, 2]
            ];
            const vector = [1, 2, 3];
            const result = MathUtils.multiplyMatrixVector(matrix, vector);
            expect(result).toEqual([2, 4, 6]);
        });

        it('should handle non-symmetric matrices correctly', () => {
            const matrix = [
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9]
            ];
            const vector = [1, 1, 1];
            const result = MathUtils.multiplyMatrixVector(matrix, vector);
            expect(result).toEqual([6, 15, 24]);
        });
    });

    describe('det3x3', () => {
        it('should calculate the determinant of a 3x3 matrix', () => {
            const matrix = [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]
            ];
            expect(MathUtils.det3x3(matrix)).toBe(1);
        });

        it('should return 0 for singular matrices', () => {
            const matrix = [
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9]
            ];
            expect(MathUtils.det3x3(matrix)).toBe(0);
        });
    });

    describe('inv3x3', () => {
        it('should calculate the inverse of a 3x3 matrix', () => {
            const matrix = [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]
            ];
            expect(MathUtils.inv3x3(matrix)).toEqual(matrix);
        });

        it('should return null for singular matrices', () => {
            const matrix = [
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9]
            ];
            expect(MathUtils.inv3x3(matrix)).toBeNull();
        });
    });

    describe('matMul3x3', () => {
        it('should multiply two 3x3 matrices', () => {
            const a = [
                [1, 0, 0],
                [0, 1, 0],
                [0, 0, 1]
            ];
            const b = [
                [2, 0, 0],
                [0, 2, 0],
                [0, 0, 2]
            ];
            const result = MathUtils.matMul3x3(a, b);
            expect(result).toEqual(b);
        });
    });
});
