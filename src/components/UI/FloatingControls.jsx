import React, { useEffect } from 'react';
import { Moon, Sun, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMolecularContext } from '../../context/MolecularContext';

const FloatingControls = () => {
    const { i18n } = useTranslation();
    const { 
        theme, setTheme, 
        showLangDropdown, setShowLangDropdown, 
        changeLanguage 
    } = useMolecularContext();

    const languages = [
        { code: 'zh', label: '中文' },
        { code: 'en', label: 'EN' },
        { code: 'es', label: 'ES' }
    ];

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.lang-dropdown')) {
                setShowLangDropdown(false);
            }
        };
        if (showLangDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showLangDropdown, setShowLangDropdown]);

    return (
        <div className="absolute bottom-4 right-4 z-50 flex flex-col gap-2">
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
    );
};

export default FloatingControls;
