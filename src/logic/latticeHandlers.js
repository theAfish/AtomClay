import { calculateSupercell, calculateVacuum, calculateScaleLattice } from '../utils/structureOperations';

export function handleSupercell(atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId, setLayers, setCurrentLattice, setAtoms, mode, diag, matrix) {
    const currentLatticeVal = lattice;
    if (!currentLatticeVal) return;

    // Filter atoms
    const activeAtoms = atoms.filter(a => a.layerId === activeLayerId);
    const otherAtoms = atoms.filter(a => a.layerId !== activeLayerId);

    let maxId = atoms.length > 0 ? Math.max(...atoms.map(a => a.id)) : -1;

    const { newAtoms, newLattice } = calculateSupercell(activeAtoms, currentLatticeVal, mode, diag, matrix, maxId);

    saveStateToHistory(atoms, lattice, layers, activeLayerId, currentLatticeSourceId);
    setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, lattice: newLattice } : l));
    setCurrentLattice(newLattice);
    setAtoms([...otherAtoms, ...newAtoms]);
}

export function handleVacuum(atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId, setLayers, setCurrentLattice, size, axis = 2) {
    const currentLatticeVal = lattice;
    if (!currentLatticeVal) return;

    // Filter atoms for active layer if needed, but vacuum usually applies to the whole cell or active layer's cell
    // Here we pass all atoms but we might only want to affect active layer's atoms if we were modifying them.
    // Since calculateVacuum returns identity for atoms, it's safe.
    const activeAtoms = atoms.filter(a => a.layerId === activeLayerId);
    const otherAtoms = atoms.filter(a => a.layerId !== activeLayerId);

    const { newAtoms, newLattice } = calculateVacuum(activeAtoms, currentLatticeVal, size, axis);

    saveStateToHistory(atoms, lattice, layers, activeLayerId, currentLatticeSourceId);
    setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, lattice: newLattice } : l));
    setCurrentLattice(newLattice);
    // If atoms were modified, we would update them here:
    // setAtoms([...otherAtoms, ...newAtoms]);
}

export function handleScaleLattice(atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId, setLayers, setCurrentLattice, scaleX = 1, scaleY = 1, scaleZ = 1) {
    const currentLatticeVal = lattice;
    if (!currentLatticeVal) return;

    const activeAtoms = atoms.filter(a => a.layerId === activeLayerId);
    const otherAtoms = atoms.filter(a => a.layerId !== activeLayerId);

    const { newAtoms, newLattice } = calculateScaleLattice(activeAtoms, currentLatticeVal, scaleX, scaleY, scaleZ);

    saveStateToHistory(atoms, lattice, layers, activeLayerId, currentLatticeSourceId);
    setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, lattice: newLattice } : l));
    setCurrentLattice(newLattice);
    // If atoms were modified:
    // setAtoms([...otherAtoms, ...newAtoms]);
}

export function handleSetLattice(atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId, setLayers, setCurrentLattice, newLattice) {
    const currentLatticeVal = lattice;
    if (!currentLatticeVal || !newLattice) return;

    // Validate newLattice shape
    if (!Array.isArray(newLattice) || newLattice.length !== 3 || !Array.isArray(newLattice[0])) {
        throw new Error('Invalid lattice matrix');
    }

    // Atoms remain unchanged in Cartesian coordinates when replacing lattice matrix
    saveStateToHistory(atoms, lattice, layers, activeLayerId, currentLatticeSourceId);
    setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, lattice: newLattice } : l));
    setCurrentLattice(newLattice);
}
