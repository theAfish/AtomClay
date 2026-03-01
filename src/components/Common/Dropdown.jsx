import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Reusable dropdown select component with theme support.
 *
 * @param {object} props
 * @param {Array<{id: string, label: string}>} props.options - List of options
 * @param {string} props.value - Currently selected option id
 * @param {function} props.onChange - Callback when an option is selected: (id) => void
 * @param {string} [props.className] - Additional classes for the trigger button
 * @param {string} [props.dropdownClassName] - Additional classes for the dropdown menu
 * @param {string} [props.itemClassName] - Base classes for each item
 * @param {string} [props.activeItemClassName] - Classes applied to the active (selected) item
 * @param {string} [props.label] - Fallback display when no option matches
 * @param {string} [props.title] - Button tooltip
 * @param {string} [props.position='bottom'] - 'bottom' | 'top' dropdown direction
 */
const Dropdown = ({
    options,
    value,
    onChange,
    className = '',
    dropdownClassName = '',
    itemClassName = '',
    activeItemClassName = '',
    label,
    title,
    position = 'bottom',
}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const selected = options.find(o => o.id === value);
    const displayLabel = selected?.label || label || value;

    const positionClass = position === 'top' ? 'bottom-full mb-1' : 'top-full mt-1';

    return (
        <div className="relative" ref={ref}>
            <button
                className={`flex items-center gap-1 ${className}`}
                onClick={() => setOpen(prev => !prev)}
                title={title}
            >
                {displayLabel}
                <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className={`absolute ${positionClass} right-0 rounded-lg shadow-lg border z-50 ${dropdownClassName}`}>
                    {options.map(opt => (
                        <button
                            key={opt.id}
                            className={`w-full text-left px-3 py-2 text-sm ${itemClassName} ${value === opt.id ? activeItemClassName : ''}`}
                            onClick={() => {
                                onChange(opt.id);
                                setOpen(false);
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dropdown;
