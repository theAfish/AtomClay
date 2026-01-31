import { useEffect } from 'react';
import { useMolecularContext } from '../context/MolecularContext';

export const useKeyboardShortcuts = () => {
    const {
        atoms,
        activeLayerId,
        setSelectedAtomIds,
        deleteSelectedAtoms,
        undo,
        redo,
        copySelection,
        pasteSelection
    } = useMolecularContext();

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Check if user is typing in an input field
            const active = document.activeElement;
            const tag = active ? active.tagName : null;
            const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (active && active.isContentEditable);
            if (isTyping) return;

            // Delete: Delete selected atoms
            if (e.key === 'Delete') {
                e.preventDefault();
                deleteSelectedAtoms();
                return;
            }

            // Ctrl+A: Select all atoms in active layer
            if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
                e.preventDefault();
                const toSelect = atoms
                    .filter(a => a.layerId === activeLayerId)
                    .map(a => a.id);
                
                if (toSelect.length > 0) {
                    setSelectedAtomIds(toSelect);
                }
                return;
            }

            // Ctrl+C: Copy
            if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
                e.preventDefault();
                copySelection();
                return;
            }

            // Ctrl+V: Paste
            if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
                e.preventDefault();
                pasteSelection();
                return;
            }

            // Ctrl+Z: Undo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
                e.preventDefault();
                if (e.shiftKey) {
                    redo(); // Ctrl+Shift+Z
                } else {
                    undo(); // Ctrl+Z
                }
                return;
            }

            // Ctrl+Y: Redo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
                e.preventDefault();
                redo();
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [atoms, activeLayerId, setSelectedAtomIds, deleteSelectedAtoms, undo, redo, copySelection, pasteSelection]);
};
