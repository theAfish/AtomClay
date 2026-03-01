import React from 'react';
import { Box, Upload, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMolecularContext } from '../../context/MolecularContext';
import { useTheme } from '../../context/ThemeContext';
import usePanelStyles from '../../hooks/usePanelStyles';
import { StructureInfo } from '../../utils/structureInfo';
import { useLatticeInfo } from '../../hooks/useLatticeInfo';
import LayerNameEditor from '../Atom/LayerNameEditor';

/**
 * Top-left info panel showing app header, file load/download,
 * active layer info, and chemical formula.
 */
const InfoPanel = () => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const {
        atoms, lattice,
        handleLoad, handleDownload,
        layers, activeLayerId,
        renameLayer,
    } = useMolecularContext();
    const panels = usePanelStyles(theme);
    const { panelClass, textPrimary, textSecondary, borderClass, buttonSecondary, buttonPrimary, textTitle, textIcon, bgInput, bgCard } = panels;

    const activeLayer = layers.find(l => l.id === activeLayerId) || null;
    const layerAtoms = atoms.filter(a => a.layerId === activeLayerId);
    const layerAtomCount = layerAtoms.length;
    const totalAtomCount = atoms.length;
    const formula = StructureInfo.getCompositionString(layerAtoms);

    return (
        <div className="absolute top-4 left-4 w-80 z-10 pointer-events-none">
            <div className={`${panelClass} p-4 rounded-xl shadow-xl pointer-events-auto`}>
                <h1 className={`text-xl font-bold mb-2 flex items-center gap-2 ${textTitle}`}>
                    <Box className={textIcon} /> AtomClay
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
                <div className={`text-xs font-mono p-2 rounded border ${bgCard} ${textSecondary} ${borderClass}`}>
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
    );
};

export default InfoPanel;
