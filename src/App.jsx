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

function AppContent() {
    const {
        pdbContent,
        viewMode,
        handleDragOver,
        handleDrop,
        isChatOpen,
        setIsChatOpen,
        deleteSelectedAtoms
    } = useMolecularContext();
    const { theme } = useTheme();

    const { t, i18n } = useTranslation();

    useEffect(() => {
        document.title = t('app.title', { defaultValue: 'AtomClay' });
    }, [i18n.language, t]);

    // Global Delete key handler (delete selected atoms) — ignore when typing in inputs
    useEffect(() => {
        const onKeyDown = (e) => {
            const active = document.activeElement;
            const tag = active ? active.tagName : null;
            const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (active && active.isContentEditable);
            if (isTyping) return;
            if (e.key === 'Delete') {
                e.preventDefault();
                deleteSelectedAtoms();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [deleteSelectedAtoms]);

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
