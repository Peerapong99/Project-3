import React, {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useFocusEffect,
} from '@react-navigation/native';

import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';

import {
  cancelAppointment,
  getMyAppointments,
} from '../services/appointmentService';

import {
  getToken,
} from '../services/authService';

// =====================================================
// STATUS CONFIG
// =====================================================

const STATUS_CONFIG = {
  pending: {
    text: 'รอผู้ขายยืนยัน',
    icon: 'clock-outline',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
  },

  confirmed: {
    text: 'ยืนยันแล้ว',
    icon: 'check-circle-outline',
    color: '#059669',
    backgroundColor: '#D1FAE5',
  },

  rejected: {
    text: 'ผู้ขายปฏิเสธ',
    icon: 'close-circle-outline',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
  },

  cancelled: {
    text: 'ยกเลิกแล้ว',
    icon: 'cancel',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
  },
};

// =====================================================
// HEADER
// =====================================================

const AppointmentHeader = ({
  navigation,
  subtitle,
  showIcon = false,
}) => {
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate(
      'MainTabs',
      {
        screen: 'Home',
      },
    );
  };

  return (
    <View style={styles.header}>

      <View
        style={styles.headerLeft}>

        <Pressable
          style={styles.backButton}
          hitSlop={10}
          onPress={handleBack}>

          <MaterialDesignIcons
            name="chevron-left"
            size={29}
            color="#334155"
          />

        </Pressable>

        <View
          style={
            styles.headerTextContainer
          }>

          <Text
            style={
              styles.headerTitle
            }>
            การนัดหมาย
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }>
            {subtitle}
          </Text>

        </View>

      </View>

      {showIcon && (
        <View
          style={
            styles.headerIcon
          }>

          <MaterialDesignIcons
            name="calendar-check-outline"
            size={25}
            color="#0F9D8A"
          />

        </View>
      )}

    </View>
  );
};

// =====================================================
// SCREEN
// =====================================================

