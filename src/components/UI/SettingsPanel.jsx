import React, { useEffect, useMemo, useState } from 'react';
import { X, Save, RefreshCw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { configService } from '../../services/configService';

const API_FIELDS = [
    { key: 'OPENAI_API_KEY', label: 'OpenAI API Key' },
    { key: 'OPENAI_API_BASE', label: 'OpenAI API Base URL' },
    { key: 'MP_API_KEY', label: 'Materials Project API Key' }
];

const DEFAULT_CONFIG = {
    OUTPUT_ARCHIVE_DIR: 'outputs_archive',
    WORKSPACE_ROOT: './workspace',
    LOG_LEVEL: 'INFO',
    LOG_TO_FILE: true,
    AGENTOM_MODEL: 'openai/qwen3-max',
    VISION_MODEL: 'openai/qwen3-omni-flash',
    WIKI_MODEL: 'openai/qwen3-max',
    STRUCTURE_MODEL: 'openai/qwen3-max',
    MP_MODEL: 'openai/qwen3-max'
};

const SettingsPanel = ({ isOpen, onClose }) => {
    const { theme } = useTheme();
    const [configState, setConfigState] = useState(DEFAULT_CONFIG);
    const [envInputs, setEnvInputs] = useState({});
    const [envMeta, setEnvMeta] = useState({});
    const [clearFlags, setClearFlags] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [validationWarnings, setValidationWarnings] = useState([]);

    const panelClasses = useMemo(() => ({
        container: theme === 'dark' ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-slate-200',
        input: theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-400' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400',
        muted: theme === 'dark' ? 'text-slate-400' : 'text-slate-500',
        border: theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
    }), [theme]);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        setError('');
        setSuccess('');
        setValidationWarnings([]);
        Promise.all([configService.getConfig(), configService.getEnv(), configService.validateConfig()])
            .then(([cfg, env, validation]) => {
                setConfigState({ ...DEFAULT_CONFIG, ...cfg });
                setEnvMeta(env || {});
                setEnvInputs({});
                setClearFlags({});
                if (!validation.is_properly_set) {
                    setValidationWarnings(validation.warnings || []);
                }
            })
            .catch((err) => setError(err.message || 'Failed to load settings'))
            .finally(() => setLoading(false));
    }, [isOpen]);

    const handleConfigChange = (key, value) => {
        setConfigState((prev) => ({ ...prev, [key]: value }));
    };

    const handleEnvChange = (key, value) => {
        setEnvInputs((prev) => ({ ...prev, [key]: value }));
        setClearFlags((prev) => ({ ...prev, [key]: false }));
    };

    const handleClearEnv = (key) => {
        setEnvInputs((prev) => ({ ...prev, [key]: '' }));
        setClearFlags((prev) => ({ ...prev, [key]: true }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccess('');

        const envPayload = {};
        Object.entries(envInputs).forEach(([key, value]) => {
            if (clearFlags[key]) {
                envPayload[key] = '';
                return;
            }
            if (value && value.trim() !== '') {
                envPayload[key] = value.trim();
            }
        });

        // If a field is marked clear but user never typed (e.g., existing key with clear button)
        Object.entries(clearFlags).forEach(([key, shouldClear]) => {
            if (shouldClear) {
                envPayload[key] = '';
            }
        });

        try {
            await configService.setConfig(configState);
            if (Object.keys(envPayload).length > 0) {
                await configService.setEnv(envPayload);
            }
            setSuccess('Settings saved. Please restart middleware and agent server to apply changes.');
            // Refresh mask state after save
            const env = await configService.getEnv();
            setEnvMeta(env || {});
            setEnvInputs({});
            setClearFlags({});
        } catch (err) {
            setError(err.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 backdrop-blur-sm p-6 overflow-y-auto">
            <div className={`w-full max-w-3xl rounded-xl border shadow-2xl ${panelClasses.container}`}>
                <div className={`flex items-center justify-between border-b px-6 py-4 ${panelClasses.border}`}>
                    <div>
                        <div className="text-lg font-semibold">Settings</div>
                        <div className={`text-sm ${panelClasses.muted}`}>Configure paths, logging, models, and API keys</div>
                    </div>
                    <button aria-label="Close settings" onClick={onClose} className="p-2 hover:opacity-80">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-6 py-4 space-y-6">
                    {loading && (
                        <div className="flex items-center gap-2 text-sm">
                            <RefreshCw size={16} className="animate-spin" />
                            Loading settings...
                        </div>
                    )}

                    {error && (
                        <div className="text-sm text-red-500">{error}</div>
                    )}

                    {success && (
                        <div className="text-sm text-green-600">{success}</div>
                    )}

                    {validationWarnings.length > 0 && (
                        <div className={`rounded-lg border-l-4 border-yellow-500 p-4 ${theme === 'dark' ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
                            <div className="font-semibold text-yellow-700 mb-2 flex items-center gap-2">
                                <span>⚠️ Configuration Required</span>
                            </div>
                            <ul className="text-sm text-yellow-700 space-y-1">
                                {validationWarnings.map((warning, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <span className="mt-1">•</span>
                                        <span>{warning}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className={`text-xs mt-3 ${theme === 'dark' ? 'text-yellow-600' : 'text-yellow-600'}`}>
                                Please configure the missing settings below to ensure proper application functionality.
                            </p>
                        </div>
                    )}

                    {/* Paths */}
                    <section className="space-y-3">
                        <div className="text-sm font-semibold">Paths</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="text-sm space-y-1">
                                <span>Workspace Root</span>
                                <input
                                    className={`w-full rounded border px-3 py-2 text-sm ${panelClasses.input}`}
                                    value={configState.WORKSPACE_ROOT}
                                    onChange={(e) => handleConfigChange('WORKSPACE_ROOT', e.target.value)}
                                    placeholder="./workspace"
                                />
                            </label>
                            <label className="text-sm space-y-1">
                                <span>Output Archive Directory</span>
                                <input
                                    className={`w-full rounded border px-3 py-2 text-sm ${panelClasses.input}`}
                                    value={configState.OUTPUT_ARCHIVE_DIR}
                                    onChange={(e) => handleConfigChange('OUTPUT_ARCHIVE_DIR', e.target.value)}
                                    placeholder="./outputs_archive"
                                />
                            </label>
                        </div>
                    </section>

                    {/* Logging */}
                    <section className="space-y-3">
                        <div className="text-sm font-semibold">Logging</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="text-sm space-y-1">
                                <span>Log Level</span>
                                <select
                                    className={`w-full rounded border px-3 py-2 text-sm ${panelClasses.input}`}
                                    value={configState.LOG_LEVEL}
                                    onChange={(e) => handleConfigChange('LOG_LEVEL', e.target.value)}
                                >
                                    <option value="DEBUG">DEBUG</option>
                                    <option value="INFO">INFO</option>
                                    <option value="WARNING">WARNING</option>
                                    <option value="ERROR">ERROR</option>
                                </select>
                            </label>
                            <label className="text-sm flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={Boolean(configState.LOG_TO_FILE)}
                                    onChange={(e) => handleConfigChange('LOG_TO_FILE', e.target.checked)}
                                />
                                <span>Log to file</span>
                            </label>
                        </div>
                    </section>

                    {/* Models */}
                    <section className="space-y-3">
                        <div className="text-sm font-semibold">Models</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="text-sm space-y-1">
                                <span>Agent Model</span>
                                <input
                                    className={`w-full rounded border px-3 py-2 text-sm ${panelClasses.input}`}
                                    value={configState.AGENTOM_MODEL}
                                    onChange={(e) => handleConfigChange('AGENTOM_MODEL', e.target.value)}
                                />
                            </label>
                            <label className="text-sm space-y-1">
                                <span>Vision Model</span>
                                <input
                                    className={`w-full rounded border px-3 py-2 text-sm ${panelClasses.input}`}
                                    value={configState.VISION_MODEL}
                                    onChange={(e) => handleConfigChange('VISION_MODEL', e.target.value)}
                                />
                            </label>
                            <label className="text-sm space-y-1">
                                <span>Wiki Model</span>
                                <input
                                    className={`w-full rounded border px-3 py-2 text-sm ${panelClasses.input}`}
                                    value={configState.WIKI_MODEL}
                                    onChange={(e) => handleConfigChange('WIKI_MODEL', e.target.value)}
                                />
                            </label>
                            <label className="text-sm space-y-1">
                                <span>Structure Model</span>
                                <input
                                    className={`w-full rounded border px-3 py-2 text-sm ${panelClasses.input}`}
                                    value={configState.STRUCTURE_MODEL}
                                    onChange={(e) => handleConfigChange('STRUCTURE_MODEL', e.target.value)}
                                />
                            </label>
                            <label className="text-sm space-y-1">
                                <span>Materials Project Model</span>
                                <input
                                    className={`w-full rounded border px-3 py-2 text-sm ${panelClasses.input}`}
                                    value={configState.MP_MODEL}
                                    onChange={(e) => handleConfigChange('MP_MODEL', e.target.value)}
                                />
                            </label>
                        </div>
                    </section>

                    {/* API Keys */}
                    <section className="space-y-3">
                        <div className="text-sm font-semibold">API Keys</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {API_FIELDS.map(({ key, label }) => {
                                const meta = envMeta[key] || {};
                                return (
                                    <div key={key} className="text-sm space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span>{label}</span>
                                            {meta.hasValue && (
                                                <button
                                                    type="button"
                                                    className="text-xs text-red-500 hover:text-red-600"
                                                    onClick={() => handleClearEnv(key)}
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="password"
                                            className={`w-full rounded border px-3 py-2 text-sm ${panelClasses.input}`}
                                            value={envInputs[key] || ''}
                                            onChange={(e) => handleEnvChange(key, e.target.value)}
                                            placeholder={meta.hasValue ? meta.masked || '********' : 'Not set'}
                                        />
                                        <div className={`text-xs ${panelClasses.muted}`}>
                                            {meta.hasValue ? 'Existing value hidden. Enter a new value to replace.' : 'Not set yet.'}
                                            {clearFlags[key] && ' (will be cleared)'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <div className={`border-t pt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${panelClasses.border}`}>
                        <div className={`text-xs ${panelClasses.muted}`}>
                            Changes are written to config/config.json and config/.env. Restart middleware and agent server after saving.
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                className="px-4 py-2 rounded border border-slate-300 text-sm hover:opacity-80"
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-500 disabled:opacity-60 flex items-center gap-2"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
