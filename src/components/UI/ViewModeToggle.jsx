import React from 'react';
import { useMolecularContext } from '../../context/MolecularContext';

const ViewModeToggle = () => {
    const { pdbContent, viewMode, setViewMode } = useMolecularContext();

    if (!pdbContent) return null;

    return (
        <div className="absolute top-4 right-80 z-[60] flex gap-2">
            <button 
                className={`px-3 py-1 rounded shadow text-sm font-medium ${viewMode === 'default' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
                onClick={() => setViewMode('default')}
            >
                Atom View
            </button>
            <button 
                className={`px-3 py-1 rounded shadow text-sm font-medium ${viewMode === 'protein' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}
                onClick={() => setViewMode('protein')}
            >
                Protein View
            </button>
        </div>
    );
};

export default ViewModeToggle;
