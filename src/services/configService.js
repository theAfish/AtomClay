/**
 * Configuration and secret management API client.
 * Uses centralized apiClient for HTTP requests.
 */
import apiClient from './apiClient';

export const getConfig = () => apiClient.get('/config');
export const setConfig = (config) => apiClient.post('/set_config', config);
export const getEnv = () => apiClient.get('/env');
export const setEnv = (envUpdates) => apiClient.post('/set_env', envUpdates);
export const validateConfig = () => apiClient.get('/validate');

export const configService = {
    getConfig,
    setConfig,
    getEnv,
    setEnv,
    validateConfig
};
