import React from 'react';
import { Layers, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMolecularContext } from '../../context/MolecularContext';
import { useTheme } from '../../context/ThemeContext';
import usePanelStyles from '../../hooks/usePanelStyles';
import { DraggablePanel } from '../Common';
import LayersList from './LayersList';

/**
 * Right draggable panel containing the layer list,
 * agent review accept/deny, and layer management controls.
 */
const LayersPanel = ({ panelX }) => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const {
        atoms, lattice,
        layers, setLayers, activeLayerId, setActiveLayerId, setLattice,
        setAtoms,
        renameLayer,
        saveStateToHistory, currentLatticeSourceId,
        agentReviewState, acceptAgentResult, denyAgentResult, handleLayerReviewAction,
    } = useMolecularContext();
    const panels = usePanelStyles(theme);
    const { panelClass, borderClass } = panels;

    return (
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
                            setAtoms={setAtoms}
                            currentLatticeSourceId={currentLatticeSourceId}
                            handleLayerReviewAction={handleLayerReviewAction}
                        />
                    </div>
                </div>
            </div>
        </DraggablePanel>
    );
};

export default LayersPanel;
