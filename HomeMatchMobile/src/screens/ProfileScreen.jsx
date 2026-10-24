
import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';
import {launchImageLibrary} from 'react-native-image-picker';

import api, {API_ORIGIN} from '../services/api';

import {
  getCurrentUser,
  getBuyerProfile,
  getStoredUser,
  getToken,
  logoutUser,
} from '../services/authService';

// ==========================================
// PROFILE SCREEN
// ==========================================

const ProfileScreen = ({navigation}) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // ==========================================
  // ROOT NAVIGATION
  // ==========================================

  const getRootNavigation = () => {
    return (
      navigation.getParent()?.getParent() ||
      navigation.getParent() ||
      navigation
    );
  };

  const navigateRoot = (screen, params) => {
    getRootNavigation().navigate(screen, params);
  };

  // ==========================================
  // LOAD PROFILE
  // ==========================================

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      const token = await getToken();

      if (!token) {
        setUser(null);
        return;
      }

      const localUser = await getStoredUser();

      if (localUser) {
        setUser(localUser);
      }

      let result;

      if (localUser?.role === 'buyer') {
        result = await getBuyerProfile();
      } else {
        result = await getCurrentUser();
      }

      if (result?.user) {
        setUser(result.user);
      }
    } catch (error) {
      console.log(
        'PROFILE ERROR:',
        error?.response?.data ||
          error?.message ||
          error,
      );

      if (error?.response?.status === 401) {
        try {
          await logoutUser();
        } catch (logoutError) {
          console.log(
            'AUTO LOGOUT ERROR:',
            logoutError,
          );
        }

        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  // ==========================================
  // CHANGE PROFILE IMAGE
  // ==========================================

  const handleChangeProfileImage = async () => {
    if (uploadingImage) {
      return;
    }

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.8,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert(
          'เกิดข้อผิดพลาด',
          result.errorMessage ||
            'ไม่สามารถเลือกรูปได้',
        );
        return;
      }

      const selectedImage = result.assets?.[0];

      if (!selectedImage?.uri) {
        Alert.alert(
          'เกิดข้อผิดพลาด',
          'ไม่พบรูปภาพที่เลือก',
        );
        return;
      }

      setUploadingImage(true);

      const formData = new FormData();

      formData.append('profileImage', {
        uri: selectedImage.uri,
        type: selectedImage.type || 'image/jpeg',
        name:
          selectedImage.fileName ||
          `profile-${Date.now()}.jpg`,
      });

      const response = await api.post(
        '/uploads/profile',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      const newProfileImage =
        response.data?.profileImage;

      if (!newProfileImage) {
        throw new Error('ไม่พบ URL รูปโปรไฟล์');
      }

      setUser(previousUser => ({
        ...previousUser,
        profileImage: newProfileImage,
      }));

      Alert.alert(
        'สำเร็จ',
        'เปลี่ยนรูปโปรไฟล์เรียบร้อยแล้ว',
      );
    } catch (error) {
      console.log(
        'UPLOAD PROFILE ERROR:',
        error?.response?.data ||
          error?.message ||
          error,
      );

      Alert.alert(
        'เกิดข้อผิดพลาด',
        error?.response?.data?.message ||
          error?.message ||
          'ไม่สามารถเปลี่ยนรูปโปรไฟล์ได้',
      );
    } finally {
      setUploadingImage(false);
    }
  };

  // ==========================================
  // MENU HANDLERS
  // ==========================================

  const handleFavorite = () => {
    navigateRoot('Favorite');
  };

  const handleBuyerAppointment = () => {
    navigateRoot('BuyerAppointment');
  };

  const handleMessages = () => {
    navigation.navigate('Messages');
  };

  const handleSellerAppointment = () => {
    navigation.navigate('Appointment');
  };

  const handlePrivacy = () => {
    navigateRoot('PrivacyPolicy');
  };

  // ==========================================
  // LOGOUT (DEBUG VERSION)
  // ==========================================

  const performLogout = async () => {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);

      console.log('LOGOUT STEP 1: START');
      console.log(
        'logoutUser type:',
        typeof logoutUser,
      );

      if (typeof logoutUser !== 'function') {
        throw new Error(
          'ไม่พบฟังก์ชัน logoutUser ใน authService.js',
        );
      }

      console.log('LOGOUT STEP 2: CLEAR AUTH');

      await logoutUser();

      console.log('LOGOUT STEP 3: CLEAR STATE');

      setUser(null);

      console.log('LOGOUT STEP 4: SUCCESS');

      Alert.alert(
        'สำเร็จ',
        'ออกจากระบบเรียบร้อยแล้ว',
      );
    } catch (error) {
      console.error('LOGOUT FAILED:', error);

      Alert.alert(
        'เกิดข้อผิดพลาด',
        error?.message ||
          'ไม่สามารถออกจากระบบได้',
      );
    } finally {
      setLoggingOut(false);
    }
  };

  const handleLogout = () => {
    if (loggingOut) {
      return;
    }

    Alert.alert(
      'ออกจากระบบ',
      'คุณต้องการออกจากระบบหรือไม่?',
      [
        {
          text: 'ยกเลิก',
          style: 'cancel',
        },
        {
          text: 'ออกจากระบบ',
          style: 'destructive',
          onPress: performLogout,
        },
      ],
      {cancelable: true},
    );
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#0F9D8A"
        />
        <Text style={styles.loadingText}>
          กำลังโหลดข้อมูล...
        </Text>
      </SafeAreaView>
    );
  }

  // ==========================================
  // GUEST PROFILE
  // ==========================================

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.guestContainer}>
          <View style={styles.guestIcon}>
            <MaterialDesignIcons
              name="account-outline"
              size={60}
              color="#0F9D8A"
            />
          </View>

          <Text style={styles.guestTitle}>
            โปรไฟล์ของคุณ
          </Text>

          <Text style={styles.guestDescription}>
            เข้าสู่ระบบเพื่อบันทึกรายการโปรด
            {'\n'}
            นัดหมายเข้าชมบ้าน
            {'\n'}
            และพูดคุยกับผู้ขาย
          </Text>

          <Pressable
            style={styles.loginButton}
            onPress={() => navigateRoot('Login')}>
            <MaterialDesignIcons
              name="login"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.loginButtonText}>
              เข้าสู่ระบบ
            </Text>
          </Pressable>

          <Pressable
            style={styles.registerButton}
            onPress={() => navigateRoot('Register')}>
            <Text style={styles.registerText}>
              สมัครสมาชิกใหม่
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // USER INFORMATION
  // ==========================================

  const isBuyer = user?.role === 'buyer';
  const isSeller = user?.role === 'seller';

  const profileImageUrl = user?.profileImage
    ? user.profileImage.startsWith('http')
      ? user.profileImage
      : `${API_ORIGIN}${user.profileImage}`
    : null;

  // ==========================================
  // PROFILE UI
  // ==========================================

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            โปรไฟล์
          </Text>
        </View>

        {/* PROFILE CARD */}
        <View style={styles.profileCard}>
          <Pressable
            style={styles.avatarWrapper}
            onPress={handleChangeProfileImage}
            disabled={uploadingImage}>

            <View style={styles.avatar}>
              {profileImageUrl ? (
                <Image
                  source={{uri: profileImageUrl}}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <MaterialDesignIcons
                  name={
                    isSeller
                      ? 'account-tie'
                      : 'account'
                  }
                  size={48}
                  color="#FFFFFF"
                />
              )}
            </View>

            <View style={styles.cameraButton}>
              {uploadingImage ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <MaterialDesignIcons
                  name="camera"
                  size={17}
                  color="#FFFFFF"
                />
              )}
            </View>
          </Pressable>

          <Text style={styles.name}>
            {user.name || '-'}
          </Text>

          <View
            style={[
              styles.roleBadge,
              isSeller && styles.sellerBadge,
            ]}>
            <MaterialDesignIcons
              name={
                isSeller
                  ? 'home-account'
                  : 'home-search-outline'
              }
              size={14}
              color={
                isSeller ? '#B45309' : '#0F766E'
              }
            />

            <Text
              style={[
                styles.roleBadgeText,
                isSeller && styles.sellerBadgeText,
              ]}>
              {isSeller ? 'ผู้ขาย' : 'ผู้ซื้อ'}
            </Text>
          </View>

          <Pressable
            style={styles.changePhotoButton}
            onPress={handleChangeProfileImage}
            disabled={uploadingImage}>
            <MaterialDesignIcons
              name="image-edit-outline"
              size={16}
              color="#0F766E"
            />
            <Text style={styles.changePhotoText}>
              {uploadingImage
                ? 'กำลังอัปโหลด...'
                : profileImageUrl
                ? 'เปลี่ยนรูปโปรไฟล์'
                : 'เพิ่มรูปโปรไฟล์'}
            </Text>
          </Pressable>
        </View>

        {/* PERSONAL INFO */}
        <Text style={styles.sectionTitle}>
          ข้อมูลส่วนตัว
        </Text>

        <View style={styles.infoCard}>
          <InfoRow
            icon="account-outline"
            title="ชื่อ"
            value={user.name || '-'}
          />

          <View style={styles.divider} />

          <InfoRow
            icon="email-outline"
            title="อีเมล"
            value={user.email || '-'}
          />

          <View style={styles.divider} />

          <InfoRow
            icon="phone-outline"
            title="เบอร์โทรศัพท์"
            value={user.phone || '-'}
          />
        </View>

        {/* BUYER MENU */}
        {isBuyer && (
          <>
            <Text style={styles.sectionTitle}>
              เมนูของฉัน
            </Text>

            <View style={styles.menuCard}>
              <MenuRow
                icon="heart-outline"
                title="รายการโปรด"
                subtitle="บ้านที่คุณบันทึกไว้"
                onPress={handleFavorite}
              />

              <View style={styles.divider} />

              <MenuRow
                icon="calendar-outline"
                title="การนัดหมาย"
                subtitle="ดูสถานะการนัดดูบ้าน"
                onPress={handleBuyerAppointment}
              />

              <View style={styles.divider} />

              <MenuRow
                icon="message-text-outline"
                title="ข้อความ"
                subtitle="พูดคุยกับผู้ขาย"
                onPress={handleMessages}
              />
            </View>
          </>
        )}

        {/* SELLER MENU */}
        {isSeller && (
          <>
            <Text style={styles.sectionTitle}>
              การจัดการ
            </Text>

            <View style={styles.menuCard}>
              <MenuRow
                icon="message-text-outline"
                title="ข้อความ"
                subtitle="ข้อความจากผู้ซื้อ"
                onPress={handleMessages}
              />

              <View style={styles.divider} />

              <MenuRow
                icon="calendar-check-outline"
                title="คำขอนัดหมาย"
                subtitle="จัดการคำขอนัดดูบ้าน"
                onPress={handleSellerAppointment}
              />
            </View>
          </>
        )}

        {/* ACCOUNT */}
        <Text style={styles.sectionTitle}>
          บัญชี
        </Text>

        <View style={styles.menuCard}>
          <MenuRow
            icon="shield-lock-outline"
            title="นโยบายความเป็นส่วนตัว"
            onPress={handlePrivacy}
          />
        </View>

        {/* LOGOUT */}
        <Pressable
          style={[
            styles.logoutButton,
            loggingOut && styles.logoutButtonDisabled,
          ]}
          disabled={loggingOut}
          onPress={handleLogout}>

          {loggingOut ? (
            <ActivityIndicator
              size="small"
              color="#EF4444"
            />
          ) : (
            <>
              <MaterialDesignIcons
                name="logout"
                size={20}
                color="#EF4444"
              />
              <Text style={styles.logoutText}>
                ออกจากระบบ
              </Text>
            </>
          )}
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
};

