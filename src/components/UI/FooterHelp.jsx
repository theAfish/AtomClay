import React from 'react';
import { useMolecularContext } from '../../context/MolecularContext';

const FooterHelp = () => {
    const { transformMode } = useMolecularContext();

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-slate-500 text-[10px] pointer-events-none bg-black/20 px-2 rounded">
            左键: 旋转/选择 | Shift+拖拽: 框选 | 右键: 平移 | 滚轮: 缩放 | 选中原子后拖拽坐标轴 {transformMode === 'translate' ? '移动' : transformMode === 'rotate' ? '旋转' : '缩放'}
        </div>
    );
};

export default FooterHelp;
