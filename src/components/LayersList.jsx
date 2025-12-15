import React, { useState } from 'react';
import { Eye, EyeOff, Plus, Trash, CheckSquare, Square } from 'lucide-react';
import LayerNameEditor from './LayerNameEditor';

const LayersList = ({ layers, panels, activeLayerId, setActiveLayerId, setLattice, setLayers, renameLayer, lattice, saveStateToHistory, atoms, currentLatticeSourceId }) => {
    if (!layers) return null;

    const { layerActive, layerInactive, layerButton, layerTextMuted, layerTextDanger, borderClass } = panels;
    const [editingLayerId, setEditingLayerId] = useState(null);

    return (
        <div className="space-y-2">
            {layers.map(layer => {
                let rowClass = activeLayerId===layer.id? layerActive : layerInactive;
                if (layer.isAgentResult) rowClass = "bg-green-900/40 border border-green-500/50";
                if (layer.isAgentInput) rowClass = "bg-red-900/40 border border-red-500/50 opacity-60";

                return (
                <div key={layer.id} className={`flex items-center justify-between p-2 rounded h-10 ${rowClass}`}>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                        <button onClick={() => setLayers(prev => prev.map(l => l.id===layer.id? {...l, selected: !l.selected}: l))} className={`p-1`} title={layer.selected ? "Deselect for Agent" : "Select for Agent"}>
                            {layer.selected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>

                        <button onClick={() => setLayers(prev => prev.map(l => l.id===layer.id? {...l, visible: !l.visible}: l))} className={`p-1`}>
                            {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>

                        <button onClick={() => setActiveLayerId(layer.id)} className={`flex-1 min-w-0 text-sm text-left truncate ${activeLayerId===layer.id? 'font-semibold' : ''}`}>
                            <LayerNameEditor layer={layer} onRename={renameLayer} inputClass={panels.bgInput} onEditingChange={(isEditing) => setEditingLayerId(prev => isEditing ? layer.id : (prev === layer.id ? null : prev))} />
                        </button>

                        {layer.lattice && editingLayerId !== layer.id && (
                            <button onClick={() => setLattice(layer.lattice, layer.id)} className={`text-[10px] ml-2 px-2 py-0.5 rounded ${layerButton}`}>
                                {`Use Lattice`}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {editingLayerId !== layer.id && (
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
                        )}
                    </div>
                </div>
            )})}

            <div className="pt-2">
                <button onClick={() => {
                    if (saveStateToHistory) {
                        saveStateToHistory(atoms, lattice, layers, activeLayerId, currentLatticeSourceId);
                    }
                    const id = `layer-${Date.now()}`;
                    const name = `Layer ${layers.length + 1}`;
                    const newLayer = { id, name, visible: true, selected: true, opacity: 1, lattice: lattice ? JSON.parse(JSON.stringify(lattice)) : null };
                    setLayers(prev => [newLayer, ...prev]);
                    setActiveLayerId(id);
                }} className={`w-full ${panels.buttonPrimary} py-1 rounded text-xs flex items-center justify-center gap-2`}><Plus size={14}/> {`New Layer`}</button>
            </div>
        </div>
    );
};

export default LayersList;
