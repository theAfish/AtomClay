// File storage service for importing/exporting files to backend
// Uses Vite proxy (see vite.config.js) so base URL is relative

let _session = { userId: null, sessionId: null };

export const setSessionInfo = ({ userId, sessionId }) => {
  _session = { userId: userId || null, sessionId: sessionId || null };
};

export const getSessionInfo = () => _session;

/**
 * Import a file to backend storage
 * @param {string} content - File content as string
 * @param {string} filename - File name
 * @param {string} format - File format (optional)
 * @param {boolean} isExport - Whether this is an export operation (adds timestamp)
 * @returns {Promise<Object>} Result with file paths
 */
export const importFile = async (content, filename, format = null, isExport = false) => {
  try {
    const response = await fetch('/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        filename,
        sessionId: _session.sessionId || 'ui',
        userId: _session.userId,
        format,
        isExport
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to import file');
    }

    return response.json();
  } catch (e) {
    console.warn('Failed to save file to backend:', e);
    throw e;
  }
};

/**
 * Export a file from backend storage
 * @param {string} filename - File name to export
 * @returns {Promise<Object>} Result with file content
 */
export const exportFile = async (filename) => {
  try {
    const response = await fetch('/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename,
        sessionId: _session.sessionId || 'ui',
        userId: _session.userId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to export file');
    }

    return response.json();
  } catch (e) {
    console.warn('Failed to export file from backend:', e);
    throw e;
  }
};

/**
 * List all files in current session
 * @returns {Promise<Object>} List of files
 */
export const listFiles = async () => {
  try {
    const sessionId = _session.sessionId || 'ui';
    const response = await fetch(`/list/${sessionId}`);

    if (!response.ok) {
      throw new Error('Failed to list files');
    }

    return response.json();
  } catch (e) {
    console.warn('Failed to list files from backend:', e);
    throw e;
  }
};

export const fileStorageService = {
  setSessionInfo,
  getSessionInfo,
  importFile,
  exportFile,
  listFiles
};
