import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { MathUtils } from '../utils/math';
import { parse } from '../utils/parsers';

export function useMolecularState() {
    // Layers State
    const [layers, setLayers] = useState([{ id: 'layer-0', name: 'Layer 1', visible: true, opacity: 1, lattice: [[10, 0, 0], [0, 10, 0], [0, 0, 10]] }]);
    const [activeLayerId, setActiveLayerId] = useState('layer-0');
    const [atoms, setAtoms] = useState([]);

    // Independent Lattice State (decoupled from active layer)
    const [currentLattice, setCurrentLattice] = useState([[10, 0, 0], [0, 10, 0], [0, 0, 10]]);
    const [currentLatticeSourceId, setCurrentLatticeSourceId] = useState('layer-0');
    const lattice = currentLattice;

    const setLattice = useCallback((newLattice, sourceId = null) => {
        setCurrentLattice(newLattice);
        if (sourceId) setCurrentLatticeSourceId(sourceId);
    }, []);

    // Undo history: stack of { atoms, layers, lattice, activeLayerId, latticeSourceId }
    const historyRef = useRef([]);
    const isUndoingRef = useRef(false);
    const MAX_HISTORY = 100;

    const saveStateToHistory = useCallback((prevAtoms, prevLattice, prevLayers, prevActiveId, prevSourceId) => {
        if (isUndoingRef.current) return;
        const snap = {
            atoms: prevAtoms ? prevAtoms.map(a => ({ ...a })) : [],
            layers: prevLayers ? JSON.parse(JSON.stringify(prevLayers)) : [],
            lattice: prevLattice,
            activeLayerId: prevActiveId,
            latticeSourceId: prevSourceId
        };
        historyRef.current.push(snap);
        if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    }, []);

    const undo = useCallback(() => {
        const h = historyRef.current;
        if (!h || h.length === 0) return;
        const last = h.pop();
        isUndoingRef.current = true;
        setAtoms(last.atoms || []);
        if (last.layers) setLayers(last.layers);
        if (last.lattice !== undefined) setCurrentLattice(last.lattice);
        if (last.activeLayerId) setActiveLayerId(last.activeLayerId);
        if (last.latticeSourceId) setCurrentLatticeSourceId(last.latticeSourceId);
        
        // allow state push suppression to end on next tick
        setTimeout(() => { isUndoingRef.current = false; }, 0);
    }, []);

    // Keyboard handler for Ctrl+Z
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                undo();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [undo]);

    // Operations

    const handleSupercell = useCallback((mode, diag, matrix) => {
        const currentLatticeVal = lattice;
        if (!currentLatticeVal) return;

        let M = mode === 'diag' ? [[diag[0], 0, 0], [0, diag[1], 0], [0, 0, diag[2]]] : matrix;
        if (Math.abs(MathUtils.det3x3(M)) < 1e-3) {
            throw new Error('Invalid Matrix');
        }

        const newLattice = MathUtils.matMul3x3(M, currentLatticeVal);
        const invM = MathUtils.inv3x3(M);

        // Filter atoms
        const activeAtoms = atoms.filter(a => a.layerId === activeLayerId);
        const otherAtoms = atoms.filter(a => a.layerId !== activeLayerId);

        const newActiveAtoms = [];
        let maxId = atoms.length > 0 ? Math.max(...atoms.map(a => a.id)) : -1;

        const range = Math.ceil(Math.max(...M.flat().map(Math.abs))) + 1;
        // Assume current atoms store Cartesian, we need fractional in OLD lattice first
        const invOldL = MathUtils.inv3x3(currentLatticeVal);

        // Pre-calc fractional for active atoms
        const oldFracs = activeAtoms.map(a => ({ ...a, f: MathUtils.multiplyMatrixVector(invOldL, [a.x, a.y, a.z]) }));

        for (let i = -range; i <= range; i++) {
            for (let j = -range; j <= range; j++) {
                for (let k = -range; k <= range; k++) {
                    oldFracs.forEach(atom => {
                        const fOldShift = [atom.f[0] + i, atom.f[1] + j, atom.f[2] + k];
                        // f_new = f_old * M_inv (row vector logic approx)
                        const [fx, fy, fz] = MathUtils.multiplyMatrixVector(invM, fOldShift);

                        if (fx >= -0.001 && fx < 0.999 && fy >= -0.001 && fy < 0.999 && fz >= -0.001 && fz < 0.999) {
                            const [cx, cy, cz] = MathUtils.multiplyMatrixVector(newLattice, [fx, fy, fz]);
                            newActiveAtoms.push({ id: ++maxId, element: atom.element, x: cx, y: cy, z: cz, layerId: activeLayerId });
                        }
                    });
                }
            }
        }
        saveStateToHistory(atoms, lattice, layers, activeLayerId, currentLatticeSourceId);
        setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, lattice: newLattice } : l));
        setCurrentLattice(newLattice);
        setAtoms([...otherAtoms, ...newActiveAtoms]);
    }, [atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId]);

    const handleVacuum = useCallback((size, axis = 2) => {
        const currentLatticeVal = lattice;
        if (!currentLatticeVal) return;
        
        const oldLen = Math.sqrt(currentLatticeVal[axis][0] ** 2 + currentLatticeVal[axis][1] ** 2 + currentLatticeVal[axis][2] ** 2);
        const ratio = (oldLen + size) / oldLen;
        const newL = [...currentLatticeVal];
        newL[axis] = currentLatticeVal[axis].map(v => v * ratio);
        
        saveStateToHistory(atoms, lattice, layers, activeLayerId, currentLatticeSourceId);
        setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, lattice: newL } : l));
        setCurrentLattice(newL);
    }, [atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId]);

    const handleScaleLattice = useCallback((scaleX = 1, scaleY = 1, scaleZ = 1) => {
        const currentLatticeVal = lattice;
        if (!currentLatticeVal) return;
        if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY) || !Number.isFinite(scaleZ)) throw new Error('Invalid scale factors');
        if (scaleX <= 0 || scaleY <= 0 || scaleZ <= 0) throw new Error('Scale factors must be > 0');
        
        const newL = [
            [currentLatticeVal[0][0] * scaleX, currentLatticeVal[0][1] * scaleX, currentLatticeVal[0][2] * scaleX],
            [currentLatticeVal[1][0] * scaleY, currentLatticeVal[1][1] * scaleY, currentLatticeVal[1][2] * scaleY],
            [currentLatticeVal[2][0] * scaleZ, currentLatticeVal[2][1] * scaleZ, currentLatticeVal[2][2] * scaleZ]
        ];
        
        saveStateToHistory(atoms, lattice, layers, activeLayerId, currentLatticeSourceId);
        setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, lattice: newL } : l));
        setCurrentLattice(newL);
    }, [atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId]);

    const addAtoms = useCallback((newAtoms, newLat, createNewLayer = false) => {
        let targetLayerId = activeLayerId;
        const isFirstImport = atoms.length === 0;
        
        if (createNewLayer) {
            const id = `layer-${Date.now()}`;
            const nameLayer = `Layer ${layers.length + 1}`;
            const newLayer = { id, name: nameLayer, visible: true, opacity: 1, lattice: newLat || null };
            setLayers(prev => [newLayer, ...prev]);
            setActiveLayerId(id);
            targetLayerId = id;

            if (isFirstImport && newLat) {
                setCurrentLattice(newLat);
                setCurrentLatticeSourceId(id);
            }
        }

        const maxId = atoms && atoms.length ? Math.max(...atoms.map(a => a.id)) : -1;
        const mapped = (newAtoms || []).map((a, i) => ({ ...a, id: maxId + 1 + i, layerId: targetLayerId }));
        
        setAtoms(prev => {
            saveStateToHistory(prev, lattice, layers, activeLayerId, currentLatticeSourceId);
            if (createNewLayer) {
                return [...prev, ...mapped];
            } else {
                const others = prev.filter(a => a.layerId !== targetLayerId);
                return [...others, ...mapped];
            }
        });

        if (!createNewLayer) {
            setLayers(prev => prev.map(l => l.id === targetLayerId ? { ...l, lattice: newLat || null } : l));
            if (isFirstImport && newLat) {
                setCurrentLattice(newLat);
                setCurrentLatticeSourceId(targetLayerId);
            } else if (newLat && currentLatticeSourceId === targetLayerId) {
                setCurrentLattice(newLat);
            }
        }
        
        return mapped.map(m => m.id); // Return new IDs for selection
    }, [atoms, lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId]);

    const updateAtoms = useCallback((updater) => {
        setAtoms(prev => {
            saveStateToHistory(prev, lattice, layers, activeLayerId, currentLatticeSourceId);
            return updater(prev);
        });
    }, [lattice, layers, activeLayerId, saveStateToHistory, currentLatticeSourceId]);

    return {
        atoms,
        lattice,
        layers,
        activeLayerId,
        setAtoms,
        setLattice,
        setLayers,
        setActiveLayerId,
        undo,
        handleSupercell,
        handleVacuum,
        handleScaleLattice,
        addAtoms,
        updateAtoms,
        saveStateToHistory
    };
}
