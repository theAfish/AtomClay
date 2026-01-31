import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Viewer from './components/Viewer';
import MolstarViewer from './components/MolstarViewer';
import Panels from './components/Panels';
import ChatPanel from './components/ChatPanel';
import { MolecularProvider, useMolecularContext } from './context/MolecularContext';
import { useTheme } from './context/ThemeContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBanner from './components/UI/ErrorBanner';
import ViewModeToggle from './components/UI/ViewModeToggle';
import FloatingControls from './components/UI/FloatingControls';
import FooterHelp from './components/UI/FooterHelp';
import ErrorBoundary from './components/ErrorBoundary';

import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function AppContent() {
    const {
        pdbContent,
        viewMode,
        handleDragOver,
        handleDrop,
        isChatOpen,
        setIsChatOpen
    } = useMolecularContext();
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
            <MolecularProvider>
                <AppContent />
            </MolecularProvider>
        </ThemeProvider>
    );
}

export default App;
