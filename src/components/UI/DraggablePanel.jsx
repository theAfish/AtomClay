import React, { useState, useEffect, useRef } from 'react';
import { X, GripHorizontal } from 'lucide-react';

const DraggablePanel = ({ 
    children, 
    title, 
    icon,
    initialX = 20, 
    initialY = 20, 
    initialWidth = 320, 
    initialHeight = 600,
    minWidth = 250,
    minHeight = 200,
    onClose,
    className = "",
    headerClass = "",
    contentClass = "",
    theme = 'light'
}) => {
    const [windowSize, setWindowSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
    const [position, setPosition] = useState({ 
        xPercent: (initialX / window.innerWidth) * 100, 
        yPercent: (initialY / window.innerHeight) * 100 
    });
    const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    
    const panelRef = useRef(null);

    // Update window size on resize
    useEffect(() => {
        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                let newX = e.clientX - dragOffset.x;
                let newY = e.clientY - dragOffset.y;
                newX = Math.max(0, Math.min(newX, windowSize.width - size.width));
                newY = Math.max(0, Math.min(newY, windowSize.height - size.height));
                setPosition({
                    xPercent: (newX / windowSize.width) * 100,
                    yPercent: (newY / windowSize.height) * 100
                });
            } else if (isResizing) {
                let actualX = (position.xPercent / 100) * windowSize.width;
                let actualY = (position.yPercent / 100) * windowSize.height;
                let newWidth = Math.max(minWidth, e.clientX - actualX);
                let newHeight = Math.max(minHeight, e.clientY - actualY);
                newWidth = Math.min(newWidth, windowSize.width - actualX);
                newHeight = Math.min(newHeight, windowSize.height - actualY);
                setSize({ width: newWidth, height: newHeight });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, dragOffset, position, size, windowSize, minWidth, minHeight]);

    const handleMouseDown = (e) => {
        // Only start drag if clicking on the header (which has the drag-handle class)
        if (e.target.closest('.drag-handle')) {
            const actualX = (position.xPercent / 100) * windowSize.width;
            const actualY = (position.yPercent / 100) * windowSize.height;
            setIsDragging(true);
            setDragOffset({
                x: e.clientX - actualX,
                y: e.clientY - actualY
            });
        }
    };

    const handleResizeMouseDown = (e) => {
        e.stopPropagation();
        setIsResizing(true);
    };

    // Basic theme styles if not provided via classes
    const bgClass = theme === 'dark' ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-800';
    const headerBg = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200';

    return (
        <div 
            ref={panelRef}
            className={`fixed shadow-2xl rounded-xl flex flex-col border z-50 ${bgClass} ${className}`}
            style={{
                left: Math.max(0, Math.min((position.xPercent / 100) * windowSize.width, windowSize.width - size.width)),
                top: Math.max(0, Math.min((position.yPercent / 100) * windowSize.height, windowSize.height - size.height)),
                width: size.width,
                height: size.height,
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Header */}
            <div className={`flex items-center justify-between p-3 border-b cursor-move drag-handle select-none rounded-t-xl ${headerBg} ${headerClass}`}>
                <div className="flex items-center gap-2 font-semibold text-sm">
                    <GripHorizontal size={16} className="opacity-50" />
                    {icon && icon}
                    {title}
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded opacity-70 hover:opacity-100 transition">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Content */}
            <div className={`flex-1 overflow-auto p-4 ${contentClass}`}>
                {children}
            </div>

            {/* Resize Handle */}
            <div 
                className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize flex items-center justify-center opacity-50 hover:opacity-100"
                onMouseDown={handleResizeMouseDown}
            >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <path d="M10 10L0 10L10 0Z" />
                </svg>
            </div>
        </div>
    );
};

export default DraggablePanel;
