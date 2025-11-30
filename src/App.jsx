import React from 'react';
import Viewer from './components/Viewer';
import MolstarViewer from './components/MolstarViewer';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import { MolecularProvider, useMolecularContext } from './context/MolecularContext';
import ErrorBanner from './components/UI/ErrorBanner';
import ViewModeToggle from './components/UI/ViewModeToggle';
import FloatingControls from './components/UI/FloatingControls';
import FooterHelp from './components/UI/FooterHelp';

function AppContent() {
    const {
        pdbContent,
        viewMode,
        theme,
        handleDragOver,
        handleDrop
    } = useMolecularContext();

    return (
        <div className="relative w-full h-full font-sans select-none" onDragOver={handleDragOver} onDrop={handleDrop}>
            <ErrorBanner />
            <ViewModeToggle />
            <FloatingControls />

            {viewMode === 'protein' && pdbContent ? (
                <MolstarViewer pdbContent={pdbContent} theme={theme} />
            ) : (
                <Viewer />
            )}

            <LeftPanel />
            <RightPanel />
            
            <FooterHelp />
        </div>
    );
}

function App() {
    return (
        <MolecularProvider>
            <AppContent />
        </MolecularProvider>
    );
}

export default App;
