/**
 * Configuration and secret management API client.
 */

const API_BASE_URL = ''; // Relative path, proxied by Vite

export const getConfig = async () => {
    const response = await fetch(`${API_BASE_URL}/config`);
    if (!response.ok) {
        throw new Error('Failed to load config');
    }
    return response.json();
};

export const setConfig = async (config) => {
    const response = await fetch(`${API_BASE_URL}/set_config`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to update config');
    }

    return response.json();
};

export const getEnv = async () => {
    const response = await fetch(`${API_BASE_URL}/env`);
    if (!response.ok) {
        throw new Error('Failed to load API keys');
    }
    return response.json();
};

export const setEnv = async (envUpdates) => {
    const response = await fetch(`${API_BASE_URL}/set_env`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(envUpdates)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to update API keys');
    }

    return response.json();
};

export const validateConfig = async () => {
    const response = await fetch(`${API_BASE_URL}/validate`);
    if (!response.ok) {
        throw new Error('Failed to validate configuration');
    }
    return response.json();
};

export const configService = {
    getConfig,
    setConfig,
    getEnv,
    setEnv,
    validateConfig
};
