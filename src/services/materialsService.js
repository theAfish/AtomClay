/**
 * Materials science API service.
 * Uses centralized apiClient for HTTP requests.
 */
import apiClient from './apiClient';

/**
 * Builds interface candidates between two structures.
 * @param {Object} payload - The request payload.
 * @returns {Promise<Object>} The response containing interfaces.
 */
export const buildInterfaces = (payload) => apiClient.post('/materials/build_interfaces', payload);

export const materialsService = {
    buildInterfaces
};
