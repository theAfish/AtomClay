// File storage service for importing/exporting files to backend.
// Uses centralized session management and apiClient.
import apiClient from './apiClient';
import { getSessionInfo, setSessionInfo } from './sessionService';

// Re-export for backwards compatibility
export { setSessionInfo, getSessionInfo };

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
    const session = getSessionInfo();
    return await apiClient.post('/import', {
      content,
      filename,
      sessionId: session.sessionId || 'ui',
      userId: session.userId,
      format,
      isExport
    });
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
    const session = getSessionInfo();
    return await apiClient.post('/export', {
      filename,
      sessionId: session.sessionId || 'ui',
      userId: session.userId
    });
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
    const session = getSessionInfo();
    const sessionId = session.sessionId || 'ui';
    return await apiClient.get(`/list/${sessionId}`);
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
