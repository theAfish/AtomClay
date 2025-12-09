import React, { useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMolecularContext } from '../context/MolecularContext';
import { PANEL_CLASSES } from '../constants/theme';
import { MathUtils } from '../utils/math';

const isInitialEmptyStructure = (layers = [], atoms = []) => {
    if (!layers || layers.length !== 1) return false;
    const base = layers[0];
    if (!base || base.id !== 'layer-0') return false;
    const atomsInBase = (atoms || []).filter(a => (a.layerId || base.id) === base.id);
    return atomsInBase.length === 0;
};

const buildPoscar = (atoms = [], lattice) => {
    if (!Array.isArray(lattice) || lattice.length !== 3) return null;
    if (!atoms || atoms.length === 0) return null;

    const lines = [];
    lines.push('AtomClay');
    lines.push('1.0');
    lattice.forEach(v => lines.push(`${v[0]} ${v[1]} ${v[2]}`));

    const groups = {};
    atoms.forEach(a => {
        const el = a.element || 'X';
        if (!groups[el]) groups[el] = [];
        groups[el].push(a);
    });
    const elements = Object.keys(groups);
    if (elements.length === 0) return null;

    lines.push(elements.join(' '));
    lines.push(elements.map(e => groups[e].length).join(' '));
    lines.push('Direct');

    const invL = MathUtils.inv3x3(lattice);
    const invLT = MathUtils.transpose3x3(invL);
    const wrap = (v) => (v - Math.floor(v + 1e-6)).toFixed(6);

    elements.forEach(e => {
        groups[e].forEach(a => {
            const [fx, fy, fz] = MathUtils.multiplyMatrixVector(invLT, [a.x, a.y, a.z]);
            lines.push(`${wrap(fx)} ${wrap(fy)} ${wrap(fz)}`);
        });
    });

    return lines.join('\n');
};

const buildStructurePayload = ({ atoms, lattice, layers, activeLayerId, sessionId }) => {
    if (isInitialEmptyStructure(layers, atoms)) return null;

    const allLayers = layers || [];
    const visibleLayerIds = new Set(
        allLayers.filter(l => l && l.visible !== false).map(l => l.id)
    );

    const atomsForVisible = (atoms || []).filter(a => {
        if (!visibleLayerIds.size) return true; // if nothing flagged, include all
        return visibleLayerIds.has(a.layerId || activeLayerId || 'layer-0');
    });

    if (!atomsForVisible || atomsForVisible.length === 0) return null;

    const latticeForStructure = lattice;
    const poscar = buildPoscar(atomsForVisible, latticeForStructure);
    if (!poscar) return null;

    // const nameParts = allLayers
    //     .filter(l => l && visibleLayerIds.has(l.id))
    //     .map(l => l.name || l.id || '')
    //     .filter(Boolean);
    // const baseName = nameParts.length ? nameParts.join('_') : 'merged_visible';
    // const safeName = baseName.replace(/[^\w.-]+/g, '_') || 'merged_visible';
    const fileName = `${sessionId || 'session'}.vasp`;

    return {
        fileName,
        content: poscar,
        layerId: null,
        atomCount: atomsForVisible.length
    };
};

// Chat panel for AI assistant interaction

