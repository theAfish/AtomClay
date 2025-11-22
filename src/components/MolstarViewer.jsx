import React, { useEffect, useRef } from 'react';
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { createPluginUI } from 'molstar/lib/mol-plugin-ui/index';
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';

export default function MolstarViewer({ pdbContent, structure, visible = true, onClose }) {
    const parentRef = useRef(null);
    const pluginRef = useRef(null);

    // Convert normalized structure to a minimal PDB string Mol* can parse
    const structureToPDB = (s) => {
        if (!s || !Array.isArray(s.atoms)) return null;
        const lines = [];
        let idx = 1;
        for (const a of s.atoms) {
            const el = (a.element || 'X').toUpperCase().slice(0,2).padStart(2, ' ');
            const serial = String(idx).padStart(5, ' ');
            const name = el.padEnd(4, ' ');
            const resName = 'UNK';
            const chain = 'A';
            const resSeq = '1'.padStart(4, ' ');
            const x = (a.x || 0).toFixed(3).toString().padStart(8, ' ');
            const y = (a.y || 0).toFixed(3).toString().padStart(8, ' ');
            const z = (a.z || 0).toFixed(3).toString().padStart(8, ' ');
            const line = `ATOM  ${serial} ${name}${resName} ${chain}${resSeq}   ${x}${y}${z}  1.00  0.00          ${el}`;
            lines.push(line);
            idx++;
        }
        lines.push('END');
        return lines.join('\n');
    };

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
                    let input = pdbContent;
                    if (!input && structure) input = structureToPDB(structure);
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
            if (!input && structure) input = structureToPDB(structure);
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

    // Optionally hide by rendering null when not visible
    return visible ? <div ref={parentRef} style={{ width: '100%', height: '100%', position: 'relative' }} /> : null;
}
