export const COLORS = {
    background: {
        // a richer, elegant navy/ink for dark mode and light for bright mode
        dark: '#000000', // deep navy-black
        light: '#f1f5f9', // slate-100
    },
    text: {
        // text.light is used when the theme is dark; text.dark for light theme
        dark: '#1f2937', // cool slate-800 (for use on light backgrounds)
        light: '#e6eef8', // soft off-white for use on dark backgrounds
    },
    ui: {
        scrollbarTrack: '#0b1220', // match background (navy)
        scrollbarThumb: '#243544', // subtle slate/blue thumb
        scrollbarThumbHover: '#2d4a5b', // slightly lighter on hover
    },
    lattice: {
        dark: '#334155', // slate-blue for lattice lines in dark mode
        light: '#888888', // grey for light mode
    },
    selection: {
        // a soft cyan/teal accent for selections in dark mode
        emissive: '#06b6d4', // teal/cyan (tailwind cyan-500-ish)
        boxBorder: 'rgba(6, 182, 212, 0.6)',
        boxBackground: 'rgba(6, 182, 212, 0.08)',
    },
    gizmo: {
        x: '#ef4444', // red-500
        y: '#10b981', // green-500
        z: '#3b82f6', // blue-500
    },
    general: {
        white: '#ffffff',
        black: '#000000',
    }
};

export const THEME_MODE = {
    DARK: 'dark',
    LIGHT: 'light',
};

export const PANEL_CLASSES = {
    dark: {
        panelClass: 'glass-panel border border-slate-700',
        textPrimary: 'text-slate-100',
        textSecondary: 'text-slate-300',
        textMuted: 'text-slate-400',
        bgInput: 'bg-slate-800',
        bgInputDarker: 'bg-slate-900',
        borderClass: 'border-slate-700',
        borderClassTransparent: 'border-slate-700/50',
        buttonSecondary: 'bg-slate-700 hover:bg-slate-600 text-white',
        bgCard: 'bg-slate-800/60',
        bgMetric: 'bg-slate-900',
        // New additions
        buttonPrimary: 'bg-sky-600 hover:bg-sky-500 text-white',
        buttonDanger: 'bg-rose-600 text-white',
        buttonDangerBg: 'bg-red-500/20 hover:bg-red-500/40 text-red-300',
        layerActive: 'bg-slate-900 border border-slate-700',
        layerInactive: 'bg-slate-900/40',
        layerButton: 'bg-slate-700 text-slate-100',
        layerTextActive: 'text-slate-100',
        layerTextMuted: 'text-slate-400',
        layerTextAccent: 'text-cyan-400',
        layerTextDanger: 'hover:text-rose-400',
        bgDropdown: 'bg-slate-900 border-slate-700',
        bgDropdownItemHover: 'hover:bg-slate-700 dark:hover:bg-slate-800',
        bgDropdownItemSelected: 'bg-sky-700 dark:bg-sky-800',
        buttonViewModeActive: 'bg-sky-600 text-white',
        buttonViewModeInactive: 'bg-white text-slate-700',
        bgFooter: 'bg-black/20 text-slate-500',
        bgError: 'bg-rose-600 text-white',
        bgErrorBoundary: 'bg-rose-900/50 border border-rose-500',
        textError: 'text-red-400',
        bgErrorCode: 'bg-black/50 text-red-300',
        bgErrorPage: 'bg-slate-900 text-white',
        buttonError: 'bg-slate-700 hover:bg-slate-600 text-white',
        textErrorSecondary: 'text-slate-300',
        textTitle: 'text-slate-100',
        textIcon: 'text-slate-400',
        textLayerInfo: 'text-slate-300',
        textNoLattice: 'text-slate-400',
        buttonPreset: 'bg-slate-700',
        borderInput: 'border-slate-600',
        // Scrollbar colors
        scrollbarTrack: '#0b1220',
        scrollbarThumb: '#243544',
        scrollbarThumbHover: '#2d4a5b',
    },
    light: {
        panelClass: 'bg-white/90 backdrop-blur-xl border border-slate-200',
        textPrimary: 'text-slate-800',
        textSecondary: 'text-slate-600',
        textMuted: 'text-slate-500',
        bgInput: 'bg-slate-100',
        bgInputDarker: 'bg-slate-200',
        borderClass: 'border-slate-300',
        borderClassTransparent: 'border-slate-200',
        buttonSecondary: 'bg-slate-200 hover:bg-slate-300 text-slate-800',
        bgCard: 'bg-slate-50',
        bgMetric: 'bg-slate-200',
        // New additions
        buttonPrimary: 'bg-gray-600 hover:bg-gray-500 text-white',
        buttonDanger: 'bg-red-600 text-white',
        buttonDangerBg: 'bg-red-500/20 hover:bg-red-500/40 text-red-300',
        layerActive: 'bg-slate-100 border border-slate-300',
        layerInactive: 'bg-slate-50/50',
        layerButton: 'bg-slate-200 text-slate-700',
        layerTextActive: 'text-gray-600 font-bold',
        layerTextMuted: 'text-slate-400',
        layerTextAccent: 'text-green-400',
        layerTextDanger: 'hover:text-red-400',
        bgDropdown: 'bg-white border-slate-200',
        bgDropdownItemHover: 'hover:bg-slate-100 dark:hover:bg-slate-700',
        bgDropdownItemSelected: 'bg-blue-100 dark:bg-blue-900',
        buttonViewModeActive: 'bg-blue-600 text-white',
        buttonViewModeInactive: 'bg-white text-slate-700',
        bgFooter: 'bg-black/20 text-slate-500',
        bgError: 'bg-red-600 text-white',
        bgErrorBoundary: 'bg-red-900/50 border border-red-500',
        textError: 'text-red-400',
        bgErrorCode: 'bg-black/50 text-red-300',
        bgErrorPage: 'bg-slate-900 text-white',
        buttonError: 'bg-slate-700 hover:bg-slate-600 text-white',
        textErrorSecondary: 'text-slate-300',
        textTitle: 'text-slate-900',
        textIcon: 'text-slate-400',
        textLayerInfo: 'text-gray-600',
        textNoLattice: 'text-slate-400',
        buttonPreset: 'bg-gray-200',
        borderInput: 'border-slate-300',
        // Scrollbar colors
        scrollbarTrack: '#f1f5f9',
        scrollbarThumb: '#cbd5e1',
        scrollbarThumbHover: '#94a3b8',
    }
};
