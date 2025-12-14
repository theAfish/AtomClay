import React, { useEffect, useRef } from 'react';
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui/index';
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';
import { COLORS } from '../constants/theme';
import { toPDB } from '../utils/parsers/pdbParser';

export default function MolstarViewer({ pdbContent, structure, visible = true, onClose, theme = 'dark' }) {
    const parentRef = useRef(null);
    const pluginRef = useRef(null);

    useEffect(() => {
        if (pluginRef.current) {
            const canvas = parentRef.current?.querySelector('canvas');
            if (canvas) {
                // Mol* canvas background is usually handled by the plugin renderer
                // But we can try to set the clear color if exposed, or just rely on the container if transparent
                // Mol* default background is usually white or black depending on skin.
                // Since we can't easily change skin at runtime without reloading, we might just leave it for now
                // or try to set the background color via plugin command if we knew it.
                // For now, let's just set the container background which might show through if transparent
                parentRef.current.style.backgroundColor = theme === 'dark' ? COLORS.background.dark : COLORS.background.light;
            }
        }
    }, [theme]);

    useEffect(() => {
        let mounted = true;
        async function init() {
            if (!parentRef.current) return;
            if (pluginRef.current) return;

            const spec = DefaultPluginUISpec();
            spec.layout = {
                initial: {
                    isExpanded: false,
                    showControls: true,
                    controlsDisplay: 'reactive',
                    regionState: {
                        bottom: 'hidden',
                        left: 'collapsed',
                        right: 'hidden',
                        top: 'hidden',
                    }
                },
            };

            try {
                const plugin = await createPluginUI({
                    target: parentRef.current,
                    spec: spec,
                    render: renderReact18
                });
                if (mounted) {
                    pluginRef.current = plugin;
                    // Set initial background
                    parentRef.current.style.backgroundColor = theme === 'dark' ? COLORS.background.dark : COLORS.background.light;
                    
                    let input = pdbContent;
                    if (!input && structure) input = toPDB(structure);
                    if (input) {
                        const data = await plugin.builders.data.rawData({ data: input, label: 'Structure' });
                        const fmt = 'pdb';
                        const trajectory = await plugin.builders.structure.parseTrajectory(data, fmt);
                        await plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default');
                    }
                }
            } catch (e) {
                console.error('Failed to initialize Mol*', e);
            }
        }

        init();

        return () => {
            mounted = false;
            if (pluginRef.current) {
                pluginRef.current.dispose();
                pluginRef.current = null;
            }
        };
    }, []);

    // React to content changes
    useEffect(() => {
        async function load() {
            if (!pluginRef.current) return;
            let input = pdbContent;
            if (!input && structure) input = toPDB(structure);
            if (!input) return;
            try {
                pluginRef.current.clear();
                const data = await pluginRef.current.builders.data.rawData({ data: input, label: 'Structure' });
                const fmt = 'pdb';
                const trajectory = await pluginRef.current.builders.structure.parseTrajectory(data, fmt);
                await pluginRef.current.builders.structure.hierarchy.applyPreset(trajectory, 'default');
            } catch (e) {
                console.error('Mol* load failed', e);
            }
        }
        if (pluginRef.current) load();
    }, [pdbContent, structure]);

    // Handle container resize
    useEffect(() => {
        if (!parentRef.current) return;
        const resizeObserver = new ResizeObserver(() => {
            if (pluginRef.current && pluginRef.current.handleResize) {
                pluginRef.current.handleResize();
            } else if (pluginRef.current && pluginRef.current.layout) {
                // Try to trigger layout update
                pluginRef.current.layout.update();
            }
        });
        resizeObserver.observe(parentRef.current);
        return () => resizeObserver.disconnect();
    }, []);
}
