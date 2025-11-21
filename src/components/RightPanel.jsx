import React from 'react';
import { Scissors, MousePointer2, Trash2 } from 'lucide-react';
import { ELEMENT_DATA } from '../constants/elements';

const RightPanel = ({
    atoms, selectedAtomIds, editMode, setEditMode,
    targetElement, setTargetElement, onApplyEdit, onDelete
}) => {
    const selectedCount = selectedAtomIds.length;
    const selAtom = selectedCount === 1 ? atoms.find(a => a.id === selectedAtomIds[0]) : null;

    return (
        <div className="absolute top-4 right-4 w-64 pointer-events-none">
            <div className="glass-panel p-4 rounded-xl shadow-xl pointer-events-auto">
                <h2 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
                    <Scissors size={16} /> 编辑工具
                </h2>
                <div className="flex gap-1 mb-4 bg-slate-900/50 p-1 rounded">
                    <button onClick={()=>setEditMode('SELECT')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${editMode==='SELECT'?'bg-blue-600 text-white':'text-slate-400'}`}>
                        <MousePointer2 size={14} /> 选择/移动
                    </button>
                    <button onClick={()=>setEditMode('DELETE')} className={`flex-1 py-2 rounded text-xs flex flex-col items-center gap-1 ${editMode==='DELETE'?'bg-red-600 text-white':'text-slate-400'}`}>
                        <Trash2 size={14} /> 删除模式
                    </button>
                </div>

                {selectedCount > 0 ? (
                    <div className="bg-slate-800/50 p-3 rounded border border-slate-700/50 animate-fade-in">
                        {selectedCount === 1 && selAtom ? (
                            <>
                                <div className="text-xs text-blue-300 font-bold mb-2 flex justify-between">
                                    <span>ID: {selAtom.id}</span>
                                    <span>{selAtom.element}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-300 mb-3">
                                    <div className="bg-slate-900 p-1 rounded text-center">x:{selAtom.x.toFixed(2)}</div>
                                    <div className="bg-slate-900 p-1 rounded text-center">y:{selAtom.y.toFixed(2)}</div>
                                    <div className="bg-slate-900 p-1 rounded text-center">z:{selAtom.z.toFixed(2)}</div>
                                </div>
                            </>
                        ) : (
                            <div className="text-xs text-blue-300 font-bold mb-2 flex justify-between">
                                <span>已选择 {selectedCount} 个原子</span>
                            </div>
                        )}
                        
                        <div className="mb-3 border-t border-slate-700/50 pt-3">
                            <label className="text-xs text-slate-400 block mb-1">替换元素</label>
                            <div className="flex gap-2">
                                <select value={targetElement} onChange={e=>setTargetElement(e.target.value)} className="flex-1 bg-slate-900 border border-slate-600 rounded text-xs px-2 py-1">
                                    {Object.keys(ELEMENT_DATA).filter(k=>k!=='Default').map(el=><option key={el} value={el}>{el}</option>)}
                                </select>
                                <button onClick={onApplyEdit} className="bg-blue-600 hover:bg-blue-500 px-3 rounded text-xs">应用</button>
                            </div>
                        </div>
                        <button onClick={onDelete} className="w-full bg-red-500/20 hover:bg-red-500/40 text-red-300 py-1 rounded text-xs flex items-center justify-center gap-1">
                            <Trash2 size={12} /> 删除
                        </button>
                    </div>
                ) : (
                    <div className="text-xs text-slate-500 text-center py-4 italic">
                        {editMode==='SELECT' ? '点击原子进行选择或拖拽' : '点击原子进行删除'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RightPanel;
