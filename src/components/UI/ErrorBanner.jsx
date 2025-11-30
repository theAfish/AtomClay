import React from 'react';
import { useMolecularContext } from '../../context/MolecularContext';

const ErrorBanner = () => {
    const { fileError, setFileError } = useMolecularContext();

    if (!fileError) return null;

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded shadow">
            <div style={{display:'flex', alignItems:'center', gap:8}}>
                <div style={{fontWeight:600}}>File error:</div>
                <div style={{opacity:0.95}}>{fileError}</div>
                <button onClick={() => setFileError(null)} style={{marginLeft:12, background:'transparent', border:'none', color:'rgba(255,255,255,0.9)', cursor:'pointer'}}>✕</button>
            </div>
        </div>
    );
};

export default ErrorBanner;
