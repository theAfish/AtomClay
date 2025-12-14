import { useMemo } from 'react';
import { MathUtils } from '../utils/math';

export const useLatticeInfo = (lattice, activeLayer) => {
    return useMemo(() => {
        // Lattice to display (layer lattice takes precedence)
        const latticeToShow = (activeLayer && activeLayer.lattice) ? activeLayer.lattice : lattice;
        const latticeExists = Array.isArray(latticeToShow) && latticeToShow.length === 3 && Array.isArray(latticeToShow[0]);
        let latticeLens = [0, 0, 0];
        if (latticeExists) {
            latticeLens = [
                Math.sqrt(latticeToShow[0][0] ** 2 + latticeToShow[0][1] ** 2 + latticeToShow[0][2] ** 2),
                Math.sqrt(latticeToShow[1][0] ** 2 + latticeToShow[1][1] ** 2 + latticeToShow[1][2] ** 2),
                Math.sqrt(latticeToShow[2][0] ** 2 + latticeToShow[2][1] ** 2 + latticeToShow[2][2] ** 2),
            ];
        }
        const volume = latticeExists ? Math.abs(MathUtils.det3x3(latticeToShow)) : null;

        return { latticeToShow, latticeExists, latticeLens, volume };
    }, [lattice, activeLayer]);
};
