import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Viewer from './components/Viewer';
import MolstarViewer from './components/MolstarViewer';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import { MolecularProvider, useMolecularContext } from './context/MolecularContext';
import ErrorBanner from './components/UI/ErrorBanner';
import ViewModeToggle from './components/UI/ViewModeToggle';
import FloatingControls from './components/UI/FloatingControls';
import FooterHelp from './components/UI/FooterHelp';
import ErrorBoundary from './components/ErrorBoundary';

function AppContent() {
    const {
        pdbContent,
        viewMode,
        theme,
        handleDragOver,
        handleDrop
    } = useMolecularContext();

    const { t, i18n } = useTranslation();

    useEffect(() => {
        document.title = t('app.title', { defaultValue: 'AtomClay' });
    }, [i18n.language, t]);

    return (
        <div className="relative w-full h-full font-sans select-none" onDragOver={handleDragOver} onDrop={handleDrop}>
            <ErrorBanner />
            <ViewModeToggle />
            <FloatingControls />

            <ErrorBoundary>
                {viewMode === 'protein' && pdbContent ? (
                    <MolstarViewer pdbContent={pdbContent} theme={theme} />
                ) : (
                    <Viewer />
                )}
            </ErrorBoundary>

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
