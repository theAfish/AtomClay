import React, { useEffect } from 'react';
import { useViewerContext } from './ViewerContext';

const ViewerCanvas = () => {
    const { containerRef, threeRef } = useViewerContext();

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            if (threeRef.current.camera && threeRef.current.renderer) {
                const { current: container } = containerRef;
                if (container) {
                    const width = container.clientWidth;
                    const height = container.clientHeight;
                    threeRef.current.camera.aspect = width / height;
                    threeRef.current.camera.updateProjectionMatrix();
                    // Pass false to updateStyle to avoid interfering with CSS layout (width: 100%)
                    threeRef.current.renderer.setSize(width, height, false); 
                    
                     // Also ensure pixel ratio is correct (in case of zoom/monitor change)
                    const dpr = Math.min(window.devicePixelRatio || 1, 2);
                    threeRef.current.renderer.setPixelRatio(dpr);
                }
            }
        };

        const container = containerRef.current;
        if (!container) return;

        // Use ResizeObserver to detect all size changes (window resize, layout changes, animations)
        const resizeObserver = new ResizeObserver(() => {
            handleResize();
        });
        
        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, [containerRef, threeRef]);

    return (
        <div 
            ref={containerRef} 
            className="w-full h-full relative overflow-hidden"
            // Prevent default touch actions to allow orbital controls to work smoothly
            style={{ touchAction: 'none' }} 
        />
    );
};

export default ViewerCanvas;
