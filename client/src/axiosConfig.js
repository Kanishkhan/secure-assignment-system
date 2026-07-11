import axios from 'axios';

const api = axios.create({
    // In dev: Vite proxy forwards /api → localhost:5000
    // In prod: VITE_API_URL is set to the Render backend URL
    baseURL: import.meta.env.VITE_API_URL || '',
    timeout: 60000, // 60s timeout for large files
});

// Attach JWT token to every request
api.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle auth errors globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid — clear session
            sessionStorage.removeItem('token');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
