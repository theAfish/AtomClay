import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Reusable accordion component with expand/collapse toggle.
 * 
 * @param {object} props
 * @param {React.ReactNode} props.icon - Icon element to display in the header
 * @param {string} props.title - Accordion section title
 * @param {React.ReactNode} props.children - Content shown when expanded
 * @param {string} [props.className] - Additional classes for the outer container
 * @param {string} [props.headerClass] - Additional classes for the header button
 * @param {boolean} [props.defaultOpen=false] - Whether to start expanded
 */
const Accordion = ({ icon, title, children, className = '', headerClass = '', defaultOpen = false }) => {
    const [expanded, setExpanded] = useState(defaultOpen);

    return (
        <div className={className}>
            <button
                onClick={() => setExpanded(prev => !prev)}
                className={`w-full flex justify-between items-center text-sm ${headerClass}`}
            >
                <span className="flex items-center gap-2">
                    {icon} {title}
                </span>
                <ChevronDown
                    size={14}
                    className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                />
            </button>
            {expanded && children}
        </div>
    );
};

export default Accordion;
