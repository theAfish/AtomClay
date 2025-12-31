import React, { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

const LayerNameEditor = ({ layer, onRename, onEditingChange, className = '', inputClass = '' }) => {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(layer ? layer.name : '');

    useEffect(() => {
        if (layer) setName(layer.name);
    }, [layer]);

    useEffect(() => {
        if (onEditingChange) onEditingChange(editing);
    }, [editing, onEditingChange]);

    if (!layer) return <>{'None'}</>;

    return editing ? (
        <span className={`inline-flex items-center gap-2 w-full ${className}`}>
            <input
                autoFocus
                type="text"
                value={name}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        onRename && onRename(layer.id, name || layer.name);
                        setEditing(false);
                    }
                    if (e.key === 'Escape') {
                        setEditing(false);
                        setName(layer.name);
                    }
                }}
                className={`flex-1 min-w-0 w-full h-6 leading-tight text-sm ${inputClass}`}
            />
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRename && onRename(layer.id, name || layer.name);
                    setEditing(false);
                }}
                className="p-1 flex-shrink-0"
                title="Save"
            >
                <Check size={14} />
            </button>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setEditing(false);
                    setName(layer.name);
                }}
                className="p-1 flex-shrink-0"
                title="Cancel"
            >
                <X size={14} />
            </button>
        </span>
    ) : (
        <span className={`inline-flex items-center gap-2 ${className}`}>
            <span onDoubleClick={() => setEditing(true)} className="truncate">
                {layer.name}
            </span>
        </span>
    );
};

export default LayerNameEditor;
