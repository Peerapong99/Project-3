import React, {useCallback, useState} from 'react';

import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {useFocusEffect} from '@react-navigation/native';

import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';

import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notificationService';

import {getStoredUser} from '../services/authService';

// =====================================================
// HELPERS
// =====================================================

const getId = value => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value?._id) {
    return String(value._id);
  }

  if (value?.id) {
    return String(value.id);
  }

  return null;
};

const getUserName = user => {
  if (!user) {
    return 'ผู้ใช้งาน';
  }

  if (user.name) {
    return user.name;
  }

  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ');
  }

  if (user.username) {
    return user.username;
  }

  if (user.email) {
    return user.email;
  }

  return 'ผู้ใช้งาน';
};

// =====================================================
// NOTIFICATION SCREEN
// =====================================================

const NotificationScreen = ({navigation}) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [readingAll, setReadingAll] = useState(false);

  // =====================================================
  // LOAD NOTIFICATIONS
  // =====================================================

  const loadNotifications = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const result = await getMyNotifications();

      console.log(
        'MY NOTIFICATIONS:',
        result?.notifications,
      );

      setNotifications(
        result?.notifications || [],
      );
    } catch (error) {
      console.log(
        'LOAD NOTIFICATIONS ERROR:',
        error?.response?.data ||
          error?.message ||
          error,
      );

      if (
        error?.message ===
        'NOT_LOGGED_IN'
      ) {
        setNotifications([]);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // =====================================================
  // LOAD WHEN SCREEN FOCUS
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      loadNotifications();

      return () => {};
    }, []),
  );

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      await loadNotifications(false);
    } finally {
      setRefreshing(false);
    }
  };

  // =====================================================
  // MARK LOCAL READ
  // =====================================================

  const markReadLocal = id => {
    setNotifications(current =>
      current.map(item =>
        item._id === id
          ? {
              ...item,
              isRead: true,
            }
          : item,
      ),
    );
  };

  // =====================================================
  // PRESS NOTIFICATION
  // =====================================================

  const handleNotificationPress = async item => {
    try {
      console.log(
        '==============================',
      );
      console.log(
        'PRESS NOTIFICATION:',
        item,
      );
      console.log(
        'NOTIFICATION TYPE:',
        item?.type,
      );
      console.log(
        '==============================',
      );

      // =================================================
      // MARK AS READ
      // =================================================

      if (!item.isRead) {
        markReadLocal(item._id);

        try {
          await markNotificationAsRead(
            item._id,
          );
        } catch (error) {
          console.log(
            'MARK READ ERROR:',
            error?.response?.data ||
              error?.message ||
              error,
          );

          await loadNotifications(false);
        }
      }

      // =================================================
      // CURRENT USER
      // =================================================

      const currentUser =
        await getStoredUser();

      console.log(
        'CURRENT USER:',
        currentUser,
      );

      console.log(
        'CURRENT USER ROLE:',
        currentUser?.role,
      );

      // =================================================
      // 1. NEW MESSAGE
      // =================================================

      if (
        item.type ===
        'new_message'
      ) {
        const conversation =
          item.conversation;

        const conversationId =
          getId(conversation);

        if (!conversationId) {
          console.log(
            'ไม่มี conversationId',
          );

          return;
        }

        const currentUserId =
          getId(currentUser);

        const buyer =
          typeof conversation ===
          'object'
            ? conversation?.buyer
            : null;

        const seller =
          typeof conversation ===
          'object'
            ? conversation?.seller
            : null;

        const buyerId =
          getId(buyer);

        const sellerId =
          getId(seller);

        let otherUser = null;

        if (
          currentUserId &&
          buyerId &&
          currentUserId === buyerId
        ) {
          otherUser = seller;
        } else if (
          currentUserId &&
          sellerId &&
          currentUserId === sellerId
        ) {
          otherUser = buyer;
        } else {
          if (
            currentUser?.role ===
            'buyer'
          ) {
            otherUser = seller;
          }

          if (
            currentUser?.role ===
            'seller'
          ) {
            otherUser = buyer;
          }
        }

        const otherUserName =
          getUserName(otherUser);

        let propertyTitle =
          'ประกาศบ้าน';

        if (
          typeof item.property ===
            'object' &&
          item.property?.title
        ) {
          propertyTitle =
            item.property.title;
        } else if (
          typeof conversation ===
            'object' &&
          typeof conversation
            ?.property ===
            'object' &&
          conversation?.property
            ?.title
        ) {
          propertyTitle =
            conversation.property.title;
        }

        console.log(
          'OPEN CHAT:',
          {
            conversationId,
            otherUserName,
            propertyTitle,
          },
        );

        navigation.navigate(
          'Chat',
          {
            conversationId,
            otherUserName,
            propertyTitle,
          },
        );

        return;
      }

      // =================================================
      // 2. APPOINTMENT CREATED
      // =================================================
      //
      // Buyer ส่งคำขอนัดหมาย
      //
      // Seller ได้ Notification
      //
      // Seller กด
      //        ↓
      // MainTabs
      //        ↓
      // Appointment
      //        ↓
      // SellerAppointmentScreen
      //        ↓
      // "คำขอนัดหมาย"
      //
      // =================================================

      if (
        item.type ===
        'appointment_created'
      ) {
        console.log(
          'OPEN SELLER APPOINTMENT REQUEST',
        );

        navigation.navigate(
          'MainTabs',
          {
            screen: 'Appointment',
          },
        );

        return;
      }

      // =================================================
      // 3. APPOINTMENT CANCELLED
      // =================================================
      //
      // Buyer ยกเลิกคำขอ
      // Notification ไปหา Seller
      //
      // Seller กด
      // -> หน้าคำขอนัดหมาย
      //
      // =================================================

      if (
        item.type ===
        'appointment_cancelled'
      ) {
        console.log(
          'OPEN SELLER CANCELLED APPOINTMENT',
        );

        navigation.navigate(
          'MainTabs',
          {
            screen: 'Appointment',
          },
        );

        return;
      }

      // =================================================
      // 4. APPOINTMENT CONFIRMED
      // =================================================
      //
      // Seller ยืนยัน
      // Notification ไปหา Buyer
      //
      // Buyer กด
      // -> BuyerAppointment
      //
      // =================================================

      if (
        item.type ===
        'appointment_confirmed'
      ) {
        console.log(
          'OPEN BUYER CONFIRMED APPOINTMENT',
        );

        navigation.navigate(
          'BuyerAppointment',
        );

        return;
      }

      // =================================================
      // 5. APPOINTMENT REJECTED
      // =================================================
      //
      // Seller ปฏิเสธ
      // Notification ไปหา Buyer
      //
      // Buyer กด
      // -> BuyerAppointment
      //
      // =================================================

      if (
        item.type ===
        'appointment_rejected'
      ) {
        console.log(
          'OPEN BUYER REJECTED APPOINTMENT',
        );

        navigation.navigate(
          'BuyerAppointment',
        );

        return;
      }

      // =================================================
      // 6. PROPERTY
      // =================================================

      const propertyId =
        getId(item.property);

      if (propertyId) {
        console.log(
          'OPEN PROPERTY:',
          propertyId,
        );

        navigation.navigate(
          'PropertyDetail',
          {
            propertyId,
          },
        );

        return;
      }

      // =================================================
      // NO DESTINATION
      // =================================================

      console.log(
        'Notification ไม่มีปลายทาง:',
        item,
      );
    } catch (error) {
      console.log(
        'NOTIFICATION PRESS ERROR:',
        error?.response?.data ||
          error?.message ||
          error,
      );
    }
  };

  // =====================================================
  // MARK ALL AS READ
  // =====================================================

  const handleMarkAllRead =
    async () => {
      try {
        const hasUnread =
          notifications.some(
            item => !item.isRead,
          );

        if (!hasUnread) {
          return;
        }

        setReadingAll(true);

        setNotifications(
          current =>
            current.map(item => ({
              ...item,
              isRead: true,
            })),
        );

        await markAllNotificationsAsRead();
      } catch (error) {
        console.log(
          'MARK ALL READ ERROR:',
          error?.response?.data ||
            error?.message ||
            error,
        );

        await loadNotifications(
          false,
        );
      } finally {
        setReadingAll(false);
      }
    };

  // =====================================================
  // NOTIFICATION ICON
  // =====================================================

  const getNotificationIcon =
    type => {
      switch (type) {
        case 'appointment_created':
          return {
            name: 'calendar-clock',
            background:
              '#FFF7ED',
            color: '#EA580C',
          };

        case 'appointment_confirmed':
          return {
            name: 'check-circle',
            background:
              '#ECFDF5',
            color: '#16A34A',
          };

        case 'appointment_rejected':
          return {
            name: 'close-circle',
            background:
              '#FEF2F2',
            color: '#DC2626',
          };

        case 'appointment_cancelled':
          return {
            name: 'calendar-remove',
            background:
              '#FFF7ED',
            color: '#F97316',
          };

        case 'new_message':
          return {
            name: 'message-text',
            background:
              '#EFF6FF',
            color: '#2563EB',
          };

        default:
          return {
            name: 'bell',
            background:
              '#F1F5F9',
            color: '#64748B',
          };
      }
    };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate =
    dateValue => {
      if (!dateValue) {
        return '';
      }

      const date =
        new Date(dateValue);

      if (
        Number.isNaN(
          date.getTime(),
        )
      ) {
        return '';
      }

      return date.toLocaleString(
        'th-TH',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        },
      );
    };

  // =====================================================
  // RENDER NOTIFICATION
  // =====================================================

  const renderNotification = ({
    item,
  }) => {
    const icon =
      getNotificationIcon(
        item.type,
      );

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        style={[
          styles.notificationCard,
          !item.isRead &&
            styles.unreadCard,
        ]}
        onPress={() =>
          handleNotificationPress(
            item,
          )
        }>

        {/* ICON */}

        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor:
                icon.background,
            },
          ]}>
          <MaterialDesignIcons
            name={icon.name}
            size={25}
            color={icon.color}
          />
        </View>

        {/* CONTENT */}

        <View
          style={
            styles.notificationContent
          }>

          <View
            style={styles.titleRow}>

            <Text
              numberOfLines={1}
              style={[
                styles.notificationTitle,
                !item.isRead &&
                  styles.unreadTitle,
              ]}>
              {item.title}
            </Text>

            {!item.isRead && (
              <View
                style={
                  styles.unreadDot
                }
              />
            )}

          </View>

          <Text
            style={
              styles.notificationMessage
            }>
            {item.message}
          </Text>

          <View
            style={styles.footer}>

            <MaterialDesignIcons
              name="clock-outline"
              size={14}
              color="#94A3B8"
            />

            <Text
              style={
                styles.dateText
              }>
              {formatDate(
                item.createdAt,
              )}
            </Text>

          </View>

        </View>

        {/* ARROW */}

        <MaterialDesignIcons
          name="chevron-right"
          size={24}
          color="#CBD5E1"
        />

      </TouchableOpacity>
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

        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
        />

        <View
          style={
            styles.loadingContainer
          }>

          <ActivityIndicator
            size="large"
            color="#0F766E"
          />

          <Text
            style={
              styles.loadingText
            }>
            กำลังโหลดการแจ้งเตือน...
          </Text>

        </View>

      </SafeAreaView>
    );
  }

  // =====================================================
  // UNREAD COUNT
  // =====================================================

  const unreadCount =
    notifications.filter(
      item => !item.isRead,
    ).length;

  // =====================================================
  // UI
  // =====================================================

  return (
    <SafeAreaView
      style={styles.container}>

      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      {/* =================================================
          HEADER
      ================================================= */}

      <View
        style={styles.header}>

        <TouchableOpacity
          activeOpacity={0.7}
          style={
            styles.backButton
          }
          onPress={() =>
            navigation.goBack()
          }>

          <MaterialDesignIcons
            name="arrow-left"
            size={26}
            color="#0F172A"
          />

        </TouchableOpacity>

        <View
          style={
            styles.headerTitleContainer
          }>

          <Text
            style={
              styles.headerTitle
            }>
            การแจ้งเตือน
          </Text>

          {unreadCount > 0 ? (
            <Text
              style={
                styles.headerSubtitle
              }>
              {unreadCount}{' '}
              รายการที่ยังไม่ได้อ่าน
            </Text>
          ) : (
            <Text
              style={
                styles.headerSubtitle
              }>
              ไม่มีรายการที่ยังไม่ได้อ่าน
            </Text>
          )}

        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          disabled={
            unreadCount === 0 ||
            readingAll
          }
          style={
            styles.readAllButton
          }
          onPress={
            handleMarkAllRead
          }>

          {readingAll ? (
            <ActivityIndicator
              size="small"
              color="#0F766E"
            />
          ) : (
            <MaterialDesignIcons
              name="check-all"
              size={25}
              color={
                unreadCount > 0
                  ? '#0F766E'
                  : '#CBD5E1'
              }
            />
          )}

        </TouchableOpacity>

      </View>

      {/* =================================================
          NOTIFICATION LIST
      ================================================= */}

      <FlatList
        data={notifications}
        keyExtractor={item =>
          item._id
        }
        renderItem={
          renderNotification
        }
        contentContainerStyle={[
          styles.listContent,

          notifications.length ===
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
            tintColor="#0F766E"
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
                name="bell-outline"
                size={55}
                color="#94A3B8"
              />

            </View>

            <Text
              style={
                styles.emptyTitle
              }>
              ยังไม่มีการแจ้งเตือน
            </Text>

            <Text
              style={
                styles.emptyDescription
              }>
              เมื่อมีการอัปเดตเกี่ยวกับ
              {'\n'}
              การนัดหมายหรือข้อความ
              {'\n'}
              การแจ้งเตือนจะแสดงที่นี่
            </Text>

          </View>
        }
      />

    </SafeAreaView>
  );
};

