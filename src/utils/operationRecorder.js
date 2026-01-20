// Lightweight recorder for user modeling operations
// Provides append-only log suitable for export/replay without coupling to React state

export function createOperationRecorder(maxEntries = 1000) {
    const log = [];

    const record = (type, params = {}, metadata = {}) => {
        const entry = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            type,
            params,
            metadata: {
                ...metadata,
                timestamp: new Date().toISOString()
            }
        };
        log.push(entry);
        if (log.length > maxEntries) {
            log.shift();
        }
        return entry;
    };

    const getLog = () => [...log];
    const clear = () => { log.length = 0; };
    const exportAsJson = (indent = 2) => JSON.stringify(log, null, indent);

    return { record, getLog, clear, exportAsJson };
}
