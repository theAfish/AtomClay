import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Viewer from './components/Workspace/Viewer';
import MolstarViewer from './components/Workspace/MolstarViewer';
import Panels from './components/Workspace/Panels';
import ChatPanel from './components/Workspace/ChatPanel';
import { MolecularProvider, useMolecularContext } from './context/MolecularContext';
import { UIProvider, useUIContext } from './context/UIContext';
import { useTheme } from './context/ThemeContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBanner from './components/Common/ErrorBanner';
import ViewModeToggle from './components/Workspace/ViewModeToggle';
import FloatingControls from './components/Workspace/FloatingControls';
import FooterHelp from './components/Workspace/FooterHelp';
import ErrorBoundary from './components/Common/ErrorBoundary';

import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function AppContent() {
    const {
        handleDragOver,
        handleDrop
    } = useMolecularContext();
    const {
        pdbContent,
        viewMode,
        isChatOpen,
        setIsChatOpen
    } = useUIContext();
    const { theme } = useTheme();

    const { t, i18n } = useTranslation();

    // Initialize global keyboard shortcuts (Undo, Redo, Delete, Select All)
    useKeyboardShortcuts();

    useEffect(() => {
        document.title = t('app.title', { defaultValue: 'AtomClay' });
    }, [i18n.language, t]);

    return (
        <div className={`relative w-full h-full font-sans select-none flex ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`} onDragOver={handleDragOver} onDrop={handleDrop}>
            <div className={`flex-1 relative ${isChatOpen ? 'mr-80' : ''} transition-all duration-300`}>
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

                <Panels />
                
                <FooterHelp />
            </div>
            <ChatPanel isOpen={isChatOpen} onToggle={() => setIsChatOpen(!isChatOpen)} />
        </div>
    );
}

function App() {
    return (
        <ThemeProvider>
            <UIProvider>
                <MolecularProvider>
                    <AppContent />
                </MolecularProvider>
            </UIProvider>
        </ThemeProvider>
    );
}

export default App;
