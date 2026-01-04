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

    // Keep track of last seen initial props so we only reposition when they change
    const prevInitialXRef = useRef(initialX);
    const prevInitialYRef = useRef(initialY);
    // Track whether the user manually moved the panel
    const hasUserMovedRef = useRef(false);
    // Track start position when dragging begins so we can detect actual movement
    const dragStartRef = useRef(null);
    // Track pointer id when using Pointer Events
    const pointerIdRef = useRef(null);

    useEffect(() => {
        // Don't interfere while the user is actively interacting
        if (isDragging || isResizing) return;

        // If the parent changed the initial position (e.g., chat opened/closed)
        const initialChanged = initialX !== prevInitialXRef.current || initialY !== prevInitialYRef.current;

        if (initialChanged) {
            if (!hasUserMovedRef.current) {
                // If user never moved the panel, snap to the new initial
                const clampedX = Math.max(0, Math.min(initialX, windowSize.width - size.width));
                const clampedY = Math.max(0, Math.min(initialY, windowSize.height - size.height));

                setPosition({
                    xPercent: (clampedX / windowSize.width) * 100,
                    yPercent: (clampedY / windowSize.height) * 100
                });
            } else {
                // If user moved the panel, shift it by the same delta the initial position changed by
                const deltaX = initialX - prevInitialXRef.current;
                const deltaY = initialY - prevInitialYRef.current;

                const deltaPercentX = (deltaX / windowSize.width) * 100;
                const deltaPercentY = (deltaY / windowSize.height) * 100;

                const newXPercent = position.xPercent + deltaPercentX;
                const newYPercent = position.yPercent + deltaPercentY;

                const actualX = (newXPercent / 100) * windowSize.width;
                const actualY = (newYPercent / 100) * windowSize.height;

                const clampedX = Math.max(0, Math.min(actualX, windowSize.width - size.width));
                const clampedY = Math.max(0, Math.min(actualY, windowSize.height - size.height));

                setPosition({
                    xPercent: (clampedX / windowSize.width) * 100,
                    yPercent: (clampedY / windowSize.height) * 100
                });
            }

            prevInitialXRef.current = initialX;
            prevInitialYRef.current = initialY;
            return;
        }

        // Otherwise, keep current relative position but ensure it stays inside the viewport
        const actualX = (position.xPercent / 100) * windowSize.width;
        const actualY = (position.yPercent / 100) * windowSize.height;
        const clampedX = Math.max(0, Math.min(actualX, windowSize.width - size.width));
        const clampedY = Math.max(0, Math.min(actualY, windowSize.height - size.height));

        if (clampedX !== actualX || clampedY !== actualY) {
            setPosition({
                xPercent: (clampedX / windowSize.width) * 100,
                yPercent: (clampedY / windowSize.height) * 100
            });
        }
    }, [initialX, initialY, windowSize.width, windowSize.height, size.width, size.height, isDragging, isResizing, position.xPercent, position.yPercent]);

    useEffect(() => {
        const handlePointerMove = (e) => {
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

        const handlePointerUp = (e) => {
            // If we started dragging and the position changed, mark that the user moved the panel
            if (dragStartRef.current) {
                const start = dragStartRef.current;
                if (start.xPercent !== position.xPercent || start.yPercent !== position.yPercent) {
                    hasUserMovedRef.current = true;
                }
                dragStartRef.current = null;
            }

            setIsDragging(false);
            setIsResizing(false);

            if (pointerIdRef.current && panelRef.current && typeof panelRef.current.releasePointerCapture === 'function') {
                try { panelRef.current.releasePointerCapture(pointerIdRef.current); } catch (err) {}
            }
            pointerIdRef.current = null;
        };

        if (isDragging || isResizing) {
            document.addEventListener('pointermove', handlePointerMove);
            document.addEventListener('pointerup', handlePointerUp);
            document.addEventListener('pointercancel', handlePointerUp);
        }

        return () => {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            document.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [isDragging, isResizing, dragOffset, position, size, windowSize, minWidth, minHeight]);

    const handlePointerDown = (e) => {
        // Only start drag if clicking on the header (which has the drag-handle class)
        if (e.target.closest('.drag-handle')) {
            e.preventDefault();
            const actualX = (position.xPercent / 100) * windowSize.width;
            const actualY = (position.yPercent / 100) * windowSize.height;
            // Save the start position to detect actual movement on pointerup
            dragStartRef.current = { xPercent: position.xPercent, yPercent: position.yPercent };
            setIsDragging(true);
            setDragOffset({
                x: e.clientX - actualX,
                y: e.clientY - actualY
            });
            // Capture the pointer so we continue getting events even if the pointer leaves the element
            pointerIdRef.current = e.pointerId;
            if (panelRef.current && typeof panelRef.current.setPointerCapture === 'function') {
                try { panelRef.current.setPointerCapture(e.pointerId); } catch (err) {}
            }
        }
    }; 

    const handleResizePointerDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        // Capture pointer for resize
        pointerIdRef.current = e.pointerId;
        if (panelRef.current && typeof panelRef.current.setPointerCapture === 'function') {
            try { panelRef.current.setPointerCapture(e.pointerId); } catch (err) {}
        }
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
            onPointerDown={handlePointerDown}
        >
            {/* Header */}
            <div className={`flex items-center justify-between p-3 border-b cursor-move drag-handle select-none touch-none rounded-t-xl ${headerBg} ${headerClass}`} style={{ touchAction: 'none' }}>
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
                className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize touch-none flex items-center justify-center opacity-50 hover:opacity-100"
                onPointerDown={handleResizePointerDown}
                style={{ touchAction: 'none' }}
            >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <path d="M10 10L0 10L10 0Z" />
                </svg>
            </div>
        </div>
    );
};

export default DraggablePanel;