// ==========================================
// INFO ROW
// ==========================================

const InfoRow = ({icon, title, value}) => {
  return (
    <View style={styles.infoRow}>
      <View style={styles.rowIcon}>
        <MaterialDesignIcons
          name={icon}
          size={21}
          color="#0F9D8A"
        />
      </View>

      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>
          {title}
        </Text>
        <Text style={styles.rowValue}>
          {value}
        </Text>
      </View>
    </View>
  );
};

// ==========================================
// MENU ROW
// ==========================================

const MenuRow = ({
  icon,
  title,
  subtitle,
  onPress,
}) => {
  return (
    <Pressable
      style={({pressed}) => [
        styles.menuRow,
        pressed && styles.menuRowPressed,
      ]}
      onPress={onPress}>

      <View style={styles.rowIcon}>
        <MaterialDesignIcons
          name={icon}
          size={21}
          color="#0F9D8A"
        />
      </View>

      <View style={styles.menuTextContainer}>
        <Text style={styles.menuTitle}>
          {title}
        </Text>

        {subtitle ? (
          <Text style={styles.menuSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <MaterialDesignIcons
        name="chevron-right"
        size={23}
        color="#94A3B8"
      />
    </Pressable>
  );
};

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },

  guestContainer: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  guestIcon: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },

  guestTitle: {
    marginTop: 22,
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },

  guestDescription: {
    marginTop: 9,
    maxWidth: 300,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    color: '#64748B',
  },

  loginButton: {
    width: '100%',
    height: 52,
    marginTop: 28,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F9D8A',
  },

  loginButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  registerButton: {
    marginTop: 16,
    padding: 8,
  },

  registerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F9D8A',
  },

  scrollContent: {
    paddingBottom: 40,
  },

  header: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
  },

  profileCard: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: '#FFFFFF',
    marginBottom: 18,
  },

  avatarWrapper: {
    position: 'relative',
  },

  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F9D8A',
    overflow: 'hidden',
  },

  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
  },

  cameraButton: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F766E',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  name: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },

  changePhotoButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F0FDFA',
  },

  changePhotoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
  },

  roleBadge: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
  },

  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },

  sellerBadge: {
    backgroundColor: '#FFFBEB',
  },

  sellerBadgeText: {
    color: '#B45309',
  },

  sectionTitle: {
    marginHorizontal: 18,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
  },

  infoCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 15,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  infoRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
  },

  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
  },

  rowContent: {
    flex: 1,
    marginLeft: 12,
  },

  rowTitle: {
    fontSize: 11,
    color: '#94A3B8',
  },

  rowValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },

  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },

  menuCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 15,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  menuRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
  },

  menuRowPressed: {
    opacity: 0.6,
  },

  menuTextContainer: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 10,
  },

  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },

  menuSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: '#94A3B8',
  },

  logoutButton: {
    height: 52,
    marginHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  logoutButtonDisabled: {
    opacity: 0.6,
  },

  logoutText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
});

export default ProfileScreen;