const ChatPanel = ({ isOpen, onToggle }) => {
    const { t } = useTranslation();
    const { theme, atoms, lattice, layers, activeLayerId, loadStructureFromText } = useMolecularContext();
    const [messages, setMessages] = useState([
        { id: 1, text: 'Hello! I\'m your AI assistant. How can I help you with your structures today?', sender: 'agent', timestamp: new Date(), type: 'response', author: 'agentom' }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [userId] = useState(`u_${Math.random().toString(36).substring(2, 8)}`);
    const [sessionId] = useState(`s_${Math.random().toString(36).substring(2, 8)}`);

    const isDark = theme === 'dark';
    const panels = PANEL_CLASSES[theme] || PANEL_CLASSES.dark;
    const panelClass = panels.panelClass;
    const textPrimary = panels.textPrimary;
    const textSecondary = panels.textSecondary;
    const bgInput = panels.bgInput;
    const borderClass = panels.borderClass;
    const buttonPrimary = panels.buttonPrimary;

    const handleSendMessage = async () => {
        const trimmed = inputMessage.trim();
        if (!trimmed || isSending) return;

        const userMessage = {
            id: messages.length + 1,
            text: trimmed,
            sender: 'user',
            timestamp: new Date(),
            type: 'user'
        };
        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');

        setIsSending(true);
        setStatusMessage('Starting...');

        // Start log streaming
        let logSource = null;
        try {
            logSource = new EventSource('/logs/stream');
            logSource.onmessage = (e) => {
                const line = e.data;
                // Parse line: 2025... - INFO - agentom - Message
                const parts = line.split(' - ');
                if (parts.length >= 4) {
                    const msg = parts.slice(3).join(' - ');
                    
                    if (msg.startsWith('=== Agent Start:')) {
                        const agent = msg.match(/=== Agent Start: (.*) ===/)?.[1] || 'unknown';
                        setMessages(prev => [...prev, {
                            id: Date.now() + Math.random(),
                            text: `🔄 Switched to agent: ${agent}`,
                            sender: 'system',
                            timestamp: new Date(),
                            type: 'log'
                        }]);
                        setStatusMessage(`Agent ${agent} is working...`);
                    } else if (msg.startsWith('>>> Tool Call:')) {
                        const tool = msg.match(/>>> Tool Call: (.*)/)?.[1] || 'unknown';
                        setMessages(prev => [...prev, {
                            id: Date.now() + Math.random(),
                            text: `🔧 Calling tool: ${tool}`,
                            sender: 'system',
                            timestamp: new Date(),
                            type: 'log'
                        }]);
                        setStatusMessage(`Calling tool ${tool}...`);
                    } else if (msg.startsWith('Tool') && msg.includes('Result:')) {
                         const tool = msg.match(/Tool (.*) Result:/)?.[1] || 'unknown';
                         setStatusMessage(`Tool ${tool} finished.`);
                    } else if (msg.startsWith('[MODEL RESPONSE]')) {
                        setStatusMessage('Generating response...');
                    }
                }
            };
        } catch (e) {
            console.error("Failed to connect to log stream", e);
        }

        // Track session state for author switching
        let sessionLastAuthor = null;

        const processEvent = (event) => {
            setMessages(prev => {
                const newMessages = [];
                let lastAuthor = 'agentom';
                
                // Find the last author from previous messages
                if (prev.length > 0) {
                    const lastAgentMsg = [...prev].reverse().find(m => m.author);
                    if (lastAgentMsg) {
                        lastAuthor = lastAgentMsg.author;
                    }
                }
                
                // Override with sessionLastAuthor if we have one for this batch
                if (sessionLastAuthor) {
                    lastAuthor = sessionLastAuthor;
                }

                const currentAuthor = event.author || 'agentom';

                // Check for agent switch
                if (currentAuthor !== lastAuthor) {
                    newMessages.push({
                        id: Date.now() + Math.random(),
                        text: `🔄 Switched to ${currentAuthor === 'agentom' ? 'Main Agent' : `subagent: ${currentAuthor}`}`,
                        sender: 'system',
                        timestamp: new Date(),
                        type: 'subagent'
                    });
                    lastAuthor = currentAuthor;
                    sessionLastAuthor = currentAuthor;
                }

                // Check for tool calls
                const hasToolConfirmations = event.actions && 
                                           event.actions.requestedToolConfirmations && 
                                           Object.keys(event.actions.requestedToolConfirmations).length > 0;

                if (event.tool || event.tool_name || hasToolConfirmations) {
                    const toolName = event.tool || event.tool_name || 'Unknown Tool';
                    let text = `🔧 Tool Call: ${toolName}`;
                    if (event.args) text += ` - Args: ${JSON.stringify(event.args)}`;
                    if (event.result) text += ` - Result: ${event.result}`;
                    newMessages.push({
                        id: Date.now() + Math.random(),
                        text,
                        sender: 'system',
                        timestamp: new Date(),
                        type: 'tool'
                    });
                }

                // Extract text for model responses or any event with text
                let text = '';
                if (event?.content?.parts && event.content.parts.length > 0) {
                    text = event.content.parts.map(p => p.text).join('\n');
                } else if (event?.text) {
                    text = event.text;
                }
                if (text.trim()) {
                    newMessages.push({
                        id: Date.now() + Math.random(),
                        text,
                        sender: 'agent',
                        timestamp: new Date(),
                        type: 'response',
                        author: currentAuthor
                    });
                    sessionLastAuthor = currentAuthor;
                }
                
                return [...prev, ...newMessages];
            });
        };

        try {
            const structurePayload = buildStructurePayload({ atoms, lattice, layers, activeLayerId, sessionId });
            const payload = {
                // match the shape in _debug/payload.json — change these defaults as needed
                appName: 'agentom',
                userId: userId,
                sessionId: sessionId,
                newMessage: {
                    role: 'user',
                    parts: [
                        { text: trimmed }
                    ]
                }
            };

            if (structurePayload) {
                payload.structure = structurePayload;
            }

            // POST to relative `/run` so Vite dev server proxy can forward to backend.
            const resp = await fetch('/run', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!resp.ok) {
                throw new Error(`Server returned ${resp.status}`);
            }

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let depth = 0;
            let inString = false;
            let escape = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                let startIndex = -1;
                let i = 0;
                
                while (i < buffer.length) {
                    const char = buffer[i];
                    
                    if (escape) {
                        escape = false;
                        i++;
                        continue;
                    }
                    
                    if (char === '\\') {
                        escape = true;
                        i++;
                        continue;
                    }
                    
                    if (char === '"') {
                        inString = !inString;
                        i++;
                        continue;
                    }
                    
                    if (!inString) {
                        if (char === '{') {
                            if (depth === 0) startIndex = i;
                            depth++;
                        } else if (char === '}') {
                            depth--;
                            if (depth === 0 && startIndex !== -1) {
                                // Found a complete object
                                const jsonStr = buffer.substring(startIndex, i + 1);
                                try {
                                    const event = JSON.parse(jsonStr);
                                    processEvent(event);
                                } catch (e) {
                                    console.error("Failed to parse JSON chunk", e);
                                }
                                // Remove processed part from buffer
                                buffer = buffer.substring(i + 1);
                                i = -1; // Restart scanning from new buffer start
                                startIndex = -1;
                            }
                        }
                    }
                    i++;
                }
            }
        } catch (err) {
            const errMessage = {
                id: messages.length + 2,
                text: `❌ Error contacting server: ${err.message}`,
                sender: 'system',
                timestamp: new Date(),
                type: 'error'
            };
            setMessages(prev => [...prev, errMessage]);
        } finally {
            setIsSending(false);
            setStatusMessage('');
            if (logSource) {
                logSource.close();
            }
            // After the agent run, try to load the final structure into a new layer
            try {
                console.log('Fetching final structure...');
                const structureResp = await fetch('/get_final_structure');
                console.log('Structure response status:', structureResp.status);
                if (structureResp.ok) {
                    const structureData = await structureResp.json();
                    console.log('Structure data:', structureData);
                    await loadStructureFromText(structureData.content, structureData.format, structureData.fileName);
                    console.log('Structure loaded successfully');
                } else {
                    console.log('No structure found or error:', await structureResp.text());
                }
            } catch (e) {
                console.error('Failed to load final structure:', e);
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <>
            <div className={`fixed top-1/2 ${isOpen ? 'right-80' : 'right-0'} transform -translate-y-1/2 z-50`}>
                <button
                    onClick={onToggle}
                    className={`${panelClass} p-3 rounded-l-xl shadow-xl hover:shadow-2xl transition-all duration-200`}
                    title={isOpen ? t('Close Chat') : t('Open Chat')}
                >
                    <MessageCircle size={20} className={textPrimary} />
                </button>
            </div>
            {isOpen && (
                <div className={`fixed top-0 right-0 h-full w-80 ${panelClass} shadow-xl z-40 flex flex-col`}>
                    {/* Header */}
                    <div className={`p-4 border-b ${borderClass} flex items-center justify-between`}>
                        <h2 className={`text-lg font-semibold flex items-center gap-2 ${textPrimary}`}>
                            <MessageCircle size={20} />
                            {t('AI Assistant')}
                        </h2>
                        <button
                            onClick={onToggle}
                            className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${textSecondary}`}
                            title={t('Close Chat')}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.sender === 'user' ? 'justify-end' : message.sender === 'system' ? 'justify-center' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] p-3 rounded-lg ${
                                        message.sender === 'user'
                                            ? `${buttonPrimary} text-white`
                                            : message.sender === 'system' || message.type === 'log'
                                            ? `${bgInput} ${textSecondary} text-center italic`
                                            : `${bgInput} ${textPrimary}`
                                    }`}
                                >
                                    <p className="text-sm">{message.text}</p>
                                    <p className={`text-xs mt-1 ${
                                        message.sender === 'user' ? 'text-blue-100' : textSecondary
                                    }`}>
                                        {message.timestamp.toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {isSending && (
                            <div className="flex justify-start">
                                <div className={`max-w-[80%] p-3 rounded-lg ${bgInput} ${textSecondary} italic`}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        <span className="ml-2 text-sm">{statusMessage || t('Agent is working...')}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className={`p-4 border-t ${borderClass}`}>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={t('Type your message...')}
                                className={`flex-1 px-3 py-2 rounded-lg ${bgInput} ${borderClass} ${textPrimary} placeholder-${textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            />
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={!inputMessage.trim() || isSending}
                                                className={`${buttonPrimary} p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                                                title={t('Send Message')}
                                            >
                                                <Send size={18} />
                                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ChatPanel;