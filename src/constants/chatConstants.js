export const CHAT_CONSTANTS = {
    LOG_PREFIXES: {
        AGENT_START: '=== Agent Start:',
        TOOL_CALL: '>>> Tool Call:',
        TOOL_RESULT: 'Tool',
        MODEL_RESPONSE: '[MODEL RESPONSE]'
    },
    MESSAGE_TYPES: {
        RESPONSE: 'response',
        USER: 'user',
        LOG: 'log',
        SUBAGENT: 'subagent',
        TOOL: 'tool',
        ERROR: 'error'
    },
    SENDERS: {
        AGENT: 'agent',
        USER: 'user',
        SYSTEM: 'system'
    },
    DEFAULTS: {
        AGENT_NAME: 'agentom',
        UNKNOWN: 'unknown'
    }
};
