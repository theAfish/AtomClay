import React, { useMemo } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useMolecularContext } from '../../context/MolecularContext';

const RenderSettingsPanel = ({ isOpen, onClose }) => {
    const { theme } = useTheme();
    const { renderSettings, setRenderSettings, resetRenderSettings } = useMolecularContext();

    const panelClasses = useMemo(() => ({
        container: theme === 'dark' ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-slate-200',
        input: theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900',
        muted: theme === 'dark' ? 'text-slate-400' : 'text-slate-500',
        border: theme === 'dark' ? 'border-slate-800' : 'border-slate-200',
        button: theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
    }), [theme]);

    if (!isOpen) return null;

    const updateSetting = (key, value) => {
        setRenderSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 backdrop-blur-sm p-6 overflow-y-auto">
            <div className={`w-full max-w-xl rounded-xl border shadow-2xl ${panelClasses.container}`}>
                <div className={`flex items-center justify-between border-b px-6 py-4 ${panelClasses.border}`}>
                    <div>
                        <div className="text-lg font-semibold">Render Settings</div>
                        <div className={`text-sm ${panelClasses.muted}`}>Temporary visual overrides for the current session</div>
                    </div>
                    <button aria-label="Close render settings" onClick={onClose} className="p-2 hover:opacity-80">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-6">
                    <section className="space-y-2">
                        <div className="text-sm font-semibold">Atom size</div>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min="0.1"
                                max="2"
                                step="0.05"
                                value={renderSettings.atomScale}
                                onChange={(e) => updateSetting('atomScale', Number(e.target.value))}
                                className="w-full"
                            />
                            <input
                                type="number"
                                min="0.1"
                                max="2"
                                step="0.05"
                                value={renderSettings.atomScale}
                                onChange={(e) => updateSetting('atomScale', Number(e.target.value))}
                                className={`w-24 rounded border px-2 py-1 text-sm ${panelClasses.input}`}
                            />
                        </div>
                        <div className={`text-xs ${panelClasses.muted}`}>Scales element radii used for rendering.</div>
                    </section>

                    <section className="space-y-2">
                        <div className="text-sm font-semibold">Bond length (vdW scale)</div>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min="0.5"
                                max="2.5"
                                step="0.05"
                                value={renderSettings.vdwScale}
                                onChange={(e) => updateSetting('vdwScale', Number(e.target.value))}
                                className="w-full"
                            />
                            <input
                                type="number"
                                min="0.5"
                                max="2.5"
                                step="0.05"
                                value={renderSettings.vdwScale}
                                onChange={(e) => updateSetting('vdwScale', Number(e.target.value))}
                                className={`w-24 rounded border px-2 py-1 text-sm ${panelClasses.input}`}
                            />
                        </div>
                        <div className={`text-xs ${panelClasses.muted}`}>Scales van der Waals radii used for bond detection.</div>
                    </section>

                    <section className="space-y-2">
                        <div className="text-sm font-semibold">Atom colors</div>
                        <div className="flex items-center gap-3">
                            <select
                                value={renderSettings.atomColorMode}
                                onChange={(e) => updateSetting('atomColorMode', e.target.value)}
                                className={`rounded border px-2 py-1 text-sm ${panelClasses.input}`}
                            >
                                <option value="element">Element colors</option>
                                <option value="single">Single color</option>
                            </select>
                            {renderSettings.atomColorMode === 'single' && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={renderSettings.atomColor}
                                        onChange={(e) => updateSetting('atomColor', e.target.value)}
                                        className="h-9 w-12 rounded border border-slate-300"
                                    />
                                    <input
                                        type="text"
                                        value={renderSettings.atomColor}
                                        onChange={(e) => updateSetting('atomColor', e.target.value)}
                                        className={`w-28 rounded border px-2 py-1 text-sm ${panelClasses.input}`}
                                        placeholder="#8aa0ff"
                                    />
                                </div>
                            )}
                        </div>
                        <div className={`text-xs ${panelClasses.muted}`}>Applies to atoms and bonds.</div>
                    </section>

                    <div className="flex items-center justify-between pt-2">
                        <button
                            onClick={resetRenderSettings}
                            className={`inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium ${panelClasses.button}`}
                        >
                            <RefreshCw size={14} />
                            Reset to defaults
                        </button>
                        <div className={`text-xs ${panelClasses.muted}`}>Changes are not saved to disk.</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RenderSettingsPanel;
