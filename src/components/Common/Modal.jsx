import React from 'react';
import { X } from 'lucide-react';

/**
 * Reusable modal overlay component.
 *
 * @param {object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {function} props.onClose - Called when the user closes the modal
 * @param {string} props.title - Modal title
 * @param {string} [props.subtitle] - Optional subtitle below the title
 * @param {React.ReactNode} props.children - Modal body content
 * @param {React.ReactNode} [props.footer] - Optional fixed footer content
 * @param {string} [props.containerClass] - Theme classes for the modal container
 * @param {string} [props.borderClass] - Theme classes for border dividers
 * @param {string} [props.subtitleClass] - Theme classes for the subtitle text
 * @param {string} [props.maxWidth='max-w-xl'] - Max width class for the modal
 */
const Modal = ({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    footer,
    containerClass = '',
    borderClass = '',
    subtitleClass = '',
    maxWidth = 'max-w-xl',
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 p-6 overflow-y-auto">
            <div className={`w-full ${maxWidth} rounded-xl border shadow-2xl ${containerClass}`}>
                {/* Header */}
                <div className={`flex items-center justify-between border-b px-6 py-4 ${borderClass}`}>
                    <div>
                        <div className="text-lg font-semibold">{title}</div>
                        {subtitle && (
                            <div className={`text-sm ${subtitleClass}`}>{subtitle}</div>
                        )}
                    </div>
                    <button aria-label="Close" onClick={onClose} className="p-2 hover:opacity-80">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-6">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className={`border-t px-6 py-4 ${borderClass}`}>
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
