import React, { createContext, useContext, useEffect, useState } from 'react';
import { COLORS, PANEL_CLASSES } from '../constants/theme';

const ThemeContext = createContext(null);

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
    return ctx;
};

export const ThemeProvider = ({ children }) => {
    const getInitial = () => {
        try {
            const stored = localStorage.getItem('theme');
            if (stored === 'dark' || stored === 'light') return stored;
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
        } catch (e) {}
        return 'dark';
    };

    const [theme, setTheme] = useState(getInitial);

    useEffect(() => {
        try {
            localStorage.setItem('theme', theme);
            const themeSpec = PANEL_CLASSES[theme] || {};
            const track = themeSpec.scrollbarTrack || (COLORS && COLORS.ui && COLORS.ui.scrollbarTrack) || '#f1f5f9';
            const thumb = themeSpec.scrollbarThumb || (COLORS && COLORS.ui && COLORS.ui.scrollbarThumb) || '#cbd5e1';
            const thumbHover = themeSpec.scrollbarThumbHover || (COLORS && COLORS.ui && COLORS.ui.scrollbarThumbHover) || '#94a3b8';
            const root = document.documentElement;
            root.style.setProperty('--scrollbar-track', track);
            root.style.setProperty('--scrollbar-thumb', thumb);
            root.style.setProperty('--scrollbar-thumb-hover', thumbHover);

            if (theme === 'dark') root.classList.add('dark');
            else root.classList.remove('dark');
        } catch (e) {
            // ignore errors (SSR safety)
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export default ThemeContext;
