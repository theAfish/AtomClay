import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMolecularState } from '../hooks/useMolecularState';
import { MathUtils } from '../utils/math';
import { parse } from '../utils/parsers';
import { createAtomHandlers } from './atomHandlers';

const MolecularContext = createContext(null);

export const useMolecularContext = () => {
    const context = useContext(MolecularContext);
    if (!context) {
        throw new Error('useMolecularContext must be used within a MolecularProvider');
    }
    return context;
};

export const MolecularProvider = ({ children }) => {
    const { i18n } = useTranslation();
    
    // Molecular State from Hook
    const molecularState = useMolecularState();
    const {
        atoms,
        lattice,
        layers,
        activeLayerId,
        setAtoms,
        setLattice,
        setLayers,
        setActiveLayerId,
        undo,
        handleSupercell: handleSupercellOp,
        handleVacuum: handleVacuumOp,
        handleScaleLattice: handleScaleLatticeOp,
        handleSetLattice: handleSetLatticeOp,
        addAtoms,
        updateAtoms
        , renameLayer
    } = molecularState;

    // UI State
    const [selectedAtomIds, setSelectedAtomIds] = useState([]);
    const [editMode, setEditMode] = useState('SELECT');
    const [transformMode, setTransformMode] = useState('translate'); // translate | rotate | scale
    const [targetElement, setTargetElement] = useState('O');
    const [fileError, setFileError] = useState(null);
    const [pdbContent, setPdbContent] = useState(null);
    const [viewMode, setViewMode] = useState('default'); // 'default' | 'protein'
    const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    // Renderer selection
    const [currentRenderer, setCurrentRenderer] = useState('three'); // 'three' | 'molstar' | 'canvas'
    const [showRendererDropdown, setShowRendererDropdown] = useState(false);
    // Chat panel
    const [isChatOpen, setIsChatOpen] = useState(false);

    // Clear selection when active layer changes
    useEffect(() => {
        setSelectedAtomIds([]);
    }, [activeLayerId]);

    // File Handling Logic
    const parseFile = async (file) => {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onerror = () => reject(new Error('Unable to read file.'));
            reader.onload = async (ev) => {
                try {
                    const name = file.name || '';
                    const text = ev.target.result;
                    if (typeof text !== 'string' || text.trim().length === 0) {
                        reject(new Error(`Empty or unreadable file. Supported formats: .xyz (atom count + coordinates), .pdb (ATOM records), .cif (Crystallographic Information File), POSCAR-like text`));
                        return;
                    }
                    const lowerName = name.toLowerCase();
                    let format = null;
                    if (lowerName.endsWith('.xyz')) format = 'xyz';
                    else if (lowerName.endsWith('.pdb')) format = 'pdb';
                    else if (lowerName.endsWith('.cif')) format = 'cif';
                    else format = 'poscar'; // default

                    if (format === 'poscar') {
                        // Inline POSCAR parsing
                        const lines = text.trim().split('\n').map(l=>l.trim()).filter(l=>l!=='');
                        if (lines.length < 6) {
                            reject(new Error(`Unrecognized file format. Supported formats: .xyz, .pdb, .cif, POSCAR-like text`));
                            return;
                        }
                        const scale = parseFloat(lines[1]);
                        if (!Number.isFinite(scale) || isNaN(scale)) {
                            reject(new Error('POSCAR-like parse failed: missing numeric scale on line 2.'));
                            return;
                        }
                        const lat = [];
                        let latOk = true;
                        for(let i=2;i<=4;i++){
                            const row = lines[i].split(/\s+/).map(x=>parseFloat(x)*scale);
                            if (row.length < 3 || row.some(v => !Number.isFinite(v))) { latOk = false; break; }
                            lat.push(row);
                        }
                        if (!latOk) { reject(new Error('POSCAR-like parse failed: invalid lattice vectors.')); return; }

                        let elems = [];
                        try { elems = lines[5].split(/\s+/).filter(x=>x!=='' && isNaN(parseFloat(x))); } catch(e) { elems = []; }
                        let idx = elems.length ? 6 : 5;
                        const countsLine = lines[idx] || '';
                        const counts = countsLine.split(/\s+/).map(n => parseInt(n,10)).filter(n => Number.isFinite(n));
                        if (!counts || counts.length === 0) {
                            reject(new Error('POSCAR-like parse failed: element counts line missing or invalid.'));
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
                            reject(new Error('POSCAR-like parse failed: not enough coordinate lines for declared atom counts.'));
                            return;
                        }
                        elems = elems.length ? elems : new Array(counts.length).fill('X');
                        elems.forEach((el, i) => {
                            for(let c=0; c<counts[i]; c++){
                                const line = lines[cursor++] || '';
                                const cds = line.split(/\s+/).slice(0,3).map(Number);
                                if (cds.length < 3 || cds.some(v => !Number.isFinite(v))) { reject(new Error('POSCAR-like parse failed: invalid coordinates.')); return; }
                                let x,y,z;
                                if(isDirect) [x,y,z] = MathUtils.multiplyMatrixVector(MathUtils.transpose3x3(lat), cds);
                                else [x,y,z] = cds;
                                newAtoms.push({id: gId++, element: el, x, y, z});
                            }
                        });
                        if (!newAtoms || newAtoms.length === 0) { reject(new Error('No atoms found in file.')); return; }
                        resolve({ newAtoms, newLat: lat, isPdb: false, text: null });
                    } else {
                        const { atoms: newAtoms, lattice: newLat } = await parse(text, format);
                        if (!newAtoms || newAtoms.length === 0) {
                            reject(new Error(`Could not parse ${format} file. Ensure it contains valid atom records.`));
                            return;
                        }
                        resolve({ newAtoms, newLat, isPdb: lowerName.endsWith('.pdb'), text: lowerName.endsWith('.pdb') ? text : null });
                    }
                } catch (e) {
                    reject(e);
                }
            };
            reader.readAsText(file);
        });
    };

    const importFile = async (file, createNewLayer) => {
        const { newAtoms, newLat, isPdb, text } = await parseFile(file);
        if (isPdb) setPdbContent(text);
        
        const newIds = addAtoms(newAtoms, newLat, createNewLayer);
        setSelectedAtomIds(newIds);
    };

    const loadStructureFromText = async (content, format, fileName) => {
        try {
            console.log('Parsing structure:', format, fileName);
            const { atoms: newAtoms, lattice: newLat } = await parse(content, format);
            console.log('Parsed atoms:', newAtoms.length, 'lattice:', newLat);
            const newIds = addAtoms(newAtoms, newLat, true); // Always create new layer
            setSelectedAtomIds(newIds);
            setFileError(null);
            console.log('Structure loaded into new layer');
        } catch (e) {
            console.error('Error loading structure:', e);
            setFileError(e.message);
        }
    };

    const handleLoad = async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        setFileError(null);
        try {
            await importFile(file, false);
        } catch (e) {
            setFileError(e.message);
        }
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
        const invLT = MathUtils.transpose3x3(invL);
        els.forEach(e=>{
            groups[e].forEach(a=>{
                const [fx,fy,fz] = MathUtils.multiplyMatrixVector(invLT, [a.x,a.y,a.z]);
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
        try {
            handleSupercellOp(mode, diag, matrix);
        } catch (e) {
            alert(e.message);
        }
    };

    const handleVacuum = (size, axis = 2) => {
        try {
            handleVacuumOp(size, axis);
        } catch (e) {
            alert(e.message);
        }
    };

    const handleScaleLattice = (scaleX = 1, scaleY = 1, scaleZ = 1) => {
        try {
            handleScaleLatticeOp(scaleX, scaleY, scaleZ);
        } catch (e) {
            alert(e.message);
        }
    };

    const handleSetLattice = (newLat) => {
        try {
            handleSetLatticeOp(newLat);
        } catch (e) {
            alert(e.message);
        }
    };

    // Atom-related handlers moved to separate module for readability
    const { onAtomClick, onBoxSelect, onAtomsMoveEnd, createAtomAtCenter } = createAtomHandlers({
        lattice,
        updateAtoms,
        targetElement,
        setSelectedAtomIds,
        setEditMode,
        setTransformMode,
        activeLayerId
    });

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files);
        for (const file of files) {
            const createNew = !(layers.length === 1 && layers[0].id === 'layer-0' && atoms.filter(a => a.layerId === 'layer-0').length === 0);
            try {
                await importFile(file, createNew);
            } catch (err) {
                setFileError(err.message);
            }
        }
    };

    const changeLanguage = (code) => {
        i18n.changeLanguage(code);
        setShowLangDropdown(false);
    };

    // createAtomAtCenter provided by atomHandlers

    const renderers = [
        { id: 'three', label: 'Three.js' },
        { id: 'custom', label: 'Shader' }
    ];

    const changeRenderer = (id) => {
        if (!renderers.find(r => r.id === id)) return;
        setCurrentRenderer(id);
        setShowRendererDropdown(false);
    };

    // Initial Load
    useEffect(() => {
        // Start empty; keep the default lattice from initial state (10x10x10)
        setAtoms([]);
    }, [setAtoms]);

    const value = {
        // Molecular State
        ...molecularState,
        
        // UI State
        selectedAtomIds, setSelectedAtomIds,
        editMode, setEditMode,
        transformMode, setTransformMode,
        targetElement, setTargetElement,
        fileError, setFileError,
        pdbContent, setPdbContent,
        viewMode, setViewMode,
        theme, setTheme,
        showLangDropdown, setShowLangDropdown,
        isChatOpen, setIsChatOpen,
        
        // Handlers
        handleLoad,
        handleDownload,
        handleSupercell,
        handleVacuum,
        handleScaleLattice,
        handleSetLattice,
        createAtomAtCenter,
        onAtomClick,
        onBoxSelect,
        onAtomsMoveEnd,
        handleDragOver,
        handleDrop,
        changeLanguage,
        renameLayer,
        loadStructureFromText,
        // Renderer API
        currentRenderer, setCurrentRenderer, renderers, showRendererDropdown, setShowRendererDropdown, changeRenderer
    };

    return (
        <MolecularContext.Provider value={value}>
            {children}
        </MolecularContext.Provider>
    );
};
