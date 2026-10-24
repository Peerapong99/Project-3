
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Android Emulator
import {API_ORIGIN, requireApiOrigin} from './apiConfig';
export {API_ORIGIN};

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  timeout: 10000,
});

// แนบ Token ทุกครั้งที่เรียก API
api.interceptors.request.use(
  async config => {
    requireApiOrigin();
    const token = await AsyncStorage.getItem(
      'homematch_token',
    );

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  error => Promise.reject(error),
);

let expiration = null;
const sessionListeners = new Set();
export const onSessionExpired = listener => {sessionListeners.add(listener); return () => sessionListeners.delete(listener);};
api.interceptors.response.use(response => response, async error => {
  if (error.config?.headers?.Authorization && (error.response?.status === 401 || error.response?.data?.code === 'ACCOUNT_BANNED') && error.config.headers.Authorization === 'Bearer ' + await AsyncStorage.getItem('homematch_token')) {
    if (!expiration) expiration = (async () => {
      await AsyncStorage.removeItem('homematch_token'); await AsyncStorage.removeItem('homematch_user');
      sessionListeners.forEach(listener => listener());
    })().finally(() => {expiration = null;});
    await expiration;
  }
  return Promise.reject(error);
});
export default api;
