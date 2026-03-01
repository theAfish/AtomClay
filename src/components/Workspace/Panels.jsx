import React, { useState, useEffect } from 'react';
import { useMolecularContext } from '../../context/MolecularContext';
import InfoPanel from './InfoPanel';
import ModelingOperationsPanel from './ModelingOperationsPanel';
import EditToolsPanel from './EditToolsPanel';
import LayersPanel from './LayersPanel';

/**
 * Main layout orchestrator that composes the four workspace panels.
 * Each sub-panel is self-contained and reads its own context.
 */
const Panels = () => {
    const { isChatOpen } = useMolecularContext();

    // Track window width to update panel positions
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Chat panel width is typically 320px. Right panel width is 340px. Margin 20px.
    const rightOffset = isChatOpen ? 320 + 360 : 360;
    const panelX = windowWidth - rightOffset;

    return (
        <>
            <InfoPanel />
            <ModelingOperationsPanel />
            <EditToolsPanel panelX={panelX} />
            <LayersPanel panelX={panelX} />
        </>
    );
};

export default Panels;