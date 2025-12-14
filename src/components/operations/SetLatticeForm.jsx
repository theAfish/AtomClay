import React, { useState, useEffect } from 'react';

const SetLatticeForm = ({ handleSetLattice, lattice, t, panels }) => {
    const { textMuted, bgInputDarker, borderClass, textPrimary, buttonSecondary } = panels;
    const [setMat, setSetMat] = useState([[0, 0, 0], [0, 0, 0], [0, 0, 0]]);

    useEffect(() => {
        if (lattice && lattice[0]) {
            setSetMat([
                [lattice[0][0], lattice[0][1], lattice[0][2]],
                [lattice[1][0], lattice[1][1], lattice[1][2]],
                [lattice[2][0], lattice[2][1], lattice[2][2]],
            ]);
        }
    }, [lattice]);

    return (
        <div className="space-y-2">
            <label className={`text-xs ${textMuted} block mb-1`}>{t('Set Lattice Matrix (rows = a,b,c) — keep atoms fixed')}</label>
            <div className="grid grid-cols-3 gap-1">
                {setMat.map((r, ri) => r.map((v, ci) => (
                    <input key={`${ri}${ci}`} type="number" step="0.0001" value={v} onChange={e => { const m = setMat.map(row => [...row]); m[ri][ci] = +e.target.value; setSetMat(m) }} className={`w-full ${bgInputDarker} border ${borderClass} rounded text-center text-xs py-1 ${textPrimary}`} />
                )))}
            </div>
            <button onClick={() => {
                // ensure matrix numbers
                const newLat = setMat.map(r => r.map(v => +v));
                handleSetLattice(newLat);
            }} className={`w-full ${buttonSecondary} p-1 rounded text-xs font-bold`}>{t('Apply')}</button>
            <div className={`text-[10px] mt-1 ${textMuted}`}>Sets the full 3x3 lattice matrix (a, b, c as row vectors). Atom Cartesian coordinates remain unchanged.</div>
        </div>
    );
};

export default SetLatticeForm;
