import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ELEMENT_DATA } from '../constants/elements';

const PERIODIC_TABLE_LAYOUT = [
  ['H',  '',   '',   '',   '',   '',   '',   '',   '',   '',   '',   '',   '',   '',   '',   '',   '',   'He'],
  ['Li', 'Be', '',   '',   '',   '',   '',   '',   '',   '',   '',   '',   'B',  'C',  'N',  'O',  'F',  'Ne'],
  ['Na', 'Mg', '',   '',   '',   '',   '',   '',   '',   '',   '',   '',   'Al', 'Si', 'P', 'S',  'Cl', 'Ar'],
  ['K',  'Ca', 'Sc', 'Ti', 'V',  'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr'],
  ['Rb', 'Sr', 'Y',  'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb', 'Te', 'I',  'Xe'],
  ['Cs', 'Ba', 'La', 'Hf', 'Ta', 'W',  'Re', 'Os', 'Ir', 'Pt', 'Au', 'Hg', 'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn'],
  ['Fr', 'Ra', 'Ac', 'Rf', 'Db', 'Sg', 'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og'],
];

const LANTHANIDES = ['Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu'];
const ACTINIDES =   ['Th', 'Pa', 'U',  'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr'];

const PeriodicTable = ({ onSelect, currentElement, panels }) => {
    const { t } = useTranslation();
    const { bgCard, borderClass } = panels;
    const [hoveredElement, setHoveredElement] = useState(null);

    const displayElement = hoveredElement || currentElement;
    const displayData = displayElement ? ELEMENT_DATA[displayElement] : null;

    const renderCell = (element, isMainTable = false) => {
        if (!element) return <div className="w-8 h-8" />;
        
        const isSelected = element === currentElement;
        const isHovered = element === hoveredElement;
        const data = ELEMENT_DATA[element];
        const color = data ? '#' + data.color.toString(16).padStart(6, '0') : '#ccc';
        
        // Determine text color based on background brightness
        const r = (data?.color >> 16) & 0xff;
        const g = (data?.color >> 8) & 0xff;
        const b = (data?.color >> 0) & 0xff;
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const textColor = luma < 128 ? 'text-white' : 'text-black';

        return (
            <button
                key={element}
                onClick={() => onSelect(element)}
                onMouseEnter={() => setHoveredElement(element)}
                onMouseLeave={() => setHoveredElement(null)}
                className={`
                    w-8 h-8 text-xs font-bold flex items-center justify-center rounded-md 
                    transition-all duration-200 ease-out
                    ${isSelected ? 'ring-2 ring-white scale-110 z-20 shadow-lg' : 'border border-transparent hover:scale-125 hover:z-20 hover:shadow-xl'}
                    ${isHovered ? 'brightness-110' : ''}
                `}
                style={{ 
                    backgroundColor: color, 
                    color: luma < 128 ? '#fff' : '#000',
                    textShadow: luma < 128 ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}
                title={element}
            >
                {element}
            </button>
        );
    };

    return (
        <div className={`p-4 rounded-xl ${bgCard} border ${borderClass} shadow-2xl backdrop-blur-sm select-none`}>
            <div className="flex gap-4">
                {/* Main Table */}
                <div className="flex flex-col gap-1">
                    {PERIODIC_TABLE_LAYOUT.map((row, i) => (
                        <div key={i} className="flex gap-1">
                            {row.map((el, j) => (
                                <div key={`${i}-${j}`}>
                                    {renderCell(el, true)}
                                </div>
                            ))}
                        </div>
                    ))}
                    
                    <div className="h-4"></div>
                    
                    <div className="flex gap-1 ml-[4.5rem]"> {/* Indent for Lanthanides/Actinides (2 cells * 2rem + gaps) */}
                        {LANTHANIDES.map(el => renderCell(el))}
                    </div>
                    <div className="flex gap-1 ml-[4.5rem]">
                        {ACTINIDES.map(el => renderCell(el))}
                    </div>
                </div>

                {/* Info Panel */}
                <div className="w-48 flex flex-col gap-4 p-4 rounded-lg bg-black/20 border border-white/10">
                    <div className="text-center">
                        <div 
                            className="w-24 h-24 mx-auto rounded-xl flex items-center justify-center text-4xl font-bold shadow-inner mb-2 transition-colors duration-300"
                            style={{ 
                                backgroundColor: displayData ? '#' + displayData.color.toString(16).padStart(6, '0') : 'transparent',
                                color: displayData ? (0.2126 * ((displayData.color >> 16) & 0xff) + 0.7152 * ((displayData.color >> 8) & 0xff) + 0.0722 * ((displayData.color >> 0) & 0xff) < 128 ? '#fff' : '#000') : 'inherit'
                            }}
                        >
                            {displayElement || '?'}
                        </div>
                        <h3 className="text-xl font-bold text-white">{displayElement || t('Select')}</h3>
                    </div>

                    {displayData && (
                        <div className="space-y-2 text-sm text-gray-300">
                            <div className="flex justify-between border-b border-white/10 pb-1">
                                <span>{t('Radius')}:</span>
                                <span className="font-mono text-white">{displayData.radius} Å</span>
                            </div>
                            <div className="flex justify-between border-b border-white/10 pb-1">
                                <span>{t('VDW')}:</span>
                                <span className="font-mono text-white">{displayData.vdw} Å</span>
                            </div>
                            <div className="flex justify-between border-b border-white/10 pb-1">
                                <span>{t('Color')}:</span>
                                <span className="font-mono text-white">#{displayData.color.toString(16).padStart(6, '0').toUpperCase()}</span>
                            </div>
                        </div>
                    )}
                    
                    {!displayData && (
                        <div className="text-center text-gray-500 text-sm mt-4">
                            {t('Hover over an element to see details')}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PeriodicTable;
