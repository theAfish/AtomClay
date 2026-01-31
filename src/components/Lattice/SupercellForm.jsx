import React, { useState } from 'react';
import { Grid } from 'lucide-react';

const SupercellForm = ({ handleSupercell, t, panels }) => {
    const { buttonPrimary, textMuted, bgInput, borderClass, textPrimary, buttonPreset } = panels;
    const [scMode, setScMode] = useState('diag');
    const [scDiag, setScDiag] = useState([1, 1, 1]);
    const [scMatrix, setScMatrix] = useState([[1, 1, 0], [-1, 1, 0], [0, 0, 1]]);

    return (
        <div className="mt-3 space-y-3">
            <div className={`flex gap-2 text-xs border-b ${borderClass} pb-2`}>
                <button onClick={() => setScMode('diag')} className={`flex-1 py-1 rounded ${scMode === 'diag' ? buttonPrimary : textMuted}`}>{t('Diagonal')}</button>
                <button onClick={() => setScMode('matrix')} className={`flex-1 py-1 rounded ${scMode === 'matrix' ? buttonPrimary : textMuted}`}>{t('Matrix')}</button>
            </div>
            {scMode === 'diag' ? (
                <div className="flex gap-2 justify-between">
                    {[0, 1, 2].map(i => <input key={i} type="number" value={scDiag[i]} onChange={e => { const n = [...scDiag]; n[i] = +e.target.value; setScDiag(n) }} className={`w-12 ${bgInput} border ${borderClass} rounded text-center text-sm ${textPrimary}`} />)}
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        <button onClick={() => setScMatrix([[1, 1, 0], [-1, 1, 0], [0, 0, 1]])} className={`text-[10px] px-2 py-1 ${buttonPreset} rounded ${textPrimary}`}>√2x√2</button>
                        <button onClick={() => setScMatrix([[2, 1, 0], [-1, 1, 0], [0, 0, 1]])} className={`text-[10px] px-2 py-1 ${buttonPreset} rounded ${textPrimary}`}>√3x√3</button>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                        {scMatrix.map((r, ri) => r.map((v, ci) => <input key={`${ri}${ci}`} type="number" value={v} onChange={e => { const m = scMatrix.map(row => [...row]); m[ri][ci] = +e.target.value; setScMatrix(m) }} className={`w-full ${bgInput} border ${borderClass} rounded text-center text-xs py-1 ${textPrimary}`} />))}
                    </div>
                </div>
            )}
            <button onClick={() => handleSupercell(scMode, scDiag, scMatrix)} className={`w-full ${buttonPrimary} py-1 rounded text-xs font-bold`}>{t('Apply')}</button>
        </div>
    );
};

export default SupercellForm;
