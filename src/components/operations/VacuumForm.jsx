import React, { useState } from 'react';

const VacuumForm = ({ handleVacuum, t, panels }) => {
    const { textMuted, bgInputDarker, borderClass, textPrimary, buttonSecondary } = panels;
    const [vacuum, setVacuum] = useState(15.0);
    const [vacuumAxis, setVacuumAxis] = useState(2);

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className={`text-xs ${textMuted} block mb-1`}>{t('Vacuum Layer (Å)')}</label>
                    <input type="number" value={vacuum} onChange={e => setVacuum(+e.target.value)} className={`w-full ${bgInputDarker} border ${borderClass} rounded px-2 py-1 text-sm ${textPrimary}`} />
                </div>
                <div className="w-20">
                    <label className={`text-xs ${textMuted} block mb-1`}>{t('Axis')}</label>
                    <select value={vacuumAxis} onChange={e => setVacuumAxis(+e.target.value)} className={`w-full ${bgInputDarker} border ${borderClass} rounded px-2 py-1 text-sm ${textPrimary}`}>
                        <option value={0}>a</option>
                        <option value={1}>b</option>
                        <option value={2}>c</option>
                    </select>
                </div>
            </div>
            <button onClick={() => handleVacuum(vacuum, vacuumAxis)} className={`w-full ${buttonSecondary} p-1 rounded text-xs font-bold`}>{t('Apply')}</button>
        </div>
    );
};

export default VacuumForm;
