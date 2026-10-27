import axios from 'axios';

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

export const OFFLINE_EVENT = 'hr:offline';
export const ONLINE_EVENT = 'hr:online';

/**
 * One way to talk to the backend: JSON, the signed-in user's token, a redirect to the login page when the session has
 * expired, and OFFLINE_EVENT / ONLINE_EVENT so the layout can tell the user when the server cannot be reached.
 * `path` is appended to the server address (for example '/api/leaves/').
 */
export const createApiClient = (path = '') => {
  const client = axios.create({
    baseURL: `${API_URL}${path}`,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      window.dispatchEvent(new Event(ONLINE_EVENT));
      return response;
    },
    (error) => {
      if (!error.response) {
        window.dispatchEvent(new Event(OFFLINE_EVENT));
      } else {
        window.dispatchEvent(new Event(ONLINE_EVENT));
        const url = error.config?.url || '';
        if (error.response.status === 401 && !url.includes('/auth/login') && !url.includes('login/')) {
          // an expired / invalid token sends the user back to the login page instead of leaving a broken UI
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (!window.location.pathname.startsWith('/login')) {
            window.location.assign('/login');
          }
        }
      }
      return Promise.reject(error);
    }
  );
  return client;
};

const api = createApiClient();

export default api;
