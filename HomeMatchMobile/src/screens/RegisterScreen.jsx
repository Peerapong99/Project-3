
import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import {
  registerBuyer,
  loginGoogleBuyer,
} from '../services/authService';

// ==========================================
// GOOGLE CONFIG
// ==========================================

// เปลี่ยนเป็น Web Client ID จริงจาก Google Cloud
// ต้องเป็น Web OAuth Client ID ไม่ใช่ Android Client ID
const GOOGLE_WEB_CLIENT_ID =
  '357363341863-c5p0bksj0mjaejan5jeboiu2sm3l7ff4.apps.googleusercontent.com';

// ==========================================
// REGISTER SCREEN
// ==========================================

const RegisterScreen = ({navigation}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  // ==========================================
  // GOOGLE INITIALIZATION
  // ==========================================

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);

  // ==========================================
  // NAVIGATE AFTER REGISTER
  // ==========================================

  const goToProfile = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'MainTabs',
          params: {
            screen: 'Profile',
          },
        },
      ],
    });
  };

  // ==========================================
  // REGISTER WITH EMAIL
  // ==========================================

  const handleRegister = async () => {
    if (loading) {
      return;
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    // CHECK EMPTY
    if (
      !cleanName ||
      !cleanEmail ||
      !cleanPhone ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert(
        'กรุณากรอกข้อมูล',
        'กรุณากรอกข้อมูลให้ครบทุกช่อง',
      );
      return;
    }

    // CHECK EMAIL
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      Alert.alert(
        'อีเมลไม่ถูกต้อง',
        'กรุณากรอกอีเมลให้ถูกต้อง',
      );
      return;
    }

    // CHECK PHONE
    if (!/^[0-9]{9,10}$/.test(cleanPhone)) {
      Alert.alert(
        'เบอร์โทรศัพท์ไม่ถูกต้อง',
        'กรุณากรอกเบอร์โทรศัพท์ 9-10 หลัก',
      );
      return;
    }

    // CHECK PASSWORD
    if (password.length < 8) {
      Alert.alert(
        'รหัสผ่านสั้นเกินไป',
        'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
      );
      return;
    }

    // CONFIRM PASSWORD
    if (password !== confirmPassword) {
      Alert.alert(
        'รหัสผ่านไม่ตรงกัน',
        'กรุณาตรวจสอบรหัสผ่านและยืนยันรหัสผ่านอีกครั้ง',
      );
      return;
    }

    // CHECK CONSENT
    if (!acceptTerms) {
      Alert.alert(
        'กรุณาให้ความยินยอม',
        'กรุณาอ่านรายละเอียดและยินยอมให้ HomeMatch จัดเก็บและใช้ข้อมูลที่จำเป็นก่อนสมัครสมาชิก',
      );
      return;
    }

    // CALL API
    try {
      setLoading(true);

      const result = await registerBuyer({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        password,
      });

      console.log('REGISTER RESULT:', {
        success: true,
        role: result?.user?.role,
      });

      Alert.alert(
        'สมัครสมาชิกสำเร็จ',
        'ยินดีต้อนรับสู่ HomeMatch',
        [
          {
            text: 'เริ่มใช้งาน',
            onPress: goToProfile,
          },
        ],
      );
    } catch (error) {
      console.log(
        'REGISTER ERROR:',
        error?.response?.data || error?.message,
      );

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่';

      Alert.alert(
        'สมัครสมาชิกไม่สำเร็จ',
        message,
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // REGISTER / LOGIN WITH GOOGLE
  // ==========================================

  const handleGoogleRegister = async () => {
    if (loading) {
      return;
    }

    if (!acceptTerms) {
      Alert.alert(
        'กรุณาให้ความยินยอม',
        'กรุณาอ่านและยอมรับนโยบายความเป็นส่วนตัวก่อนสมัครสมาชิกด้วย Google',
      );
      return;
    }

    if (
      !GOOGLE_WEB_CLIENT_ID ||
      GOOGLE_WEB_CLIENT_ID.startsWith('YOUR_')
    ) {
      Alert.alert(
        'ยังไม่ได้ตั้งค่า Google',
        'กรุณาใส่ Web Client ID จริงจาก Google Cloud ใน RegisterScreen.jsx',
      );
      return;
    }

    try {
      setLoading(true);

      // ตรวจสอบ Google Play Services
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // เปิดหน้าเลือกบัญชี Google
      const googleResponse = await GoogleSignin.signIn();

      if (!isSuccessResponse(googleResponse)) {
        return;
      }

      // รับ ID Token
      let idToken = googleResponse.data?.idToken;

      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens?.idToken;
      }

      if (!idToken) {
        throw new Error(
          'ไม่สามารถรับ Google ID Token ได้',
        );
      }

      // ส่ง Token ให้ Backend
      const result = await loginGoogleBuyer(idToken);

      if (
        !result?.token ||
        result?.user?.role !== 'buyer'
      ) {
        throw new Error(
          'ข้อมูลบัญชีผู้ซื้อไม่ถูกต้อง',
        );
      }

      console.log(
        'GOOGLE REGISTER SUCCESS:',
        result.user?.role,
      );

      Alert.alert(
        'สำเร็จ',
        'เข้าสู่ HomeMatch ด้วย Google เรียบร้อยแล้ว',
        [
          {
            text: 'เริ่มใช้งาน',
            onPress: goToProfile,
          },
        ],
      );
    } catch (error) {
      console.log(
        'GOOGLE REGISTER ERROR:',
        error?.response?.data || error,
      );

      if (
        isErrorWithCode(error) &&
        error.code === statusCodes.SIGN_IN_CANCELLED
      ) {
        return;
      }

      if (
        isErrorWithCode(error) &&
        error.code === statusCodes.IN_PROGRESS
      ) {
        return;
      }

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'ไม่สามารถสมัครสมาชิกด้วย Google ได้';

      Alert.alert(
        'สมัครสมาชิกด้วย Google ไม่สำเร็จ',
        message,
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}>

          {/* LOGO */}
          <View style={styles.logoSection}>
            <View style={styles.logoIcons}>
              <MaterialDesignIcons
                name="home-roof"
                size={44}
                color="#075B8C"
              />

              <View style={styles.heartLogo}>
                <MaterialDesignIcons
                  name="heart-outline"
                  size={34}
                  color="#0F9D8A"
                />
              </View>

              <MaterialDesignIcons
                name="home-roof"
                size={44}
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

          {/* CARD */}
          <View style={styles.card}>

            {/* LOGIN / REGISTER TABS */}
            <View style={styles.authTabs}>
              <Pressable
                style={styles.authTab}
                onPress={() =>
                  navigation.navigate('Login')
                }>
                <Text style={styles.authTabText}>
                  เข้าสู่ระบบ
                </Text>
              </Pressable>

              <View
                style={[
                  styles.authTab,
                  styles.authTabActive,
                ]}>
                <Text style={styles.authTabActiveText}>
                  สมัครสมาชิก
                </Text>
              </View>
            </View>

            {/* TITLE */}
            <Text style={styles.title}>
              สร้างบัญชีผู้ซื้อ
            </Text>

            <Text style={styles.subtitle}>
              สมัครสมาชิกเพื่อค้นหาบ้าน
              บันทึกรายการโปรด และนัดหมายกับผู้ขาย
            </Text>

            {/* NAME */}
            <Text style={styles.label}>
              ชื่อ - นามสกุล
            </Text>

            <View style={styles.inputContainer}>
              <MaterialDesignIcons
                name="account-outline"
                size={19}
                color="#94A3B8"
              />

              <TextInput
                style={styles.input}
                placeholder="ชื่อ - นามสกุล"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* EMAIL */}
            <Text style={styles.label}>
              อีเมล
            </Text>

            <View style={styles.inputContainer}>
              <MaterialDesignIcons
                name="email-outline"
                size={19}
                color="#94A3B8"
              />

              <TextInput
                style={styles.input}
                placeholder="example@email.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* PHONE */}
            <Text style={styles.label}>
              เบอร์โทรศัพท์
            </Text>

            <View style={styles.inputContainer}>
              <MaterialDesignIcons
                name="phone-outline"
                size={19}
                color="#94A3B8"
              />

              <TextInput
                style={styles.input}
                placeholder="0812345678"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            {/* PASSWORD */}
            <Text style={styles.label}>
              รหัสผ่าน
            </Text>

            <View style={styles.inputContainer}>
              <MaterialDesignIcons
                name="lock-outline"
                size={19}
                color="#94A3B8"
              />

              <TextInput
                style={styles.input}
                placeholder="อย่างน้อย 8 ตัวอักษร"
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

            {/* CONFIRM PASSWORD */}
            <Text style={styles.label}>
              ยืนยันรหัสผ่าน
            </Text>

            <View style={styles.inputContainer}>
              <MaterialDesignIcons
                name="lock-check-outline"
                size={19}
                color="#94A3B8"
              />

              <TextInput
                style={styles.input}
                placeholder="กรอกรหัสผ่านอีกครั้ง"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <Pressable
                style={styles.eyeButton}
                onPress={() =>
                  setShowConfirmPassword(
                    value => !value,
                  )
                }>
                <MaterialDesignIcons
                  name={
                    showConfirmPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={19}
                  color="#94A3B8"
                />
              </Pressable>
            </View>

            {/* CONSENT */}
            <View style={styles.consentBox}>
              <View style={styles.consentHeader}>
                <MaterialDesignIcons
                  name="shield-check-outline"
                  size={20}
                  color="#0F9D8A"
                />

                <Text style={styles.consentTitle}>
                  ความยินยอมในการจัดเก็บข้อมูล
                </Text>
              </View>

              <Text style={styles.consentDescription}>
                HomeMatch จะจัดเก็บข้อมูลที่จำเป็น เช่น
                ชื่อ อีเมล เบอร์โทรศัพท์ และข้อมูลการใช้งาน
                เพื่อใช้ในการสมัครสมาชิก เข้าสู่ระบบ
                และให้บริการภายในแอป
              </Text>

              {/* PRIVACY POLICY */}
              <Pressable
                style={styles.readMoreButton}
                onPress={() =>
                  navigation.navigate('PrivacyPolicy')
                }>
                <View style={styles.readMoreLeft}>
                  <MaterialDesignIcons
                    name="file-document-outline"
                    size={17}
                    color="#0F9D8A"
                  />

                  <Text style={styles.readMoreText}>
                    อ่านรายละเอียดเพิ่มเติม
                  </Text>
                </View>

                <MaterialDesignIcons
                  name="chevron-right"
                  size={19}
                  color="#0F9D8A"
                />
              </Pressable>

              {/* CHECKBOX */}
              <Pressable
                style={styles.termsContainer}
                onPress={() =>
                  setAcceptTerms(value => !value)
                }>
                <View
                  style={[
                    styles.checkbox,
                    acceptTerms &&
                      styles.checkboxActive,
                  ]}>
                  {acceptTerms && (
                    <MaterialDesignIcons
                      name="check"
                      size={13}
                      color="#FFFFFF"
                    />
                  )}
                </View>

                <View style={styles.termsContent}>
                  <Text style={styles.termsText}>
                    ฉันได้อ่านรายละเอียดและยินยอมให้
                    HomeMatch จัดเก็บและใช้ข้อมูลของฉัน
                    เพื่อให้บริการภายในแอป
                  </Text>

                  <Text style={styles.privacyHint}>
                    การสมัครสมาชิกถือว่าคุณยอมรับ
                    ข้อกำหนดการใช้งาน
                    และนโยบายความเป็นส่วนตัว
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* REGISTER BUTTON */}
            <Pressable
              style={[
                styles.registerButton,
                loading && styles.buttonDisabled,
                !acceptTerms &&
                  styles.registerButtonInactive,
              ]}
              disabled={loading}
              onPress={handleRegister}>

              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <MaterialDesignIcons
                    name="account-plus-outline"
                    size={19}
                    color="#FFFFFF"
                  />

                  <Text style={styles.registerButtonText}>
                    สมัครสมาชิก
                  </Text>
                </>
              )}
            </Pressable>

            {/* OR */}
            <View style={styles.orContainer}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>
                หรือ
              </Text>
              <View style={styles.orLine} />
            </View>

            {/* GOOGLE REGISTER */}
            <Pressable
              style={[
                styles.googleButton,
                loading && styles.buttonDisabled,
              ]}
              disabled={loading}
              onPress={handleGoogleRegister}>

              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#4285F4"
                />
              ) : (
                <>
                  <Text style={styles.googleG}>
                    G
                  </Text>

                  <Text style={styles.googleText}>
                    สมัครสมาชิกด้วย Google
                  </Text>
                </>
              )}
            </Pressable>

            {/* LOGIN LINK */}
            <View style={styles.loginRow}>
              <Text style={styles.loginQuestion}>
                มีบัญชีอยู่แล้ว?
              </Text>

              <Pressable
                onPress={() =>
                  navigation.navigate('Login')
                }>
                <Text style={styles.loginLink}>
                  เข้าสู่ระบบ
                </Text>
              </Pressable>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RegisterScreen;

