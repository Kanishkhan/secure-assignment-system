import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || (
    import.meta.env.PROD ? 'https://secure-assignment-api.onrender.com' : 'http://localhost:5000'
);

const api = axios.create({
    baseURL: API_BASE_URL
});

export default api;
