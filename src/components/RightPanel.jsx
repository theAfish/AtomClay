import React, { useState } from 'react';
import { Scissors, MousePointer2, PlusSquare, Trash2, Move, RotateCw, Maximize2, Layers } from 'lucide-react';
import { ELEMENT_DATA } from '../constants/elements';
import { useTranslation } from 'react-i18next';
import { useMolecularContext } from '../context/MolecularContext';
import usePanelStyles from '../hooks/usePanelStyles';
import LayersList from './LayersList';

const RightPanel = () => {
    const { t } = useTranslation();

    const {
        atoms, selectedAtomIds, setSelectedAtomIds,
        editMode, setEditMode,
        targetElement, setTargetElement,
        transformMode, setTransformMode,
        updateAtoms,
        createAtomAtCenter,
        theme,
        // Layers-related state moved from LeftPanel
        layers, setLayers, activeLayerId, setActiveLayerId, setLattice, renameLayer, lattice,
        isChatOpen
    } = useMolecularContext();

    const selectedCount = selectedAtomIds.length;
    const selAtom = selectedCount === 1 ? atoms.find(a => a.id === selectedAtomIds[0]) : null;

    const isDark = theme === 'dark';
    const panels = usePanelStyles(theme);
    const { panelClass, textPrimary, textSecondary, textMuted, bgCard, bgMetric, buttonPrimary, buttonDanger, buttonDangerBg, layerActive, layerInactive, layerButton, layerTextActive, layerTextMuted, layerTextAccent, layerTextDanger, textLayerInfo, borderInput } = panels;
    const bgInput = panels.bgInputDarker || panels.bgInput;
    const borderClass = panels.borderClassTransparent || panels.borderClass;

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

    // Local editing state for layers is now handled by reusable components

    return (
        <div className="fixed top-4 w-80 pointer-events-none z-50" style={{ right: isChatOpen ? '336px' : '16px' }}>
            <div className={`${panelClass} p-4 rounded-xl shadow-xl pointer-events-auto`}> 
                <h2 className={`text-sm font-bold mb-3 flex items-center gap-2 ${textPrimary}`}>
                    <Scissors size={16} /> {t('Edit Tools')}
                </h2>
                <div className={`flex gap-1 mb-4 p-1 rounded ${panels.bgCard}`}>
                    <button onClick={()=>setEditMode('SELECT')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${editMode==='SELECT'?buttonPrimary:textMuted}`}>
                        <MousePointer2 size={14} /> {t('Select/Move')}
                    </button>
                    <button onClick={()=>createAtomAtCenter()} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${textMuted}`}>
                        <PlusSquare size={14} /> {t('Add Atom')}
                    </button>
                </div>

                {/* Transform Mode Buttons - visible only when in SELECT mode */}
                {editMode === 'SELECT' && (
                    <div className={`flex gap-1 mb-4 p-1 rounded ${panels.bgCard}`}>
                        <button onClick={()=>setTransformMode('translate')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${transformMode==='translate'?buttonPrimary:textMuted}`}>
                            <Move size={14} /> {t('Translate')}
                        </button>
                        <button onClick={()=>setTransformMode('rotate')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${transformMode==='rotate'?buttonPrimary:textMuted}`}>
                            <RotateCw size={14} /> {t('Rotate')}
                        </button>
                        <button onClick={()=>setTransformMode('scale')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${transformMode==='scale'?buttonPrimary:textMuted}`}>
                            <Maximize2 size={14} /> {t('Scale')}
                        </button>
                    </div>
                )}

                {selectedCount > 0 ? (
                    <div className={`${bgCard} p-3 rounded border ${borderClass} animate-fade-in`}>
                        {selectedCount === 1 && selAtom ? (
                            <>
                                <div className={`text-xs font-bold mb-2 flex justify-between ${textLayerInfo}`}>
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
                            <div className={`text-xs font-bold mb-2 flex justify-between ${textLayerInfo}`}>
                                <span>{t('Selected Atoms', { count: selectedCount })}</span>
                            </div>
                        )}
                        
                        <div className={`mb-3 border-t ${borderClass} pt-3`}>
                            <label className={`text-xs ${textMuted} block mb-1`}>{t('Replace Element')}</label>
                            <div className="flex gap-2">
                                <select value={targetElement} onChange={e=>setTargetElement(e.target.value)} className={`flex-1 ${bgInput} border ${borderInput} rounded text-xs px-2 py-1 ${textPrimary}`}>
                                    {Object.keys(ELEMENT_DATA).filter(k=>k!=='Default').map(el=><option key={el} value={el}>{el}</option>)}
                                </select>
                                <button onClick={onApplyEdit} className={`${buttonPrimary} px-3 rounded text-xs`}>{t('Apply')}</button>
                            </div>
                        </div>
                        <button onClick={onDelete} className={`w-full ${buttonDangerBg} py-1 rounded text-xs flex items-center justify-center gap-1`}>
                            <Trash2 size={12} /> {t('Delete')}
                        </button>
                    </div>
                ) : (
                    <div className={`text-xs text-center py-4 italic ${textMuted}`}>
                        {t('Select Instruction', { mode: t(transformMode.charAt(0).toUpperCase() + transformMode.slice(1)) })}
                        <div className="mt-2 text-[11px]">{t('Use the Add Atom button to insert a new atom at the cell center.')}</div>
                    </div>
                )}
            </div>

            {/* Layers UI moved here from LeftPanel (refactored to reusable component) */}
            <div className={`${panelClass} p-4 rounded-xl shadow-xl pointer-events-auto mt-4`}>
                <h2 className={`text-sm font-bold mb-3 flex items-center gap-2 ${textPrimary}`}>
                    <Layers size={16} /> {t('Layers')}
                </h2>
                <div className="space-y-2">
                    <LayersList
                        layers={layers}
                        panels={panels}
                        activeLayerId={activeLayerId}
                        setActiveLayerId={setActiveLayerId}
                        setLattice={setLattice}
                        setLayers={setLayers}
                        renameLayer={renameLayer}
                        lattice={lattice}
                    />
                </div>
            </div>
        </div>
    );
};

export default RightPanel;