// ==========================================
// STYLES
// ==========================================

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
    paddingTop: 25,
    paddingBottom: 35,
    alignItems: 'center',
  },

  logoSection: {
    alignItems: 'center',
    marginBottom: 18,
  },

  logoIcons: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heartLogo: {
    marginHorizontal: -11,
    zIndex: 5,
    marginTop: 6,
  },

  logoTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -1,
    color: '#075B8C',
  },

  logoTitleGreen: {
    color: '#0F8F7E',
  },

  logoSubtitle: {
    marginTop: -2,
    fontSize: 8,
    fontWeight: '700',
    color: '#075B8C',
  },

  card: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 24,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
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
    marginBottom: 19,
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

  title: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    color: '#0F172A',
  },

  subtitle: {
    marginTop: 5,
    marginBottom: 17,
    paddingHorizontal: 10,
    fontSize: 9,
    lineHeight: 14,
    textAlign: 'center',
    color: '#94A3B8',
  },

  label: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
  },

  inputContainer: {
    height: 43,
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

  consentBox: {
    marginTop: 16,
    paddingHorizontal: 13,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDF3EF',
    backgroundColor: '#F6FFFD',
  },

  consentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },

  consentTitle: {
    marginLeft: 7,
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
  },

  consentDescription: {
    fontSize: 8,
    lineHeight: 13,
    color: '#64748B',
  },

  readMoreButton: {
    height: 40,
    marginTop: 11,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    backgroundColor: '#ECFDF5',
  },

  readMoreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  readMoreText: {
    marginLeft: 7,
    fontSize: 9,
    fontWeight: '800',
    color: '#0F766E',
  },

  termsContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  checkbox: {
    width: 18,
    height: 18,
    marginTop: 1,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  checkboxActive: {
    borderColor: '#0F9D8A',
    backgroundColor: '#0F9D8A',
  },

  termsContent: {
    flex: 1,
    marginLeft: 8,
  },

  termsText: {
    fontSize: 8,
    lineHeight: 13,
    color: '#475569',
  },

  privacyHint: {
    marginTop: 4,
    fontSize: 7,
    lineHeight: 11,
    color: '#94A3B8',
  },

  registerButton: {
    height: 45,
    marginTop: 18,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#0FB39F',
  },

  registerButtonInactive: {
    opacity: 0.65,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  registerButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  orContainer: {
    marginVertical: 16,
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

  loginRow: {
    marginTop: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  loginQuestion: {
    fontSize: 9,
    color: '#94A3B8',
  },

  loginLink: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0F9D8A',
  },
});
