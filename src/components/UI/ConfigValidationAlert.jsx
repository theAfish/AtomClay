import React, { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { configService } from '../../services/configService';

const ConfigValidationAlert = ({ onOpenSettings }) => {
    const { theme } = useTheme();
    const [validationStatus, setValidationStatus] = useState(null);
    const [dismissed, setDismissed] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkValidation = async () => {
            try {
                const validation = await configService.validateConfig();
                setValidationStatus(validation);
            } catch (err) {
                console.error('Failed to validate configuration:', err);
            } finally {
                setLoading(false);
            }
        };

        checkValidation();
        // Check every 30 seconds for changes
        const interval = setInterval(checkValidation, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading || dismissed || !validationStatus || validationStatus.is_properly_set) {
        return null;
    }

    const bgColor = theme === 'dark' ? 'bg-amber-900/30 border-amber-700' : 'bg-amber-50 border-amber-300';
    const textColor = theme === 'dark' ? 'text-amber-200' : 'text-amber-900';
    const buttonHover = theme === 'dark' ? 'hover:bg-amber-700/50' : 'hover:bg-amber-100';
    const borderColor = theme === 'dark' ? 'border-amber-600' : 'border-amber-300';

    return (
        <div className="fixed top-4 left-4 right-4 z-[75] max-w-2xl mx-auto">
            <div className={`rounded-lg border-l-4 border-amber-500 p-4 ${bgColor} flex items-start gap-3`}>
                <AlertCircle size={20} className={`flex-shrink-0 mt-0.5 ${textColor}`} />
                <div className="flex-grow">
                    <h3 className={`font-semibold ${textColor} mb-2`}>Configuration Required</h3>
                    <p className={`text-sm ${textColor} mb-3`}>
                        {validationStatus.warnings.length} configuration issue{validationStatus.warnings.length !== 1 ? 's' : ''} detected. 
                        Please configure your settings to ensure proper application functionality.
                    </p>
                    <ul className={`text-sm ${textColor} space-y-1 mb-3`}>
                        {validationStatus.warnings.slice(0, 3).map((warning, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                                <span className="mt-0.5">•</span>
                                <span>{warning}</span>
                            </li>
                        ))}
                        {validationStatus.warnings.length > 3 && (
                            <li className="italic">... and {validationStatus.warnings.length - 3} more</li>
                        )}
                    </ul>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onOpenSettings}
                            className={`px-4 py-2 rounded text-sm font-medium ${textColor} border ${borderColor} ${buttonHover} transition-colors`}
                        >
                            Open Settings
                        </button>
                        <button
                            onClick={() => setDismissed(true)}
                            className={`p-1 rounded ${buttonHover} transition-colors`}
                            aria-label="Dismiss notification"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfigValidationAlert;
