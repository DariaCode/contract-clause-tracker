/**
 * Base URL for the API. Requests use relative `/api` paths which are proxied
 * to the backend — by `proxy.conf.json` under `ng serve`, and by nginx in the
 * Docker image. This keeps the app free of environment-specific config.
 */
export const API_BASE = '/api';
