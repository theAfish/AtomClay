import React, { useState } from 'react';

const ScaleForm = ({ handleScaleLattice, t, panels }) => {
    const { textMuted, bgInputDarker, borderClass, textPrimary, buttonSecondary } = panels;
    const [scaleVec, setScaleVec] = useState([1, 1, 1]);

    return (
        <div className="space-y-2">
            <label className={`text-xs ${textMuted} block mb-1`}>{t('Scale Lattice (keep atoms fixed)')}</label>
            <div className="flex gap-2">
                {[0, 1, 2].map(i => (
                    <input key={i} type="number" step="0.01" value={scaleVec[i]} onChange={e => { const n = [...scaleVec]; n[i] = +e.target.value; setScaleVec(n) }} className={`w-full ${bgInputDarker} border ${borderClass} rounded px-2 py-1 text-sm ${textPrimary}`} />
                ))}
            </div>
            <button onClick={() => { handleScaleLattice(scaleVec[0] || 1, scaleVec[1] || 1, scaleVec[2] || 1); setScaleVec([1, 1, 1]); }} className={`w-full ${buttonSecondary} p-1 rounded text-xs font-bold`}>{t('Apply')}</button>
            <div className={`text-[10px] mt-1 ${textMuted}`}>Scale factors applied to the lattice vectors a, b and c respectively. Atom coordinates remain unchanged.</div>
        </div>
    );
};

export default ScaleForm;
