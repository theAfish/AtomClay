/**
 * Agent API service.
 * Uses centralized apiClient for HTTP requests.
 */
import { postStream, getRaw } from './apiClient';

/**
 * Runs the agent with the given payload (streaming response).
 * @param {Object} payload - The payload to send to the agent.
 * @returns {Promise<Response>} The raw fetch response for stream reading.
 */
export const runAgent = async (payload) => {
    return postStream('/run', payload);
};

/**
 * Fetches the final structure (raw response for status checks).
 * @returns {Promise<Response>} The raw fetch response.
 */
export const getFinalStructure = async () => {
    return getRaw('/get_final_structure');
};

export const api = {
    runAgent,
    getFinalStructure
};
