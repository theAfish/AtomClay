import { useState, useCallback } from 'react';
import { parse } from '../utils/parsers';

export const useFileImportExport = (molecularState, uiHandlers) => {
    const { 
        addAtoms, 
        atoms, 
        lattice, 
        layers, 
        activeLayerId,
        recordOperation 
    } = molecularState;
    
    const { 
        setSelectedAtomIds, 
        setPdbContent 
    } = uiHandlers;

    const [fileError, setFileError] = useState(null);

    const parseFile = async (file) => {
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onerror = () => reject(new Error('Unable to read file.'));
            reader.onload = async (ev) => {
                try {
                    const name = file.name || '';
                    const text = ev.target.result;
                    if (typeof text !== 'string' || text.trim().length === 0) {
                        reject(new Error(`Empty or unreadable file. Supported formats: .xyz, .pdb, .cif, .mol, POSCAR-like text`));
                        return;
                    }

                    const { atoms: newAtoms, lattice: newLat, metadata } = await parse(text, undefined, name);
                    
                    if (!newAtoms || newAtoms.length === 0) {
                        reject(new Error(`Could not parse file. Ensure it contains valid atom records.`));
                        return;
                    }
                    
                    const format = metadata ? metadata.format : 'unknown';
                    const isPdb = format === 'pdb';
                    
                    resolve({ newAtoms, newLat, isPdb, text: isPdb ? text : null });
                } catch (e) {
                    reject(e);
                }
            };
            reader.readAsText(file);
        });
    };

    const importFile = useCallback(async (file, createNewLayer) => {
        try {
            const { newAtoms, newLat, isPdb, text } = await parseFile(file);
            if (isPdb && setPdbContent) setPdbContent(text);
            
            const newIds = addAtoms(newAtoms, newLat, createNewLayer);
            recordOperation('IMPORT_FILE', {
                fileName: file.name,
                createNewLayer,
                atomCount: newAtoms.length,
                hasLattice: Boolean(newLat),
                layerId: newIds.layerId
            });
            if (setSelectedAtomIds) setSelectedAtomIds(newIds);
            
        } catch (e) {
            setFileError(e.message);
            throw e; // Re-throw so caller knows it failed if needed
        }
    }, [addAtoms, recordOperation, setSelectedAtomIds, setPdbContent]);

    const loadStructureFromText = useCallback(async (content, fileName) => {
        try {
            console.log('Parsing structure:', fileName);
            const { atoms: newAtoms, lattice: newLat } = await parse(content, undefined, fileName);
            console.log('Parsed atoms:', newAtoms.length, 'lattice:', newLat);
            const newIds = addAtoms(newAtoms, newLat, true); // Always create new layer
            recordOperation('IMPORT_TEXT', {
                fileName,
                createNewLayer: true,
                atomCount: newAtoms.length,
                hasLattice: Boolean(newLat),
                layerId: newIds.layerId
            });
            if (setSelectedAtomIds) setSelectedAtomIds(newIds);
            setFileError(null);
            console.log('Structure loaded into new layer');
        } catch (e) {
            console.error('Error loading structure:', e);
            setFileError(e.message);
        }
    }, [addAtoms, recordOperation, setSelectedAtomIds]);

    const handleLoad = useCallback(async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        setFileError(null);
        try {
            const isCurrentLayerEmpty = atoms.filter(a => a.layerId === activeLayerId).length === 0;
            const createNewLayer = !isCurrentLayerEmpty;
            await importFile(file, createNewLayer);
        } catch (e) {
            setFileError(e.message);
        } finally {
            // Reset input value to allow reloading the same file
            e.target.value = '';
        }
    }, [atoms, activeLayerId, importFile]);

    const handleDownload = useCallback(() => {
        // Generate ExtXYZ (requires lattice)
        if (!lattice) return alert('No lattice info available for ExtXYZ export');
        
        // Filter atoms from visible layers only
        const visibleLayerIds = new Set(layers.filter(l => l.visible).map(l => l.id));
        const visibleAtoms = atoms.filter(a => visibleLayerIds.has(a.layerId));
        
        if (visibleAtoms.length === 0) {
            return alert('No visible atoms to export');
        }
        
        // Build ExtXYZ format
        let s = `${visibleAtoms.length}\n`;
        
        // Comment line with lattice info
        const latticeStr = `Lattice="${lattice[0][0]} ${lattice[0][1]} ${lattice[0][2]} ${lattice[1][0]} ${lattice[1][1]} ${lattice[1][2]} ${lattice[2][0]} ${lattice[2][1]} ${lattice[2][2]}" Properties=species:S:1:pos:R:3`;
        s += `${latticeStr}\n`;
        
        // Atom lines (element x y z)
        visibleAtoms.forEach(a => {
            s += `${a.element} ${a.x.toFixed(6)} ${a.y.toFixed(6)} ${a.z.toFixed(6)}\n`;
        });
        
        // Generate timestamped filename
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `structure_${timestamp}.extxyz`;
        
        // Download to user
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([s], {type:'text/plain'}));
        a.download = filename;
        a.click();

        recordOperation('EXPORT_EXTXYZ', {
            visibleAtoms: visibleAtoms.length,
            visibleLayers: Array.from(visibleLayerIds),
            filename: filename
        }, { lattice });
        
    }, [lattice, layers, atoms, recordOperation]);

    return {
        importFile, // Exposed if needed elsewhere
        loadStructureFromText,
        handleLoad,
        handleDownload,
        fileError,
        setFileError
    };
};
