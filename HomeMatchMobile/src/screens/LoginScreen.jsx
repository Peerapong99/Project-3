import React, {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';
import api from '../services/api';
import {
  GoogleSignin,
  isCancelledResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  loginBuyer,
  loginSeller,
  loginGoogleBuyer,
} from '../services/authService';
// Android Emulator ใช้ 10.0.2.2
// มือถือจริงให้เปลี่ยนเป็น IP คอมพิวเตอร์

// ใส่ Web Client ID จาก Google Cloud Console
const GOOGLE_WEB_CLIENT_ID = '357363341863-c5p0bksj0mjaejan5jeboiu2sm3l7ff4.apps.googleusercontent.com';
const LoginScreen = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [selectedRole, setSelectedRole] = useState('buyer');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem('homematch_remembered_email').then(value => {
      if (active && value) {setEmail(value); setRememberMe(true);}
    }).catch(() => {});
    return () => {active = false;};
  }, []);
  // Forgot Password
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  // =========================
  // LOGIN
  // =========================
  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      Alert.alert('กรุณากรอกข้อมูล', 'กรุณากรอกอีเมล');
      return;
    }
    if (!password) {
      Alert.alert('กรุณากรอกข้อมูล', 'กรุณากรอกรหัสผ่าน');
      return;
    }
    try {
      setLoading(true);
      let result = null;
      if (selectedRole === 'buyer') {
        result = await loginBuyer(cleanEmail, password);
        if (result?.user?.role !== 'buyer') {
          Alert.alert(
            'ไม่สามารถเข้าสู่ระบบได้',
            'บัญชีนี้ไม่ใช่บัญชีผู้ซื้อ',
          );
          return;
        }
      }
      if (selectedRole === 'seller') {
        result = await loginSeller(cleanEmail, password);
        if (result?.user?.role !== 'seller') {
          Alert.alert(
            'ไม่สามารถเข้าสู่ระบบได้',
            'บัญชีนี้ไม่ใช่บัญชีผู้ขาย',
          );
          return;
        }
      }
      if (rememberMe) await AsyncStorage.setItem('homematch_remembered_email', cleanEmail);
      else await AsyncStorage.removeItem('homematch_remembered_email');
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'MainTabs',
            params: {screen: 'Profile'},
          },
        ],
      });
    } catch (error) {
      console.log(
        'LOGIN ERROR:',
        error?.response?.data || error?.message,
      );
      let message =
        error?.response?.data?.message ||
        error?.message ||
        'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่';
      if (error?.response?.status === 401) {
        message =
          selectedRole === 'seller'
            ? 'อีเมลหรือรหัสผ่านผู้ขายไม่ถูกต้อง'
            : 'อีเมลหรือรหัสผ่านผู้ซื้อไม่ถูกต้อง';
      }
      Alert.alert('เข้าสู่ระบบไม่สำเร็จ', message);
    } finally {
      setLoading(false);
    }
  };
  // =========================
  // REGISTER
  // =========================
  const handleRegister = () => {
    navigation.navigate('Register');
  };
  // =========================
  // FORGOT PASSWORD
  // =========================
  const handleForgotPassword = () => {
    setForgotEmail(email);
    setForgotVisible(true);
  };
  const sendResetEmail = async () => {
    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      Alert.alert(
        'อีเมลไม่ถูกต้อง',
        'กรุณากรอกอีเมลให้ถูกต้อง',
      );
      return;
    }
    try {
      setForgotLoading(true);
      const response = await api.post(
        '/auth/forgot-password',
        {email: cleanEmail},
        {timeout: 15000},
      );
      setForgotVisible(false);
      Alert.alert(
        'ตรวจสอบอีเมล',
        response.data?.message ||
          'หากมีบัญชีในระบบ เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้',
      );
    } catch (error) {
      Alert.alert(
        'ส่งอีเมลไม่สำเร็จ',
        error?.response?.data?.message ||
          'กรุณาตรวจสอบการเชื่อมต่อ Backend',
      );
    } finally {
      setForgotLoading(false);
    }
  };
  // =========================
  // GOOGLE LOGIN
  // =========================
  const handleGoogleLogin = async () => {
    if (selectedRole !== 'buyer') {
      Alert.alert(
        'Google Login',
        'ขณะนี้รองรับเฉพาะบัญชีผู้ซื้อ',
      );
      return;
    }
    if (GOOGLE_WEB_CLIENT_ID.startsWith('YOUR_')) {
      Alert.alert(
        'ยังไม่ได้ตั้งค่า Google',
        'กรุณาใส่ Google Web Client ID ก่อนใช้งาน',
      );
      return;
    }
    try {
      setLoading(true);
      GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
      });
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      const signInResult = await GoogleSignin.signIn();
      if (isCancelledResponse(signInResult)) {
        return;
      }
      const idToken =
        signInResult?.data?.idToken ||
        signInResult?.idToken;
      if (!idToken) {
        throw new Error('ไม่ได้รับ Google ID Token');
      }
      const result = await loginGoogleBuyer(idToken);
      if (result?.user?.role !== 'buyer') {
        throw new Error('บัญชีนี้ไม่ใช่บัญชีผู้ซื้อ');
      }
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'MainTabs',
            params: {screen: 'Profile'},
          },
        ],
      });
    } catch (error) {
      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      Alert.alert(
        'Google Login ไม่สำเร็จ',
        error?.response?.data?.message ||
          error?.message ||
          'กรุณาลองใหม่',
      );
    } finally {
      setLoading(false);
    }
  };
  // =========================
  // UI
  // =========================
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* LOGO */}
          <View style={styles.logoSection}>
            <View style={styles.logoIcons}>
              <MaterialDesignIcons
                name="home-roof"
                size={48}
                color="#075B8C"
              />
              <View style={styles.heartLogo}>
                <MaterialDesignIcons
                  name="heart-outline"
                  size={37}
                  color="#0F9D8A"
                />
              </View>
              <MaterialDesignIcons
                name="home-roof"
                size={48}
                color="#0F9D8A"
              />
            </View>
            <Text style={styles.logoTitle}>
              Home
              <Text style={styles.logoTitleGreen}>
                Match
              </Text>
            </Text>
            <Text style={styles.logoSubtitle}>
              หาบ้านที่ใช่ คู่ชีวิตที่ลงตัว
            </Text>
          </View>
          {/* LOGIN CARD */}
          <View style={styles.card}>
            {/* LOGIN / REGISTER */}
            <View style={styles.authTabs}>
              <Pressable
                style={[
                  styles.authTab,
                  styles.authTabActive,
                ]}>
                <Text style={styles.authTabActiveText}>
                  เข้าสู่ระบบ
                </Text>
              </Pressable>
              <Pressable
                style={styles.authTab}
                onPress={handleRegister}>
                <Text style={styles.authTabText}>
                  สมัครสมาชิก
                </Text>
              </Pressable>
            </View>
            {/* ACCOUNT TYPE */}
            <Text style={styles.sectionLabel}>
              ประเภทผู้ใช้
            </Text>
            <View style={styles.roleContainer}>
              <Pressable
                style={[
                  styles.roleButton,
                  selectedRole === 'buyer' &&
                    styles.roleButtonActive,
                ]}
                onPress={() => setSelectedRole('buyer')}>
                <MaterialDesignIcons
                  name="account-search-outline"
                  size={17}
                  color={
                    selectedRole === 'buyer'
                      ? '#0F9D8A'
                      : '#94A3B8'
                  }
                />
                <Text
                  style={[
                    styles.roleText,
                    selectedRole === 'buyer' &&
                      styles.roleTextActive,
                  ]}>
                  ผู้ซื้อ
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.roleButton,
                  selectedRole === 'seller' &&
                    styles.roleButtonActive,
                ]}
                onPress={() => setSelectedRole('seller')}>
                <MaterialDesignIcons
                  name="home-account"
                  size={17}
                  color={
                    selectedRole === 'seller'
                      ? '#0F9D8A'
                      : '#94A3B8'
                  }
                />
                <Text
                  style={[
                    styles.roleText,
                    selectedRole === 'seller' &&
                      styles.roleTextActive,
                  ]}>
                  ผู้ขาย
                </Text>
              </Pressable>
            </View>
            {/* EMAIL */}
            <View style={styles.inputContainer}>
              <MaterialDesignIcons
                name="email-outline"
                size={20}
                color="#94A3B8"
              />
              <TextInput
                style={styles.input}
                placeholder="อีเมล"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>
            {/* PASSWORD */}
            <View
              style={[
                styles.inputContainer,
                {marginTop: 12},
              ]}>
              <MaterialDesignIcons
                name="lock-outline"
                size={20}
                color="#94A3B8"
              />
              <TextInput
                style={styles.input}
                placeholder="รหัสผ่าน"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable
                style={styles.eyeButton}
                onPress={() =>
                  setShowPassword(value => !value)
                }>
                <MaterialDesignIcons
                  name={
                    showPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={19}
                  color="#94A3B8"
                />
              </Pressable>
            </View>
            {/* REMEMBER / FORGOT */}
            <View style={styles.optionRow}>
              <Pressable
                style={styles.rememberContainer}
                onPress={() =>
                  setRememberMe(value => !value)
                }>
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxActive,
                  ]}>
                  {rememberMe && (
                    <MaterialDesignIcons
                      name="check"
                      size={13}
                      color="#FFFFFF"
                    />
                  )}
                </View>
                <Text style={styles.rememberText}>
                  จำอีเมลของฉัน
                </Text>
              </Pressable>
              <Pressable onPress={handleForgotPassword}>
                <Text style={styles.forgotText}>
                  ลืมรหัสผ่าน?
                </Text>
              </Pressable>
            </View>
            {/* SECURITY MESSAGE */}
            <View style={styles.agreementRow}>
              <MaterialDesignIcons
                name="shield-check-outline"
                size={15}
                color="#94A3B8"
              />
              <Text style={styles.agreementText}>
                ระบบจะรักษาความปลอดภัยข้อมูลส่วนบุคคลของคุณ
              </Text>
            </View>
            {/* LOGIN BUTTON */}
            <Pressable
              style={[
                styles.loginButton,
                loading && styles.loginButtonDisabled,
              ]}
              disabled={loading}
              onPress={handleLogin}>
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Text style={styles.loginButtonText}>
                  เข้าสู่ระบบ
                </Text>
              )}
            </Pressable>
            {/* OR */}
            <View style={styles.orContainer}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>หรือ</Text>
              <View style={styles.orLine} />
            </View>
            {/* GOOGLE */}
            <Pressable
              style={[
                styles.googleButton,
                loading && styles.loginButtonDisabled,
              ]}
              disabled={loading}
              onPress={handleGoogleLogin}>
              <View style={styles.googleIcon}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleText}>
                เข้าสู่ระบบด้วย Google
              </Text>
            </Pressable>
            {/* FOOTER */}
            <Text style={styles.footerText}>
              เข้าใช้งานอย่างปลอดภัย
              {'\n'}
              เพื่อค้นหาบ้านในฝันของคุณ
            </Text>
          </View>
          {/* GUEST */}
          <Pressable
            style={styles.guestButton}
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{name: 'MainTabs'}],
              })
            }>
            <Text style={styles.guestText}>
              เข้าใช้งานโดยไม่เข้าสู่ระบบ
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* FORGOT PASSWORD MODAL */}
      <Modal
        visible={forgotVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!forgotLoading) {
            setForgotVisible(false);
          }
        }}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === 'ios' ? 'padding' : undefined
          }>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <MaterialDesignIcons
                name="lock-reset"
                size={30}
                color="#0F9D8A"
              />
            </View>
            <Text style={styles.modalTitle}>
              ลืมรหัสผ่าน?
            </Text>
            <Text style={styles.modalDescription}>
              กรอกอีเมลที่ใช้สมัคร HomeMatch
              {'\n'}
              เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้คุณ
            </Text>
            <View style={styles.modalInputContainer}>
              <MaterialDesignIcons
                name="email-outline"
                size={20}
                color="#94A3B8"
              />
              <TextInput
                style={styles.modalInput}
                placeholder="example@gmail.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={forgotEmail}
                onChangeText={setForgotEmail}
                editable={!forgotLoading}
              />
            </View>
            <Pressable
              style={[
                styles.modalSubmit,
                forgotLoading &&
                  styles.loginButtonDisabled,
              ]}
              disabled={forgotLoading}
              onPress={sendResetEmail}>
              {forgotLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitText}>
                  ส่งลิงก์รีเซ็ตรหัสผ่าน
                </Text>
              )}
            </Pressable>
            <Pressable
              style={styles.modalCancel}
              disabled={forgotLoading}
              onPress={() => setForgotVisible(false)}>
              <Text style={styles.modalCancelText}>
                ยกเลิก
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};
export default LoginScreen;
// =========================
// STYLES
// =========================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F9D8A',
    backgroundImage:
      'linear-gradient(155deg, #E4FCF7 0%, #B0F2E6 28%, #63DCC8 55%, #22B6A1 78%, #0F9D8A 100%)',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 42,
    paddingBottom: 35,
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIcons: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartLogo: {
    marginHorizontal: -12,
    zIndex: 5,
    marginTop: 7,
  },
  logoTitle: {
    marginTop: 1,
    fontSize: 27,
    fontWeight: '900',
    color: '#075B8C',
    letterSpacing: -1,
  },
  logoTitleGreen: {
    color: '#0F8F7E',
  },
  logoSubtitle: {
    marginTop: -2,
    fontSize: 9,
    fontWeight: '700',
    color: '#075B8C',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 27,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 6,
  },
  authTabs: {
    height: 43,
    flexDirection: 'row',
    padding: 3,
    borderRadius: 8,
    backgroundColor: '#E5E5E5',
    marginBottom: 26,
  },
  authTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  authTabActive: {
    backgroundColor: '#FFFFFF',
  },
  authTabText: {
    fontSize: 11,
    color: '#AAAAAA',
  },
  authTabActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F9D8A',
  },
  sectionLabel: {
    marginBottom: 10,
    fontSize: 10,
    color: '#94A3B8',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },
  roleButton: {
    flex: 1,
    height: 37,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  roleButtonActive: {
    borderColor: '#0F9D8A',
    backgroundColor: '#F0FDFA',
  },
  roleText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  roleTextActive: {
    fontWeight: '700',
    color: '#0F9D8A',
  },
  inputContainer: {
    height: 45,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    borderRadius: 8,
    backgroundColor: '#F0F0F4',
  },
  input: {
    flex: 1,
    marginLeft: 9,
    paddingVertical: 0,
    fontSize: 11,
    color: '#1E293B',
  },
  eyeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRow: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkbox: {
    width: 17,
    height: 17,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: '#0F9D8A',
    backgroundColor: '#0F9D8A',
  },
  rememberText: {
    fontSize: 9,
    color: '#94A3B8',
  },
  forgotText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0F9D8A',
  },
  agreementRow: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  agreementText: {
    flex: 1,
    fontSize: 8,
    lineHeight: 12,
    color: '#94A3B8',
  },
  loginButton: {
    height: 45,
    marginTop: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0FB39F',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  orContainer: {
    marginVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  orText: {
    marginHorizontal: 10,
    fontSize: 8,
    color: '#A1A1AA',
  },
  googleButton: {
    height: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  googleIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 17,
    fontWeight: '900',
    color: '#4285F4',
  },
  googleText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#334155',
  },
  footerText: {
    marginTop: 17,
    fontSize: 7,
    textAlign: 'center',
    color: '#A1A1AA',
  },
  guestButton: {
    marginTop: 18,
    paddingVertical: 8,
  },
  guestText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  // FORGOT PASSWORD MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E6FAF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#075B8C',
  },
  modalDescription: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 21,
    color: '#64748B',
    textAlign: 'center',
  },
  modalInputContainer: {
    width: '100%',
    height: 48,
    marginTop: 22,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  modalInput: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  modalSubmit: {
    width: '100%',
    height: 48,
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: '#0F9D8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalCancel: {
    paddingVertical: 14,
    marginTop: 5,
  },
  modalCancelText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
