import React, { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import usePanelStyles from '../../hooks/usePanelStyles';
import { useMolecularContext } from '../../context/MolecularContext';
import { ELEMENT_DATA } from '../../constants/elements';

const RenderSettingsPanel = ({ isOpen, onClose }) => {
    const { theme } = useTheme();
    const panels = usePanelStyles(theme);
    const { renderSettings, setRenderSettings, resetRenderSettings } = useMolecularContext();
    const [targetElement, setTargetElement] = useState('C');

    const panelClasses = {
        container: panels.panelClass,
        input: `${panels.bgInput} ${panels.borderClass} ${panels.textPrimary}`,
        muted: panels.textMuted,
        border: panels.borderClass,
        button: `${panels.buttonSecondary}`,
    };

    if (!isOpen) return null;

    const updateSetting = (key, value) => {
        setRenderSettings(prev => ({ ...prev, [key]: value }));
    };

    const overrides = renderSettings.elementOverrides || {};
    const currentOverride = overrides[targetElement] || {};
    const defaultProps = ELEMENT_DATA[targetElement] || { radius: 1.0, vdw: 1.0, color: 0x808080 };

    const toHex = (c) => {
        if (typeof c === 'string') return c;
        return '#' + (c || 0).toString(16).padStart(6, '0');
    };

    const currentRadius = currentOverride.radius !== undefined ? currentOverride.radius : defaultProps.radius;
    const currentVdw = currentOverride.vdw !== undefined ? currentOverride.vdw : defaultProps.vdw;
    const currentColor = currentOverride.color !== undefined ? toHex(currentOverride.color) : toHex(defaultProps.color);

    const updateOverride = (key, value) => {
        setRenderSettings(prev => ({
            ...prev,
            elementOverrides: {
                ...(prev.elementOverrides || {}),
                [targetElement]: {
                    ...((prev.elementOverrides || {})[targetElement] || {}),
                    [key]: value
                }
            }
        }));
    };

    const clearOverride = () => {
        setRenderSettings(prev => {
            const next = { ...prev, elementOverrides: { ...(prev.elementOverrides || {}) } };
            delete next.elementOverrides[targetElement];
            return next;
        });
    };


    return (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 p-6 overflow-y-auto">
            <div className={`w-full max-w-xl rounded-xl border shadow-2xl ${panelClasses.container}`}>
                <div className={`flex items-center justify-between border-b px-6 py-4 ${panelClasses.border}`}>
                    <div>
                        <div className="text-lg font-semibold">Visual Settings</div>
                        <div className={`text-sm ${panelClasses.muted}`}>Temporary visual overrides for the current session</div>
                    </div>
                    <button aria-label="Close visual settings" onClick={onClose} className="p-2 hover:opacity-80">
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

                    <section className={`space-y-4 border-t pt-4 ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold">Per-Element Customization</div>
                            {Object.keys(currentOverride).length > 0 && (
                                <button onClick={clearOverride} className="text-xs text-blue-500 hover:underline">
                                    Reset {targetElement}
                                </button>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-3">
                             <select 
                                value={targetElement} 
                                onChange={e => setTargetElement(e.target.value)}
                                className={`rounded border px-2 py-1 text-sm font-mono ${panelClasses.input}`}
                            >
                                {Object.keys(ELEMENT_DATA).map(el => (
                                    <option key={el} value={el}>{el}</option>
                                ))}
                            </select>
                            <input 
                                type="color" 
                                value={currentColor}
                                onChange={e => updateOverride('color', e.target.value)}
                                className="h-9 w-12 rounded border border-slate-300 cursor-pointer"
                                title="Change Element Color"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs mb-1 opacity-70">Radius</div>
                                <input
                                    type="number"
                                    min="0.1"
                                    max="5.0"
                                    step="0.05"
                                    value={currentRadius}
                                    onChange={(e) => updateOverride('radius', Number(e.target.value))}
                                    className={`w-full rounded border px-2 py-1 text-sm ${panelClasses.input}`}
                                />
                            </div>
                            <div>
                                <div className="text-xs mb-1 opacity-70">VdW Radius</div>
                                <input
                                    type="number"
                                    min="0.1"
                                    max="5.0"
                                    step="0.05"
                                    value={currentVdw}
                                    onChange={(e) => updateOverride('vdw', Number(e.target.value))}
                                    className={`w-full rounded border px-2 py-1 text-sm ${panelClasses.input}`}
                                />
                            </div>
                        </div>
                        <div className={`text-xs ${panelClasses.muted}`}>Specific overrides for {targetElement}. Multiplied by global scale.</div>
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
