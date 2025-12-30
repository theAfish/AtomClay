
const API_BASE_URL = ''; // Relative path, proxied by Vite

/**
 * Builds interface candidates between two structures.
 * @param {Object} payload - The request payload.
 * @returns {Promise<Object>} The response containing interfaces.
 */
export const buildInterfaces = async (payload) => {
    const response = await fetch(`${API_BASE_URL}/materials/build_interfaces`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to build interfaces');
    }

    return response.json();
};

export const materialsService = {
    buildInterfaces
};