const AppointmentScreen = ({
  navigation,
}) => {
  const [
    appointments,
    setAppointments,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    loggedIn,
    setLoggedIn,
  ] = useState(false);

  const [
    cancellingId,
    setCancellingId,
  ] = useState(null);

  // =====================================================
  // LOAD APPOINTMENTS
  // =====================================================

  const loadAppointments =
    useCallback(async () => {
      try {
        const token =
          await getToken();

        if (!token) {
          setLoggedIn(false);
          setAppointments([]);
          setLoading(false);
          setRefreshing(false);

          return;
        }

        setLoggedIn(true);

        const result =
          await getMyAppointments();

        const data =
          result?.appointments || [];

        setAppointments(
          Array.isArray(data)
            ? data
            : [],
        );
      } catch (error) {
        console.log(
          'Load Appointments Error:',
          error?.response?.data ||
            error,
        );

        if (
          error?.message ===
            'NOT_LOGGED_IN' ||
          error?.response?.status ===
            401
        ) {
          setLoggedIn(false);
          setAppointments([]);
        } else {
          Alert.alert(
            'เกิดข้อผิดพลาด',
            error?.response?.data
              ?.message ||
              'ไม่สามารถโหลดรายการนัดหมายได้',
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

  // =====================================================
  // REFRESH WHEN FOCUS
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      setLoading(true);

      loadAppointments();
    }, [loadAppointments]),
  );

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = () => {
    setRefreshing(true);

    loadAppointments();
  };

  // =====================================================
  // CANCEL
  // =====================================================

  const handleCancel =
    appointment => {
      Alert.alert(
        'ยกเลิกนัดหมาย',
        'คุณต้องการยกเลิกนัดหมายนี้หรือไม่?',
        [
          {
            text: 'ไม่',
            style: 'cancel',
          },
          {
            text:
              'ยกเลิกนัดหมาย',

            style: 'destructive',

            onPress: async () => {
              try {
                setCancellingId(
                  appointment._id,
                );

                await cancelAppointment(
                  appointment._id,
                );

                Alert.alert(
                  'สำเร็จ',
                  'ยกเลิกนัดหมายเรียบร้อยแล้ว',
                );

                await loadAppointments();
              } catch (error) {
                console.log(
                  'Cancel Appointment Error:',
                  error?.response
                    ?.data ||
                    error,
                );

                Alert.alert(
                  'ไม่สามารถยกเลิกได้',

                  error?.response
                    ?.data?.message ||
                    'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
                );
              } finally {
                setCancellingId(
                  null,
                );
              }
            },
          },
        ],
      );
    };

  // =====================================================
  // PROPERTY DETAIL
  // =====================================================

  const handleProperty =
    appointment => {
      const propertyId =
        appointment?.property?._id;

      if (!propertyId) {
        Alert.alert(
          'ไม่พบข้อมูล',
          'ไม่พบข้อมูลประกาศนี้',
        );

        return;
      }

      navigation.navigate(
        'PropertyDetail',
        {
          propertyId,
        },
      );
    };

  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  // =====================================================
  // HOME
  // =====================================================

  const handleHome = () => {
    navigation.navigate(
      'MainTabs',
      {
        screen: 'Home',
      },
    );
  };

  // =====================================================
  // DATE FORMAT
  // =====================================================

  const formatDate =
    dateValue => {
      if (!dateValue) {
        return '-';
      }

      const date =
        new Date(dateValue);

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return dateValue;
      }

      return date.toLocaleDateString(
        'th-TH',
        {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        },
      );
    };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <View
        style={
          styles.container
        }>

        <AppointmentHeader
          navigation={navigation}
          subtitle="นัดหมายเข้าชมบ้านของคุณ"
        />

        <View
          style={
            styles.stateContainer
          }>

          <ActivityIndicator
            size="large"
            color="#0F9D8A"
          />

          <Text
            style={
              styles.loadingText
            }>
            กำลังโหลดรายการนัดหมาย...
          </Text>

        </View>

      </View>
    );
  }

  // =====================================================
  // NOT LOGIN
  // =====================================================

  if (!loggedIn) {
    return (
      <View
        style={
          styles.container
        }>

        <AppointmentHeader
          navigation={navigation}
          subtitle="นัดหมายเข้าชมบ้านของคุณ"
        />

        <View
          style={
            styles.loginContainer
          }>

          <View
            style={
              styles.emptyIcon
            }>

            <MaterialDesignIcons
              name="calendar-account-outline"
              size={55}
              color="#0F9D8A"
            />

          </View>

          <Text
            style={
              styles.emptyTitle
            }>
            เข้าสู่ระบบเพื่อดูนัดหมาย
          </Text>

          <Text
            style={
              styles.emptyDescription
            }>
            คุณต้องเข้าสู่ระบบก่อน
            เพื่อดูและจัดการรายการนัดหมายเข้าชมบ้าน
          </Text>

          <Pressable
            style={
              styles.loginButton
            }
            onPress={
              handleLogin
            }>

            <MaterialDesignIcons
              name="login"
              size={20}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.loginButtonText
              }>
              เข้าสู่ระบบ
            </Text>

          </Pressable>

        </View>

      </View>
    );
  }

  // =====================================================
  // EMPTY
  // =====================================================

  if (
    loggedIn &&
    appointments.length === 0
  ) {
    return (
      <View
        style={
          styles.container
        }>

        <AppointmentHeader
          navigation={navigation}
          subtitle="นัดหมายเข้าชมบ้านของคุณ"
        />

        <ScrollView
          contentContainerStyle={
            styles.emptyScroll
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                handleRefresh
              }
            />
          }>

          <View
            style={
              styles.emptyIcon
            }>

            <MaterialDesignIcons
              name="calendar-blank-outline"
              size={55}
              color="#0F9D8A"
            />

          </View>

          <Text
            style={
              styles.emptyTitle
            }>
            ยังไม่มีนัดหมาย
          </Text>

          <Text
            style={
              styles.emptyDescription
            }>
            เมื่อคุณนัดหมายเข้าชมบ้าน
            รายการนัดหมายจะแสดงที่นี่
          </Text>

          <Pressable
            style={
              styles.browseButton
            }
            onPress={
              handleHome
            }>

            <MaterialDesignIcons
              name="home-search-outline"
              size={20}
              color="#0F9D8A"
            />

            <Text
              style={
                styles.browseButtonText
              }>
              เลือกดูบ้าน
            </Text>

          </Pressable>

        </ScrollView>

      </View>
    );
  }

  // =====================================================
  // LIST
  // =====================================================

  return (
    <View
      style={styles.container}>

      <AppointmentHeader
        navigation={navigation}
        subtitle={`${appointments.length} รายการนัดหมาย`}
        showIcon
      />

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
          />
        }>

        {appointments.map(
          appointment => {
            const status =
              STATUS_CONFIG[
                appointment.status
              ] ||
              STATUS_CONFIG.pending;

            const property =
              appointment.property;

            const canCancel =
              appointment.status ===
                'pending' ||
              appointment.status ===
                'confirmed';

            const cancelling =
              cancellingId ===
              appointment._id;

            return (
              <View
                key={
                  appointment._id
                }
                style={
                  styles.appointmentCard
                }>

                {/* STATUS */}

                <View
                  style={
                    styles.cardTopRow
                  }>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          status.backgroundColor,
                      },
                    ]}>

                    <MaterialDesignIcons
                      name={
                        status.icon
                      }
                      size={15}
                      color={
                        status.color
                      }
                    />

                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            status.color,
                        },
                      ]}>
                      {status.text}
                    </Text>

                  </View>

                  <Text
                    style={
                      styles.createdText
                    }>

                    {appointment.createdAt
                      ? new Date(
                          appointment.createdAt,
                        ).toLocaleDateString(
                          'th-TH',
                        )
                      : ''}

                  </Text>

                </View>

                {/* PROPERTY */}

                <Pressable
                  style={
                    styles.propertySection
                  }
                  onPress={() =>
                    handleProperty(
                      appointment,
                    )
                  }>

                  <View
                    style={
                      styles.propertyIcon
                    }>

                    <MaterialDesignIcons
                      name="home-outline"
                      size={25}
                      color="#0F9D8A"
                    />

                  </View>

                  <View
                    style={
                      styles.propertyInfo
                    }>

                    <Text
                      style={
                        styles.propertyTitle
                      }
                      numberOfLines={2}>

                      {property?.title ||
                        'ประกาศ HomeMatch'}

                    </Text>

                    <View
                      style={
                        styles.locationRow
                      }>

                      <MaterialDesignIcons
                        name="map-marker-outline"
                        size={14}
                        color="#94A3B8"
                      />

                      <Text
                        style={
                          styles.locationText
                        }
                        numberOfLines={
                          1
                        }>

                        {[
                          property
                            ?.location
                            ?.district,

                          property
                            ?.location
                            ?.province,
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(', ') ||
                          'ไม่ระบุที่อยู่'}

                      </Text>

                    </View>

                  </View>

                  <MaterialDesignIcons
                    name="chevron-right"
                    size={23}
                    color="#CBD5E1"
                  />

                </Pressable>

                <View
                  style={
                    styles.divider
                  }
                />

                {/* DATE */}

                <View
                  style={
                    styles.detailRow
                  }>

                  <View
                    style={
                      styles.detailIcon
                    }>

                    <MaterialDesignIcons
                      name="calendar-outline"
                      size={20}
                      color="#0F9D8A"
                    />

                  </View>

                  <View
                    style={
                      styles.detailContent
                    }>

                    <Text
                      style={
                        styles.detailLabel
                      }>
                      วันที่เข้าชม
                    </Text>

                    <Text
                      style={
                        styles.detailValue
                      }>
                      {formatDate(
                        appointment.appointmentDate,
                      )}
                    </Text>

                  </View>

                </View>

                {/* TIME */}

                <View
                  style={
                    styles.detailRow
                  }>

                  <View
                    style={
                      styles.detailIcon
                    }>

                    <MaterialDesignIcons
                      name="clock-outline"
                      size={20}
                      color="#0F9D8A"
                    />

                  </View>

                  <View
                    style={
                      styles.detailContent
                    }>

                    <Text
                      style={
                        styles.detailLabel
                      }>
                      เวลา
                    </Text>

                    <Text
                      style={
                        styles.detailValue
                      }>
                      {appointment.appointmentTime ||
                        '-'}{' '}
                      น.
                    </Text>

                  </View>

                </View>

                {/* SELLER */}

                <View
                  style={
                    styles.detailRow
                  }>

                  <View
                    style={
                      styles.detailIcon
                    }>

                    <MaterialDesignIcons
                      name="account-outline"
                      size={20}
                      color="#0F9D8A"
                    />

                  </View>

                  <View
                    style={
                      styles.detailContent
                    }>

                    <Text
                      style={
                        styles.detailLabel
                      }>
                      ผู้ขาย
                    </Text>

                    <Text
                      style={
                        styles.detailValue
                      }>

                      {appointment
                        ?.seller?.name ||
                        'ผู้ขาย HomeMatch'}

                    </Text>

                  </View>

                </View>

                {/* MESSAGE */}

                {appointment.message ? (
                  <View
                    style={
                      styles.messageBox
                    }>

                    <MaterialDesignIcons
                      name="message-text-outline"
                      size={18}
                      color="#64748B"
                    />

                    <View
                      style={
                        styles.messageContent
                      }>

                      <Text
                        style={
                          styles.messageLabel
                        }>
                        ข้อความถึงผู้ขาย
                      </Text>

                      <Text
                        style={
                          styles.messageText
                        }>
                        {
                          appointment.message
                        }
                      </Text>

                    </View>

                  </View>
                ) : null}

                {/* REJECTION */}

                {appointment.status ===
                  'rejected' &&
                appointment.rejectionReason ? (
                  <View
                    style={
                      styles.rejectionBox
                    }>

                    <MaterialDesignIcons
                      name="alert-circle-outline"
                      size={18}
                      color="#DC2626"
                    />

                    <View
                      style={
                        styles.messageContent
                      }>

                      <Text
                        style={
                          styles.rejectionLabel
                        }>
                        เหตุผลที่ปฏิเสธ
                      </Text>

                      <Text
                        style={
                          styles.rejectionText
                        }>
                        {
                          appointment.rejectionReason
                        }
                      </Text>

                    </View>

                  </View>
                ) : null}

                {/* CANCEL */}

                {canCancel && (
                  <Pressable
                    style={[
                      styles.cancelButton,

                      cancelling &&
                        styles.disabledButton,
                    ]}
                    disabled={
                      cancelling
                    }
                    onPress={() =>
                      handleCancel(
                        appointment,
                      )
                    }>

                    {cancelling ? (
                      <ActivityIndicator
                        size="small"
                        color="#DC2626"
                      />
                    ) : (
                      <>
                        <MaterialDesignIcons
                          name="calendar-remove-outline"
                          size={18}
                          color="#DC2626"
                        />

                        <Text
                          style={
                            styles.cancelButtonText
                          }>
                          ยกเลิกนัดหมาย
                        </Text>
                      </>
                    )}

                  </Pressable>
                )}

              </View>
            );
          },
        )}

      </ScrollView>

    </View>
  );
};

