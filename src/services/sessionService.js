/**
 * Centralized session management.
 *
 * Previously both loggerService and fileStorageService maintained their own
 * independent `_session` objects. This module consolidates session info into
 * a single source of truth that all services can reference.
 */

let _session = { userId: null, sessionId: null };

/**
 * Update the global session info.
 * @param {{ userId?: string, sessionId?: string }} info
 */
export const setSessionInfo = ({ userId, sessionId }) => {
    _session = { userId: userId || null, sessionId: sessionId || null };
};

/**
 * Retrieve the current session info.
 * @returns {{ userId: string|null, sessionId: string|null }}
 */
export const getSessionInfo = () => _session;
