import React, { useState, useEffect } from 'react';
import { Box, Layers, Upload, Download, Grid, ChevronDown, Expand, Eye, EyeOff, Plus, Trash, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMolecularContext } from '../context/MolecularContext';
import usePanelStyles from '../hooks/usePanelStyles';
import { MathUtils } from '../utils/math';
import { StructureInfo } from '../utils/structureInfo';
import LayerNameEditor from './LayerNameEditor';

const LeftPanel = () => {
    const { t } = useTranslation();
    const {
        atoms, lattice, 
        handleLoad, handleDownload, 
        handleSupercell, handleVacuum,
        handleScaleLattice, handleSetLattice,
        layers, setLayers, activeLayerId, setActiveLayerId, setLattice,
        theme,
        renameLayer,
    } = useMolecularContext();

    const atomCount = atoms.length;
    const activeLayer = layers.find(l => l.id === activeLayerId) || null;
    const layerAtoms = atoms.filter(a => a.layerId === activeLayerId);
    const layerAtomCount = layerAtoms.length;
    const totalAtomCount = atoms.length;

    const formula = StructureInfo.getCompositionString(layerAtoms);

    // Lattice to display (layer lattice takes precedence)
    const latticeToShow = (activeLayer && activeLayer.lattice) ? activeLayer.lattice : lattice;
    const latticeExists = Array.isArray(latticeToShow) && latticeToShow.length === 3 && Array.isArray(latticeToShow[0]);
    let latticeLens = [0,0,0];
    if (latticeExists) {
        latticeLens = [
            Math.sqrt(latticeToShow[0][0]**2 + latticeToShow[0][1]**2 + latticeToShow[0][2]**2),
            Math.sqrt(latticeToShow[1][0]**2 + latticeToShow[1][1]**2 + latticeToShow[1][2]**2),
            Math.sqrt(latticeToShow[2][0]**2 + latticeToShow[2][1]**2 + latticeToShow[2][2]**2),
        ];
    }
    const volume = latticeExists ? Math.abs(MathUtils.det3x3(latticeToShow)) : null;

    const [scMode, setScMode] = useState('diag');
    const [scDiag, setScDiag] = useState([1,1,1]);
    const [scMatrix, setScMatrix] = useState([[1,1,0],[-1,1,0],[0,0,1]]);
    const [vacuum, setVacuum] = useState(15.0);
    const [scaleVec, setScaleVec] = useState([1,1,1]);
    const [setMat, setSetMat] = useState([[0,0,0],[0,0,0],[0,0,0]]);

    useEffect(()=>{
        if(lattice && lattice[0]){
            setSetMat([
                [lattice[0][0], lattice[0][1], lattice[0][2]],
                [lattice[1][0], lattice[1][1], lattice[1][2]],
                [lattice[2][0], lattice[2][1], lattice[2][2]],
            ]);
        }
    }, [lattice]);
    const [expand, setExpand] = useState(false);
    const [expandLattice, setExpandLattice] = useState(false);
    const [latticeTab, setLatticeTab] = useState('vacuum');
    const [vacuumAxis, setVacuumAxis] = useState(2);
    // Two separate editing states: one for the header (active layer) and one for the layers list
    const [editingActiveLayerId, setEditingActiveLayerId] = useState(null);
    const [editingActiveName, setEditingActiveName] = useState('');
    const [editingLayerId, setEditingLayerId] = useState(null);
    const [editingName, setEditingName] = useState('');

    const isDark = theme === 'dark';
    const panels = usePanelStyles(theme);
    const { panelClass, textPrimary, textSecondary, textMuted, bgInput, bgInputDarker, borderClass, buttonSecondary, buttonPrimary, textTitle, textIcon, textLayerInfo, textNoLattice, buttonPreset, layerTextActive, layerTextMuted, layerTextAccent } = panels;

    return (
        <div className="absolute top-4 left-4 w-80 flex flex-col gap-4 pointer-events-none">
            <div className={`${panelClass} p-4 rounded-xl shadow-xl pointer-events-auto`}>
                <h1 className={`text-xl font-bold mb-2 flex items-center gap-2 ${textTitle}`}>
                    <Box className={`${textIcon}`} /> AtomClay
                </h1>
                <div className="flex gap-2 mb-4">
                    <label className={`flex-1 cursor-pointer ${buttonPrimary} py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm transition`}>
                        <Upload size={16} /> {t('Load Molecule')}
                        <input type="file" className="hidden" onChange={handleLoad} />
                    </label>
                    <button onClick={handleDownload} className={`${buttonSecondary} p-2 rounded-lg`} title={t('Download')}>
                        <Download size={18} />
                    </button>
                </div>
                <div className={`text-xs font-mono p-2 rounded border ${panels.bgCard} ${textSecondary} ${borderClass}`}>
                    <p className="font-bold">{t('Active Layer')}: {activeLayer ? (
                        <span className="inline-flex items-center gap-2">
                            <LayerNameEditor layer={activeLayer} onRename={renameLayer} inputClass={`${bgInput} border ${borderClass} rounded px-2 ${textPrimary}`} />
                        </span>
                    ) : t('None')}</p>
                    <p>{t('Atoms in layer')}: <span className="font-semibold">{layerAtomCount}</span> &nbsp;|&nbsp; {t('Total atoms')}: <span className="font-semibold">{totalAtomCount}</span></p>
                    <p>{t('Chemical Formula')}: <span className="font-bold">{formula || 'N/A'}</span></p>
                    {/* Lattice information removed from top info panel */}
                </div>
            </div>

            <div className={`${panelClass} p-4 rounded-xl shadow-xl pointer-events-auto`}>
                <h2 className={`text-sm font-bold mb-3 flex items-center gap-2 ${textPrimary}`}>
                    <Layers size={16} /> {t('Modeling Operations')}
                </h2>
                <div className="space-y-3">
                    {/* Supercell */}
                    <div className={`${panels.bgCard} p-2 rounded border ${borderClass}`}>
                        <button onClick={() => setExpand(!expand)} className={`w-full flex justify-between text-sm ${textSecondary} hover:${textPrimary}`}>
                            <span className="flex items-center gap-2"><Grid size={16} /> {t('Supercell')}</span>
                            <ChevronDown size={14} className={`transition ${expand?'rotate-180':''}`} />
                        </button>
                        {expand && (
                            <div className="mt-3 space-y-3">
                                <div className={`flex gap-2 text-xs border-b ${borderClass} pb-2`}>
                                    <button onClick={()=>setScMode('diag')} className={`flex-1 py-1 rounded ${scMode==='diag'?buttonPrimary:textMuted}`}>{t('Diagonal')}</button>
                                    <button onClick={()=>setScMode('matrix')} className={`flex-1 py-1 rounded ${scMode==='matrix'?buttonPrimary:textMuted}`}>{t('Matrix')}</button>
                                </div>
                                {scMode==='diag' ? (
                                    <div className="flex gap-2 justify-between">
                                        {[0,1,2].map(i=><input key={i} type="number" value={scDiag[i]} onChange={e=>{const n=[...scDiag];n[i]=+e.target.value;setScDiag(n)}} className={`w-12 ${bgInput} border ${borderClass} rounded text-center text-sm ${textPrimary}`}/>)}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex gap-2 overflow-x-auto pb-1">
                                            <button onClick={()=>setScMatrix([[1,1,0],[-1,1,0],[0,0,1]])} className={`text-[10px] px-2 py-1 ${buttonPreset} rounded ${textPrimary}`}>√2x√2</button>
                                            <button onClick={()=>setScMatrix([[2,1,0],[-1,1,0],[0,0,1]])} className={`text-[10px] px-2 py-1 ${buttonPreset} rounded ${textPrimary}`}>√3x√3</button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1">
                                            {scMatrix.map((r,ri)=>r.map((v,ci)=><input key={`${ri}${ci}`} type="number" value={v} onChange={e=>{const m=scMatrix.map(row=>[...row]);m[ri][ci]=+e.target.value;setScMatrix(m)}} className={`w-full ${bgInput} border ${borderClass} rounded text-center text-xs py-1 ${textPrimary}`}/>))}
                                        </div>
                                    </div>
                                )}
                                <button onClick={()=>handleSupercell(scMode, scDiag, scMatrix)} className={`w-full ${buttonPrimary} py-1 rounded text-xs font-bold`}>{t('Apply')}</button>
                            </div>
                        )}
                    </div>
                    {/* Lattice Operations Accordion */}
                    <div className={`${panels.bgCard} p-2 rounded border ${borderClass}`}>
                        <button onClick={() => setExpandLattice(!expandLattice)} className={`w-full flex justify-between text-sm ${textSecondary} hover:${textPrimary}`}>
                            <span className="flex items-center gap-2"><Expand size={16} /> {t('Lattice Operations')}</span>
                            <ChevronDown size={14} className={`transition ${expandLattice?'rotate-180':''}`} />
                        </button>
                        {expandLattice && (
                            <div className="mt-3 space-y-3">
                                <div className={`flex gap-2 text-xs border-b ${borderClass} pb-2`}>
                                    <button onClick={()=>setLatticeTab('vacuum')} className={`flex-1 py-1 rounded ${latticeTab==='vacuum'?buttonPrimary:textMuted}`}>{t('Vacuum')}</button>
                                    <button onClick={()=>setLatticeTab('scale')} className={`flex-1 py-1 rounded ${latticeTab==='scale'?buttonPrimary:textMuted}`}>{t('Scale')}</button>
                                    <button onClick={()=>setLatticeTab('setlength')} className={`flex-1 py-1 rounded ${latticeTab==='setlength'?buttonPrimary:textMuted}`}>{t('Set Lengths')}</button>
                                </div>

                                {latticeTab === 'vacuum' && (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <label className={`text-xs ${textMuted} block mb-1`}>{t('Vacuum Layer (Å)')}</label>
                                                <input type="number" value={vacuum} onChange={e=>setVacuum(+e.target.value)} className={`w-full ${bgInputDarker} border ${borderClass} rounded px-2 py-1 text-sm ${textPrimary}`}/>
                                            </div>
                                            <div className="w-20">
                                                <label className={`text-xs ${textMuted} block mb-1`}>Axis</label>
                                                <select value={vacuumAxis} onChange={e=>setVacuumAxis(+e.target.value)} className={`w-full ${bgInputDarker} border ${borderClass} rounded px-2 py-1 text-sm ${textPrimary}`}>
                                                    <option value={0}>a</option>
                                                    <option value={1}>b</option>
                                                    <option value={2}>c</option>
                                                </select>
                                            </div>
                                        </div>
                                        <button onClick={()=>handleVacuum(vacuum, vacuumAxis)} className={`w-full ${buttonSecondary} p-1 rounded text-xs font-bold`}>{t('Apply')}</button>
                                    </div>
                                )}

                                {latticeTab === 'scale' && (
                                    <div className="space-y-2">
                                        <label className={`text-xs ${textMuted} block mb-1`}>{t('Scale Lattice (keep atoms fixed)')}</label>
                                        <div className="flex gap-2">
                                            {[0,1,2].map(i=>(
                                                <input key={i} type="number" step="0.01" value={scaleVec[i]} onChange={e=>{const n=[...scaleVec];n[i]=+e.target.value;setScaleVec(n)}} className={`w-full ${bgInputDarker} border ${borderClass} rounded px-2 py-1 text-sm ${textPrimary}`}/>
                                            ))}
                                        </div>
                                        <button onClick={()=>{ handleScaleLattice(scaleVec[0]||1, scaleVec[1]||1, scaleVec[2]||1); setScaleVec([1,1,1]); }} className={`w-full ${buttonSecondary} p-1 rounded text-xs font-bold`}>{t('Apply')}</button>
                                        <div className={`text-[10px] mt-1 ${textMuted}`}>Scale factors applied to the lattice vectors a, b and c respectively. Atom coordinates remain unchanged.</div>
                                    </div>
                                )}

                                {latticeTab === 'setlength' && (
                                    <div className="space-y-2">
                                        <label className={`text-xs ${textMuted} block mb-1`}>{t('Set Lattice Matrix (rows = a,b,c) — keep atoms fixed')}</label>
                                        <div className="grid grid-cols-3 gap-1">
                                            {setMat.map((r,ri)=>r.map((v,ci)=>(
                                                <input key={`${ri}${ci}`} type="number" step="0.0001" value={v} onChange={e=>{const m=setMat.map(row=>[...row]);m[ri][ci]=+e.target.value;setSetMat(m)}} className={`w-full ${bgInputDarker} border ${borderClass} rounded text-center text-xs py-1 ${textPrimary}`}/>
                                            )))}
                                        </div>
                                        <button onClick={()=>{
                                            // ensure matrix numbers
                                            const newLat = setMat.map(r=>r.map(v=>+v));
                                            handleSetLattice(newLat);
                                        }} className={`w-full ${buttonSecondary} p-1 rounded text-xs font-bold`}>{t('Apply')}</button>
                                        <div className={`text-[10px] mt-1 ${textMuted}`}>Sets the full 3x3 lattice matrix (a, b, c as row vectors). Atom Cartesian coordinates remain unchanged.</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Layers UI has been moved to the right panel to improve placement — this section intentionally kept empty in the left panel */}
        </div>
    );
};

export default LeftPanel;
