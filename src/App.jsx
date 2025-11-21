import React, { useState, useEffect, useCallback, useRef } from 'react';
import Viewer from './components/Viewer';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import { MathUtils } from './utils/math';
import { parseXYZ } from './utils/parsers';
import { DEMO_POSCAR } from './constants/elements';

function App() {
    // Data State
    const [lattice, setLattice] = useState([[10,0,0],[0,10,0],[0,0,10]]);
    const [atoms, setAtoms] = useState([]);
    
    // UI State
    const [selectedAtomIds, setSelectedAtomIds] = useState([]);
    const [editMode, setEditMode] = useState('SELECT');
    const [targetElement, setTargetElement] = useState('O');
    const [fileError, setFileError] = useState(null);
    // Layers State (minimal)
    const [layers, setLayers] = useState([{ id: 'layer-0', name: 'Layer 1', visible: true, opacity: 1, lattice: lattice }]);
    const [activeLayerId, setActiveLayerId] = useState('layer-0');
    const layerCounterRef = useRef(1);

    // Clear selection when active layer changes
    useEffect(() => {
        setSelectedAtomIds([]);
    }, [activeLayerId]);

    // Actions
    // Undo history: stack of { atoms, lattice }
    const historyRef = useRef([]);
    const isUndoingRef = useRef(false);
    const MAX_HISTORY = 100;

    const saveStateToHistory = useCallback((prevAtoms, prevLattice, prevLayers) => {
        if (isUndoingRef.current) return;
        const snap = {
            atoms: prevAtoms ? prevAtoms.map(a => ({ ...a })) : [],
            lattice: prevLattice ? prevLattice.map(row => row.slice()) : null,
            layers: prevLayers ? JSON.parse(JSON.stringify(prevLayers)) : []
        };
        historyRef.current.push(snap);
        if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    }, []);

    const ensureLayered = useCallback((arr, defaultLayerId) => {
        const d = defaultLayerId || (layers && layers[0] && layers[0].id) || 'layer-0';
        return (arr || []).map(a => (a.layerId ? a : { ...a, layerId: d }));
    }, [layers]);

    const undo = useCallback(() => {
        const h = historyRef.current;
        if (!h || h.length === 0) return;
        const last = h.pop();
        isUndoingRef.current = true;
        setAtoms(last.atoms || []);
        setLattice(last.lattice);
        if (last.layers) setLayers(last.layers);
        setSelectedAtomIds([]);
        // allow state push suppression to end on next tick
        setTimeout(() => { isUndoingRef.current = false; }, 0);
    }, []);

    // keyboard handler for Ctrl+Z
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

    const handleLoad = (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        setFileError(null);
        reader.onerror = () => { setFileError('Unable to read file.'); };
        reader.onload = (ev) => {
            // Support XYZ and POSCAR-like (simple) formats
            try {
                const name = file.name || '';
                const text = ev.target.result;
                if (typeof text !== 'string' || text.trim().length === 0) {
                    setFileError('Empty or unreadable file. Please select a valid .xyz or POSCAR-like file.');
                    return;
                }
                if (name.toLowerCase().endsWith('.xyz')) {
                    const { atoms: newAtoms, lattice: newLat } = parseXYZ(text);
                    if (!newAtoms || newAtoms.length === 0) {
                        setFileError('Could not parse .xyz file. Ensure it contains a valid atom count and coordinates.');
                        return;
                    }
                    // Replace contents of the active layer: remove old atoms in that layer, then add imported atoms
                    {
                        const maxId = atoms && atoms.length ? Math.max(...atoms.map(a => a.id)) : -1;
                        const mapped = (newAtoms || []).map((a, i) => ({ ...a, id: maxId + 1 + i, layerId: activeLayerId }));
                        setAtoms(prev => {
                            saveStateToHistory(prev, lattice, layers);
                            const others = prev.filter(a => a.layerId !== activeLayerId);
                            return [...others, ...mapped];
                        });
                        // Save lattice on this layer
                        setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, lattice: newLat || null } : l));
                        // Update global lattice if none exists or if importing into the base (first) layer
                        if (!lattice || activeLayerId === (layers && layers[0] && layers[0].id)) setLattice(newLat || null);
                        setSelectedAtomIds(mapped.map(m => m.id));
                    }
                    return;
                }

                // Fallback: attempt to parse POSCAR-like format (existing code)
                const lines = text.trim().split('\n').map(l=>l.trim()).filter(l=>l!=='');
                // Basic validation for POSCAR-like minimal structure
                if (lines.length < 6) {
                    setFileError('Unrecognized file format. Supported: .xyz (atom count + coordinates) or POSCAR-like text.');
                    return;
                }
                const scale = parseFloat(lines[1]);
                if (!Number.isFinite(scale) || isNaN(scale)) {
                    setFileError('POSCAR-like parse failed: missing numeric scale on line 2.');
                    return;
                }
                const lat = [];
                let latOk = true;
                for(let i=2;i<=4;i++){
                    const row = lines[i].split(/\s+/).map(x=>parseFloat(x)*scale);
                    if (row.length < 3 || row.some(v => !Number.isFinite(v))) { latOk = false; break; }
                    lat.push(row);
                }
                if (!latOk) { setFileError('POSCAR-like parse failed: invalid lattice vectors.'); return; }

                let elems = [];
                try { elems = lines[5].split(/\s+/).filter(x=>x!=='' && isNaN(parseFloat(x))); } catch(e) { elems = []; }
                let idx = elems.length ? 6 : 5;
                const countsLine = lines[idx] || '';
                const counts = countsLine.split(/\s+/).map(n => parseInt(n,10)).filter(n => Number.isFinite(n));
                if (!counts || counts.length === 0) {
                    setFileError('POSCAR-like parse failed: element counts line missing or invalid.');
                    return;
                }
                let typeLine = lines[idx+1] || '';
                let start = idx+2;
                if(typeLine.toLowerCase().startsWith('s')) { start++; typeLine=lines[idx+2] || ''; }
                const isDirect = /direct|fractional/i.test(typeLine);

                let newAtoms = [];
                let gId = 0;
                let cursor = start;
                let totalExpected = counts.reduce((a,b)=>a+b,0);
                if (lines.length < cursor + totalExpected) {
                    setFileError('POSCAR-like parse failed: not enough coordinate lines for declared atom counts.');
                    return;
                }
                elems = elems.length ? elems : new Array(counts.length).fill('X');
                elems.forEach((el, i) => {
                    for(let c=0; c<counts[i]; c++){
                        const line = lines[cursor++] || '';
                        const cds = line.split(/\s+/).slice(0,3).map(Number);
                        if (cds.length < 3 || cds.some(v => !Number.isFinite(v))) { setFileError('POSCAR-like parse failed: invalid coordinates.'); return; }
                        let x,y,z;
                        if(isDirect) [x,y,z] = MathUtils.multiplyMatrixVector(lat, cds);
                        else [x,y,z] = cds;
                        newAtoms.push({id: gId++, element: el, x, y, z});
                    }
                });
                if (!newAtoms || newAtoms.length === 0) { setFileError('No atoms found in file.'); return; }
                // Replace contents of the active layer: remove old atoms in that layer, then add imported atoms
                {
                    const maxId = atoms && atoms.length ? Math.max(...atoms.map(a => a.id)) : -1;
                    const mapped = (newAtoms || []).map((a, i) => ({ ...a, id: maxId + 1 + i, layerId: activeLayerId }));
                    // Save lattice on this layer
                    setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, lattice: lat || null } : l));
                    // Update global lattice if none exists or if importing into the base (first) layer
                    if (!lattice || activeLayerId === (layers && layers[0] && layers[0].id)) setLattice(lat);
                    setAtoms(prev => {
                        saveStateToHistory(prev, lattice, layers);
                        const others = prev.filter(a => a.layerId !== activeLayerId);
                        return [...others, ...mapped];
                    });
                    setSelectedAtomIds(mapped.map(m => m.id));
                }
            } catch(err) { alert('解析错误'); }
        };
        reader.readAsText(file);
    };

    const handleDownload = () => {
        // Generate POSCAR (requires lattice)
        if (!lattice) return alert('No lattice info available for POSCAR export');
        let s = "AtomClay\n1.0\n";
        lattice.forEach(v => s+=` ${v[0].toFixed(6)} ${v[1].toFixed(6)} ${v[2].toFixed(6)}\n`);
        const groups={};
        atoms.forEach(a=>{ if(!groups[a.element])groups[a.element]=[]; groups[a.element].push(a); });
        const els=Object.keys(groups);
        s+=` ${els.join(' ')}\n ${els.map(e=>groups[e].length).join(' ')}\nDirect\n`;
        const invL = MathUtils.inv3x3(lattice);
        els.forEach(e=>{
            groups[e].forEach(a=>{
                const [fx,fy,fz] = MathUtils.multiplyMatrixVector(invL, [a.x,a.y,a.z]);
                const w = v => (v-Math.floor(v+0.0001)).toFixed(6);
                s+=` ${w(fx)} ${w(fy)} ${w(fz)}\n`;
            });
        });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([s], {type:'text/plain'}));
        a.download = 'POSCAR';
        a.click();
    };

    const handleSupercell = (mode, diag, matrix) => {
        // Use active layer lattice
        const activeLayer = layers.find(l => l.id === activeLayerId);
        const currentLattice = activeLayer?.lattice || lattice;

        let M = mode==='diag' ? [[diag[0],0,0],[0,diag[1],0],[0,0,diag[2]]] : matrix;
        if(Math.abs(MathUtils.det3x3(M))<1e-3) return alert('Invalid Matrix');
        
        const newLattice = MathUtils.matMul3x3(M, currentLattice);
        const invM = MathUtils.inv3x3(M);
        
        // Filter atoms
        const activeAtoms = atoms.filter(a => a.layerId === activeLayerId);
        const otherAtoms = atoms.filter(a => a.layerId !== activeLayerId);

        const newActiveAtoms = [];
        let maxId = atoms.length > 0 ? Math.max(...atoms.map(a => a.id)) : -1;

        const range = Math.ceil(Math.max(...M.flat().map(Math.abs)))+1;
        // Assume current atoms store Cartesian, we need fractional in OLD lattice first
        const invOldL = MathUtils.inv3x3(currentLattice);

        // Pre-calc fractional for active atoms
        const oldFracs = activeAtoms.map(a => ({...a, f: MathUtils.multiplyMatrixVector(invOldL, [a.x,a.y,a.z])}));

        for(let i=-range; i<=range; i++){
            for(let j=-range; j<=range; j++){
                for(let k=-range; k<=range; k++){
                    oldFracs.forEach(atom => {
                        const fOldShift = [atom.f[0]+i, atom.f[1]+j, atom.f[2]+k];
                        // f_new = f_old * M_inv (row vector logic approx)
                        const fn = MathUtils.multiplyMatrixVector(invM, fOldShift); // Actually invM is correct transform for coords
                        // But wait, MathUtils.multiply is Matrix * Vector (Column). 
                        // If we treat f as column: F_new = M_inv * F_old. Yes.
                        // Let's verify: P = L_new * F_new = (M * L_old) * (M_inv * F_old) = L_old * F_old. Correct.
                        const [fx,fy,fz] = MathUtils.multiplyMatrixVector(invM, fOldShift); // wait, actually inv3x3 returns matrix.
                        // Just use standard mat-vec mul.
                        
                        if(fx>=-0.001 && fx<0.999 && fy>=-0.001 && fy<0.999 && fz>=-0.001 && fz<0.999) {
                            const [cx, cy, cz] = MathUtils.multiplyMatrixVector(newLattice, [fx,fy,fz]);
                            newActiveAtoms.push({id: ++maxId, element: atom.element, x:cx, y:cy, z:cz, layerId: activeLayerId});
                        }
                    });
                }
            }
        }
        saveStateToHistory(atoms, lattice, layers);
        setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, lattice: newLattice } : l));
        setAtoms([...otherAtoms, ...newActiveAtoms]);
    };

    const handleVacuum = (size) => {
        const oldLen = Math.sqrt(lattice[2][0]**2+lattice[2][1]**2+lattice[2][2]**2);
        const ratio = (oldLen+size)/oldLen;
        const newL = [lattice[0], lattice[1], lattice[2].map(v=>v*ratio)];
        saveStateToHistory(atoms, lattice, layers);
        setLattice(newL);
        setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, lattice: newL } : l));
        // Cartesian coords stay same, relative changes (handled by rendering logic)
    };

    const onAtomClick = useCallback((id, isMulti) => {
        if(editMode === 'DELETE' && id !== null) {
            setAtoms(prev => {
                saveStateToHistory(prev, lattice, layers);
                return prev.filter(a => a.id !== id);
            });
            setSelectedAtomIds(prev => prev.filter(i => i !== id));
        } else {
            if (id === null) {
                if (!isMulti) setSelectedAtomIds([]);
            } else {
                if (isMulti) {
                    setSelectedAtomIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                } else {
                    setSelectedAtomIds([id]);
                }
            }
        }
    }, [editMode, lattice, layers, saveStateToHistory]);

    const onBoxSelect = useCallback((ids, isMulti) => {
        if (isMulti) {
            // Merge unique
            setSelectedAtomIds(prev => [...new Set([...prev, ...ids])]);
        } else {
            setSelectedAtomIds(ids);
        }
    }, []);

    const onAtomsMoveEnd = useCallback((moves) => {
        setAtoms(prev => {
            saveStateToHistory(prev, lattice, layers);
            const moveMap = new Map(moves.map(m => [m.id, m]));
            return prev.map(a => {
                if (moveMap.has(a.id)) {
                    const m = moveMap.get(a.id);
                    return { ...a, x: m.x, y: m.y, z: m.z };
                }
                return a;
            });
        });
    }, [lattice, layers, saveStateToHistory]);

    // Initial Load
    useEffect(() => {
        // Start empty; keep the default lattice from initial state (10x10x10)
        setAtoms([]);
    }, []);

    return (
        <div className="relative w-full h-full font-sans select-none">
            {fileError && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded shadow">
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <div style={{fontWeight:600}}>File error:</div>
                        <div style={{opacity:0.95}}>{fileError}</div>
                        <button onClick={() => setFileError(null)} style={{marginLeft:12, background:'transparent', border:'none', color:'rgba(255,255,255,0.9)', cursor:'pointer'}}>✕</button>
                    </div>
                </div>
            )}
            <Viewer 
                atoms={atoms}
                lattice={lattice}
                layers={layers}
                activeLayerId={activeLayerId}
                selectedAtomIds={selectedAtomIds}
                onAtomClick={onAtomClick}
                onAtomsMoveEnd={onAtomsMoveEnd}
                onBoxSelect={onBoxSelect}
            />

            <LeftPanel 
                atomCount={atoms.length}
                lattice={lattice}
                onLoad={handleLoad}
                onDownload={handleDownload}
                onSupercell={handleSupercell}
                onVacuum={handleVacuum}
                layers={layers}
                setLayers={setLayers}
                activeLayerId={activeLayerId}
                setActiveLayerId={setActiveLayerId}
                setLattice={setLattice}
            />

            <RightPanel 
                atoms={atoms}
                selectedAtomIds={selectedAtomIds}
                editMode={editMode}
                setEditMode={setEditMode}
                targetElement={targetElement}
                setTargetElement={setTargetElement}
                onApplyEdit={() => {
                    if(selectedAtomIds.length > 0) {
                        setAtoms(prev => {
                            saveStateToHistory(prev, lattice);
                            return prev.map(a => selectedAtomIds.includes(a.id) ? { ...a, element: targetElement } : a);
                        });
                    }
                }}
                onDelete={() => {
                    if(selectedAtomIds.length > 0) {
                        setAtoms(prev => {
                            saveStateToHistory(prev, lattice);
                            return prev.filter(a => !selectedAtomIds.includes(a.id));
                        });
                        setSelectedAtomIds([]);
                    }
                }}
            />
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-slate-500 text-[10px] pointer-events-none bg-black/20 px-2 rounded">
                左键: 旋转/选择 | Shift+拖拽: 框选 | 右键: 平移 | 滚轮: 缩放 | 选中原子后拖拽坐标轴移动
            </div>
        </div>
    );
}

export default App;
