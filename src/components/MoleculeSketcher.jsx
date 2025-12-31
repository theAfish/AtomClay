import React, { useEffect, useRef, useState } from 'react';
import { Kekule } from 'kekule';
import 'kekule/theme/default';
import { Check, X, RotateCcw } from 'lucide-react';

const MoleculeSketcher = ({ onSave, onCancel }) => {
    const composerRef = useRef(null);
    const [composer, setComposer] = useState(null);

    useEffect(() => {
        if (composerRef.current && !composer) {
            // Initialize Kekule Composer
            const newComposer = new Kekule.Editor.Composer(composerRef.current);
            
            // Adjust size
            newComposer.setDimension('100%', '100%');
            
            // Configure to show 2D drawing tools
            newComposer.setEnableStyleToolbar(true);
            newComposer.setEnableOperHistory(true);
            newComposer.setEnableLoadNewFile(true);
            newComposer.setEnableCreateNewDoc(true);
            
            setComposer(newComposer);
        }
    }, [composerRef, composer]);

    const handleSave = () => {
        if (!composer) {
            console.warn('Composer not initialized');
            return;
        }
        const chemObj = composer.getChemObj();
        if (!chemObj) {
            console.warn('No chemObj found in composer');
            return;
        }

        // Generate 3D structure
        // We use Kekule.Calculator.generate3D
        // It might be async
        // Show loading or something?
        const processMolecule = (mol) => {
            const atoms = [];
            // Center the molecule
            // mol.setCoord2D({x:0, y:0}); // Not needed for 3D
            // Get all atoms
            // If chemObj is a ChemSpace, we might need to iterate children
            const nodes = [];
            if (mol.getNodes) {
                mol.getNodes().forEach(n => nodes.push(n));
            } else if (mol.root) {
                // If it's a ChemSpace
                mol.root.children.forEach(child => {
                    if (child.getNodes) {
                        child.getNodes().forEach(n => nodes.push(n));
                    }
                });
            }

            nodes.forEach(node => {
                if (node instanceof Kekule.Atom) {
                    let coord = node.getCoord3D();
                    if (!coord || typeof coord.x !== 'number') {
                        const coord2D = node.getCoord2D();
                        if (coord2D) {
                            // Fallback to 2D coordinates (z=0)
                            coord = { x: coord2D.x, y: coord2D.y, z: 0 };
                        }
                    }
                    const symbol = node.getSymbol();
                    if (coord && symbol) {
                        atoms.push({
                            element: symbol,
                            x: coord.x || 0,
                            y: coord.y || 0,
                            z: coord.z || 0
                        });
                    }
                }
            });

            if (atoms.length > 0) {
                onSave(atoms);
            } else {
                console.warn('No atoms found or 3D generation failed');
                // Try to save 2D coords as 3D (z=0) if 3D failed?
                // But user wants 3D structure.
            }
        };
        // Try to generate 3D
        try {


            // The composer.getChemObj() usually returns a ChemDocument (container).
            // For generate3D we need a Molecule/Structure fragment. Try to extract one.
            let sourceForGen = chemObj;
            if (!chemObj.getFlattenedShadowFragment) {
                const mols = composer.exportObjs && composer.exportObjs(Kekule.Molecule);
                if (mols && mols.length > 0) {
                    sourceForGen = mols[0];
                } else {
                    console.warn('No molecule found in composer to generate 3D');
                    return;
                }
            }

            const doGenerate = () => {
                let responded = false;
                const timeoutId = setTimeout(() => {
                    if (!responded) {
                        console.warn('generate3D did not respond within 10s');
                    }
                }, 10000);

                Kekule.Calculator.generate3D(sourceForGen, null,
                    (generatedMol) => {
                        responded = true;
                        clearTimeout(timeoutId);
                        processMolecule(generatedMol);
                    },
                    (err) => {
                        responded = true;
                        clearTimeout(timeoutId);
                        console.error('generate3D error:', err);
                    },
                    (msg) => {
                        // optional messages from generator ignored unless error
                    }
                );
            };

            if (Kekule.OpenBabel && Kekule.OpenBabel.loadObScript) {
                Kekule.OpenBabel.loadObScript(null, () => {
                    doGenerate();
                }, (err) => {
                    console.error('OpenBabel load error:', err);
                    // Still try generating
                    doGenerate();
                });
            } else {
                doGenerate();
            }
        } catch (e) {
            console.error("3D Generation failed", e);
            // Fallback: just take what we have (maybe 2D)
            processMolecule(chemObj);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-[800px] h-[600px] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-3 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800">Draw Molecule</h3>
                    <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex-1 relative bg-white" ref={composerRef}>
                    {/* Kekule Composer will be injected here */}
                </div>

                <div className="p-3 border-t bg-gray-50 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2">
                        <Check size={18} /> Generate 3D & Add
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MoleculeSketcher;
