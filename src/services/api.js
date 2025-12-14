/**
 * Centralized API service for handling HTTP requests.
 */

const API_BASE_URL = ''; // Relative path as per existing code

/**
 * Runs the agent with the given payload.
 * @param {Object} payload - The payload to send to the agent.
 * @returns {Promise<Response>} The fetch response.
 */
export const runAgent = async (payload) => {
    return fetch(`${API_BASE_URL}/run`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
};

/**
 * Fetches the final structure.
 * @returns {Promise<Response>} The fetch response.
 */
export const getFinalStructure = async () => {
    return fetch(`${API_BASE_URL}/get_final_structure`);
};

export const api = {
    runAgent,
    getFinalStructure
};
