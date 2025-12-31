import React, { useState } from 'react';
import { Box, Layers, Upload, Download, Grid, ChevronDown, Expand, Settings, Scissors, MousePointer2, PlusSquare, Trash2, Move, RotateCw, Maximize2, Check, X } from 'lucide-react';
import { ELEMENT_DATA } from '../constants/elements';
import { useTranslation } from 'react-i18next';
import { useMolecularContext } from '../context/MolecularContext';
import { useTheme } from '../context/ThemeContext';
import usePanelStyles from '../hooks/usePanelStyles';
import { StructureInfo } from '../utils/structureInfo';
import LayerNameEditor from './LayerNameEditor';
import { useLatticeInfo } from '../hooks/useLatticeInfo';
import SupercellForm from './operations/SupercellForm';
import VacuumForm from './operations/VacuumForm';
import ScaleForm from './operations/ScaleForm';
import SetLatticeForm from './operations/SetLatticeForm';
import InterfaceForm from './operations/InterfaceForm';
import LayersList from './LayersList';
import DraggablePanel from './UI/DraggablePanel';
import ElementSelector from './UI/ElementSelector';
import MoleculeSketcher from './MoleculeSketcher';

const Panels = () => {
    const { t } = useTranslation();
    const {
        atoms, lattice, 
        handleLoad, handleDownload, 
        handleSupercell, handleVacuum,
        handleScaleLattice, handleSetLattice,
        layers, setLayers, activeLayerId, setActiveLayerId, setLattice,
        renameLayer,
        selectedAtomIds, setSelectedAtomIds,
        editMode, setEditMode,
        targetElement, setTargetElement,
        transformMode, setTransformMode,
        updateAtoms,
        createAtomAtCenter,
        saveStateToHistory, currentLatticeSourceId,
        isChatOpen,
        agentReviewState, acceptAgentResult, denyAgentResult, handleLayerReviewAction
    } = useMolecularContext();
    const { theme } = useTheme();

    const atomCount = atoms.length;
    const activeLayer = layers.find(l => l.id === activeLayerId) || null;
    const layerAtoms = atoms.filter(a => a.layerId === activeLayerId);
    const layerAtomCount = layerAtoms.length;
    const totalAtomCount = atoms.length;

    const formula = StructureInfo.getCompositionString(layerAtoms);

    const { latticeToShow, latticeExists, latticeLens, volume } = useLatticeInfo(lattice, activeLayer);

    const [expand, setExpand] = useState(false);
    const [expandLattice, setExpandLattice] = useState(false);
    const [expandInterface, setExpandInterface] = useState(false);
    const [latticeTab, setLatticeTab] = useState('vacuum');
    
    // Two separate editing states: one for the header (active layer) and one for the layers list
    const [editingActiveLayerId, setEditingActiveLayerId] = useState(null);
    const [editingActiveName, setEditingActiveName] = useState('');
    const [editingLayerId, setEditingLayerId] = useState(null);
    const [editingName, setEditingName] = useState('');

    const [addSubMode, setAddSubMode] = useState(null);
    const [showSketcher, setShowSketcher] = useState(false);

    const handleMoleculeSave = (newAtoms) => {
        // Create a proper layer id string (follow app convention)
        const newLayerId = `layer-${Date.now()}`;
        const maxAtomId = atoms && atoms.length ? Math.max(...atoms.map(a => a.id)) : -1;

        const atomsWithIds = newAtoms.map((a, idx) => ({
            ...a,
            id: maxAtomId + 1 + idx,
            layerId: newLayerId
        }));

        const newLayer = {
            id: newLayerId,
            name: `Molecule ${layers.length + 1}`,
            visible: true,
            selected: true,
            opacity: 1,
            lattice: null,
            color: '#ff0000',
            type: 'molecule'
        };

        // Insert new layer at the front like other imports
        setLayers(prev => [newLayer, ...prev]);
        updateAtoms(prev => [...prev, ...atomsWithIds]);
        setActiveLayerId(newLayerId);
        // Select the newly added atoms so they can be edited/deleted right away
        // extract their ids
        const newIds = atomsWithIds.map(a => a.id);
        setSelectedAtomIds(newIds);
        setEditMode('SELECT');
        setTransformMode('translate');
        setShowSketcher(false);
        setAddSubMode(null);
    };

    const selectedCount = selectedAtomIds.length;
    const selAtom = selectedCount === 1 ? atoms.find(a => a.id === selectedAtomIds[0]) : null;

    const isDark = theme === 'dark';
    const panels = usePanelStyles(theme);
    const { panelClass, textPrimary, textSecondary, textMuted, bgInput, bgInputDarker, borderClass, buttonSecondary, buttonPrimary, textTitle, textIcon, textLayerInfo, textNoLattice, buttonPreset, layerTextActive, layerTextMuted, layerTextAccent } = panels;
    const { bgCard, bgMetric, buttonDanger, buttonDangerBg, layerActive, layerInactive, layerButton, layerTextDanger, borderInput } = panels;

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

    // Calculate panel position based on chat state
    // Chat panel width is typically 320px. Right panel width is 340px. Margin 20px.
    const rightOffset = isChatOpen ? 320 + 360 : 360;
    const panelX = window.innerWidth - rightOffset;

    return (
        <>
            {/* Fixed Top-Left Panel */}
            <div className="absolute top-4 left-4 w-80 z-10 pointer-events-none">
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
                    </div>
                </div>
            </div>

            {/* Draggable Tools Panel (Left) */}
            <DraggablePanel 
                title={t('Modeling Operations')} 
                icon={<Settings size={16} />}
                theme={theme}
                initialX={20}
                initialY={320}
                initialWidth={340}
                initialHeight={500}
                className={`${panelClass} backdrop-blur-md`}
                headerClass={`border-b ${borderClass}`}
            >
                <div className="flex flex-col gap-6">
                    {/* Modeling Operations */}
                    <div>
                        <div className="space-y-3">
                            {/* Supercell */}
                            <div className={`${panels.bgCard} p-2 rounded border ${borderClass}`}>
                                <button onClick={() => setExpand(!expand)} className={`w-full flex justify-between text-sm ${textSecondary} hover:${textPrimary}`}>
                                    <span className="flex items-center gap-2"><Grid size={16} /> {t('Supercell')}</span>
                                    <ChevronDown size={14} className={`transition ${expand?'rotate-180':''}`} />
                                </button>
                                {expand && (
                                    <SupercellForm handleSupercell={handleSupercell} t={t} panels={panels} />
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
                                            <VacuumForm handleVacuum={handleVacuum} t={t} panels={panels} />
                                        )}

                                        {latticeTab === 'scale' && (
                                            <ScaleForm handleScaleLattice={handleScaleLattice} t={t} panels={panels} />
                                        )}

                                        {latticeTab === 'setlength' && (
                                            <SetLatticeForm handleSetLattice={handleSetLattice} lattice={lattice} t={t} panels={panels} />
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Interface Building */}
                            <div className={`${panels.bgCard} p-2 rounded border ${borderClass}`}>
                                <button onClick={() => setExpandInterface(!expandInterface)} className={`w-full flex justify-between text-sm ${textSecondary} hover:${textPrimary}`}>
                                    <span className="flex items-center gap-2"><Layers size={16} /> {t('Interface Building')}</span>
                                    <ChevronDown size={14} className={`transition ${expandInterface?'rotate-180':''}`} />
                                </button>
                                {expandInterface && (
                                    <InterfaceForm layers={layers} t={t} panels={panels} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DraggablePanel>

            {/* Edit Tools Panel (Right) */}
            <DraggablePanel 
                title={t('Edit Tools')} 
                icon={<Scissors size={16} />}
                theme={theme}
                initialX={panelX}
                initialY={20}
                initialWidth={340}
                initialHeight={400}
                className={`${panelClass} backdrop-blur-md`}
                headerClass={`border-b ${borderClass}`}
            >
                <div className="flex flex-col gap-6">
                    <div>
                        <div className={`flex gap-1 mb-4 p-1 rounded ${panels.bgCard}`}>
                            <button onClick={()=>setEditMode('SELECT')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${editMode==='SELECT'?buttonPrimary:textMuted}`}>
                                <MousePointer2 size={14} /> {t('Select/Move')}
                            </button>
                            <button onClick={()=>setEditMode('ADD')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${editMode==='ADD'?buttonPrimary:textMuted}`}>
                                <PlusSquare size={14} /> {t('Add')}
                            </button>
                        </div>

                        {/* Add Mode Buttons - visible only when in ADD mode */}
                        {editMode === 'ADD' && (
                            <div className="flex flex-col gap-2">
                                <div className={`flex gap-1 mb-4 p-1 rounded ${panels.bgCard}`}>
                                    <button onClick={()=>setAddSubMode(addSubMode === 'atom' ? null : 'atom')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${addSubMode==='atom'?buttonPrimary:textMuted} hover:${textPrimary}`}>
                                        <PlusSquare size={14} /> {t('Add Atom')}
                                    </button>
                                    <button onClick={()=>setAddSubMode(addSubMode === 'molecule' ? null : 'molecule')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${addSubMode==='molecule'?buttonPrimary:textMuted} hover:${textPrimary}`}>
                                        <Box size={14} /> {t('Add Molecule')}
                                    </button>
                                </div>
                                
                                {addSubMode === 'molecule' && (
                                    <div className={`p-2 rounded ${panels.bgCard} border ${borderClass} animate-fade-in mb-2`}>
                                        <button onClick={() => setShowSketcher(true)} className={`w-full ${buttonPrimary} py-2 rounded text-xs flex items-center justify-center gap-2`}>
                                            <Box size={14} /> {t('Open Sketcher')}
                                        </button>
                                    </div>
                                )}

                                {addSubMode === 'atom' && (
                                    <div className={`p-2 rounded ${panels.bgCard} border ${borderClass} animate-fade-in`}>
                                        <div className={`text-xs font-bold mb-2 ${textLayerInfo}`}>{t('Select Element')}</div>
                                        <div className="flex gap-2 items-center">
                                            <ElementSelector 
                                                value={targetElement} 
                                                onChange={setTargetElement} 
                                                panels={panels}
                                                className={`flex-1 ${bgInput} border ${borderInput} rounded text-xs px-2 py-1 ${textPrimary}`}
                                            />
                                            <button onClick={() => createAtomAtCenter(targetElement)} className={`${buttonPrimary} px-4 py-1 rounded text-xs flex items-center gap-2`}>
                                                <PlusSquare size={14} /> {t('Apply')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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
                                        <ElementSelector 
                                            value={targetElement} 
                                            onChange={setTargetElement} 
                                            panels={panels}
                                            className={`flex-1 ${bgInput} border ${borderInput} rounded text-xs px-2 py-1 ${textPrimary}`}
                                        />
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
                </div>
            </DraggablePanel>

            {showSketcher && (
                <MoleculeSketcher 
                    onSave={handleMoleculeSave} 
                    onCancel={() => setShowSketcher(false)} 
                />
            )}

            {/* Layers Panel (Right) */}
            <DraggablePanel 
                title={t('Layers')} 
                icon={<Layers size={16} />}
                theme={theme}
                initialX={panelX}
                initialY={440}
                initialWidth={340}
                initialHeight={400}
                className={`${panelClass} backdrop-blur-md`}
                headerClass={`border-b ${borderClass}`}
            >
                <div className="flex flex-col gap-6">
                    <div>
                        {agentReviewState && agentReviewState.status === 'reviewing' && (
                            <div className="flex gap-1 mb-3">
                                <button onClick={acceptAgentResult} className="bg-green-600 hover:bg-green-700 text-white p-1 rounded" title="Accept Agent Result">
                                    <Check size={14} />
                                </button>
                                <button onClick={denyAgentResult} className="bg-red-600 hover:bg-red-700 text-white p-1 rounded" title="Deny Agent Result">
                                    <X size={14} />
                                </button>
                            </div>
                        )}
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
                                saveStateToHistory={saveStateToHistory}
                                atoms={atoms}
                                currentLatticeSourceId={currentLatticeSourceId}
                                handleLayerReviewAction={handleLayerReviewAction}
                            />
                        </div>
                    </div>
                </div>
            </DraggablePanel>
        </>
    );
};

export default Panels;