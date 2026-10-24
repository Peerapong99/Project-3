import {NativeModules, Platform} from 'react-native';
const configured = NativeModules.HomeMatchConfig?.apiOrigin || NativeModules.SettingsManager?.settings?.HomeMatchApiOrigin;
const origin = typeof configured === 'string' && /^https?:\/\//.test(configured) ? configured : '';
export const API_ORIGIN = (origin || (__DEV__ ? (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000') : '')).replace(/\/+$/, '');
export function requireApiOrigin() {
  if (!API_ORIGIN || (!__DEV__ && !API_ORIGIN.startsWith('https://'))) throw new Error('กรุณาตั้งค่า HTTPS API origin สำหรับแอปรุ่นเผยแพร่');
}
