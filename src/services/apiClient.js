/**
 * Centralized HTTP client for all API requests.
 * Consolidates common fetch patterns: JSON headers, error handling,
 * and response parsing into a single reusable utility.
 *
 * All service modules should use this client instead of calling fetch directly.
 */

const API_BASE_URL = ''; // Relative path — proxied by Vite dev server

/**
 * Perform a JSON GET request.
 * @param {string} path - URL path (relative to API_BASE_URL)
 * @param {object} [options] - Additional fetch options
 * @returns {Promise<any>} Parsed JSON response
 */
export async function get(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            ...options.headers,
        },
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `GET ${path} failed with status ${response.status}`);
    }
    return response.json();
}

/**
 * Perform a JSON POST request.
 * @param {string} path - URL path (relative to API_BASE_URL)
 * @param {any} body - Request body (will be JSON-serialized)
 * @param {object} [options] - Additional fetch options
 * @returns {Promise<any>} Parsed JSON response
 */
export async function post(path, body, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `POST ${path} failed with status ${response.status}`);
    }
    return response.json();
}

/**
 * Perform a streaming POST request (returns the raw Response for manual reading).
 * @param {string} path - URL path
 * @param {any} body - Request body
 * @param {object} [options] - Additional fetch options
 * @returns {Promise<Response>} Raw fetch response
 */
export async function postStream(path, body, options = {}) {
    return fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        body: JSON.stringify(body),
    });
}

/**
 * Perform a raw GET that returns the Response object (e.g. for streaming or status checks).
 * @param {string} path - URL path
 * @param {object} [options] - Additional fetch options
 * @returns {Promise<Response>} Raw fetch response
 */
export async function getRaw(path, options = {}) {
    return fetch(`${API_BASE_URL}${path}`, options);
}

const apiClient = { get, post, postStream, getRaw };
export default apiClient;
