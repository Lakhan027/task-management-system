/**
 * Mask sensitive data in URL
 */
export const maskUrl = (url) => {
    if (!url)
        return '';
    return url.replace(/:[^:@]*@/, ':****@');
};
/**
 * Format timestamp
 */
export const formatTimestamp = (date = new Date()) => {
    return date.toISOString();
};
/**
 * Get environment
 */
export const getEnv = () => process.env.NODE_ENV || 'development';
/**
 * Check if development environment
 */
export const isDev = () => getEnv() === 'development';
/**
 * Check if production environment
 */
export const isProd = () => getEnv() === 'production';
/**
 * Get server port
 */
export const getPort = () => process.env.PORT || 5000;
/**
 * Async wrapper for route handlers
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
