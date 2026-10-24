import React, {useCallback, useState} from 'react';

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {useFocusEffect} from '@react-navigation/native';

import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';

import PropertyCard from '../components/PropertyCard';
import api from '../services/api';

import {
  getUnreadNotificationCount,
} from '../services/notificationService';

// =====================================================
// SELLER HOME SCREEN
// =====================================================

const SellerHomeScreen = ({navigation}) => {
  const [properties, setProperties] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    sold: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [
    unreadNotificationCount,
    setUnreadNotificationCount,
  ] = useState(0);

  // ===================================================
  // LOAD SELLER PROPERTIES
  // ===================================================

  const loadMyProperties = useCallback(async () => {
    try {
      setError('');

      const response = await api.get(
        '/properties/my',
      );

      setProperties(
        response.data?.properties || [],
      );
    } catch (err) {
      console.log(
        'LOAD MY PROPERTIES ERROR:',
        err?.response?.data ||
          err?.message ||
          err,
      );

      setError(
        'ไม่สามารถโหลดประกาศของคุณได้',
      );
    }
  }, []);

  // ===================================================
  // LOAD STATS
  // ===================================================

  const loadStats = useCallback(async () => {
    try {
      const response = await api.get(
        '/properties/my/stats',
      );

      setStats({
        total: response.data?.total || 0,
        pending: response.data?.pending || 0,
        approved:
          response.data?.approved || 0,
        rejected:
          response.data?.rejected || 0,
        sold: response.data?.sold || 0,
      });
    } catch (err) {
      console.log(
        'LOAD SELLER STATS ERROR:',
        err?.response?.data ||
          err?.message ||
          err,
      );
    }
  }, []);

  // ===================================================
  // NOTIFICATION COUNT
  // ===================================================

  const loadNotificationCount =
    useCallback(async () => {
      try {
        const result =
          await getUnreadNotificationCount();

        setUnreadNotificationCount(
          result?.count || 0,
        );
      } catch (err) {
        setUnreadNotificationCount(0);
      }
    }, []);

  // ===================================================
  // LOAD SCREEN
  // ===================================================

  const loadScreen = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        await Promise.all([
          loadMyProperties(),
          loadStats(),
          loadNotificationCount(),
        ]);
      } finally {
        if (showLoading) {
          setLoading(false);
        }

        setRefreshing(false);
      }
    },
    [
      loadMyProperties,
      loadStats,
      loadNotificationCount,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      loadScreen();

      return () => {};
    }, [loadScreen]),
  );

  // ===================================================
  // REFRESH
  // ===================================================

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadScreen(false);
  };

  // ===================================================
  // NAVIGATION
  // ===================================================

  const handleNotification = () => {
    navigation.navigate('Notification');
  };

  const handlePropertyPress = property => {
    if (!property?._id) {
      return;
    }

    /*
      หมายเหตุ:
      PropertyDetail public API เปิดได้เฉพาะ approved
      เพราะฉะนั้นตอนนี้ให้เปิดรายละเอียดเฉพาะ
      ประกาศที่ approved ก่อน
    */

    if (property.status === 'approved') {
      navigation.navigate(
        'PropertyDetail',
        {
          propertyId: property._id,
        },
      );

      return;
    }

    console.log(
      'PROPERTY STATUS:',
      property.status,
    );
  };

  // ===================================================
  // STATUS
  // ===================================================

  const getStatusConfig = status => {
    switch (status) {
      case 'approved':
        return {
          label: 'อนุมัติแล้ว',
          icon: 'check-circle',
          background: '#ECFDF5',
          color: '#16A34A',
        };

      case 'rejected':
        return {
          label: 'ไม่อนุมัติ',
          icon: 'close-circle',
          background: '#FEF2F2',
          color: '#DC2626',
        };

      case 'sold':
        return {
          label: 'ขายแล้ว',
          icon: 'home-check',
          background: '#EFF6FF',
          color: '#2563EB',
        };

      default:
        return {
          label: 'รอตรวจสอบ',
          icon: 'clock-outline',
          background: '#FFF7ED',
          color: '#EA580C',
        };
    }
  };

  // ===================================================
  // STAT CARD
  // ===================================================

  const StatCard = ({
    title,
    value,
    icon,
    iconBackground,
    iconColor,
  }) => {
    return (
      <View style={styles.statCard}>
        <View
          style={[
            styles.statIcon,
            {
              backgroundColor:
                iconBackground,
            },
          ]}>
          <MaterialDesignIcons
            name={icon}
            size={22}
            color={iconColor}
          />
        </View>

        <View style={styles.statText}>
          <Text style={styles.statValue}>
            {value}
          </Text>

          <Text style={styles.statTitle}>
            {title}
          </Text>
        </View>
      </View>
    );
  };

  // ===================================================
  // PROPERTY
  // ===================================================

  const SellerPropertyItem = ({
    property,
  }) => {
    const status =
      getStatusConfig(property.status);

    return (
      <View
        style={styles.propertyContainer}>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  status.background,
              },
            ]}>
            <MaterialDesignIcons
              name={status.icon}
              size={15}
              color={status.color}
            />

            <Text
              style={[
                styles.statusText,
                {
                  color: status.color,
                },
              ]}>
              {status.label}
            </Text>
          </View>
        </View>

        <PropertyCard
          property={property}
          onPress={handlePropertyPress}
        />

        {property.status ===
          'rejected' &&
          property.rejectionReason ? (
          <View
            style={
              styles.rejectionContainer
            }>
            <MaterialDesignIcons
              name="alert-circle-outline"
              size={18}
              color="#DC2626"
            />

            <View
              style={
                styles.rejectionContent
              }>
              <Text
                style={
                  styles.rejectionTitle
                }>
                เหตุผลที่ไม่อนุมัติ
              </Text>

              <Text
                style={
                  styles.rejectionText
                }>
                {
                  property.rejectionReason
                }
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  // ===================================================
  // LOADING
  // ===================================================

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }>
        <ActivityIndicator
          size="large"
          color="#0F766E"
        />

        <Text style={styles.loadingText}>
          กำลังโหลดประกาศของคุณ...
        </Text>
      </View>
    );
  }

  // ===================================================
  // UI
  // ===================================================

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0F766E"
          />
        }>

        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text
                style={
                  styles.welcomeText
                }>
                Seller Dashboard
              </Text>

              <Text
                style={styles.userText}>
                ประกาศของฉัน 🏠
              </Text>
            </View>

            <Pressable
              onPress={
                handleNotification
              }
              style={({pressed}) => [
                styles.notification,
                pressed && {
                  opacity: 0.7,
                },
              ]}>
              <MaterialDesignIcons
                name={
                  unreadNotificationCount >
                  0
                    ? 'bell'
                    : 'bell-outline'
                }
                size={23}
                color="#334155"
              />

              {unreadNotificationCount >
                0 && (
                <View
                  style={
                    styles.notificationBadge
                  }>
                  <Text
                    style={
                      styles.notificationBadgeText
                    }>
                    {unreadNotificationCount >
                    99
                      ? '99+'
                      : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          <Text
            style={
              styles.headerDescription
            }>
            จัดการและติดตามสถานะประกาศบ้านของคุณ
          </Text>
        </View>

        {/* CONTENT */}

        <View style={styles.content}>

          {/* STATS */}

          <Text
            style={
              styles.sectionTitle
            }>
            ภาพรวมประกาศ
          </Text>

          <View style={styles.statsGrid}>
            <StatCard
              title="ทั้งหมด"
              value={stats.total}
              icon="home-city-outline"
              iconBackground="#F1F5F9"
              iconColor="#475569"
            />

            <StatCard
              title="รอตรวจสอบ"
              value={stats.pending}
              icon="clock-outline"
              iconBackground="#FFF7ED"
              iconColor="#EA580C"
            />

            <StatCard
              title="อนุมัติแล้ว"
              value={stats.approved}
              icon="check-circle-outline"
              iconBackground="#ECFDF5"
              iconColor="#16A34A"
            />

            <StatCard
              title="ไม่อนุมัติ"
              value={stats.rejected}
              icon="close-circle-outline"
              iconBackground="#FEF2F2"
              iconColor="#DC2626"
            />
          </View>

          {/* PROPERTY HEADER */}

          <View
            style={
              styles.propertyHeader
            }>
            <Text
              style={
                styles.sectionTitle
              }>
              ประกาศของฉัน
            </Text>

            <View
              style={
                styles.totalBadge
              }>
              <Text
                style={
                  styles.totalBadgeText
                }>
                {properties.length}{' '}
                รายการ
              </Text>
            </View>
          </View>

          {/* ERROR */}

          {error ? (
            <View
              style={
                styles.errorContainer
              }>
              <MaterialDesignIcons
                name="alert-circle-outline"
                size={25}
                color="#DC2626"
              />

              <Text
                style={styles.errorText}>
                {error}
              </Text>

              <Pressable
                onPress={() =>
                  loadScreen()
                }>
                <Text
                  style={
                    styles.retryText
                  }>
                  ลองใหม่
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* EMPTY */}

          {!error &&
          properties.length === 0 ? (
            <View
              style={
                styles.emptyContainer
              }>
              <View
                style={
                  styles.emptyIcon
                }>
                <MaterialDesignIcons
                  name="home-plus-outline"
                  size={48}
                  color="#94A3B8"
                />
              </View>

              <Text
                style={
                  styles.emptyTitle
                }>
                ยังไม่มีประกาศ
              </Text>

              <Text
                style={
                  styles.emptyDescription
                }>
                ประกาศบ้านที่คุณเพิ่มจะปรากฏที่นี่
              </Text>
            </View>
          ) : null}

          {/* LIST */}

          {!error &&
            properties.map(property => (
              <SellerPropertyItem
                key={property._id}
                property={property}
              />
            ))}

          <View
            style={styles.bottomSpace}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default SellerHomeScreen;

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
    fontSize: 14,
  },

  // HEADER

  header: {
    backgroundColor: '#0F766E',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 27,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
  },

  welcomeText: {
    color: '#CCFBF1',
    fontSize: 12,
  },

  userText: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },

  headerDescription: {
    marginTop: 13,
    color: '#CCFBF1',
    fontSize: 13,
    lineHeight: 19,
  },

  notification: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  notificationBadge: {
    position: 'absolute',
    right: -5,
    top: -5,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#F97316',
    borderWidth: 2,
    borderColor: '#0F766E',
    justifyContent: 'center',
    alignItems: 'center',
  },

  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  // CONTENT

  content: {
    paddingHorizontal: 18,
    paddingTop: 22,
  },

  sectionTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },

  // STATS

  statsGrid: {
    marginTop: 13,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent:
      'space-between',
    rowGap: 10,
  },

  statCard: {
    width: '48.5%',
    minHeight: 90,
    padding: 13,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },

  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statText: {
    marginLeft: 10,
    flex: 1,
  },

  statValue: {
    color: '#0F172A',
    fontSize: 21,
    fontWeight: '800',
  },

  statTitle: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 11,
  },

  // PROPERTY

  propertyHeader: {
    marginTop: 27,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
  },

  totalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#CCFBF1',
  },

  totalBadgeText: {
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '700',
  },

  propertyContainer: {
    marginBottom: 20,
  },

  statusRow: {
    marginBottom: 8,
    alignItems: 'flex-start',
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '800',
  },

  // REJECT

  rejectionContainer: {
    marginTop: 9,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
  },

  rejectionContent: {
    marginLeft: 8,
    flex: 1,
  },

  rejectionTitle: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '800',
  },

  rejectionText: {
    marginTop: 3,
    color: '#B91C1C',
    fontSize: 12,
    lineHeight: 18,
  },

  // ERROR

  errorContainer: {
    padding: 20,
    borderRadius: 15,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
  },

  errorText: {
    marginTop: 7,
    color: '#DC2626',
    fontSize: 13,
  },

  retryText: {
    marginTop: 10,
    color: '#0F766E',
    fontWeight: '800',
  },

  // EMPTY

  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyTitle: {
    marginTop: 16,
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },

  emptyDescription: {
    marginTop: 6,
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
  },

  bottomSpace: {
    height: 50,
  },
});