// =====================================================
// EXPORT
// =====================================================

export default NotificationScreen;

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

    header: {
      minHeight: 95,

      backgroundColor:
        '#FFFFFF',

      flexDirection: 'row',
      alignItems: 'center',

      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 10,

      borderBottomWidth: 1,
      borderBottomColor:
        '#E2E8F0',
    },

    backButton: {
      width: 42,
      height: 42,

      borderRadius: 21,

      justifyContent:
        'center',

      alignItems: 'center',
    },

    headerTitleContainer: {
      flex: 1,
      marginLeft: 4,
    },

    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#0F172A',
    },

    headerSubtitle: {
      marginTop: 2,

      fontSize: 12,

      color: '#64748B',
    },

    readAllButton: {
      width: 42,
      height: 42,

      borderRadius: 21,

      justifyContent:
        'center',

      alignItems: 'center',
    },

    // =================================================
    // LIST
    // =================================================

    listContent: {
      padding: 16,
      paddingBottom: 40,
    },

    notificationCard: {
      flexDirection: 'row',
      alignItems: 'center',

      backgroundColor:
        '#FFFFFF',

      padding: 15,
      marginBottom: 12,

      borderRadius: 18,

      borderWidth: 1,
      borderColor:
        '#E2E8F0',

      elevation: 1,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 1,
      },

      shadowOpacity: 0.04,
      shadowRadius: 3,
    },

    unreadCard: {
      borderColor:
        '#99F6E4',

      backgroundColor:
        '#F0FDFA',
    },

    // =================================================
    // ICON
    // =================================================

    iconContainer: {
      width: 48,
      height: 48,

      borderRadius: 24,

      justifyContent:
        'center',

      alignItems: 'center',

      marginRight: 13,
    },

    // =================================================
    // CONTENT
    // =================================================

    notificationContent: {
      flex: 1,
      paddingRight: 8,
    },

    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    notificationTitle: {
      flex: 1,

      fontSize: 15,

      fontWeight: '600',

      color: '#334155',
    },

    unreadTitle: {
      fontWeight: '800',
      color: '#0F172A',
    },

    unreadDot: {
      width: 8,
      height: 8,

      borderRadius: 4,

      backgroundColor:
        '#0F766E',

      marginLeft: 8,
    },

    notificationMessage: {
      marginTop: 5,

      fontSize: 13.5,

      lineHeight: 20,

      color: '#64748B',
    },

    footer: {
      marginTop: 9,

      flexDirection: 'row',

      alignItems: 'center',
    },

    dateText: {
      marginLeft: 5,

      fontSize: 11.5,

      color: '#94A3B8',
    },

    // =================================================
    // EMPTY
    // =================================================

    emptyListContent: {
      flexGrow: 1,
    },

    emptyContainer: {
      flex: 1,

      justifyContent:
        'center',

      alignItems: 'center',

      paddingHorizontal: 40,
      paddingBottom: 70,
    },

    emptyIcon: {
      width: 100,
      height: 100,

      borderRadius: 50,

      backgroundColor:
        '#F1F5F9',

      justifyContent:
        'center',

      alignItems: 'center',

      marginBottom: 20,
    },

    emptyTitle: {
      fontSize: 19,

      fontWeight: '700',

      color: '#0F172A',

      marginBottom: 8,
    },

    emptyDescription: {
      textAlign: 'center',

      fontSize: 14,

      lineHeight: 22,

      color: '#64748B',
    },

    // =================================================
    // LOADING
    // =================================================

    loadingContainer: {
      flex: 1,

      justifyContent:
        'center',

      alignItems: 'center',
    },

    loadingText: {
      marginTop: 12,

      fontSize: 14,

      color: '#64748B',
    },
  });