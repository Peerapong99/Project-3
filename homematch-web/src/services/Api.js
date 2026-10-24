import axios from "axios";

export const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin)).replace(/\/+$/, '');
const api = axios.create({
  baseURL: API_ORIGIN + '/api',
  timeout: 10000,
});

// แนบ JWT Token ไปกับทุก Request
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(response => response, error => {
  if (error.config?.headers?.Authorization === 'Bearer ' + sessionStorage.getItem('token') && (error.response?.status === 401 || error.response?.data?.code === 'ACCOUNT_BANNED')) {
    sessionStorage.removeItem('token'); sessionStorage.removeItem('user');
    if (window.location.pathname !== '/login') window.location.replace('/login');
  }
  return Promise.reject(error);
});
export default api;