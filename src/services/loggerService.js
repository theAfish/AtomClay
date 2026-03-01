// Simple client-side logger transport to backend middleware.
// Uses centralized session and apiClient.
import { getSessionInfo, setSessionInfo } from './sessionService';

// Re-export setSessionInfo for backwards compatibility
export { setSessionInfo };

export const logOperation = async (entryOrType, maybeParams, maybeMetadata) => {
  try {
    let entry = entryOrType;
    if (typeof entryOrType === 'string') {
      entry = { type: entryOrType, params: maybeParams || {}, metadata: maybeMetadata || {} };
    }

    const session = getSessionInfo();
    const payload = {
      entry,
      userId: session.userId,
      sessionId: session.sessionId
    };

    await fetch('/logs/operation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    // Non-fatal; ignore network errors to avoid disrupting UI
  }
};

export const logOperations = async (entries) => {
  try {
    const session = getSessionInfo();
    const payload = {
      entries,
      userId: session.userId,
      sessionId: session.sessionId
    };
    await fetch('/logs/operation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    // ignore
  }
};
