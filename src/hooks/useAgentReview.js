import { useState, useCallback } from 'react';
import { parse } from '../utils/parsers';

/**
 * Encapsulates the agent result review workflow:
 * - Receiving a new agent result → creating a review layer
 * - Accepting or denying the result
 * - Per-layer keep/discard actions
 *
 * Extracted from MolecularContext to improve separation of concerns.
 */
export function useAgentReview({
    layers, setLayers,
    atoms, lattice,
    activeLayerId, setActiveLayerId,
    setLattice,
    addAtoms,
    setSelectedAtomIds,
    setFileError,
    recordOp,
}) {
    const [agentReviewState, setAgentReviewState] = useState({
        status: 'idle',
        originalLayers: [],
        resultLayerId: null,
        originalLattice: null,
        originalLatticeSource: null,
    });

    const handleAgentResult = useCallback(async (content, fileName) => {
        const selectedLayers = layers.filter(l => l.selected);
        const selectedLayerIds = selectedLayers.map(l => l.id);

        setLayers(prev => prev.map(l => {
            if (selectedLayerIds.includes(l.id)) {
                return { ...l, visible: false, isAgentInput: true };
            }
            return l;
        }));

        try {
            const { atoms: newAtoms, lattice: newLat } = await parse(content, undefined, fileName);
            const newIds = addAtoms(newAtoms, newLat, true);
            const newLayerId = newIds.layerId;

            setLayers(prev => prev.map(l =>
                l.id === newLayerId ? { ...l, isAgentResult: true } : l
            ));

            if (newLat) setLattice(newLat, newLayerId);

            setAgentReviewState({
                status: 'reviewing',
                originalLayers: selectedLayerIds,
                resultLayerId: newLayerId,
                originalLattice: lattice,
                originalLatticeSource: activeLayerId,
            });

            recordOp('AGENT_RESULT_RECEIVED', {
                fileName,
                atomCount: newAtoms.length,
                resultLayerId: newLayerId,
                originalLayers: selectedLayerIds,
            }, { lattice: newLat });

            setSelectedAtomIds(newIds);
            if (setFileError) setFileError(null);
        } catch (e) {
            console.error('Error loading structure:', e);
            if (setFileError) setFileError(e.message);
        }
    }, [layers, setLayers, lattice, activeLayerId, addAtoms, setLattice, setSelectedAtomIds, setFileError, recordOp]);

    const acceptAgentResult = useCallback(() => {
        const { originalLayers, resultLayerId } = agentReviewState;
        setLayers(prev => prev.filter(l => !originalLayers.includes(l.id)).map(l => {
            if (l.id === resultLayerId) {
                const { isAgentResult, ...rest } = l;
                return rest;
            }
            return l;
        }));
        setAgentReviewState({ status: 'idle', originalLayers: [], resultLayerId: null, originalLattice: null, originalLatticeSource: null });
        recordOp('AGENT_RESULT_ACCEPT', { resultLayerId });
    }, [agentReviewState, setLayers, recordOp]);

    const denyAgentResult = useCallback(() => {
        const { originalLayers, resultLayerId, originalLattice, originalLatticeSource } = agentReviewState;
        setLayers(prev => {
            const next = prev.filter(l => l.id !== resultLayerId).map(l => {
                if (originalLayers.includes(l.id)) {
                    const { isAgentInput, visible, ...rest } = l;
                    return { ...rest, visible: true };
                }
                return l;
            });
            if (activeLayerId === resultLayerId) {
                const firstOriginal = originalLayers.find(id => next.some(l => l.id === id));
                if (firstOriginal) setActiveLayerId(firstOriginal);
            }
            return next;
        });
        setLattice(originalLattice, originalLatticeSource);
        setAgentReviewState({ status: 'idle', originalLayers: [], resultLayerId: null, originalLattice: null, originalLatticeSource: null });
        recordOp('AGENT_RESULT_DENY', { resultLayerId, restoredLayers: originalLayers });
    }, [agentReviewState, activeLayerId, setActiveLayerId, setLayers, setLattice, recordOp]);

    const handleLayerReviewAction = useCallback((layerId, action) => {
        setLayers(prev => {
            const nextLayers = prev.map(l => {
                if (l.id !== layerId) return l;
                if (action === 'keep') {
                    const { isAgentInput, isAgentResult, visible, ...rest } = l;
                    const kept = { ...rest, visible: true };
                    if (l.isAgentResult && l.lattice) setLattice(l.lattice, layerId);
                    return kept;
                } else if (action === 'discard') {
                    if (l.isAgentResult) setLattice(agentReviewState.originalLattice, agentReviewState.originalLatticeSource);
                    return null;
                }
                return l;
            }).filter(Boolean);

            if (action === 'discard' && activeLayerId === layerId) {
                const remaining = nextLayers.filter(l => l.visible);
                setActiveLayerId(remaining.length > 0 ? remaining[0].id : null);
            }

            const hasFlagged = nextLayers.some(l => l.isAgentInput || l.isAgentResult);
            if (!hasFlagged) {
                setAgentReviewState({ status: 'idle', originalLayers: [], resultLayerId: null, originalLattice: null, originalLatticeSource: null });
            }

            recordOp('AGENT_LAYER_ACTION', { layerId, action });
            return nextLayers;
        });
    }, [agentReviewState, activeLayerId, setActiveLayerId, setLayers, setLattice, recordOp]);

    return {
        agentReviewState,
        handleAgentResult,
        acceptAgentResult,
        denyAgentResult,
        handleLayerReviewAction,
    };
}
