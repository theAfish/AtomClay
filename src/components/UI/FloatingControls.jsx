import React, { useEffect, useState } from 'react';
import { Moon, Sun, ChevronDown, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMolecularContext } from '../../context/MolecularContext';
import { useTheme } from '../../context/ThemeContext';
import SettingsPanel from './SettingsPanel';
import ConfigValidationAlert from './ConfigValidationAlert';

const FloatingControls = () => {
    const { i18n } = useTranslation();
    const { 
        showLangDropdown, setShowLangDropdown, 
        changeLanguage,
        // renderer
        currentRenderer, renderers, showRendererDropdown, setShowRendererDropdown, changeRenderer,
        isChatOpen
    } = useMolecularContext();

    const { theme, setTheme } = useTheme();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const languages = [
        { code: 'zh', label: '中文' },
        { code: 'en', label: 'EN' },
        { code: 'es', label: 'ES' }
    ];

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.lang-dropdown') && !event.target.closest('.renderer-dropdown')) {
                setShowLangDropdown(false);
                setShowRendererDropdown(false);
            }
        };
        if (showLangDropdown || showRendererDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showLangDropdown, setShowLangDropdown, showRendererDropdown, setShowRendererDropdown]);

    return (
        <>
            <ConfigValidationAlert onOpenSettings={() => setIsSettingsOpen(true)} />
            <div className="fixed bottom-4 z-[60] flex flex-col gap-2" style={{ right: isChatOpen ? '336px' : '16px' }}>
                <button
                    className={`px-3 py-1 rounded-full shadow-lg text-sm font-medium flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-800 hover:bg-slate-100'}`}
                    onClick={() => setIsSettingsOpen(true)}
                    title="Open Settings"
                >
                    <Settings size={16} />
                    Settings
                </button>
                <div className="relative renderer-dropdown">
                    <button 
                        className={`px-3 py-1 rounded-full shadow-lg text-sm font-medium flex items-center gap-1 ${theme === 'dark' ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-800 hover:bg-slate-100'}`}
                        onClick={() => setShowRendererDropdown(!showRendererDropdown)}
                        title="Change Renderer"
                    >
                        {renderers.find(r => r.id === currentRenderer)?.label || 'Renderer'}
                        <ChevronDown size={12} className={`transition ${showRendererDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showRendererDropdown && (
                        <div className={`absolute bottom-full right-0 mb-1 w-28 rounded-lg shadow-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                            {renderers.map(r => (
                                <button
                                    key={r.id}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 ${currentRenderer === r.id ? 'bg-blue-100 dark:bg-blue-900' : ''} ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}
                                    onClick={() => changeRenderer(r.id)}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="relative lang-dropdown">
                    <button 
                        className={`px-3 py-1 rounded-full shadow-lg text-sm font-medium flex items-center gap-1 ${theme === 'dark' ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-800 hover:bg-slate-100'}`}
                        onClick={() => setShowLangDropdown(!showLangDropdown)}
                        title="Change Language"
                    >
                        {languages.find(lang => lang.code === i18n.language)?.label || 'EN'}
                        <ChevronDown size={12} className={`transition ${showLangDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showLangDropdown && (
                        <div className={`absolute bottom-full right-0 mb-1 w-20 rounded-lg shadow-lg border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                            {languages.map(lang => (
                                <button
                                    key={lang.code}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 ${i18n.language === lang.code ? 'bg-blue-100 dark:bg-blue-900' : ''} ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}
                                    onClick={() => changeLanguage(lang.code)}
                                >
                                    {lang.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button 
                    className={`w-12 h-12 rounded-full shadow-lg text-lg font-medium flex items-center justify-center ${theme === 'dark' ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-800 hover:bg-slate-100'}`}
                    onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
            </div>

            <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </>
    );
};

export default FloatingControls;
