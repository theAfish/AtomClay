import React, { useState } from 'react';
import { Scissors, MousePointer2, PlusSquare, Expand, Box, Move, RotateCw, Maximize2, Grid, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMolecularContext } from '../../context/MolecularContext';
import { useTheme } from '../../context/ThemeContext';
import usePanelStyles from '../../hooks/usePanelStyles';
import { DraggablePanel } from '../Common';
import ElementSelector from '../Atom/ElementSelector';
import MoleculeSketcher from '../Atom/MoleculeSketcher';

/**
 * Right draggable panel containing edit tools:
 * SELECT/ADD/LATTICE mode tabs, transform modes,
 * element selector, atom creation, selection info.
 */
const EditToolsPanel = ({ panelX }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const {
        atoms, lattice,
        layers, setLayers, activeLayerId, setActiveLayerId,
        selectedAtomIds, setSelectedAtomIds,
        editMode, setEditMode,
        targetElement, setTargetElement,
        transformMode, setTransformMode,
        updateAtoms,
        createAtomAtCenter,
        handleWrapAtoms,
        moveAtomsWithLattice, setMoveAtomsWithLattice,
    } = useMolecularContext();
    const panels = usePanelStyles(theme);
    const {
        panelClass, textPrimary, textSecondary, textMuted,
        bgInput, borderClass, borderInput, buttonPrimary,
        bgCard, bgMetric, buttonDangerBg, textLayerInfo,
    } = panels;

    const [addSubMode, setAddSubMode] = useState(null);
    const [showSketcher, setShowSketcher] = useState(false);

    const selectedCount = selectedAtomIds.length;
    const selAtom = selectedCount === 1 ? atoms.find(a => a.id === selectedAtomIds[0]) : null;

    const onApplyEdit = () => {
        if (selectedAtomIds.length > 0) {
            const ids = selectedAtomIds.slice();
            updateAtoms(
                prev => prev.map(a => ids.includes(a.id) ? { ...a, element: targetElement } : a),
                'replace-element',
                { ids, count: ids.length, newElement: targetElement }
            );
        }
    };

    const onDelete = () => {
        if (selectedAtomIds.length > 0) {
            const ids = selectedAtomIds.slice();
            updateAtoms(prev => prev.filter(a => !ids.includes(a.id)), 'delete-selected', { ids, count: ids.length });
            setSelectedAtomIds([]);
        }
    };

    const handleMoleculeSave = (newAtoms) => {
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
        setLayers(prev => [newLayer, ...prev]);
        updateAtoms(prev => [...prev, ...atomsWithIds]);
        setActiveLayerId(newLayerId);
        setSelectedAtomIds(atomsWithIds.map(a => a.id));
        setEditMode('SELECT');
        setTransformMode('translate');
        setShowSketcher(false);
        setAddSubMode(null);
    };

    // --- Mode-specific sub-panels ---
    const renderAddMode = () => (
        <div className="flex flex-col gap-2">
            <div className={`flex gap-1 mb-4 p-1 rounded ${bgCard}`}>
                <button onClick={() => setAddSubMode(addSubMode === 'atom' ? null : 'atom')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${addSubMode === 'atom' ? buttonPrimary : textMuted} hover:${textPrimary}`}>
                    <PlusSquare size={14} /> {t('Add Atom')}
                </button>
                <button onClick={() => setAddSubMode(addSubMode === 'molecule' ? null : 'molecule')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${addSubMode === 'molecule' ? buttonPrimary : textMuted} hover:${textPrimary}`}>
                    <Box size={14} /> {t('Add Molecule')}
                </button>
            </div>
            {addSubMode === 'molecule' && (
                <div className={`p-2 rounded ${bgCard} border ${borderClass} animate-fade-in mb-2`}>
                    <button onClick={() => setShowSketcher(true)} className={`w-full ${buttonPrimary} py-2 rounded text-xs flex items-center justify-center gap-2`}>
                        <Box size={14} /> {t('Open Sketcher')}
                    </button>
                </div>
            )}
            {addSubMode === 'atom' && (
                <div className={`p-2 rounded ${bgCard} border ${borderClass} animate-fade-in`}>
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
    );

    const renderSelectMode = () => (
        <div className={`flex gap-1 mb-4 p-1 rounded ${bgCard}`}>
            <button onClick={() => setTransformMode('translate')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${transformMode === 'translate' ? buttonPrimary : textMuted}`}>
                <Move size={14} /> {t('Translate')}
            </button>
            <button onClick={() => setTransformMode('rotate')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${transformMode === 'rotate' ? buttonPrimary : textMuted}`}>
                <RotateCw size={14} /> {t('Rotate')}
            </button>
            <button onClick={() => setTransformMode('scale')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${transformMode === 'scale' ? buttonPrimary : textMuted}`}>
                <Maximize2 size={14} /> {t('Scale')}
            </button>
        </div>
    );

    const renderLatticeMode = () => (
        <div className={`p-2 rounded ${bgCard} border ${borderClass} animate-fade-in mb-2`}>
            <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={moveAtomsWithLattice} onChange={() => setMoveAtomsWithLattice(!moveAtomsWithLattice)} />
                <span className="ml-2">{t('Move atoms with lattice (keep fractional coords)')}</span>
            </label>
            <div className={`mt-2 border-t ${borderClass} pt-2`}>
                <button onClick={handleWrapAtoms} className={`w-full ${buttonPrimary} py-2 rounded text-xs flex items-center justify-center gap-2`}>
                    <Grid size={14} /> {t('Wrap Atoms to Cell')}
                </button>
            </div>
        </div>
    );

    const renderSelectionInfo = () => {
        if (selectedCount === 0) {
            return (
                <div className={`text-xs text-center py-4 italic ${textMuted}`}>
                    {t('Select Instruction', { mode: t(transformMode.charAt(0).toUpperCase() + transformMode.slice(1)) })}
                    <div className="mt-2 text-[11px]">{t('Use the Add Atom button to insert a new atom at the cell center.')}</div>
                </div>
            );
        }
        return (
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
        );
    };

    return (
        <>
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
                        {/* Mode tabs */}
                        <div className={`flex gap-1 mb-4 p-1 rounded ${bgCard}`}>
                            <button onClick={() => setEditMode('SELECT')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${editMode === 'SELECT' ? buttonPrimary : textMuted}`}>
                                <MousePointer2 size={14} /> {t('Select/Move')}
                            </button>
                            <button onClick={() => setEditMode('ADD')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${editMode === 'ADD' ? buttonPrimary : textMuted}`}>
                                <PlusSquare size={14} /> {t('Add')}
                            </button>
                            <button onClick={() => setEditMode('LATTICE')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${editMode === 'LATTICE' ? buttonPrimary : textMuted}`}>
                                <Expand size={14} /> {t('Lattice')}
                            </button>
                        </div>

                        {editMode === 'ADD' && renderAddMode()}
                        {editMode === 'SELECT' && renderSelectMode()}
                        {editMode === 'LATTICE' && renderLatticeMode()}

                        {renderSelectionInfo()}
                    </div>
                </div>
            </DraggablePanel>

            {showSketcher && (
                <MoleculeSketcher
                    onSave={handleMoleculeSave}
                    onCancel={() => setShowSketcher(false)}
                />
            )}
        </>
    );
};

export default EditToolsPanel;
