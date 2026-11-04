import axios from 'axios';
import { getApiErrorMessage } from './apiErrors';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 15000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(new Error(getApiErrorMessage(error), { cause: error }));
  },
);

export default api;
