import React, { useState } from 'react';
import { useMolecularContext } from '../../context/MolecularContext';
import { buildPoscar } from '../../utils/structureExports';
import { materialsService } from '../../services/materialsService';
import { Loader2, Check, AlertCircle, ChevronRight } from 'lucide-react';

const InterfaceForm = ({ t, panels }) => {
    // Use context directly to get atoms and setters
    const { layers, atoms, setLayers, setAtoms, setActiveLayerId, setLattice } = useMolecularContext();

    const [layerAId, setLayerAId] = useState('');
    const [layerBId, setLayerBId] = useState('');
    const [millerA, setMillerA] = useState({ h: 1, k: 0, l: 0 });
    const [millerB, setMillerB] = useState({ h: 1, k: 0, l: 0 });
    
    // New state for additional parameters
    const [gap, setGap] = useState(2.5);
    const [vacuumOverFilm, setVacuumOverFilm] = useState(0.0);
    const [filmThickness, setFilmThickness] = useState(1);
    const [substrateThickness, setSubstrateThickness] = useState(1);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [results, setResults] = useState([]);
    const [previewedInterface, setPreviewedInterface] = useState(null);

    const clearPreview = () => {
        if (previewedInterface) {
            // Remove the preview layer and atoms
            setLayers(prev => prev.filter(l => l.id !== `preview-${previewedInterface.id}`));
            setAtoms(prev => prev.filter(a => a.layerId !== `preview-${previewedInterface.id}`));
            // Show all layers again
            setLayers(prev => prev.map(l => ({ ...l, visible: true })));
            setPreviewedInterface(null);
        }
    };

    const previewInterface = (iface) => {
        clearPreview(); // Remove previous preview if any
        // Hide all layers
        setLayers(prev => prev.map(l => ({ ...l, visible: false })));
        // Add preview layer
        const previewLayerId = `preview-${iface.id}`;
        const previewLayer = {
            id: previewLayerId,
            name: `Preview Interface ${iface.id}`,
            visible: true,
            selected: true,
            opacity: 1,
            lattice: iface.lattice
        };
        const previewAtoms = iface.atoms.map((a, idx) => ({
            id: `${previewLayerId}-${idx}`,
            element: a.element,
            x: a.x,
            y: a.y,
            z: a.z,
            layerId: previewLayerId
        }));
        setLayers(prev => [...prev, previewLayer]);
        setAtoms(prev => [...prev, ...previewAtoms]);
        setActiveLayerId(previewLayerId);
        setLattice(iface.lattice);
        setPreviewedInterface(iface);
    };

    const handleApply = async () => {
        setError(null);
        setResults([]);
        
        if (!layerAId || !layerBId) {
            setError(t('Please select both layers'));
            return;
        }
        
        const layerA = layers.find(l => l.id === layerAId);
        const layerB = layers.find(l => l.id === layerBId);
        
        if (!layerA || !layerB) {
             setError(t('Invalid layers selected'));
             return;
        }

        const atomsA = atoms.filter(a => a.layerId === layerAId);
        const atomsB = atoms.filter(a => a.layerId === layerBId);
        
        const poscarA = buildPoscar(atomsA, layerA.lattice);
        const poscarB = buildPoscar(atomsB, layerB.lattice);
        
        if (!poscarA || !poscarB) {
            setError(t('Failed to generate structure data for selected layers'));
            return;
        }

        setLoading(true);
        try {
            const payload = {
                film_structure_string: poscarA,
                film_format: 'poscar',
                substrate_structure_string: poscarB,
                substrate_format: 'poscar',
                film_miller: [parseInt(millerA.h)||0, parseInt(millerA.k)||0, parseInt(millerA.l)||0],
                substrate_miller: [parseInt(millerB.h)||0, parseInt(millerB.k)||0, parseInt(millerB.l)||0],
                max_area: 400.0,
                max_length_tol: 0.03,
                max_angle_tol: 0.01,
                gap: parseFloat(gap) || 2.5,
                vacuum_over_film: parseFloat(vacuumOverFilm) || 0.0,
                film_thickness: parseInt(filmThickness) || 1,
                substrate_thickness: parseInt(substrateThickness) || 1,
                in_layers: true,
                max_interfaces: 1000
            };
            
            const response = await materialsService.buildInterfaces(payload);
            if (response.interfaces && response.interfaces.length > 0) {
                setResults(response.interfaces);
            } else {
                setError(response.message || t('No interfaces found'));
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadInterface = (iface) => {
        clearPreview(); // Clear any preview before loading
        const newLayerId = `layer-${Date.now()}`;
        const newLayer = {
            id: newLayerId,
            name: `Interface ${iface.id}`,
            visible: true,
            selected: true,
            opacity: 1,
            lattice: iface.lattice
        };
        
        const newAtoms = iface.atoms.map((a, idx) => ({
            id: `${newLayerId}-${idx}`,
            element: a.element,
            x: a.x,
            y: a.y,
            z: a.z,
            layerId: newLayerId
        }));
        
        setLayers(prev => [...prev, newLayer]);
        setAtoms(prev => [...prev, ...newAtoms]);
        setActiveLayerId(newLayerId);
        setLattice(iface.lattice);
    };

    const handleMillerChange = (layer, index, value) => {
        if (value === '' || value === '-') {
             if (layer === 'A') {
                setMillerA(prev => ({ ...prev, [index]: value }));
            } else {
                setMillerB(prev => ({ ...prev, [index]: value }));
            }
            return;
        }

        const val = parseInt(value);
        if (!isNaN(val)) {
            if (layer === 'A') {
                setMillerA(prev => ({ ...prev, [index]: val }));
            } else {
                setMillerB(prev => ({ ...prev, [index]: val }));
            }
        }
    };

    const { bgInput, textPrimary, textSecondary, buttonPrimary, borderClass, bgCard, textMuted } = panels;

    return (
        <div className="mt-3 space-y-3">
            {/* Layer A Selection */}
            <div>
                <label className={`block text-xs ${textSecondary} mb-1`}>{t('Layer A (Film)')}</label>
                <select 
                    value={layerAId} 
                    onChange={(e) => setLayerAId(e.target.value)}
                    className={`w-full p-1 text-sm rounded border ${bgInput} ${textPrimary} ${borderClass}`}
                >
                    <option value="">{t('Select Layer')}</option>
                    {layers.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                </select>
                <div className="flex gap-2 mt-1">
                    {['h', 'k', 'l'].map(idx => (
                        <input 
                            key={`A-${idx}`}
                            type="number" 
                            placeholder={idx}
                            value={millerA[idx]}
                            onChange={(e) => handleMillerChange('A', idx, e.target.value)}
                            className={`w-full p-1 text-sm rounded border ${bgInput} ${textPrimary} ${borderClass}`}
                        />
                    ))}
                </div>
            </div>

            {/* Layer B Selection */}
            <div>
                <label className={`block text-xs ${textSecondary} mb-1`}>{t('Layer B (Substrate)')}</label>
                <select 
                    value={layerBId} 
                    onChange={(e) => setLayerBId(e.target.value)}
                    className={`w-full p-1 text-sm rounded border ${bgInput} ${textPrimary} ${borderClass}`}
                >
                    <option value="">{t('Select Layer')}</option>
                    {layers.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                </select>
                <div className="flex gap-2 mt-1">
                    {['h', 'k', 'l'].map(idx => (
                        <input 
                            key={`B-${idx}`}
                            type="number" 
                            placeholder={idx}
                            value={millerB[idx]}
                            onChange={(e) => handleMillerChange('B', idx, e.target.value)}
                            className={`w-full p-1 text-sm rounded border ${bgInput} ${textPrimary} ${borderClass}`}
                        />
                    ))}
                </div>
            </div>

            {/* Interface Parameters */}
            <div className="space-y-2">
                <label className={`block text-xs ${textSecondary} mb-1`}>{t('Interface Parameters')}</label>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className={`block text-xs ${textSecondary} mb-1`}>{t('Gap (Å)')}</label>
                        <input 
                            type="number" 
                            step="0.1"
                            value={gap}
                            onChange={(e) => setGap(e.target.value)}
                            className={`w-full p-1 text-sm rounded border ${bgInput} ${textPrimary} ${borderClass}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-xs ${textSecondary} mb-1`}>{t('Vacuum (Å)')}</label>
                        <input 
                            type="number" 
                            step="0.1"
                            value={vacuumOverFilm}
                            onChange={(e) => setVacuumOverFilm(e.target.value)}
                            className={`w-full p-1 text-sm rounded border ${bgInput} ${textPrimary} ${borderClass}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-xs ${textSecondary} mb-1`}>{t('Layer A Thickness')}</label>
                        <input 
                            type="number" 
                            min="1"
                            value={filmThickness}
                            onChange={(e) => setFilmThickness(e.target.value)}
                            className={`w-full p-1 text-sm rounded border ${bgInput} ${textPrimary} ${borderClass}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-xs ${textSecondary} mb-1`}>{t('Layer B Thickness')}</label>
                        <input 
                            type="number" 
                            min="1"
                            value={substrateThickness}
                            onChange={(e) => setSubstrateThickness(e.target.value)}
                            className={`w-full p-1 text-sm rounded border ${bgInput} ${textPrimary} ${borderClass}`}
                        />
                    </div>
                </div>
            </div>

            <button 
                onClick={handleApply}
                disabled={loading}
                className={`w-full py-1 rounded ${buttonPrimary} text-sm font-semibold mt-2 flex items-center justify-center gap-2`}
            >
                {loading ? <Loader2 className="animate-spin" size={16} /> : t('Find Interfaces')}
            </button>

            {error && (
                <div className="text-red-500 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle size={12} /> {error}
                </div>
            )}

            {results.length > 0 && (
                <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-1">
                    <p className={`text-xs ${textSecondary} font-semibold`}>{t('Candidates')} ({results.length})</p>
                    {results.map((iface, idx) => (
                        <div key={idx} className={`p-2 rounded border ${bgCard} ${borderClass} text-xs`}>
                            <div className="flex justify-between items-start mb-1">
                                <span className={`${textPrimary} font-bold`}>#{idx+1} Strain: {(iface.von_mises_strain || 0).toFixed(4)}</span>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => previewInterface(iface)}
                                        className={`${buttonPrimary} px-2 py-0.5 rounded text-[10px]`}
                                    >
                                        {t('Preview')}
                                    </button>
                                    <button 
                                        onClick={() => loadInterface(iface)}
                                        className={`${buttonPrimary} px-2 py-0.5 rounded text-[10px] flex items-center gap-1`}
                                    >
                                        {t('Load')} <ChevronRight size={10} />
                                    </button>
                                </div>
                            </div>
                            <div className={`${textMuted} grid grid-cols-2 gap-1`}>
                                <span>Area: {iface.area ? iface.area.toFixed(2) : 'N/A'} Å²</span>
                                <span>Atoms: {iface.atoms.length}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default InterfaceForm;
