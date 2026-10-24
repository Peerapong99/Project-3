
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';

import { createAppointment } from '../services/appointmentService';
import { getToken } from '../services/authService';

const TIMES = [
  '09:00',
  '10:00',
  '11:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
];

const CreateAppointmentScreen = ({ route, navigation }) => {
  const { propertyId, propertyTitle } = route.params || {};
  const insets = useSafeAreaInsets();

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingLogin, setCheckingLogin] = useState(true);

  // =========================================
  // NAVIGATION
  // =========================================

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs', {
        screen: 'Home',
      });
    }
  }, [navigation]);

  // =========================================
  // CHECK LOGIN
  // =========================================

  useEffect(() => {
    let mounted = true;

    const checkLogin = async () => {
      try {
        const token = await getToken();

        if (!mounted) return;

        if (!token) {
          setCheckingLogin(false);

          Alert.alert(
            'กรุณาเข้าสู่ระบบ',
            'คุณต้องเข้าสู่ระบบก่อนนัดหมายเข้าชมบ้าน',
            [
              {
                text: 'ยกเลิก',
                style: 'cancel',
                onPress: handleBack,
              },
              {
                text: 'เข้าสู่ระบบ',
                onPress: () => navigation.replace('Login'),
              },
            ],
            { cancelable: false },
          );

          return;
        }

        setCheckingLogin(false);
      } catch (error) {
        console.log('Check Login Error:', error);

        if (mounted) {
          setCheckingLogin(false);

          Alert.alert(
            'เกิดข้อผิดพลาด',
            'ไม่สามารถตรวจสอบการเข้าสู่ระบบได้',
            [
              {
                text: 'ตกลง',
                onPress: handleBack,
              },
            ],
          );
        }
      }
    };

    checkLogin();

    return () => {
      mounted = false;
    };
  }, [navigation, handleBack]);

  // =========================================
  // CREATE DATE LIST
  // =========================================

  const dates = useMemo(() => {
    const result = [];
    const today = new Date();

    for (let i = 1; i <= 14; i += 1) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      result.push({
        value: `${year}-${month}-${day}`,
        dayName: date.toLocaleDateString('th-TH', {
          weekday: 'short',
        }),
        displayDate: date.toLocaleDateString('th-TH', {
          day: 'numeric',
          month: 'short',
        }),
      });
    }

    return result;
  }, []);

  // =========================================
  // SUBMIT APPOINTMENT
  // =========================================

  const handleSubmit = async () => {
    if (loading) return;

    if (!propertyId) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่พบข้อมูลบ้าน');
      return;
    }

    if (!selectedDate) {
      Alert.alert(
        'กรุณาเลือกวันที่',
        'เลือกวันที่ที่ต้องการเข้าชมบ้าน',
      );
      return;
    }

    if (!selectedTime) {
      Alert.alert(
        'กรุณาเลือกเวลา',
        'เลือกเวลาที่ต้องการเข้าชมบ้าน',
      );
      return;
    }

    try {
      setLoading(true);

      const result = await createAppointment({
        propertyId,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
        message: message.trim(),
      });

      Alert.alert(
        'ส่งคำขอนัดหมายแล้ว',
        result?.message ||
          'ระบบได้ส่งคำขอนัดหมายไปยังผู้ขายแล้ว',
        [
          {
            text: 'ดูรายการนัดหมาย',
            onPress: () => {
              navigation.reset({
                index: 1,
                routes: [
                  { name: 'MainTabs' },
                  { name: 'BuyerAppointment' },
                ],
              });
            },
          },
        ],
        { cancelable: false },
      );
    } catch (error) {
      console.log(
        'Create Appointment Error:',
        error?.response?.data || error,
      );

      if (
        error?.message === 'NOT_LOGGED_IN' ||
        error?.response?.status === 401
      ) {
        Alert.alert(
          'กรุณาเข้าสู่ระบบ',
          'คุณต้องเข้าสู่ระบบก่อนนัดหมาย',
          [
            {
              text: 'เข้าสู่ระบบ',
              onPress: () => navigation.replace('Login'),
            },
          ],
        );
        return;
      }

      Alert.alert(
        'นัดหมายไม่สำเร็จ',
        error?.response?.data?.message ||
          'ไม่สามารถสร้างนัดหมายได้ กรุณาลองใหม่อีกครั้ง',
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================================
  // LOADING
  // =========================================

  if (checkingLogin) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F9D8A" />
        <Text style={styles.loadingText}>
          กำลังตรวจสอบข้อมูล...
        </Text>
      </View>
    );
  }

  // =========================================
  // UI
  // =========================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* HEADER */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 14,
          },
        ]}
      >
        <Pressable
          style={styles.backButton}
          onPress={handleBack}
          hitSlop={10}
        >
          <MaterialDesignIcons
            name="chevron-left"
            size={30}
            color="#334155"
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          นัดหมายเข้าชมบ้าน
        </Text>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* PROPERTY */}
        <View style={styles.propertyCard}>
          <View style={styles.propertyIcon}>
            <MaterialDesignIcons
              name="home-outline"
              size={28}
              color="#0F9D8A"
            />
          </View>

          <View style={styles.propertyInfo}>
            <Text style={styles.propertyLabel}>
              บ้านที่ต้องการเข้าชม
            </Text>

            <Text
              style={styles.propertyTitle}
              numberOfLines={2}
            >
              {propertyTitle || 'HomeMatch Property'}
            </Text>
          </View>
        </View>

        {/* INFO */}
        <View style={styles.infoBox}>
          <MaterialDesignIcons
            name="information-outline"
            size={20}
            color="#0F766E"
          />

          <Text style={styles.infoText}>
            เลือกวันและเวลาที่สะดวก จากนั้นระบบจะส่งคำขอไปยังผู้ขาย
            เพื่อยืนยันการนัดหมาย
          </Text>
        </View>

        {/* DATE */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <MaterialDesignIcons
              name="calendar-month-outline"
              size={21}
              color="#0F9D8A"
            />
            <Text style={styles.sectionTitle}>
              เลือกวันที่
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateList}
          >
            {dates.map(date => {
              const selected = selectedDate === date.value;

              return (
                <Pressable
                  key={date.value}
                  style={[
                    styles.dateCard,
                    selected && styles.dateCardSelected,
                  ]}
                  onPress={() => setSelectedDate(date.value)}
                >
                  <Text
                    style={[
                      styles.dateDay,
                      selected && styles.dateTextSelected,
                    ]}
                  >
                    {date.dayName}
                  </Text>

                  <Text
                    style={[
                      styles.dateValue,
                      selected && styles.dateTextSelected,
                    ]}
                  >
                    {date.displayDate}
                  </Text>

                  {selected && (
                    <MaterialDesignIcons
                      name="check-circle"
                      size={17}
                      color="#FFFFFF"
                      style={styles.dateCheck}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* TIME */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <MaterialDesignIcons
              name="clock-outline"
              size={21}
              color="#0F9D8A"
            />
            <Text style={styles.sectionTitle}>
              เลือกเวลา
            </Text>
          </View>

          <View style={styles.timeGrid}>
            {TIMES.map(time => {
              const selected = selectedTime === time;

              return (
                <Pressable
                  key={time}
                  style={[
                    styles.timeButton,
                    selected && styles.timeButtonSelected,
                  ]}
                  onPress={() => setSelectedTime(time)}
                >
                  <MaterialDesignIcons
                    name="clock-outline"
                    size={16}
                    color={
                      selected ? '#FFFFFF' : '#64748B'
                    }
                  />

                  <Text
                    style={[
                      styles.timeText,
                      selected && styles.timeTextSelected,
                    ]}
                  >
                    {time}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* MESSAGE */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <MaterialDesignIcons
              name="message-text-outline"
              size={21}
              color="#0F9D8A"
            />
            <Text style={styles.sectionTitle}>
              ข้อความถึงผู้ขาย
            </Text>
          </View>

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="เช่น ต้องการนัดเข้าชมบ้านครับ"
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={500}
            textAlignVertical="top"
            style={styles.messageInput}
          />

          <Text style={styles.characterCount}>
            {message.length}/500
          </Text>
        </View>

        {/* SUMMARY */}
        {(selectedDate || selectedTime) && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>
              สรุปการนัดหมาย
            </Text>

            <View style={styles.summaryRow}>
              <MaterialDesignIcons
                name="calendar-outline"
                size={18}
                color="#64748B"
              />
              <Text style={styles.summaryText}>
                {selectedDate || 'ยังไม่ได้เลือกวันที่'}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <MaterialDesignIcons
                name="clock-outline"
                size={18}
                color="#64748B"
              />
              <Text style={styles.summaryText}>
                {selectedTime
                  ? `${selectedTime} น.`
                  : 'ยังไม่ได้เลือกเวลา'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* BOTTOM BUTTON */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 18),
          },
        ]}
      >
        <Pressable
          style={[
            styles.submitButton,
            loading && styles.submitButtonDisabled,
          ]}
          disabled={loading}
          onPress={handleSubmit}
        >
          {loading ? (
            <ActivityIndicator
              color="#FFFFFF"
              size="small"
            />
          ) : (
            <>
              <MaterialDesignIcons
                name="calendar-check-outline"
                size={21}
                color="#FFFFFF"
              />
              <Text style={styles.submitButtonText}>
                ยืนยันนัดหมาย
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

export default CreateAppointmentScreen;

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
    color: '#64748B',
    fontSize: 13,
  },

  // HEADER
  header: {
    minHeight: 90,
    paddingHorizontal: 16,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#1E293B',
    fontSize: 17,
    fontWeight: '800',
  },

  headerPlaceholder: {
    width: 42,
  },

  // CONTENT
  scrollContent: {
    padding: 20,
    paddingBottom: 140,
  },

  propertyCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },

  propertyIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  propertyInfo: {
    flex: 1,
    marginLeft: 13,
  },

  propertyLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },

  propertyTitle: {
    marginTop: 3,
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '800',
  },

  infoBox: {
    marginTop: 15,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#CCFBF1',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },

  infoText: {
    flex: 1,
    color: '#0F766E',
    fontSize: 11,
    lineHeight: 18,
  },

  section: {
    marginTop: 25,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 13,
  },

  sectionTitle: {
    color: '#1E293B',
    fontSize: 15,
    fontWeight: '800',
  },

  dateList: {
    gap: 10,
    paddingRight: 10,
  },

  dateCard: {
    width: 90,
    minHeight: 90,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateCardSelected: {
    backgroundColor: '#0F9D8A',
    borderColor: '#0F9D8A',
  },

  dateDay: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },

  dateValue: {
    marginTop: 5,
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '800',
  },

  dateTextSelected: {
    color: '#FFFFFF',
  },

  dateCheck: {
    marginTop: 5,
  },

  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  timeButton: {
    width: '22%',
    minWidth: 75,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  timeButtonSelected: {
    backgroundColor: '#0F9D8A',
    borderColor: '#0F9D8A',
  },

  timeText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },

  timeTextSelected: {
    color: '#FFFFFF',
  },

  messageInput: {
    minHeight: 120,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    color: '#1E293B',
    fontSize: 13,
    lineHeight: 20,
  },

  characterCount: {
    marginTop: 6,
    textAlign: 'right',
    color: '#94A3B8',
    fontSize: 10,
  },

  summaryCard: {
    marginTop: 25,
    padding: 16,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
  },

  summaryTitle: {
    marginBottom: 12,
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '800',
  },

  summaryRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  summaryText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },

  // BOTTOM
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },

  submitButton: {
    height: 54,
    borderRadius: 15,
    backgroundColor: '#0F9D8A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  submitButtonDisabled: {
    opacity: 0.6,
  },

  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
