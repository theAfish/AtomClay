import React, { useState } from 'react';
import { Settings, Grid, Expand, Layers, Code } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMolecularContext } from '../../context/MolecularContext';
import { useTheme } from '../../context/ThemeContext';
import usePanelStyles from '../../hooks/usePanelStyles';
import { Accordion } from '../Common';
import { DraggablePanel } from '../Common';
import SupercellForm from '../Lattice/SupercellForm';
import VacuumForm from '../Lattice/VacuumForm';
import ScaleForm from '../Lattice/ScaleForm';
import SetLatticeForm from '../Lattice/SetLatticeForm';
import InterfaceForm from '../Lattice/InterfaceForm';
import ProceduralGenForm from '../Lattice/ProceduralGenForm';

/**
 * Left draggable panel containing modeling operations:
 * Supercell, Lattice Operations, Interface Building, Procedural Generation.
 */
const ModelingOperationsPanel = () => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const {
        lattice, layers,
        handleSupercell, handleVacuum,
        handleScaleLattice, handleSetLattice,
    } = useMolecularContext();
    const panels = usePanelStyles(theme);
    const { panelClass, textSecondary, textPrimary, textMuted, borderClass, buttonPrimary, bgCard } = panels;

    const [latticeTab, setLatticeTab] = useState('vacuum');

    const accordionStyle = `${bgCard} p-2 rounded border ${borderClass}`;
    const headerStyle = `${textSecondary} hover:${textPrimary}`;

    return (
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
                <div className="space-y-3">
                    {/* Supercell */}
                    <Accordion
                        icon={<Grid size={16} />}
                        title={t('Supercell')}
                        className={accordionStyle}
                        headerClass={headerStyle}
                    >
                        <SupercellForm handleSupercell={handleSupercell} t={t} panels={panels} />
                    </Accordion>

                    {/* Lattice Operations */}
                    <Accordion
                        icon={<Expand size={16} />}
                        title={t('Lattice Operations')}
                        className={accordionStyle}
                        headerClass={headerStyle}
                    >
                        <div className="mt-3 space-y-3">
                            <div className={`flex gap-2 text-xs border-b ${borderClass} pb-2`}>
                                <button onClick={() => setLatticeTab('vacuum')} className={`flex-1 py-1 rounded ${latticeTab === 'vacuum' ? buttonPrimary : textMuted}`}>{t('Vacuum')}</button>
                                <button onClick={() => setLatticeTab('scale')} className={`flex-1 py-1 rounded ${latticeTab === 'scale' ? buttonPrimary : textMuted}`}>{t('Scale')}</button>
                                <button onClick={() => setLatticeTab('setlength')} className={`flex-1 py-1 rounded ${latticeTab === 'setlength' ? buttonPrimary : textMuted}`}>{t('Set Lengths')}</button>
                            </div>
                            {latticeTab === 'vacuum' && <VacuumForm handleVacuum={handleVacuum} t={t} panels={panels} />}
                            {latticeTab === 'scale' && <ScaleForm handleScaleLattice={handleScaleLattice} t={t} panels={panels} />}
                            {latticeTab === 'setlength' && <SetLatticeForm handleSetLattice={handleSetLattice} lattice={lattice} t={t} panels={panels} />}
                        </div>
                    </Accordion>

                    {/* Interface Building */}
                    <Accordion
                        icon={<Layers size={16} />}
                        title={t('Interface Building')}
                        className={accordionStyle}
                        headerClass={headerStyle}
                    >
                        <InterfaceForm layers={layers} t={t} panels={panels} />
                    </Accordion>

                    {/* Procedural Generation */}
                    <Accordion
                        icon={<Code size={16} />}
                        title={t('Procedural Generation')}
                        className={accordionStyle}
                        headerClass={headerStyle}
                    >
                        <ProceduralGenForm t={t} panels={panels} />
                    </Accordion>
                </div>
            </div>
        </DraggablePanel>
    );
};

export default ModelingOperationsPanel;