export default AppointmentScreen;

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // =================================================
  // HEADER
  // =================================================

  header: {
    minHeight: 125,

    paddingHorizontal: 16,

    // เลื่อน Header ลง ไม่ให้ชน Status Bar / กล้องหน้า
    paddingTop: 40,

    paddingBottom: 20,

    backgroundColor: '#FFFFFF',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  headerLeft: {
    flex: 1,

    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 42,
    height: 42,

    marginRight: 10,

    borderRadius: 21,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#F1F5F9',
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    color: '#1E293B',

    fontSize: 22,
    fontWeight: '900',
  },

  headerSubtitle: {
    marginTop: 4,

    color: '#94A3B8',

    fontSize: 11,
  },

  headerIcon: {
    width: 45,
    height: 45,

    borderRadius: 14,

    backgroundColor: '#F0FDFA',

    alignItems: 'center',
    justifyContent: 'center',
  },

  // =================================================
  // LOADING
  // =================================================

  stateContainer: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#FFFFFF',
  },

  loadingText: {
    marginTop: 10,

    color: '#64748B',

    fontSize: 12,
  },

  // =================================================
  // EMPTY / LOGIN
  // =================================================

  loginContainer: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 35,
  },

  emptyScroll: {
    flexGrow: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 35,
    paddingBottom: 70,
  },

  emptyIcon: {
    width: 100,
    height: 100,

    borderRadius: 50,

    backgroundColor: '#F0FDFA',

    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    marginTop: 20,

    color: '#1E293B',

    fontSize: 18,
    fontWeight: '800',
  },

  emptyDescription: {
    marginTop: 8,

    color: '#94A3B8',

    fontSize: 12,
    lineHeight: 19,

    textAlign: 'center',
  },

  loginButton: {
    marginTop: 22,

    minWidth: 180,
    height: 50,

    paddingHorizontal: 25,

    borderRadius: 14,

    backgroundColor: '#0F9D8A',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 8,
  },

  loginButtonText: {
    color: '#FFFFFF',

    fontSize: 13,
    fontWeight: '800',
  },

  browseButton: {
    marginTop: 22,

    height: 48,

    paddingHorizontal: 22,

    borderRadius: 13,

    borderWidth: 1.5,
    borderColor: '#0F9D8A',

    backgroundColor: '#FFFFFF',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 7,
  },

  browseButtonText: {
    color: '#0F9D8A',

    fontSize: 13,
    fontWeight: '800',
  },

  // =================================================
  // LIST
  // =================================================

  listContent: {
    padding: 16,
    paddingBottom: 35,
  },

  appointmentCard: {
    marginBottom: 16,

    padding: 16,

    borderRadius: 18,

    backgroundColor: '#FFFFFF',

    elevation: 2,
  },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,

    borderRadius: 20,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 5,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  createdText: {
    color: '#94A3B8',

    fontSize: 9,
  },

  // =================================================
  // PROPERTY
  // =================================================

  propertySection: {
    marginTop: 15,

    flexDirection: 'row',
    alignItems: 'center',
  },

  propertyIcon: {
    width: 48,
    height: 48,

    borderRadius: 13,

    backgroundColor: '#F0FDFA',

    alignItems: 'center',
    justifyContent: 'center',
  },

  propertyInfo: {
    flex: 1,

    marginLeft: 12,
  },

  propertyTitle: {
    color: '#1E293B',

    fontSize: 14,
    fontWeight: '800',
  },

  locationRow: {
    marginTop: 4,

    flexDirection: 'row',
    alignItems: 'center',
  },

  locationText: {
    flex: 1,

    marginLeft: 3,

    color: '#94A3B8',

    fontSize: 10,
  },

  divider: {
    height: 1,

    marginVertical: 15,

    backgroundColor: '#F1F5F9',
  },

  // =================================================
  // DETAILS
  // =================================================

  detailRow: {
    marginBottom: 13,

    flexDirection: 'row',
    alignItems: 'center',
  },

  detailIcon: {
    width: 37,
    height: 37,

    borderRadius: 11,

    backgroundColor: '#F0FDFA',

    alignItems: 'center',
    justifyContent: 'center',
  },

  detailContent: {
    flex: 1,

    marginLeft: 10,
  },

  detailLabel: {
    color: '#94A3B8',

    fontSize: 9,
    fontWeight: '600',
  },

  detailValue: {
    marginTop: 2,

    color: '#334155',

    fontSize: 12,
    fontWeight: '700',
  },

  // =================================================
  // MESSAGE
  // =================================================

  messageBox: {
    marginTop: 3,

    padding: 12,

    borderRadius: 12,

    backgroundColor: '#F8FAFC',

    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  messageContent: {
    flex: 1,

    marginLeft: 8,
  },

  messageLabel: {
    color: '#94A3B8',

    fontSize: 9,
    fontWeight: '600',
  },

  messageText: {
    marginTop: 3,

    color: '#475569',

    fontSize: 11,
    lineHeight: 17,
  },

  // =================================================
  // REJECTION
  // =================================================

  rejectionBox: {
    marginTop: 10,

    padding: 12,

    borderRadius: 12,

    backgroundColor: '#FEF2F2',

    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  rejectionLabel: {
    color: '#DC2626',

    fontSize: 9,
    fontWeight: '700',
  },

  rejectionText: {
    marginTop: 3,

    color: '#B91C1C',

    fontSize: 11,
    lineHeight: 17,
  },

  // =================================================
  // CANCEL
  // =================================================

  cancelButton: {
    marginTop: 15,

    height: 45,

    borderRadius: 12,

    borderWidth: 1,
    borderColor: '#FECACA',

    backgroundColor: '#FEF2F2',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 7,
  },

  cancelButtonText: {
    color: '#DC2626',

    fontSize: 12,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.55,
  },
});