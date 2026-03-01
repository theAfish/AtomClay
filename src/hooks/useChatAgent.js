import { useState, useEffect } from 'react';
import { useMolecularContext } from '../context/MolecularContext';
import { buildStructurePayload } from '../utils/structureExports';
import { CHAT_CONSTANTS } from '../constants/chatConstants';
import { runAgent, getFinalStructure } from '../services/api';
import { setSessionInfo } from '../services/sessionService';

export const useChatAgent = () => {
    const { atoms, lattice, layers, activeLayerId, loadStructureFromText, handleAgentResult } = useMolecularContext();
    const [messages, setMessages] = useState([
        { 
            id: 1, 
            text: 'Hello! I\'m your AI assistant. How can I help you with your structures today?', 
            sender: CHAT_CONSTANTS.SENDERS.AGENT, 
            timestamp: new Date(), 
            type: CHAT_CONSTANTS.MESSAGE_TYPES.RESPONSE, 
            author: CHAT_CONSTANTS.DEFAULTS.AGENT_NAME 
        }
    ]);
    const [isSending, setIsSending] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [userId] = useState(`u_${Math.random().toString(36).substring(2, 8)}`);
    const [sessionId] = useState(`s_${Math.random().toString(36).substring(2, 8)}`);

    useEffect(() => {
        setSessionInfo({ userId, sessionId });
    }, [userId, sessionId]);

    const sendMessage = async (text) => {
        const trimmed = text.trim();
        if (!trimmed || isSending) return;

        const userMessage = {
            id: messages.length + 1,
            text: trimmed,
            sender: CHAT_CONSTANTS.SENDERS.USER,
            timestamp: new Date(),
            type: CHAT_CONSTANTS.MESSAGE_TYPES.USER
        };
        setMessages(prev => [...prev, userMessage]);

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
                    
                    if (msg.startsWith(CHAT_CONSTANTS.LOG_PREFIXES.AGENT_START)) {
                        const agent = msg.match(new RegExp(`${CHAT_CONSTANTS.LOG_PREFIXES.AGENT_START} (.*) ===`))?.[1] || CHAT_CONSTANTS.DEFAULTS.UNKNOWN;
                        setMessages(prev => [...prev, {
                            id: Date.now() + Math.random(),
                            text: `🔄 Switched to agent: ${agent}`,
                            sender: CHAT_CONSTANTS.SENDERS.SYSTEM,
                            timestamp: new Date(),
                            type: CHAT_CONSTANTS.MESSAGE_TYPES.LOG
                        }]);
                        setStatusMessage(`Agent ${agent} is working...`);
                    } else if (msg.startsWith(CHAT_CONSTANTS.LOG_PREFIXES.TOOL_CALL)) {
                        const tool = msg.match(new RegExp(`${CHAT_CONSTANTS.LOG_PREFIXES.TOOL_CALL} (.*)`))?.[1] || CHAT_CONSTANTS.DEFAULTS.UNKNOWN;
                        setMessages(prev => [...prev, {
                            id: Date.now() + Math.random(),
                            text: `🔧 Calling tool: ${tool}`,
                            sender: CHAT_CONSTANTS.SENDERS.SYSTEM,
                            timestamp: new Date(),
                            type: CHAT_CONSTANTS.MESSAGE_TYPES.LOG
                        }]);
                        setStatusMessage(`Calling tool ${tool}...`);
                    } else if (msg.startsWith(CHAT_CONSTANTS.LOG_PREFIXES.TOOL_RESULT) && msg.includes('Result:')) {
                         const tool = msg.match(/Tool (.*) Result:/)?.[1] || CHAT_CONSTANTS.DEFAULTS.UNKNOWN;
                         setStatusMessage(`Tool ${tool} finished.`);
                    } else if (msg.startsWith(CHAT_CONSTANTS.LOG_PREFIXES.MODEL_RESPONSE)) {
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
                let lastAuthor = CHAT_CONSTANTS.DEFAULTS.AGENT_NAME;
                
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

                const currentAuthor = event.author || CHAT_CONSTANTS.DEFAULTS.AGENT_NAME;

                // Check for agent switch
                if (currentAuthor !== lastAuthor) {
                    newMessages.push({
                        id: Date.now() + Math.random(),
                        text: `🔄 Switched to ${currentAuthor === CHAT_CONSTANTS.DEFAULTS.AGENT_NAME ? 'Main Agent' : `subagent: ${currentAuthor}`}`,
                        sender: CHAT_CONSTANTS.SENDERS.SYSTEM,
                        timestamp: new Date(),
                        type: CHAT_CONSTANTS.MESSAGE_TYPES.SUBAGENT
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
                        sender: CHAT_CONSTANTS.SENDERS.SYSTEM,
                        timestamp: new Date(),
                        type: CHAT_CONSTANTS.MESSAGE_TYPES.TOOL
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
                        sender: CHAT_CONSTANTS.SENDERS.AGENT,
                        timestamp: new Date(),
                        type: CHAT_CONSTANTS.MESSAGE_TYPES.RESPONSE,
                        author: currentAuthor
                    });
                    sessionLastAuthor = currentAuthor;
                }
                
                return [...prev, ...newMessages];
            });
        };

        try {
            const structurePayload = buildStructurePayload({ atoms, lattice, layers, activeLayerId, sessionId });
            
            let messageText = trimmed;
            if (structurePayload && structurePayload.fileName) {
                messageText += `\n\nSystem: The user has uploaded a structure file at inputs/${structurePayload.fileName}`;
            }

            const payload = {
                // match the shape in _debug/payload.json — change these defaults as needed
                appName: CHAT_CONSTANTS.DEFAULTS.AGENT_NAME,
                userId: userId,
                sessionId: sessionId,
                newMessage: {
                    role: 'user',
                    parts: [
                        { text: messageText }
                    ]
                }
            };

            if (structurePayload) {
                payload.structure = structurePayload;
            }

            // POST to relative `/run` so Vite dev server proxy can forward to backend.
            const resp = await runAgent(payload);

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
                sender: CHAT_CONSTANTS.SENDERS.SYSTEM,
                timestamp: new Date(),
                type: CHAT_CONSTANTS.MESSAGE_TYPES.ERROR
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
                const structureResp = await getFinalStructure();
                console.log('Structure response status:', structureResp.status);
                if (structureResp.ok) {
                    const structureData = await structureResp.json();
                    console.log('Structure data:', structureData);
                    await handleAgentResult(structureData.content, structureData.fileName);
                    console.log('Structure loaded successfully');
                } else {
                    console.log('No structure found or error:', await structureResp.text());
                }
            } catch (e) {
                console.error('Failed to load final structure:', e);
            }
        }
    };

    return { messages, sendMessage, isSending, statusMessage };
};
