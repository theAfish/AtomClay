import React, { useState } from 'react';
import { Scissors, MousePointer2, Trash2, Move, RotateCw, Maximize2, Layers, Eye, EyeOff, Plus, Trash, Check, X } from 'lucide-react';
import { ELEMENT_DATA } from '../constants/elements';
import { useTranslation } from 'react-i18next';
import { useMolecularContext } from '../context/MolecularContext';

const RightPanel = () => {
    const { t } = useTranslation();

    const {
        atoms, selectedAtomIds, setSelectedAtomIds,
        editMode, setEditMode,
        targetElement, setTargetElement,
        transformMode, setTransformMode,
        updateAtoms,
        theme,
        // Layers-related state moved from LeftPanel
        layers, setLayers, activeLayerId, setActiveLayerId, setLattice, renameLayer, lattice
    } = useMolecularContext();

    const selectedCount = selectedAtomIds.length;
    const selAtom = selectedCount === 1 ? atoms.find(a => a.id === selectedAtomIds[0]) : null;

    const isDark = theme === 'dark';
    const panelClass = isDark ? "glass-panel" : "bg-white/90 backdrop-blur-xl border border-slate-200";
    const textPrimary = isDark ? "text-slate-200" : "text-slate-800";
    const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
    const textMuted = isDark ? "text-slate-400" : "text-slate-500";
    const bgInput = isDark ? "bg-slate-900" : "bg-slate-100";
    const bgCard = isDark ? "bg-slate-800/50" : "bg-slate-50";
    const borderClass = isDark ? "border-slate-700/50" : "border-slate-200";
    const bgMetric = isDark ? "bg-slate-900" : "bg-slate-200";

    const onApplyEdit = () => {
        if(selectedAtomIds.length > 0) {
            updateAtoms(prev => prev.map(a => selectedAtomIds.includes(a.id) ? { ...a, element: targetElement } : a));
        }
    };

    const onDelete = () => {
        if(selectedAtomIds.length > 0) {
            updateAtoms(prev => prev.filter(a => !selectedAtomIds.includes(a.id)));
            setSelectedAtomIds([]);
        }
    };

    // Local editing state for layers moved into this panel
    const [editingLayerId, setEditingLayerId] = useState(null);
    const [editingName, setEditingName] = useState('');

    return (
        <div className="absolute top-4 right-4 w-80 pointer-events-none">
            <div className={`${panelClass} p-4 rounded-xl shadow-xl pointer-events-auto`}> 
                <h2 className={`text-sm font-bold mb-3 flex items-center gap-2 ${textPrimary}`}>
                    <Scissors size={16} /> {t('Edit Tools')}
                </h2>
                <div className={`flex gap-1 mb-4 p-1 rounded ${isDark ? 'bg-slate-900/50' : 'bg-slate-200/50'}`}>
                    <button onClick={()=>setEditMode('SELECT')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${editMode==='SELECT'?'bg-blue-600 text-white':textMuted}`}>
                        <MousePointer2 size={14} /> {t('Select/Move')}
                    </button>
                    <button onClick={()=>setEditMode('DELETE')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${editMode==='DELETE'?'bg-red-600 text-white':textMuted}`}>
                        <Trash2 size={14} /> {t('Delete Mode')}
                    </button>
                </div>

                {/* Transform Mode Buttons - visible only when in SELECT mode */}
                {editMode === 'SELECT' && (
                    <div className={`flex gap-1 mb-4 p-1 rounded ${isDark ? 'bg-slate-900/50' : 'bg-slate-200/50'}`}>
                        <button onClick={()=>setTransformMode('translate')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${transformMode==='translate'?'bg-blue-600 text-white':textMuted}`}>
                            <Move size={14} /> {t('Translate')}
                        </button>
                        <button onClick={()=>setTransformMode('rotate')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${transformMode==='rotate'?'bg-blue-600 text-white':textMuted}`}>
                            <RotateCw size={14} /> {t('Rotate')}
                        </button>
                        <button onClick={()=>setTransformMode('scale')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${transformMode==='scale'?'bg-blue-600 text-white':textMuted}`}>
                            <Maximize2 size={14} /> {t('Scale')}
                        </button>
                    </div>
                )}

                {selectedCount > 0 ? (
                    <div className={`${bgCard} p-3 rounded border ${borderClass} animate-fade-in`}>
                        {selectedCount === 1 && selAtom ? (
                            <>
                                <div className={`text-xs font-bold mb-2 flex justify-between ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                                    <span>{t('ID')}: {selAtom.id}</span>
                                    <span>{selAtom.element}</span>
                                </div>
                                <div className={`grid grid-cols-3 gap-1 text-[10px] font-mono mb-3 ${textSecondary}`}>
                                    <div className={`${bgMetric} p-1 rounded text-center`}>{t('x')}: {selAtom.x.toFixed(2)}</div>
                                    <div className={`${bgMetric} p-1 rounded text-center`}>{t('y')}: {selAtom.y.toFixed(2)}</div>
                                    <div className={`${bgMetric} p-1 rounded text-center`}>{t('z')}: {selAtom.z.toFixed(2)}</div>
                                </div>
                            </>
                        ) : (
                            <div className={`text-xs font-bold mb-2 flex justify-between ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                                <span>{t('Selected Atoms', { count: selectedCount })}</span>
                            </div>
                        )}
                        
                        <div className={`mb-3 border-t ${borderClass} pt-3`}>
                            <label className={`text-xs ${textMuted} block mb-1`}>{t('Replace Element')}</label>
                            <div className="flex gap-2">
                                <select value={targetElement} onChange={e=>setTargetElement(e.target.value)} className={`flex-1 ${bgInput} border ${isDark ? 'border-slate-600' : 'border-slate-300'} rounded text-xs px-2 py-1 ${textPrimary}`}>
                                    {Object.keys(ELEMENT_DATA).filter(k=>k!=='Default').map(el=><option key={el} value={el}>{el}</option>)}
                                </select>
                                <button onClick={onApplyEdit} className="bg-blue-600 hover:bg-blue-500 px-3 rounded text-xs text-white">{t('Apply')}</button>
                            </div>
                        </div>
                        <button onClick={onDelete} className="w-full bg-red-500/20 hover:bg-red-500/40 text-red-300 py-1 rounded text-xs flex items-center justify-center gap-1">
                            <Trash2 size={12} /> {t('Delete')}
                        </button>
                    </div>
                ) : (
                    <div className={`text-xs text-center py-4 italic ${textMuted}`}>
                        {editMode==='SELECT' ? t('Select Instruction', { mode: t(transformMode.charAt(0).toUpperCase() + transformMode.slice(1)) }) : t('Delete Instruction')}
                    </div>
                )}
            </div>

            {/* Layers UI moved here from LeftPanel */}
            <div className={`${panelClass} p-4 rounded-xl shadow-xl pointer-events-auto mt-4`}>
                <h2 className={`text-sm font-bold mb-3 flex items-center gap-2 ${textPrimary}`}>
                    <Layers size={16} /> {t('Layers')}
                </h2>
                <div className="space-y-2">
                    {layers && layers.map(layer => (
                        <div key={layer.id} className={`flex items-center justify-between p-2 rounded h-10 ${activeLayerId===layer.id? (isDark ? 'bg-slate-800 border border-slate-600' : 'bg-slate-100 border border-slate-300') : (isDark ? 'bg-slate-900/40' : 'bg-slate-50/50')}`}>
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                                <button onClick={() => setLayers(prev => prev.map(l => l.id===layer.id? {...l, visible: !l.visible}: l))} className={`p-1 ${textPrimary}`}>
                                    {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                                {editingLayerId === layer.id ? (
                                    <div className="flex items-center gap-2 h-full">
                                        <input autoFocus type="text" value={editingName} onChange={e=>{ setEditingName(e.target.value); }} onKeyDown={e=>{
                                            if(e.key === 'Enter') { renameLayer(layer.id, editingName || layer.name); setEditingLayerId(null); setEditingName(''); }
                                            if(e.key === 'Escape') { setEditingLayerId(null); setEditingName(''); }
                                        }} className={`flex-1 min-w-0 max-w-[240px] h-6 leading-tight text-sm ${bgInput} border ${borderClass} rounded px-2 ${textPrimary}`} />
                                        <button onClick={() => { renameLayer(layer.id, editingName || layer.name); setEditingLayerId(null); setEditingName(''); }} className="p-1 text-green-400 w-6 h-6 inline-flex items-center justify-center relative z-10" title="Save"><Check size={14} /></button>
                                        <button onClick={() => { setEditingLayerId(null); setEditingName(''); }} className="p-1 text-slate-400 w-6 h-6 inline-flex items-center justify-center relative z-10" title="Cancel"><X size={14} /></button>
                                    </div>
                                ) : (
                                    <button onClick={() => setActiveLayerId(layer.id)} onDoubleClick={() => { setEditingLayerId(layer.id); setEditingName(layer.name); }} className={`flex-1 min-w-0 text-sm text-left truncate ${activeLayerId===layer.id? (isDark ? 'text-white' : 'text-blue-600 font-bold') : textSecondary}`}>
                                        <span className="truncate">{layer.name}</span>
                                    </button>
                                )}
                                {layer.lattice && (
                                    <button onClick={() => setLattice(layer.lattice, layer.id)} className={`text-[10px] ml-2 px-2 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'} ${editingLayerId === layer.id ? 'invisible pointer-events-none' : ''}`}>{`Use Lattice`}</button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => {
                                    if (!layers || layers.length <= 1) return;
                                    setLayers(prev => {
                                        const next = prev.filter(l => l.id !== layer.id);
                                        if (activeLayerId === layer.id) {
                                            const newFirst = next[0] || null;
                                            if (newFirst) {
                                                setActiveLayerId(newFirst.id);
                                                setLattice(newFirst.lattice || null);
                                            } else {
                                                setActiveLayerId(null);
                                                setLattice(null);
                                            }
                                        }
                                        return next;
                                    });
                                }} className={`p-1 text-slate-400 hover:text-red-400 ${editingLayerId === layer.id ? 'invisible pointer-events-none' : ''}`} title={`Delete Layer`}><Trash size={14}/></button>
                            </div>
                        </div>
                    ))}

                    <div className="pt-2">
                        <button onClick={() => {
                            const id = `layer-${Date.now()}`;
                            const name = `Layer ${layers.length + 1}`;
                            const newLayer = { id, name, visible: true, opacity: 1, lattice: lattice ? JSON.parse(JSON.stringify(lattice)) : null };
                            setLayers(prev => [newLayer, ...prev]);
                            setActiveLayerId(id);
                        }} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-1 rounded text-xs flex items-center justify-center gap-2"><Plus size={14}/> {`New Layer`}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RightPanel;
