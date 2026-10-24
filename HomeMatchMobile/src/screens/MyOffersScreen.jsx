
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';

import api from '../services/api';

const STATUS = {
  pending: {
    label: 'รอพิจารณา',
    color: '#D97706',
    background: '#FFFBEB',
  },
  accepted: {
    label: 'ยอมรับแล้ว',
    color: '#059669',
    background: '#ECFDF5',
  },
  rejected: {
    label: 'ปฏิเสธแล้ว',
    color: '#DC2626',
    background: '#FEF2F2',
  },
  cancelled: {
    label: 'ยกเลิกแล้ว',
    color: '#64748B',
    background: '#F1F5F9',
  },
};

const formatPrice = value =>
  Number(value || 0).toLocaleString('th-TH');

const MyOffersScreen = ({ navigation }) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const fetchOffers = useCallback(async () => {
    try {
      const response = await api.get('/offers/my');

      const data = response.data;

      setOffers(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.offers)
          ? data.offers
          : [],
      );
    } catch (error) {
      console.log('FETCH OFFERS ERROR:', error);

      Alert.alert(
        'เกิดข้อผิดพลาด',
        error.response?.data?.message ||
          'ไม่สามารถโหลดข้อเสนอซื้อได้',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchOffers();
    }, [fetchOffers]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOffers();
  };

  const handleCancel = offerId => {
    Alert.alert(
      'ยืนยันการยกเลิก',
      'ต้องการยกเลิกข้อเสนอซื้อนี้หรือไม่?',
      [
        {
          text: 'ไม่',
          style: 'cancel',
        },
        {
          text: 'ยกเลิกข้อเสนอ',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingId(offerId);

              await api.patch(
                `/offers/${offerId}/cancel`,
              );

              Alert.alert(
                'สำเร็จ',
                'ยกเลิกข้อเสนอซื้อเรียบร้อยแล้ว',
              );

              await fetchOffers();
            } catch (error) {
              Alert.alert(
                'เกิดข้อผิดพลาด',
                error.response?.data?.message ||
                  'ไม่สามารถยกเลิกข้อเสนอได้',
              );
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#0F9D8A"
        />
        <Text style={styles.loadingText}>
          กำลังโหลดข้อเสนอซื้อ...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#0F9D8A']}
        />
      }>

      <Text style={styles.heading}>
        ข้อเสนอซื้อของฉัน
      </Text>

      <Text style={styles.subtitle}>
        ติดตามข้อเสนอราคาที่ส่งให้ผู้ขาย
      </Text>

      {offers.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialDesignIcons
            name="handshake-outline"
            size={55}
            color="#94A3B8"
          />

          <Text style={styles.emptyTitle}>
            ยังไม่มีข้อเสนอซื้อ
          </Text>

          <Text style={styles.emptySubtitle}>
            เมื่อคุณเสนอราคาซื้อบ้าน
            รายการจะแสดงที่หน้านี้
          </Text>

          <Pressable
            style={styles.homeButton}
            onPress={() =>
              navigation.navigate('MainTabs')
            }>
            <Text style={styles.homeButtonText}>
              กลับไปเลือกบ้าน
            </Text>
          </Pressable>
        </View>
      ) : (
        offers.map(offer => {
          const status =
            STATUS[offer.status] || STATUS.pending;

          return (
            <View
              key={offer._id}
              style={styles.card}>

              <View style={styles.cardHeader}>
                <View style={styles.titleContainer}>
                  <Text style={styles.propertyTitle}>
                    {offer.property?.title ||
                      'ไม่พบข้อมูลบ้าน'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        status.background,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.statusText,
                      { color: status.color },
                    ]}>
                    {status.label}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.label}>
                ราคาประกาศ
              </Text>

              <Text style={styles.normalPrice}>
                ฿{formatPrice(offer.property?.price)}
              </Text>

              <Text style={styles.label}>
                ราคาที่คุณเสนอ
              </Text>

              <Text style={styles.offerPrice}>
                ฿{formatPrice(offer.offerPrice)}
              </Text>

              {offer.message ? (
                <View style={styles.messageBox}>
                  <Text style={styles.messageLabel}>
                    ข้อความถึงผู้ขาย
                  </Text>

                  <Text style={styles.messageText}>
                    {offer.message}
                  </Text>
                </View>
              ) : null}

              {offer.createdAt && (
                <Text style={styles.dateText}>
                  ส่งข้อเสนอเมื่อ{' '}
                  {new Date(
                    offer.createdAt,
                  ).toLocaleDateString('th-TH')}
                </Text>
              )}

              {offer.status === 'pending' && (
                <Pressable
                  style={styles.cancelButton}
                  disabled={processingId !== null}
                  onPress={() =>
                    handleCancel(offer._id)
                  }>
                  {processingId === offer._id ? (
                    <ActivityIndicator
                      color="#DC2626"
                    />
                  ) : (
                    <>
                      <MaterialDesignIcons
                        name="close-circle-outline"
                        size={19}
                        color="#DC2626"
                      />

                      <Text style={styles.cancelText}>
                        ยกเลิกข้อเสนอ
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

export default MyOffersScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    paddingBottom: 45,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
  },
  heading: {
    fontSize: 23,
    fontWeight: '800',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    marginBottom: 22,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    marginTop: 25,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#334155',
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 8,
  },
  homeButton: {
    backgroundColor: '#0F9D8A',
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 20,
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  titleContainer: {
    flex: 1,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 15,
  },
  label: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 5,
  },
  normalPrice: {
    color: '#334155',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  offerPrice: {
    color: '#0F9D8A',
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 15,
  },
  messageBox: {
    backgroundColor: '#F8FAFC',
    padding: 13,
    borderRadius: 12,
    marginBottom: 12,
  },
  messageLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  messageText: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 21,
  },
  dateText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 5,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    padding: 13,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  cancelText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
  },
});
