import React, { useState } from 'react';
import { Eye, EyeOff, Plus, Trash, CheckSquare, Square, Check, X, Merge } from 'lucide-react';
import LayerNameEditor from '../Atom/LayerNameEditor';

const LayersList = ({ layers, panels, activeLayerId, setActiveLayerId, setLattice, setLayers, renameLayer, lattice, saveStateToHistory, atoms, setAtoms, currentLatticeSourceId, handleLayerReviewAction }) => {
    if (!layers) return null;

    const { layerActive, layerInactive, layerButton, layerTextMuted, layerTextDanger, borderClass } = panels;
    const [editingLayerId, setEditingLayerId] = useState(null);

    const handleMergeLayers = () => {
        const layersToMerge = layers.filter(l => l.selected);
        if (layersToMerge.length < 2) return;

        if (saveStateToHistory) {
            saveStateToHistory(atoms, lattice, layers, activeLayerId, currentLatticeSourceId);
        }

        const id = `layer-${Date.now()}`; // Same ID format as new layer
        const name = `Merged Layer`;
        
        // Find a lattice to use. Prioritize active layer if selected, otherwise first selected.
        const prioritizedLayer = layersToMerge.find(l => l.id === activeLayerId) || layersToMerge[0];
        const mergedLattice = prioritizedLayer.lattice ? JSON.parse(JSON.stringify(prioritizedLayer.lattice)) : (lattice ? JSON.parse(JSON.stringify(lattice)) : null);

        const newLayer = { 
            id, 
            name, 
            visible: true, 
            selected: true, 
            opacity: 1, 
            lattice: mergedLattice 
        };

        // Update atoms
        const layerIdsToMerge = new Set(layersToMerge.map(l => l.id));
        const newAtoms = atoms.map(atom => {
            if (layerIdsToMerge.has(atom.layerId)) {
                return { ...atom, layerId: id };
            }
            return atom;
        });

        if (setAtoms) setAtoms(newAtoms);

        // Update layers: Remove merged, add new one
        setLayers(prev => {
            const remaining = prev.filter(l => !layerIdsToMerge.has(l.id));
            return [newLayer, ...remaining];
        });

        setActiveLayerId(id);
        if (mergedLattice) setLattice(mergedLattice, id);
    };

    return (
        <div className="space-y-2">
            {layers.map(layer => {
                let rowClass = activeLayerId===layer.id? layerActive : layerInactive;
                const isReview = layer.isAgentResult || layer.isAgentInput;
                if (layer.isAgentResult) rowClass = "bg-green-900/40 border border-green-500/50";
                if (layer.isAgentInput) rowClass = "bg-red-900/40 border border-red-500/50 opacity-60";

                return (
                <div key={layer.id} className={`flex items-center justify-between p-2 rounded h-10 ${rowClass}`}>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                        {!isReview && (
                            <button onClick={() => setLayers(prev => prev.map(l => l.id===layer.id? {...l, selected: !l.selected}: l))} className={`p-1`} title={layer.selected ? "Deselect for Agent" : "Select for Agent"}>
                                {layer.selected ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>
                        )}

                        {!isReview && (
                            <button onClick={() => setLayers(prev => prev.map(l => l.id===layer.id? {...l, visible: !l.visible}: l))} className={`p-1`}>
                                {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                        )}

                        <button onClick={() => setActiveLayerId(layer.id)} className={`flex-1 min-w-0 text-sm text-left truncate ${activeLayerId===layer.id? 'font-semibold' : ''}`}>
                            <LayerNameEditor layer={layer} onRename={renameLayer} inputClass={panels.bgInput} onEditingChange={(isEditing) => setEditingLayerId(prev => isEditing ? layer.id : (prev === layer.id ? null : prev))} />
                        </button>

                        {layer.lattice && editingLayerId !== layer.id && !isReview && (
                            <button onClick={() => setLattice(layer.lattice, layer.id)} className={`text-[10px] ml-2 px-2 py-0.5 rounded ${layerButton}`}>
                                {`Use Lattice`}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {isReview ? (
                            <>
                                <button 
                                    onClick={() => handleLayerReviewAction(layer.id, layer.isAgentInput ? 'discard' : 'keep')} 
                                    className="p-1 text-green-500 hover:text-green-400" 
                                    title={layer.isAgentInput ? "Accept Modification (Delete Original)" : "Accept Result (Keep New)"}
                                >
                                    <Check size={16} />
                                </button>
                                <button 
                                    onClick={() => handleLayerReviewAction(layer.id, layer.isAgentInput ? 'keep' : 'discard')} 
                                    className="p-1 text-red-500 hover:text-red-400" 
                                    title={layer.isAgentInput ? "Reject Modification (Restore Original)" : "Reject Result (Delete New)"}
                                >
                                    <X size={16} />
                                </button>
                            </>
                        ) : (
                            editingLayerId !== layer.id && (
                                <button onClick={() => {
                                if (!layers || layers.length <= 1) return;
                                if (saveStateToHistory) {
                                    saveStateToHistory(atoms, lattice, layers, activeLayerId, currentLatticeSourceId);
                                }
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
                                }} className={`p-1 ${layerTextMuted} hover:${layerTextDanger}`} title={`Delete Layer`}><Trash size={14}/></button>
                            )
                        )}
                    </div>
                </div>
            )})}

            <div className="pt-2 flex gap-2">
                <button onClick={() => {
                    if (saveStateToHistory) {
                        saveStateToHistory(atoms, lattice, layers, activeLayerId, currentLatticeSourceId);
                    }
                    const id = `layer-${Date.now()}`;
                    const existingNumbers = layers
                        .map(l => {
                            const match = l.name.match(/^Layer (\d+)$/);
                            return match ? parseInt(match[1], 10) : 0;
                        })
                        .filter(n => n > 0);
                    const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : layers.length + 1;
                    const name = `Layer ${nextNum}`;
                    const newLayer = { id, name, visible: true, selected: true, opacity: 1, lattice: lattice ? JSON.parse(JSON.stringify(lattice)) : null };
                    setLayers(prev => [newLayer, ...prev]);
                    setActiveLayerId(id);
                }} className={`flex-1 ${panels.buttonPrimary} py-1 rounded text-xs flex items-center justify-center gap-2`}><Plus size={14}/> {`New Layer`}</button>

                {layers.filter(l => l.selected).length > 1 && (
                    <button onClick={handleMergeLayers} className={`flex-1 ${panels.buttonPrimary} py-1 rounded text-xs flex items-center justify-center gap-2`} title="Merge selected layers"><Merge size={14}/> {`Merge`}</button>
                )}
            </div>
        </div>
    );
};

export default LayersList;
