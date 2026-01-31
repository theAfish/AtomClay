import React, { useState } from 'react';
import { Play, RotateCcw, Code2 } from 'lucide-react';
import { useMolecularContext } from '../../context/MolecularContext';

const ProceduralGenForm = ({ t, panels }) => {
    const { buttonPrimary, buttonSecondary, textMuted, bgInput, borderClass, textPrimary, textSecondary, bgMetric } = panels;
    const { updateAtoms, atoms, activeLayerId } = useMolecularContext();
    const DEFAULT_SCRIPT = `// Example: Create a Polyethylene-like chain
let count = 6;
let spacing = 1.5;

for(let i=0; i<count; i++) {
  // Add Carbon at cursor
  add('C');
  
  // Add Hydrogens
  let {x, y, z} = getPos();
  add('H', x, y + 1.1, z);
  add('H', x, y - 1.1, z);
  
  // Move cursor for next unit
  move(spacing, 0, 0); 
}`;
    const [script, setScript] = useState(DEFAULT_SCRIPT);
    const [error, setError] = useState(null);

    const runScript = () => {
        setError(null);
        try {
            const newAtoms = [];
            // Find max ID safely
            let currentId = 1;
            if (atoms && atoms.length > 0) {
                 currentId = Math.max(...atoms.map(a => a.id)) + 1;
            }
            
            // Execution context state
            let cursor = { x: 0, y: 0, z: 0 };
            
            // Define the API exposed to the script
            const api = {
                // --- Cursor Operations ---
                move: (x, y, z) => {
                    if (Array.isArray(x)) [x, y, z] = x;
                    cursor.x += (x || 0);
                    cursor.y += (y || 0);
                    cursor.z += (z || 0);
                },
                setPos: (x, y, z) => {
                    if (Array.isArray(x)) [x, y, z] = x;
                    cursor.x = (x || 0);
                    cursor.y = (y || 0);
                    cursor.z = (z || 0);
                },
                getPos: () => ({ ...cursor }),
                
                // --- Atom Operations ---
                add: (element, x, y, z) => {
                    let ax = cursor.x, ay = cursor.y, az = cursor.z;
                    
                    // Overrides
                    if (x !== undefined) {
                        if (Array.isArray(x)) {
                            [ax, ay, az] = x;
                        } else if (typeof x === 'object' && x !== null) {
                            ax = x.x ?? ax; ay = x.y ?? ay; az = x.z ?? az;
                        } else {
                            ax = x;
                            if (y !== undefined) ay = y;
                            if (z !== undefined) az = z;
                        }
                    }

                    newAtoms.push({
                        id: currentId++,
                        element: element || 'H',
                        x: ax, y: ay, z: az,
                        layerId: activeLayerId
                    });
                },
                
                // --- Helpers ---
                print: (msg) => console.log('Script output:', msg),
                rand: (min, max) => Math.random() * (max - min) + min,
            };

            // Prepare the function
            const keys = Object.keys(api);
            const values = Object.values(api);
            
            // "use strict" to prevent leaking globals slightly better
            const body = `"use strict";\n${script}`;
            
            const userFunc = new Function(...keys, body);
            userFunc(...values);

            if (newAtoms.length > 0) {
                updateAtoms(prev => [...prev, ...newAtoms]);
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };

    return (
        <div className="mt-3 space-y-3">
            <div className={`text-xs ${textSecondary} bg-black/20 p-2 rounded border ${borderClass}`}>
                <div className="flex items-center gap-2 mb-1 font-bold"><Code2 size={12}/> {t('JavaScript API Available')}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10px] opacity-80">
                    <div>add(el, [x,y,z]?)</div> { /* add 'C' or add 'C', 1,0,0 */ }
                    <div>move(x,y,z)</div>
                    <div>setPos(x,y,z)</div>
                    <div>getPos() &rarr; &#123;x,y,z&#125;</div>
                </div>
                <div className="mt-1 opacity-60 italic text-[10px]">
                    Use standard JS for loops, variables, and math.
                </div>
            </div>
            
            <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className={`w-full h-40 ${bgInput} border ${borderClass} rounded p-2 text-xs font-mono ${textPrimary} focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-y`}
                placeholder="Enter JavaScript..."
                spellCheck="false"
            />

            {error && (
                <div className="text-red-400 text-xs p-2 bg-red-900/10 rounded border border-red-500/30 whitespace-pre-wrap">
                    &gt; {error}
                </div>
            )}

            <div className="flex justify-end gap-2">
                <button onClick={() => setScript(DEFAULT_SCRIPT)} className={`${buttonSecondary} p-1 rounded`} title="Reset example">
                    <RotateCcw size={14} />
                </button>
                <button onClick={runScript} className={`${buttonPrimary} text-xs px-3 py-1 rounded flex items-center gap-1 shadow-lg shadow-blue-900/20`}>
                    <Play size={14} /> {t('Run')}
                </button>
            </div>
        </div>
    );
};

export default ProceduralGenForm;
