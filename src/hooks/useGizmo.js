import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { COLORS } from '../constants/theme';

export const useGizmo = (containerRef, threeRef, theme, lattice) => {
    const gizmoRef = useRef({ canvas: null, ctx: null });

    useEffect(() => {
        if (!containerRef.current) return;

        const gizmoSize = 120;
        const gizmoCanvas = document.createElement('canvas');
        gizmoCanvas.style.position = 'absolute';
        gizmoCanvas.style.left = '10px';
        gizmoCanvas.style.bottom = '10px';
        gizmoCanvas.style.width = gizmoSize + 'px';
        gizmoCanvas.style.height = gizmoSize + 'px';
        gizmoCanvas.style.pointerEvents = 'none';
        gizmoCanvas.style.zIndex = 20;
        const dpr = window.devicePixelRatio || 1;
        gizmoCanvas.width = Math.round(gizmoSize * dpr);
        gizmoCanvas.height = Math.round(gizmoSize * dpr);
        gizmoCanvas.style.background = 'transparent';
        
        const gizmoCtx = gizmoCanvas.getContext('2d');
        containerRef.current.appendChild(gizmoCanvas);

        gizmoRef.current = { canvas: gizmoCanvas, ctx: gizmoCtx };

        return () => {
            if (gizmoCanvas.parentNode) {
                gizmoCanvas.parentNode.removeChild(gizmoCanvas);
            }
        };
    }, [containerRef]);

    const drawGizmo = () => {
        const { ctx, canvas } = gizmoRef.current;
        const { camera } = threeRef.current;
        
        if (!ctx || !canvas || !camera) return;

        const dpr = window.devicePixelRatio || 1;
        const gizmoSize = 120;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);

        const w = gizmoSize, h = gizmoSize;
        const cx = w / 2, cy = h / 2;
        const radius = Math.min(w, h) * 0.32; 

        const isDark = theme === 'dark';
        ctx.beginPath();
        ctx.fillStyle = isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.6)';
        ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.3)';
        ctx.lineWidth = 1;
        ctx.arc(cx, cy, Math.min(w, h) / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (!lattice || !Array.isArray(lattice) || lattice.length !== 3) {
            ctx.restore();
            return;
        }

        const axesData = [
            { vec: new THREE.Vector3(...lattice[0]).normalize(), color: COLORS.gizmo.x, label: 'a' },
            { vec: new THREE.Vector3(...lattice[1]).normalize(), color: COLORS.gizmo.y, label: 'b' },
            { vec: new THREE.Vector3(...lattice[2]).normalize(), color: COLORS.gizmo.z, label: 'c' }
        ];

        const rotMat = new THREE.Matrix3().setFromMatrix4(camera.matrixWorldInverse);
        
        ctx.lineWidth = 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '12px sans-serif';

        const projectedAxes = axesData.map(ax => {
            const v = ax.vec.clone().applyMatrix3(rotMat);
            return {
                ...ax,
                x: v.x,
                y: v.y,
                z: v.z 
            };
        });

        projectedAxes.sort((a, b) => a.z - b.z);

        projectedAxes.forEach(p => {
            const len = Math.sqrt(p.x * p.x + p.y * p.y);
            if (len < 0.001) return;

            const ex = cx + p.x * radius; 
            const ey = cy - p.y * radius; 

            ctx.globalAlpha = p.z > 0 ? 1.0 : 0.35; 

            ctx.beginPath();
            ctx.strokeStyle = p.color;
            ctx.moveTo(cx, cy);
            ctx.lineTo(ex, ey);
            ctx.stroke();

            const angle = Math.atan2(ey - cy, ex - cx);
            ctx.save();
            ctx.translate(ex, ey);
            ctx.rotate(angle);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-6, -4);
            ctx.lineTo(-6, 4);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = 1.0; 
            ctx.fillStyle = isDark ? COLORS.text.light : COLORS.text.dark;
            ctx.fillText(p.label, ex + Math.cos(angle) * 10, ey + Math.sin(angle) * 10);
            ctx.restore();
        });

        ctx.restore();
    };

    return drawGizmo;
};
