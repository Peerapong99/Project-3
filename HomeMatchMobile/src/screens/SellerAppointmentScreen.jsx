import React, {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  useFocusEffect,
} from '@react-navigation/native';

import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';

import api from '../services/api';

import {
  getToken,
} from '../services/authService';

// =====================================================
// SELLER APPOINTMENT SCREEN
// =====================================================

const SellerAppointmentScreen = ({
  navigation,
}) => {
  const [appointments, setAppointments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(null);

  const [
    rejectModalVisible,
    setRejectModalVisible,
  ] = useState(false);

  const [
    selectedAppointment,
    setSelectedAppointment,
  ] = useState(null);

  const [
    rejectionReason,
    setRejectionReason,
  ] = useState('');

  // =====================================================
  // LOAD APPOINTMENTS
  // =====================================================

  const loadAppointments =
    useCallback(async () => {
      try {
        const token =
          await getToken();

        if (!token) {
          setAppointments([]);
          return;
        }

        const response =
          await api.get(
            '/appointments/seller',
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        console.log(
          'SELLER APPOINTMENTS:',
          response.data,
        );

        // รองรับทั้ง
        // { appointments: [...] }
        // และ [...]
        const data =
          response.data?.appointments ||
          response.data ||
          [];

        if (Array.isArray(data)) {
          setAppointments(data);
        } else {
          setAppointments([]);
        }
      } catch (error) {
        console.log(
          'LOAD SELLER APPOINTMENTS ERROR:',
          error?.response?.data ||
            error?.message ||
            error,
        );

        if (
          error?.response?.status === 401
        ) {
          Alert.alert(
            'กรุณาเข้าสู่ระบบ',
            'กรุณาเข้าสู่ระบบใหม่',
          );

          return;
        }

        if (
          error?.response?.status === 403
        ) {
          Alert.alert(
            'ไม่มีสิทธิ์ใช้งาน',
            'หน้านี้สำหรับผู้ขายเท่านั้น',
          );

          return;
        }

        Alert.alert(
          'เกิดข้อผิดพลาด',
          error?.response?.data
            ?.message ||
            'ไม่สามารถโหลดรายการนัดหมายได้',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, []);

  // =====================================================
  // LOAD WHEN FOCUS
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
  // CONFIRM APPOINTMENT
  // =====================================================

  const handleConfirm =
    appointment => {
      Alert.alert(
        'ยืนยันการนัดหมาย',
        'ต้องการยืนยันการนัดหมายนี้หรือไม่?',
        [
          {
            text: 'ยกเลิก',
            style: 'cancel',
          },
          {
            text: 'ยืนยัน',
            onPress: () =>
              confirmAppointment(
                appointment,
              ),
          },
        ],
      );
    };

  const confirmAppointment =
    async appointment => {
      try {
        setActionLoading(
          appointment._id,
        );

        const token =
          await getToken();

        if (!token) {
          Alert.alert(
            'กรุณาเข้าสู่ระบบ',
            'กรุณาเข้าสู่ระบบใหม่',
          );

          return;
        }

        const response =
          await api.patch(
            `/appointments/${appointment._id}/status`,
            {
              status: 'confirmed',
            },
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        console.log(
          'CONFIRM APPOINTMENT:',
          response.data,
        );

        Alert.alert(
          'สำเร็จ',
          'ยืนยันการนัดหมายเรียบร้อยแล้ว',
        );

        await loadAppointments();
      } catch (error) {
        console.log(
          'CONFIRM APPOINTMENT ERROR:',
          error?.response?.data ||
            error?.message ||
            error,
        );

        Alert.alert(
          'ไม่สามารถยืนยันได้',
          error?.response?.data
            ?.message ||
            'กรุณาลองใหม่อีกครั้ง',
        );
      } finally {
        setActionLoading(null);
      }
    };

  // =====================================================
  // OPEN REJECT MODAL
  // =====================================================

  const handleOpenReject =
    appointment => {
      setSelectedAppointment(
        appointment,
      );

      setRejectionReason('');

      setRejectModalVisible(true);
    };

  // =====================================================
  // CLOSE REJECT MODAL
  // =====================================================

  const closeRejectModal = () => {
    setRejectModalVisible(false);

    setSelectedAppointment(null);

    setRejectionReason('');
  };

  // =====================================================
  // REJECT APPOINTMENT
  // =====================================================

  const handleReject = async () => {
    const reason =
      rejectionReason.trim();

    if (!reason) {
      Alert.alert(
        'กรุณาระบุเหตุผล',
        'กรุณากรอกเหตุผลในการปฏิเสธนัดหมาย',
      );

      return;
    }

    if (!selectedAppointment?._id) {
      return;
    }

    try {
      setActionLoading(
        selectedAppointment._id,
      );

      const token =
        await getToken();

      if (!token) {
        Alert.alert(
          'กรุณาเข้าสู่ระบบ',
          'กรุณาเข้าสู่ระบบใหม่',
        );

        return;
      }

      const response =
        await api.patch(
          `/appointments/${selectedAppointment._id}/status`,
          {
            status: 'rejected',
            rejectionReason: reason,
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        );

      console.log(
        'REJECT APPOINTMENT:',
        response.data,
      );

      closeRejectModal();

      Alert.alert(
        'สำเร็จ',
        'ปฏิเสธการนัดหมายเรียบร้อยแล้ว',
      );

      await loadAppointments();
    } catch (error) {
      console.log(
        'REJECT APPOINTMENT ERROR:',
        error?.response?.data ||
          error?.message ||
          error,
      );

      Alert.alert(
        'ไม่สามารถปฏิเสธได้',
        error?.response?.data
          ?.message ||
          'กรุณาลองใหม่อีกครั้ง',
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =====================================================
  // OPEN PROPERTY
  // =====================================================

  const handleOpenProperty =
    appointment => {
      const propertyId =
        appointment?.property?._id ||
        appointment?.property;

      if (!propertyId) {
        Alert.alert(
          'ไม่พบข้อมูล',
          'ไม่พบข้อมูลประกาศบ้าน',
        );

        return;
      }

      const parent =
        navigation.getParent();

      if (parent) {
        parent.navigate(
          'PropertyDetail',
          {
            propertyId,
          },
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
  // STATUS CONFIG
  // =====================================================

  const getStatusConfig =
    status => {
      switch (status) {
        case 'confirmed':
          return {
            label: 'ยืนยันแล้ว',
            icon:
              'check-circle-outline',
            background:
              '#DCFCE7',
            color:
              '#15803D',
          };

        case 'rejected':
          return {
            label: 'ปฏิเสธแล้ว',
            icon:
              'close-circle-outline',
            background:
              '#FEE2E2',
            color:
              '#DC2626',
          };

        case 'cancelled':
          return {
            label:
              'ผู้ซื้อยกเลิก',
            icon:
              'cancel',
            background:
              '#F1F5F9',
            color:
              '#64748B',
          };

        default:
          return {
            label:
              'รอการยืนยัน',
            icon:
              'clock-outline',
            background:
              '#FEF3C7',
            color:
              '#D97706',
          };
      }
    };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = date => {
    if (!date) {
      return '-';
    }

    try {
      return new Date(
        date,
      ).toLocaleDateString(
        'th-TH',
        {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        },
      );
    } catch {
      return date;
    }
  };

  // =====================================================
  // APPOINTMENT CARD
  // =====================================================

  const renderAppointment = ({
    item,
  }) => {
    const status =
      getStatusConfig(
        item.status,
      );

    const propertyTitle =
      item?.property?.title ||
      'ประกาศบ้าน';

    const buyerName =
      item?.buyer?.name ||
      'ผู้ซื้อ';

    const buyerPhone =
      item?.buyer?.phone ||
      '-';

    const buyerEmail =
      item?.buyer?.email ||
      '-';

    const isProcessing =
      actionLoading ===
      item._id;

    return (
      <View
        style={
          styles.card
        }>

        {/* HEADER */}

        <View
          style={
            styles.cardHeader
          }>

          <View
            style={
              styles.propertyIcon
            }>

            <MaterialDesignIcons
              name="home-outline"
              size={24}
              color="#0F9D8A"
            />

          </View>

          <View
            style={
              styles.headerContent
            }>

            <Text
              numberOfLines={2}
              style={
                styles.propertyTitle
              }>

              {propertyTitle}

            </Text>

            <Pressable
              onPress={() =>
                handleOpenProperty(
                  item,
                )
              }>

              <Text
                style={
                  styles.viewProperty
                }>

                ดูรายละเอียดบ้าน

              </Text>

            </Pressable>

          </View>

          <View
            style={[
              styles.statusBadge,

              {
                backgroundColor:
                  status.background,
              },
            ]}>

            <MaterialDesignIcons
              name={
                status.icon
              }
              size={14}
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

              {status.label}

            </Text>

          </View>

        </View>

        <View
          style={
            styles.divider
          }
        />

        {/* BUYER */}

        <Text
          style={
            styles.sectionTitle
          }>

          ข้อมูลผู้ซื้อ

        </Text>

        <View
          style={
            styles.infoRow
          }>

          <MaterialDesignIcons
            name="account-outline"
            size={19}
            color="#64748B"
          />

          <View
            style={
              styles.infoContent
            }>

            <Text
              style={
                styles.infoLabel
              }>

              ชื่อผู้ซื้อ

            </Text>

            <Text
              style={
                styles.infoValue
              }>

              {buyerName}

            </Text>

          </View>

        </View>

        <View
          style={
            styles.infoRow
          }>

          <MaterialDesignIcons
            name="phone-outline"
            size={19}
            color="#64748B"
          />

          <View
            style={
              styles.infoContent
            }>

            <Text
              style={
                styles.infoLabel
              }>

              เบอร์โทรศัพท์

            </Text>

            <Text
              style={
                styles.infoValue
              }>

              {buyerPhone}

            </Text>

          </View>

        </View>

        <View
          style={
            styles.infoRow
          }>

          <MaterialDesignIcons
            name="email-outline"
            size={19}
            color="#64748B"
          />

          <View
            style={
              styles.infoContent
            }>

            <Text
              style={
                styles.infoLabel
              }>

              อีเมล

            </Text>

            <Text
              style={
                styles.infoValue
              }>

              {buyerEmail}

            </Text>

          </View>

        </View>

        <View
          style={
            styles.divider
          }
        />

        {/* DATE / TIME */}

        <View
          style={
            styles.dateTimeContainer
          }>

          <View
            style={
              styles.dateTimeBox
            }>

            <MaterialDesignIcons
              name="calendar-outline"
              size={22}
              color="#0F9D8A"
            />

            <View
              style={
                styles.dateTimeContent
              }>

              <Text
                style={
                  styles.dateTimeLabel
                }>

                วันที่เข้าชม

              </Text>

              <Text
                style={
                  styles.dateTimeValue
                }>

                {formatDate(
                  item.appointmentDate,
                )}

              </Text>

            </View>

          </View>

          <View
            style={
              styles.dateTimeBox
            }>

            <MaterialDesignIcons
              name="clock-outline"
              size={22}
              color="#0F9D8A"
            />

            <View
              style={
                styles.dateTimeContent
              }>

              <Text
                style={
                  styles.dateTimeLabel
                }>

                เวลา

              </Text>

              <Text
                style={
                  styles.dateTimeValue
                }>

                {item.appointmentTime ||
                  '-'}

              </Text>

            </View>

          </View>

        </View>

        {/* MESSAGE */}

        {!!item.message && (
          <View
            style={
              styles.messageBox
            }>

            <Text
              style={
                styles.messageLabel
              }>

              ข้อความจากผู้ซื้อ

            </Text>

            <Text
              style={
                styles.messageText
              }>

              {item.message}

            </Text>

          </View>
        )}

        {/* REJECTION REASON */}

        {item.status ===
          'rejected' &&
          !!item.rejectionReason && (
            <View
              style={
                styles.rejectionBox
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
                  item.rejectionReason
                }

              </Text>

            </View>
          )}

        {/* ACTION */}

        {item.status ===
          'pending' && (
          <View
            style={
              styles.actionContainer
            }>

            <Pressable
              disabled={
                isProcessing
              }
              style={[
                styles.rejectButton,

                isProcessing &&
                  styles.disabledButton,
              ]}
              onPress={() =>
                handleOpenReject(
                  item,
                )
              }>

              <MaterialDesignIcons
                name="close"
                size={18}
                color="#DC2626"
              />

              <Text
                style={
                  styles.rejectButtonText
                }>

                ปฏิเสธ

              </Text>

            </Pressable>

            <Pressable
              disabled={
                isProcessing
              }
              style={[
                styles.confirmButton,

                isProcessing &&
                  styles.disabledButton,
              ]}
              onPress={() =>
                handleConfirm(
                  item,
                )
              }>

              {isProcessing ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <MaterialDesignIcons
                    name="check"
                    size={18}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.confirmButtonText
                    }>

                    ยืนยัน

                  </Text>
                </>
              )}

            </Pressable>

          </View>
        )}

      </View>
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.container
        }>

        <View
          style={
            styles.loadingContainer
          }>

          <ActivityIndicator
            size="large"
            color="#0F9D8A"
          />

          <Text
            style={
              styles.loadingText
            }>

            กำลังโหลดนัดหมาย...

          </Text>

        </View>

      </SafeAreaView>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <SafeAreaView
      style={
        styles.container
      }>

      {/* HEADER */}

      <View
        style={
          styles.screenHeader
        }>

        <View>

          <Text
            style={
              styles.screenTitle
            }>

            คำขอนัดหมาย

          </Text>

          <Text
            style={
              styles.screenSubtitle
            }>

            จัดการคำขอเข้าชมบ้านจากผู้ซื้อ

          </Text>

        </View>

        <View
          style={
            styles.headerIcon
          }>

          <MaterialDesignIcons
            name="calendar-check-outline"
            size={26}
            color="#0F9D8A"
          />

        </View>

      </View>

      {/* LIST */}

      <FlatList
        data={appointments}
        keyExtractor={item =>
          item._id
        }
        renderItem={
          renderAppointment
        }
        contentContainerStyle={[
          styles.listContent,

          appointments.length ===
            0 &&
            styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
            tintColor="#0F9D8A"
          />
        }
        ListEmptyComponent={
          <View
            style={
              styles.emptyContainer
            }>

            <View
              style={
                styles.emptyIcon
              }>

              <MaterialDesignIcons
                name="calendar-blank-outline"
                size={50}
                color="#94A3B8"
              />

            </View>

            <Text
              style={
                styles.emptyTitle
              }>

              ยังไม่มีคำขอนัดหมาย

            </Text>

            <Text
              style={
                styles.emptyDescription
              }>

              เมื่อผู้ซื้อส่งคำขอเข้าชมบ้าน
              รายการจะแสดงที่หน้านี้

            </Text>

          </View>
        }
      />

      {/* ================================================
          REJECT MODAL
      ================================================ */}

      <Modal
        visible={
          rejectModalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={
          closeRejectModal
        }>

        <View
          style={
            styles.modalOverlay
          }>

          <View
            style={
              styles.modalCard
            }>

            <View
              style={
                styles.modalIcon
              }>

              <MaterialDesignIcons
                name="calendar-remove-outline"
                size={32}
                color="#DC2626"
              />

            </View>

            <Text
              style={
                styles.modalTitle
              }>

              ปฏิเสธการนัดหมาย

            </Text>

            <Text
              style={
                styles.modalDescription
              }>

              กรุณาระบุเหตุผล
              เพื่อแจ้งให้ผู้ซื้อทราบ

            </Text>

            <TextInput
              style={
                styles.reasonInput
              }
              placeholder="เช่น ไม่สะดวกในวันและเวลาดังกล่าว"
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={500}
              value={
                rejectionReason
              }
              onChangeText={
                setRejectionReason
              }
              textAlignVertical="top"
            />

            <Text
              style={
                styles.characterCount
              }>

              {
                rejectionReason.length
              }/500

            </Text>

            <View
              style={
                styles.modalActions
              }>

              <Pressable
                style={
                  styles.modalCancelButton
                }
                onPress={
                  closeRejectModal
                }>

                <Text
                  style={
                    styles.modalCancelText
                  }>

                  ยกเลิก

                </Text>

              </Pressable>

              <Pressable
                style={
                  styles.modalRejectButton
                }
                onPress={
                  handleReject
                }>

                <Text
                  style={
                    styles.modalRejectText
                  }>

                  ยืนยันการปฏิเสธ

                </Text>

              </Pressable>

            </View>

          </View>

        </View>

      </Modal>

    </SafeAreaView>
  );
};

export default SellerAppointmentScreen;

// =====================================================
// STYLES
// =====================================================

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#F8FAFC',
    },

    // =================================================
    // HEADER
    // =================================================

    screenHeader: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 18,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',

      backgroundColor:
        '#FFFFFF',

      borderBottomWidth: 1,
      borderBottomColor:
        '#E2E8F0',
    },

    screenTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: '#0F172A',
    },

    screenSubtitle: {
      marginTop: 4,

      fontSize: 12,
      color: '#64748B',
    },

    headerIcon: {
      width: 46,
      height: 46,

      borderRadius: 23,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        '#F0FDFA',
    },

    // =================================================
    // LIST
    // =================================================

    listContent: {
      padding: 16,
      paddingBottom: 30,
    },

    emptyListContent: {
      flexGrow: 1,
    },

    // =================================================
    // CARD
    // =================================================

    card: {
      marginBottom: 16,

      padding: 16,

      borderRadius: 16,

      backgroundColor:
        '#FFFFFF',

      borderWidth: 1,
      borderColor:
        '#E2E8F0',

      elevation: 2,

      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },

    cardHeader: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
    },

    propertyIcon: {
      width: 44,
      height: 44,

      borderRadius: 12,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        '#F0FDFA',
    },

    headerContent: {
      flex: 1,

      marginLeft: 12,
      marginRight: 8,
    },

    propertyTitle: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '700',

      color: '#0F172A',
    },

    viewProperty: {
      marginTop: 4,

      fontSize: 11,
      fontWeight: '600',

      color: '#0F9D8A',
    },

    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 5,

      borderRadius: 20,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 4,
    },

    statusText: {
      fontSize: 9,
      fontWeight: '700',
    },

    divider: {
      height: 1,

      marginVertical: 15,

      backgroundColor:
        '#E2E8F0',
    },

    sectionTitle: {
      marginBottom: 12,

      fontSize: 12,
      fontWeight: '700',

      color: '#334155',
    },

    // =================================================
    // INFO
    // =================================================

    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',

      marginBottom: 11,
    },

    infoContent: {
      flex: 1,

      marginLeft: 10,
    },

    infoLabel: {
      fontSize: 9,

      color: '#94A3B8',
    },

    infoValue: {
      marginTop: 2,

      fontSize: 12,
      fontWeight: '600',

      color: '#334155',
    },

    // =================================================
    // DATE TIME
    // =================================================

    dateTimeContainer: {
      flexDirection: 'row',

      gap: 10,
    },

    dateTimeBox: {
      flex: 1,

      minHeight: 65,

      paddingHorizontal: 11,
      paddingVertical: 10,

      borderRadius: 12,

      flexDirection: 'row',
      alignItems: 'center',

      backgroundColor:
        '#F8FAFC',
    },

    dateTimeContent: {
      flex: 1,

      marginLeft: 8,
    },

    dateTimeLabel: {
      fontSize: 9,

      color: '#94A3B8',
    },

    dateTimeValue: {
      marginTop: 3,

      fontSize: 11,
      fontWeight: '700',

      color: '#334155',
    },

    // =================================================
    // MESSAGE
    // =================================================

    messageBox: {
      marginTop: 14,

      padding: 12,

      borderRadius: 10,

      backgroundColor:
        '#F8FAFC',
    },

    messageLabel: {
      marginBottom: 5,

      fontSize: 9,
      fontWeight: '700',

      color: '#64748B',
    },

    messageText: {
      fontSize: 11,
      lineHeight: 17,

      color: '#334155',
    },

    rejectionBox: {
      marginTop: 14,

      padding: 12,

      borderRadius: 10,

      backgroundColor:
        '#FEF2F2',

      borderWidth: 1,
      borderColor:
        '#FECACA',
    },

    rejectionLabel: {
      marginBottom: 5,

      fontSize: 9,
      fontWeight: '700',

      color: '#DC2626',
    },

    rejectionText: {
      fontSize: 11,
      lineHeight: 17,

      color: '#991B1B',
    },

    // =================================================
    // ACTION
    // =================================================

    actionContainer: {
      marginTop: 16,

      flexDirection: 'row',

      gap: 10,
    },

    rejectButton: {
      flex: 1,
      height: 43,

      borderRadius: 10,

      borderWidth: 1,
      borderColor:
        '#FCA5A5',

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',

      gap: 5,

      backgroundColor:
        '#FFFFFF',
    },

    rejectButtonText: {
      fontSize: 11,
      fontWeight: '700',

      color: '#DC2626',
    },

    confirmButton: {
      flex: 1,
      height: 43,

      borderRadius: 10,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',

      gap: 5,

      backgroundColor:
        '#0F9D8A',
    },

    confirmButtonText: {
      fontSize: 11,
      fontWeight: '700',

      color: '#FFFFFF',
    },

    disabledButton: {
      opacity: 0.5,
    },

    // =================================================
    // LOADING
    // =================================================

    loadingContainer: {
      flex: 1,

      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingText: {
      marginTop: 12,

      fontSize: 12,

      color: '#64748B',
    },

    // =================================================
    // EMPTY
    // =================================================

    emptyContainer: {
      flex: 1,

      alignItems: 'center',
      justifyContent: 'center',

      paddingHorizontal: 35,
    },

    emptyIcon: {
      width: 90,
      height: 90,

      borderRadius: 45,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        '#F1F5F9',
    },

    emptyTitle: {
      marginTop: 18,

      fontSize: 17,
      fontWeight: '700',

      color: '#334155',
    },

    emptyDescription: {
      marginTop: 7,

      fontSize: 11,
      lineHeight: 18,

      textAlign: 'center',

      color: '#94A3B8',
    },

    // =================================================
    // MODAL
    // =================================================

    modalOverlay: {
      flex: 1,

      paddingHorizontal: 24,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        'rgba(15, 23, 42, 0.55)',
    },

    modalCard: {
      width: '100%',
      maxWidth: 420,

      padding: 22,

      borderRadius: 18,

      backgroundColor:
        '#FFFFFF',
    },

    modalIcon: {
      width: 58,
      height: 58,

      alignSelf: 'center',

      borderRadius: 29,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        '#FEF2F2',
    },

    modalTitle: {
      marginTop: 14,

      fontSize: 18,
      fontWeight: '800',

      textAlign: 'center',

      color: '#0F172A',
    },

    modalDescription: {
      marginTop: 6,

      fontSize: 11,
      lineHeight: 17,

      textAlign: 'center',

      color: '#64748B',
    },

    reasonInput: {
      height: 110,

      marginTop: 18,

      padding: 12,

      borderRadius: 10,

      borderWidth: 1,
      borderColor:
        '#E2E8F0',

      fontSize: 12,

      color: '#0F172A',

      backgroundColor:
        '#F8FAFC',
    },

    characterCount: {
      marginTop: 5,

      fontSize: 9,

      textAlign: 'right',

      color: '#94A3B8',
    },

    modalActions: {
      marginTop: 18,

      flexDirection: 'row',

      gap: 10,
    },

    modalCancelButton: {
      flex: 1,
      height: 43,

      borderRadius: 10,

      borderWidth: 1,
      borderColor:
        '#E2E8F0',

      alignItems: 'center',
      justifyContent: 'center',
    },

    modalCancelText: {
      fontSize: 11,
      fontWeight: '700',

      color: '#64748B',
    },

    modalRejectButton: {
      flex: 1.4,
      height: 43,

      borderRadius: 10,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        '#DC2626',
    },

    modalRejectText: {
      fontSize: 11,
      fontWeight: '700',

      color: '#FFFFFF',
    },
  });