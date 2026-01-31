import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ChevronDown, Atom } from 'lucide-react';
import PeriodicTable from './PeriodicTable';
import { createPortal } from 'react-dom';

const ElementSelector = ({ value, onChange, panels, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef(null);
    const popupRef = useRef(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    const toggleOpen = () => {
        setIsOpen(!isOpen);
    };

    const updatePosition = () => {
        if (isOpen && buttonRef.current && popupRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const popupRect = popupRef.current.getBoundingClientRect();
            
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const padding = 10;

            // Initial attempt: Bottom-Left aligned
            let top = buttonRect.bottom + 8;
            let left = buttonRect.left;

            // Horizontal Logic
            if (left + popupRect.width > viewportWidth - padding) {
                // Try aligning right edge with button right edge
                const leftAlignedRight = buttonRect.right - popupRect.width;
                if (leftAlignedRight >= padding) {
                    left = leftAlignedRight;
                } else {
                    // If both fail, clamp to right edge
                    left = viewportWidth - popupRect.width - padding;
                }
            }
            
            // Final clamp left
            if (left < padding) {
                left = padding;
            }

            // Vertical Logic
            const spaceBelow = viewportHeight - buttonRect.bottom - padding;
            const spaceAbove = buttonRect.top - padding;

            // If it doesn't fit below, and there is more space above, move it above
            if (popupRect.height > spaceBelow && spaceAbove > spaceBelow) {
                top = buttonRect.top - popupRect.height - 8;
            }

            // Final clamp vertical
            if (top < padding) {
                top = padding;
            }

            setPosition({ top, left });
        }
    };

    useLayoutEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
            
            return () => {
                window.removeEventListener('resize', updatePosition);
                window.removeEventListener('scroll', updatePosition, true);
            };
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpen && buttonRef.current && !buttonRef.current.contains(event.target) && 
                popupRef.current && !popupRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <>
            <button 
                ref={buttonRef}
                onClick={toggleOpen} 
                className={`${className} group relative flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg border transition-all duration-200 min-w-[140px]
                    ${isOpen ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}
                `}
                title="Select Element"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${isOpen ? 'bg-blue-500 text-white shadow-sm' : 'bg-white/5 text-gray-400 group-hover:text-white group-hover:bg-white/10'} transition-all duration-300`}>
                        <Atom size={18} className={isOpen ? 'animate-spin' : ''} />
                    </div>
                    <div className="flex flex-col items-start leading-none">
                        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold mb-0.5">Element</span>
                        <span className="font-bold font-mono text-lg text-gray-200 group-hover:text-white transition-colors">{value}</span>
                    </div>
                </div>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-400' : 'text-gray-600 group-hover:text-gray-400'}`} />
            </button>
            {isOpen && createPortal(
                <div 
                    ref={popupRef}
                    className="periodic-table-popup fixed z-[9999] max-h-[90vh] max-w-[95vw] overflow-auto rounded-xl shadow-2xl scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
                    style={{ 
                        top: position.top, 
                        left: position.left,
                    }}
                >
                    <div className="animate-in fade-in zoom-in-95 duration-200 slide-in-from-top-2">
                        <PeriodicTable 
                            onSelect={(el) => { onChange(el); setIsOpen(false); }} 
                            currentElement={value} 
                            panels={panels} 
                        />
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default ElementSelector;
