import React, { useState } from 'react';
import { Box, Layers, Upload, Download, Grid, ChevronDown, Expand } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMolecularContext } from '../context/MolecularContext';
import usePanelStyles from '../hooks/usePanelStyles';
import { StructureInfo } from '../utils/structureInfo';
import LayerNameEditor from './LayerNameEditor';
import { useLatticeInfo } from '../hooks/useLatticeInfo';
import SupercellForm from './operations/SupercellForm';
import VacuumForm from './operations/VacuumForm';
import ScaleForm from './operations/ScaleForm';
import SetLatticeForm from './operations/SetLatticeForm';
import InterfaceForm from './operations/InterfaceForm';

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

            {/* Layers UI has been moved to the right panel to improve placement — this section intentionally kept empty in the left panel */}
        </div>
    );
};

export default LeftPanel;
