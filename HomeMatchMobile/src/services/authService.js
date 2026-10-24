
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// =====================================================
// KEYS
// =====================================================

const TOKEN_KEY = 'homematch_token';
const USER_KEY = 'homematch_user';

// =====================================================
// SAVE AUTH DATA
// ใช้ร่วมกันทั้ง Buyer / Seller / Google
// =====================================================

const saveAuthData = async data => {
  if (!data?.token || !data?.user) {
    throw new Error('ข้อมูลการเข้าสู่ระบบไม่ครบถ้วน');
  }

  await AsyncStorage.setMany({
    [TOKEN_KEY]: data.token,
    [USER_KEY]: JSON.stringify(data.user),
  });
};

// =====================================================
// REGISTER BUYER
// =====================================================

export const registerBuyer = async ({
  name,
  email,
  phone,
  password,
}) => {
  const response = await api.post(
    '/auth/buyer/register',
    {
      name,
      email,
      phone,
      password,
    },
  );

  const data = response.data;

  // บันทึกข้อมูลเมื่อ Backend ส่ง Token กลับมา
  if (data?.token && data?.user) {
    await saveAuthData(data);
  }

  return data;
};

// =====================================================
// LOGIN BUYER
// =====================================================

export const loginBuyer = async (
  email,
  password,
) => {
  const response = await api.post(
    '/auth/buyer/login',
    {
      email,
      password,
    },
  );

  const data = response.data;

  if (data?.user?.role !== 'buyer') {
    throw new Error('บัญชีนี้ไม่ใช่บัญชีผู้ซื้อ');
  }

  await saveAuthData(data);

  return data;
};

// =====================================================
// GOOGLE LOGIN BUYER
// ใช้ Google ID Token จาก LoginScreen
// =====================================================

export const loginGoogleBuyer = async idToken => {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('ไม่พบ Google ID Token');
  }

  // ส่ง Google ID Token ให้ Backend ตรวจสอบ
  const response = await api.post(
    '/auth/buyer/google',
    {
      idToken,
    },
  );

  const data = response.data;

  // อนุญาตเฉพาะ Buyer
  if (data?.user?.role !== 'buyer') {
    throw new Error(
      'Google Login รองรับเฉพาะบัญชีผู้ซื้อ',
    );
  }

  // บันทึก JWT และข้อมูลผู้ใช้
  await saveAuthData(data);

  return data;
};

// =====================================================
// LOGIN SELLER
// =====================================================

export const loginSeller = async (
  email,
  password,
) => {
  const response = await api.post(
    '/auth/login',
    {
      email,
      password,
    },
  );

  const data = response.data;

  if (data?.user?.role !== 'seller') {
    throw new Error('บัญชีนี้ไม่ใช่บัญชีผู้ขาย');
  }

  await saveAuthData(data);

  return data;
};

// =====================================================
// GET TOKEN
// =====================================================

export const getToken = async () => {
  try {
    return await AsyncStorage.getItem(
      TOKEN_KEY,
    );
  } catch (error) {
    console.log('GET TOKEN ERROR:', error);
    return null;
  }
};

// =====================================================
// GET LOCAL USER
// =====================================================

export const getStoredUser = async () => {
  try {
    const user = await AsyncStorage.getItem(
      USER_KEY,
    );

    if (!user) {
      return null;
    }

    return JSON.parse(user);
  } catch (error) {
    console.log(
      'GET STORED USER ERROR:',
      error,
    );

    return null;
  }
};

// =====================================================
// GET BUYER PROFILE FROM BACKEND
// =====================================================

export const getBuyerProfile = async () => {
  const token = await getToken();

  if (!token) {
    return null;
  }

  const response = await api.get(
    '/auth/buyer/me',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (response.data?.user) {
    await AsyncStorage.setItem(
      USER_KEY,
      JSON.stringify(response.data.user),
    );
  }

  return response.data;
};

// =====================================================
// GET CURRENT USER
// ใช้ได้ทั้ง Buyer / Seller
// =====================================================

export const getCurrentUser = async () => {
  const token = await getToken();

  if (!token) {
    return null;
  }

  const response = await api.get(
    '/auth/me',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (response.data?.user) {
    await AsyncStorage.setItem(
      USER_KEY,
      JSON.stringify(response.data.user),
    );
  }

  return response.data;
};

// =====================================================
// CHECK LOGIN
// =====================================================

export const isLoggedIn = async () => {
  const token = await getToken();
  return !!token;
};

// =====================================================
// CHECK ROLE
// =====================================================

export const getUserRole = async () => {
  const user = await getStoredUser();
  return user?.role || null;
};

// =====================================================
// LOGOUT
// ใช้ได้ทั้ง Buyer / Seller
// =====================================================


export const logoutUser = async () => {
  try {
    console.log('AUTH LOGOUT STEP 1: START');

    console.log(
      'AsyncStorage:',
      typeof AsyncStorage,
    );

    console.log(
      'AsyncStorage.removeItem:',
      typeof AsyncStorage?.removeItem,
    );

    console.log(
      'AsyncStorage.multiRemove:',
      typeof AsyncStorage?.multiRemove,
    );

    if (typeof AsyncStorage?.removeItem !== 'function') {
      throw new Error(
        'AsyncStorage.removeItem ไม่ใช่ฟังก์ชัน',
      );
    }

    console.log('AUTH LOGOUT STEP 2: REMOVE TOKEN');

    await AsyncStorage.removeItem(TOKEN_KEY);

    console.log('AUTH LOGOUT STEP 3: REMOVE USER');

    await AsyncStorage.removeItem(USER_KEY);

    console.log('AUTH LOGOUT STEP 4: SUCCESS');

    return true;
  } catch (error) {
    console.error('AUTH LOGOUT ERROR:', error);
    throw error;
  }
};


// =====================================================
// LOGOUT BUYER
// เก็บไว้เพื่อไม่ให้ ProfileScreen เดิมพัง
// =====================================================

export const logoutBuyer = async () => {
  return await logoutUser();
};
