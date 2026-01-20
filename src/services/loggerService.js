// Simple client-side logger transport to backend middleware
// Uses Vite proxy (see vite.config.js) so base URL is relative

let _session = { userId: null, sessionId: null };

export const setSessionInfo = ({ userId, sessionId }) => {
  _session = { userId: userId || null, sessionId: sessionId || null };
};

export const logOperation = async (entryOrType, maybeParams, maybeMetadata) => {
  try {
    let entry = entryOrType;
    if (typeof entryOrType === 'string') {
      entry = { type: entryOrType, params: maybeParams || {}, metadata: maybeMetadata || {} };
    }

    const payload = {
      entry,
      userId: _session.userId,
      sessionId: _session.sessionId
    };

    await fetch('/logs/operation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    // Non-fatal; ignore network errors to avoid disrupting UI
    // console.warn('Failed to send operation log', e);
  }
};

export const logOperations = async (entries) => {
  try {
    const payload = {
      entries,
      userId: _session.userId,
      sessionId: _session.sessionId
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
