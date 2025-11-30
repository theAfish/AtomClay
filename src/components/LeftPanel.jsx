import React, { useState } from 'react';
import { Box, Layers, Upload, Download, Grid, ChevronDown, Expand, Eye, EyeOff, Plus, Trash } from 'lucide-react';

const LeftPanel = ({ 
    atomCount, lattice, 
    onLoad, onDownload, 
    onSupercell, onVacuum,
    layers = [], setLayers = () => {}, activeLayerId, setActiveLayerId, setLattice = () => {},
    theme = 'dark'
}) => {
    const [scMode, setScMode] = useState('diag');
    const [scDiag, setScDiag] = useState([1,1,1]);
    const [scMatrix, setScMatrix] = useState([[1,1,0],[-1,1,0],[0,0,1]]);
    const [vacuum, setVacuum] = useState(15.0);
    const [expand, setExpand] = useState(false);

    const isDark = theme === 'dark';
    const panelClass = isDark ? "glass-panel" : "bg-white/90 backdrop-blur-xl border border-slate-200";
    const textPrimary = isDark ? "text-slate-200" : "text-slate-800";
    const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
    const textMuted = isDark ? "text-slate-400" : "text-slate-500";
    const bgInput = isDark ? "bg-slate-800" : "bg-slate-100";
    const bgInputDarker = isDark ? "bg-slate-900" : "bg-slate-200";
    const borderClass = isDark ? "border-slate-700" : "border-slate-300";
    const buttonSecondary = isDark ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-slate-200 hover:bg-slate-300 text-slate-800";

    return (
        <div className="absolute top-4 left-4 w-80 flex flex-col gap-4 pointer-events-none">
            <div className={`${panelClass} p-4 rounded-xl shadow-xl pointer-events-auto`}>
                <h1 className={`text-xl font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <Box className="text-blue-400" /> AtomClay
                </h1>
                <div className="flex gap-2 mb-4">
                    <label className="flex-1 cursor-pointer bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm transition">
                        <Upload size={16} /> 导入
                        <input type="file" className="hidden" onChange={onLoad} />
                    </label>
                    <button onClick={onDownload} className={`${buttonSecondary} p-2 rounded-lg`} title="导出">
                        <Download size={18} />
                    </button>
                </div>
                <div className={`text-xs font-mono p-2 rounded border ${isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    <p>Atom Count: {atomCount}</p>
                    <p>Cell: {lattice && lattice[0] ? `${Math.sqrt(lattice[0][0]**2+lattice[0][1]**2+lattice[0][2]**2).toFixed(2)} Å` : 'N/A'}</p>
                </div>
            </div>

            <div className={`${panelClass} p-4 rounded-xl shadow-xl pointer-events-auto`}>
                <h2 className={`text-sm font-bold mb-3 flex items-center gap-2 ${textPrimary}`}>
                    <Layers size={16} /> 建模操作
                </h2>
                <div className="space-y-3">
                    {/* Supercell */}
                    <div className={`${isDark ? 'bg-slate-900/50' : 'bg-slate-50'} p-2 rounded border ${borderClass}`}>
                        <button onClick={() => setExpand(!expand)} className={`w-full flex justify-between text-sm ${textSecondary} hover:${textPrimary}`}>
                            <span className="flex items-center gap-2"><Grid size={16} /> 扩胞 (Supercell)</span>
                            <ChevronDown size={14} className={`transition ${expand?'rotate-180':''}`} />
                        </button>
                        {expand && (
                            <div className="mt-3 space-y-3">
                                <div className={`flex gap-2 text-xs border-b ${borderClass} pb-2`}>
                                    <button onClick={()=>setScMode('diag')} className={`flex-1 py-1 rounded ${scMode==='diag'?'bg-blue-600 text-white':textMuted}`}>对角</button>
                                    <button onClick={()=>setScMode('matrix')} className={`flex-1 py-1 rounded ${scMode==='matrix'?'bg-blue-600 text-white':textMuted}`}>矩阵</button>
                                </div>
                                {scMode==='diag' ? (
                                    <div className="flex gap-2 justify-between">
                                        {[0,1,2].map(i=><input key={i} type="number" value={scDiag[i]} onChange={e=>{const n=[...scDiag];n[i]=+e.target.value;setScDiag(n)}} className={`w-12 ${bgInput} border ${borderClass} rounded text-center text-sm ${textPrimary}`}/>)}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <div className="flex gap-2 overflow-x-auto pb-1">
                                            <button onClick={()=>setScMatrix([[1,1,0],[-1,1,0],[0,0,1]])} className={`text-[10px] px-2 py-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded ${textPrimary}`}>√2x√2</button>
                                            <button onClick={()=>setScMatrix([[2,1,0],[-1,1,0],[0,0,1]])} className={`text-[10px] px-2 py-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'} rounded ${textPrimary}`}>√3x√3</button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1">
                                            {scMatrix.map((r,ri)=>r.map((v,ci)=><input key={`${ri}${ci}`} type="number" value={v} onChange={e=>{const m=scMatrix.map(row=>[...row]);m[ri][ci]=+e.target.value;setScMatrix(m)}} className={`w-full ${bgInput} border ${borderClass} rounded text-center text-xs py-1 ${textPrimary}`}/>))}
                                        </div>
                                    </div>
                                )}
                                <button onClick={()=>onSupercell(scMode, scDiag, scMatrix)} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-1 rounded text-xs font-bold">应用</button>
                            </div>
                        )}
                    </div>
                    {/* Vacuum */}
                    <div className="flex gap-2 items-center">
                        <div className="flex-1">
                            <label className={`text-xs ${textMuted} block mb-1`}>真空层 (Å)</label>
                            <input type="number" value={vacuum} onChange={e=>setVacuum(+e.target.value)} className={`w-full ${bgInputDarker} border ${borderClass} rounded px-2 py-1 text-sm ${textPrimary}`}/>
                        </div>
                        <button onClick={()=>onVacuum(vacuum)} className={`mt-5 ${buttonSecondary} p-2 rounded`}><Expand size={16}/></button>
                    </div>
                </div>
            </div>

            <div className={`${panelClass} p-4 rounded-xl shadow-xl pointer-events-auto`}>
                <h2 className={`text-sm font-bold mb-3 flex items-center gap-2 ${textPrimary}`}>
                    <Layers size={16} /> 图层 (Layers)
                </h2>
                <div className="space-y-2">
                    {layers.map(layer => (
                        <div key={layer.id} className={`flex items-center justify-between p-2 rounded ${activeLayerId===layer.id? (isDark ? 'bg-slate-800 border border-slate-600' : 'bg-slate-100 border border-slate-300') : (isDark ? 'bg-slate-900/40' : 'bg-slate-50/50')}`}>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setLayers(prev => prev.map(l => l.id===layer.id? {...l, visible: !l.visible}: l))} className={`p-1 ${textPrimary}`}>
                                    {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                                <button onClick={() => setActiveLayerId(layer.id)} className={`text-sm text-left ${activeLayerId===layer.id? (isDark ? 'text-white' : 'text-blue-600 font-bold') : textSecondary}`}>
                                    {layer.name}
                                </button>
                                {layer.lattice && (
                                    <button onClick={() => setLattice(layer.lattice)} className={`text-[10px] ml-2 px-2 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'}`}>Use Lattice</button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => {
                                    if (layers.length <= 1) return;
                                    setLayers(prev => {
                                        const next = prev.filter(l => l.id !== layer.id);
                                        // If we deleted the active layer, pick the first and update global lattice
                                        if (activeLayerId === layer.id) {
                                            const newFirst = next[0] || null;
                                            if (newFirst) {
                                                setActiveLayerId(newFirst.id);
                                                setLattice(newFirst.lattice || null);
                                            } else {
                                                setActiveLayerId(null);
                                                setLattice(null);
                                            }
                                        }
                                        return next;
                                    });
                                }} className="p-1 text-slate-400 hover:text-red-400" title="删除图层"><Trash size={14}/></button>
                            </div>
                        </div>
                    ))}

                    <div className="pt-2">
                        <button onClick={() => {
                            const id = `layer-${Date.now()}`;
                            const name = `Layer ${layers.length + 1}`;
                            const newLayer = { id, name, visible: true, opacity: 1, lattice: lattice ? JSON.parse(JSON.stringify(lattice)) : null };
                            setLayers(prev => [newLayer, ...prev]);
                            setActiveLayerId(id);
                        }} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-1 rounded text-xs flex items-center justify-center gap-2"><Plus size={14}/> 新建图层</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeftPanel;
