
import React, { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';

import api, { API_ORIGIN } from '../services/api';
import FloorPlanViewer from '../components/FloorPlanViewer';
import PropertyMap from '../components/PropertyMap';

import {
  isFavorite,
  toggleFavorite,
} from '../services/favoriteService';

import { startConversation } from '../services/chatService';

import {
  getStoredUser,
  getToken,
} from '../services/authService';

// =====================================
// HELPERS
// =====================================

const formatPrice = value =>
  Number(value || 0).toLocaleString('th-TH');

const getImageUrl = image => {
  if (!image) return null;

  const path =
    typeof image === 'string'
      ? image
      : image.url || image.path || '';

  if (!path) return null;

  if (/^https?:\/\//i.test(path)) return path;

  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
};

// =====================================
// STAT BOX
// =====================================

const StatBox = ({ icon, value, label }) => (
  <View style={styles.statBox}>
    <MaterialDesignIcons
      name={icon}
      size={22}
      color="#0F9D8A"
    />

    <Text style={styles.statValue} numberOfLines={1}>
      {value}
    </Text>

    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// =====================================
// PROPERTY DETAIL SCREEN
// =====================================

const PropertyDetailScreen = ({ route, navigation }) => {
  const propertyId = route.params?.propertyId;

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liked, setLiked] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [checkingOffer, setCheckingOffer] = useState(false);

  // =====================================
  // LOAD PROPERTY
  // =====================================

  useEffect(() => {
    let active = true;

    const loadProperty = async () => {
      if (!propertyId) {
        setError('ไม่พบรหัสบ้าน');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const response = await api.get(
          `/properties/public/${propertyId}`,
        );

        if (active) {
          setProperty(response.data?.property || null);
          setError('');
        }
      } catch (err) {
        console.log('PROPERTY DETAIL ERROR:', err);

        if (active) {
          setError('ไม่สามารถโหลดรายละเอียดบ้านได้');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProperty();

    return () => {
      active = false;
    };
  }, [propertyId]);

  // =====================================
  // CHECK FAVORITE
  // =====================================

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const checkFavorite = async () => {
        if (!propertyId) return;

        try {
          const result = await isFavorite(propertyId);

          if (active) setLiked(Boolean(result));
        } catch (err) {
          console.log('CHECK FAVORITE ERROR:', err);
        }
      };

      checkFavorite();

      return () => {
        active = false;
      };
    }, [propertyId]),
  );

  // =====================================
  // LOGIN / BUYER CHECK
  // =====================================

  const requireBuyer = async (actionName = 'ทำรายการ') => {
    try {
      const [token, user] = await Promise.all([
        getToken(),
        getStoredUser(),
      ]);

      if (!token || !user) {
        Alert.alert(
          'กรุณาเข้าสู่ระบบ',
          `กรุณาเข้าสู่ระบบก่อน${actionName}`,
          [
            { text: 'ยกเลิก', style: 'cancel' },
            {
              text: 'เข้าสู่ระบบ',
              onPress: () => navigation.navigate('Login'),
            },
          ],
        );

        return false;
      }

      if (user.role !== 'buyer') {
        Alert.alert(
          'ไม่สามารถทำรายการได้',
          'ฟังก์ชันนี้สำหรับบัญชีผู้ซื้อเท่านั้น',
        );

        return false;
      }

      return true;
    } catch (err) {
      Alert.alert(
        'เกิดข้อผิดพลาด',
        'ไม่สามารถตรวจสอบข้อมูลผู้ใช้ได้',
      );

      return false;
    }
  };

  // =====================================
  // FAVORITE
  // =====================================

  const handleFavorite = async () => {
    if (!property) return;

    try {
      const result = await toggleFavorite(property);
      setLiked(Boolean(result.isFavorite));
    } catch (err) {
      Alert.alert(
        'เกิดข้อผิดพลาด',
        'ไม่สามารถบันทึกรายการโปรดได้',
      );
    }
  };

  // =====================================
  // BACK
  // =====================================

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs');
    }
  };

  // =====================================
  // SHARE
  // =====================================

  const handleShare = async () => {
    if (!property) return;

    try {
      await Share.share({
        message:
          `${property.title}\n` +
          `ราคา ฿${formatPrice(property.price)}\n` +
          'ดูรายละเอียดบ้านบน HomeMatch',
      });
    } catch (err) {
      console.log('SHARE ERROR:', err);
    }
  };

  // =====================================
  // APPOINTMENT
  // =====================================

  const handleAppointment = () => {
    if (!property?._id) return;

    navigation.navigate('CreateAppointment', {
      propertyId: property._id,
      propertyTitle: property.title,
      propertyImage:
        property.images?.length > 0
          ? property.images[0]
          : null,
      propertyLocation: property.location || null,
    });
  };

  // =====================================
  // CREATE PURCHASE OFFER
  // =====================================

  const handleCreateOffer = async () => {
    if (!property?._id || checkingOffer) return;

    try {
      setCheckingOffer(true);

      const allowed = await requireBuyer('เสนอราคาซื้อบ้าน');

      if (!allowed) return;

      if (property.status && property.status !== 'approved') {
        Alert.alert(
          'ไม่สามารถเสนอราคาได้',
          'ประกาศบ้านนี้ไม่เปิดรับข้อเสนอซื้อ',
        );
        return;
      }

      navigation.navigate('CreateOffer', {
        propertyId: property._id,
        propertyTitle: property.title,
        propertyPrice: property.price,
      });
    } finally {
      setCheckingOffer(false);
    }
  };

  // =====================================
  // MY PURCHASE OFFERS
  // =====================================

  const handleMyOffers = async () => {
    if (checkingOffer) return;

    try {
      setCheckingOffer(true);

      const allowed = await requireBuyer('ดูข้อเสนอซื้อ');

      if (!allowed) return;

      navigation.navigate('MyOffers');
    } finally {
      setCheckingOffer(false);
    }
  };

  // =====================================
  // CHAT WITH SELLER
  // =====================================

  const handleChat = async () => {
    if (!property?._id || startingChat) return;

    try {
      setStartingChat(true);

      const allowed = await requireBuyer('แชทกับผู้ขาย');

      if (!allowed) return;

      const data = await startConversation(property._id);
      const conversation = data?.conversation;

      if (!conversation?._id) {
        throw new Error('CONVERSATION_NOT_FOUND');
      }

      navigation.navigate('Chat', {
        conversationId: conversation._id,

        otherUserName:
          conversation.seller?.name ||
          property.seller?.name ||
          'ผู้ขาย',

        propertyTitle:
          conversation.property?.title ||
          property.title ||
          'ประกาศบ้าน',

        propertyId: property._id,
      });
    } catch (err) {
      console.log(
        'START CHAT ERROR:',
        err?.response?.data || err?.message,
      );

      Alert.alert(
        'ไม่สามารถเริ่มแชทได้',
        err?.response?.data?.message ||
          'กรุณาลองใหม่อีกครั้ง',
      );
    } finally {
      setStartingChat(false);
    }
  };

  // =====================================
  // LOADING
  // =====================================

  if (loading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator size="large" color="#0F9D8A" />
        <Text style={styles.stateText}>
          กำลังโหลดรายละเอียดบ้าน...
        </Text>
      </View>
    );
  }

  // =====================================
  // ERROR
  // =====================================

  if (error || !property) {
    return (
      <View style={styles.stateContainer}>
        <MaterialDesignIcons
          name="alert-circle-outline"
          size={50}
          color="#EF4444"
        />

        <Text style={styles.errorText}>
          {error || 'ไม่พบข้อมูลบ้าน'}
        </Text>

        <Pressable
          style={styles.backErrorButton}
          onPress={handleBack}>
          <Text style={styles.backErrorText}>กลับ</Text>
        </Pressable>
      </View>
    );
  }

  // =====================================
  // PROPERTY DATA
  // =====================================

  const imageUrl =
    property.images?.length > 0
      ? getImageUrl(property.images[0])
      : null;

  const location = [
    property.location?.address,
    property.location?.district,
    property.location?.province,
  ]
    .filter(Boolean)
    .join(', ');

  const latitude = Number(property.location?.latitude);
  const longitude = Number(property.location?.longitude);

  const hasCoordinates =
    property.location?.latitude !== undefined &&
    property.location?.latitude !== null &&
    property.location?.latitude !== '' &&
    property.location?.longitude !== undefined &&
    property.location?.longitude !== null &&
    property.location?.longitude !== '' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  const googleMapsUrl =
    property.location?.googleMapsUrl?.trim() || '';

  const hasMapLocation =
    hasCoordinates || Boolean(googleMapsUrl);

  // =====================================
  // OPEN MAP
  // =====================================

  const handleOpenMap = async () => {
    const targetUrl = hasCoordinates
      ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`
      : googleMapsUrl;

    if (!targetUrl) {
      Alert.alert(
        'ไม่มีตำแหน่งบ้าน',
        'ผู้ขายยังไม่ได้ระบุตำแหน่งบนแผนที่',
      );
      return;
    }

    try {
      await Linking.openURL(targetUrl);
    } catch (err) {
      Alert.alert(
        'เปิดแผนที่ไม่ได้',
        'กรุณาตรวจสอบอินเทอร์เน็ต',
      );
    }
  };

  // =====================================
  // RENDER
  // =====================================

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        {/* HERO IMAGE */}
        <View style={styles.hero}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImage}>
              <MaterialDesignIcons
                name="image-off-outline"
                size={45}
                color="#94A3B8"
              />
              <Text style={styles.noImageText}>
                ไม่มีรูปภาพ
              </Text>
            </View>
          )}
        </View>

        {/* PROPERTY CARD */}
        <View style={styles.propertyCard}>
          <Text style={styles.propertyTitle}>
            {property.title}
          </Text>

          <View style={styles.locationRow}>
            <MaterialDesignIcons
              name="map-marker-outline"
              size={15}
              color="#94A3B8"
            />

            <Text
              style={styles.locationText}
              numberOfLines={2}>
              {location || 'ไม่ระบุที่อยู่'}
            </Text>
          </View>

          <Text style={styles.price}>
            ฿{formatPrice(property.price)}
          </Text>
        </View>

        <View style={styles.content}>
          {/* PROPERTY STATS */}
          <View style={styles.statsRow}>
            <StatBox
              icon="bed-outline"
              value={property.bedrooms ?? 0}
              label="ห้องนอน"
            />
            <StatBox
              icon="shower"
              value={property.bathrooms ?? 0}
              label="ห้องน้ำ"
            />
            <StatBox
              icon="floor-plan"
              value={`${property.area ?? 0}`}
              label="ตร.ม."
            />
            <StatBox
              icon="home-outline"
              value={property.floorPlans?.length ?? 0}
              label="ชั้น/แปลน"
            />
          </View>

          {/* DESCRIPTION */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              รายละเอียด
            </Text>

            <Text style={styles.description}>
              {property.description ||
                'ไม่มีรายละเอียดเพิ่มเติม'}
            </Text>
          </View>

          {/* MAP */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              ตำแหน่งบ้าน
            </Text>

            <View style={styles.mapCard}>
              {hasCoordinates ? (
                <PropertyMap
                  latitude={latitude}
                  longitude={longitude}
                  title={property.title || 'ตำแหน่งบ้าน'}
                  zoom={16}
                />
              ) : (
                <View style={styles.mapEmpty}>
                  <MaterialDesignIcons
                    name="map-marker-outline"
                    size={34}
                    color="#94A3B8"
                  />

                  <Text style={styles.mapEmptyText}>
                    {googleMapsUrl
                      ? 'ผู้ขายระบุลิงก์แผนที่ไว้ กดปุ่มด้านล่างเพื่อดูตำแหน่ง'
                      : 'ผู้ขายยังไม่ได้ระบุพิกัดบ้าน'}
                  </Text>
                </View>
              )}

              {Boolean(location) && (
                <Text style={styles.mapAddress}>
                  {location}
                </Text>
              )}

              {hasMapLocation && (
                <Pressable
                  style={styles.mapButton}
                  onPress={handleOpenMap}>
                  <MaterialDesignIcons
                    name="directions"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text style={styles.mapButtonText}>
                    เปิดตำแหน่งบนแผนที่
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* FLOOR PLAN 2D */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>
                แปลนบ้าน 2D
              </Text>

              <View style={styles.interactiveBadge}>
                <MaterialDesignIcons
                  name="gesture-tap"
                  size={14}
                  color="#0F9D8A"
                />
                <Text style={styles.interactiveText}>
                  Interactive
                </Text>
              </View>
            </View>

            <FloorPlanViewer
              floorPlans={property.floorPlans || []}
              propertyId={property._id}
            />
          </View>

          {/* PURCHASE OFFERS */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              ข้อเสนอซื้อบ้าน
            </Text>

            <Text style={styles.offerDescription}>
              สนใจบ้านหลังนี้? คุณสามารถเสนอราคาที่ต้องการ
              ให้ผู้ขายพิจารณาได้
            </Text>

            <View style={styles.offerCard}>
              <View style={styles.offerInfoRow}>
                <MaterialDesignIcons
                  name="handshake-outline"
                  size={25}
                  color="#0F9D8A"
                />

                <View style={styles.offerInfoText}>
                  <Text style={styles.offerInfoTitle}>
                    เจรจาราคากับผู้ขาย
                  </Text>
                  <Text style={styles.offerInfoSubtitle}>
                    ส่งข้อเสนอและติดตามผลได้ในแอป
                  </Text>
                </View>
              </View>

              <Pressable
                style={styles.offerPrimaryButton}
                onPress={handleCreateOffer}
                disabled={checkingOffer}>
                {checkingOffer ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialDesignIcons
                      name="handshake-outline"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.offerPrimaryText}>
                      เสนอราคาซื้อบ้าน
                    </Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={styles.offerSecondaryButton}
                onPress={handleMyOffers}
                disabled={checkingOffer}>
                <MaterialDesignIcons
                  name="format-list-bulleted"
                  size={20}
                  color="#0F9D8A"
                />
                <Text style={styles.offerSecondaryText}>
                  ดูข้อเสนอซื้อของฉัน
                </Text>
              </Pressable>
            </View>
          </View>

          {/* SELLER */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              ข้อมูลผู้ขาย
            </Text>

            <View style={styles.sellerContainer}>
              <View style={styles.avatar}>
                <MaterialDesignIcons
                  name="account"
                  size={27}
                  color="#FFFFFF"
                />
              </View>

              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>
                  {property.seller?.name ||
                    'ผู้ขาย HomeMatch'}
                </Text>

                <Text style={styles.sellerRole}>
                  เจ้าของประกาศ
                </Text>
              </View>

              <Pressable
                style={styles.chatSellerButton}
                onPress={handleChat}
                disabled={startingChat}>
                {startingChat ? (
                  <ActivityIndicator
                    size="small"
                    color="#0F9D8A"
                  />
                ) : (
                  <MaterialDesignIcons
                    name="message-text-outline"
                    size={21}
                    color="#0F9D8A"
                  />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* TOP ACTIONS */}
      <View
        style={styles.topActionsOverlay}
        pointerEvents="box-none">

        <Pressable
          style={[styles.topActionButton, styles.backButton]}
          onPress={handleBack}>
          <MaterialDesignIcons
            name="chevron-left"
            size={32}
            color="#475569"
          />
        </Pressable>

        <Pressable
          style={[styles.topActionButton, styles.shareButton]}
          onPress={handleShare}>
          <MaterialDesignIcons
            name="share-variant-outline"
            size={22}
            color="#64748B"
          />
        </Pressable>

        <Pressable
          style={[styles.topActionButton, styles.favoriteButton]}
          onPress={handleFavorite}>
          <MaterialDesignIcons
            name={liked ? 'heart' : 'heart-outline'}
            size={27}
            color={liked ? '#EF4444' : '#64748B'}
          />
        </Pressable>
      </View>

      {/* BOTTOM ACTIONS */}
      <View style={styles.bottomActions}>
        <Pressable
          style={[
            styles.secondaryAction,
            liked && styles.secondaryActionLiked,
          ]}
          onPress={handleFavorite}>
          <MaterialDesignIcons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? '#FFFFFF' : '#0F9D8A'}
          />

          <Text
            style={[
              styles.secondaryActionText,
              liked && styles.secondaryActionTextLiked,
            ]}>
            {liked ? 'บันทึกแล้ว' : 'บันทึก'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.chatAction}
          onPress={handleChat}
          disabled={startingChat}>
          {startingChat ? (
            <ActivityIndicator
              size="small"
              color="#0F9D8A"
            />
          ) : (
            <MaterialDesignIcons
              name="message-text-outline"
              size={20}
              color="#0F9D8A"
            />
          )}

          <Text style={styles.chatActionText}>แชท</Text>
        </Pressable>

        <Pressable
          style={styles.primaryAction}
          onPress={handleAppointment}>
          <MaterialDesignIcons
            name="calendar-month-outline"
            size={20}
            color="#FFFFFF"
          />

          <Text style={styles.primaryActionText}>
            นัดดูบ้าน
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default PropertyDetailScreen;

// =====================================
// STYLES
// =====================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },

  hero: {
    height: 300,
    backgroundColor: '#E2E8F0',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    marginTop: 8,
    color: '#94A3B8',
    fontSize: 12,
  },

  topActionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    zIndex: 999,
    elevation: 100,
  },
  topActionButton: {
    position: 'absolute',
    top: 18,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 20,
  },
  backButton: {
    left: 16,
  },
  shareButton: {
    right: 76,
  },
  favoriteButton: {
    right: 16,
  },

  propertyCard: {
    marginHorizontal: 20,
    marginTop: -30,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    elevation: 5,
    zIndex: 2,
  },
  propertyTitle: {
    color: '#1E293B',
    fontSize: 19,
    fontWeight: '800',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  locationText: {
    flex: 1,
    marginLeft: 4,
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
  price: {
    marginTop: 12,
    color: '#0F9D8A',
    fontSize: 23,
    fontWeight: '900',
  },

  content: {
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 18,
  },
  statBox: {
    flex: 1,
    minHeight: 85,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  statValue: {
    marginTop: 4,
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 3,
    color: '#94A3B8',
    fontSize: 9,
  },

  section: {
    marginTop: 25,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  description: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 20,
  },
  interactiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: '#CCFBF1',
  },
  interactiveText: {
    color: '#0F766E',
    fontSize: 10,
    fontWeight: '700',
  },

  mapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    overflow: 'hidden',
    paddingBottom: 12,
  },
  mapEmpty: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#F1F5F9',
  },
  mapEmptyText: {
    marginTop: 8,
    color: '#64748B',
    textAlign: 'center',
    fontSize: 12,
  },
  mapAddress: {
    marginHorizontal: 14,
    marginTop: 12,
    color: '#475569',
    fontSize: 12,
    lineHeight: 19,
  },
  mapButton: {
    marginHorizontal: 12,
    marginTop: 12,
    height: 45,
    borderRadius: 12,
    backgroundColor: '#0F9D8A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  // PURCHASE OFFERS
  offerDescription: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 20,
    marginBottom: 14,
  },
  offerCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  offerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  offerInfoText: {
    flex: 1,
  },
  offerInfoTitle: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '800',
  },
  offerInfoSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 3,
  },
  offerPrimaryButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#0F9D8A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  offerPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  offerSecondaryButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#0F9D8A',
    backgroundColor: '#F0FDFA',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  offerSecondaryText: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '800',
  },

  sellerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#0F9D8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sellerName: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '800',
  },
  sellerRole: {
    marginTop: 3,
    color: '#94A3B8',
    fontSize: 10,
  },
  chatSellerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    elevation: 20,
    zIndex: 500,
  },
  secondaryAction: {
    width: 82,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#0F9D8A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
  },
  secondaryActionText: {
    color: '#0F9D8A',
    fontSize: 11,
    fontWeight: '800',
  },
  secondaryActionLiked: {
    backgroundColor: '#0F9D8A',
  },
  secondaryActionTextLiked: {
    color: '#FFFFFF',
  },
  chatAction: {
    width: 76,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#0F9D8A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F0FDFA',
  },
  chatActionText: {
    color: '#0F766E',
    fontSize: 11,
    fontWeight: '800',
  },
  primaryAction: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#0F9D8A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  stateContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  stateText: {
    marginTop: 10,
    color: '#64748B',
  },
  errorText: {
    marginTop: 12,
    color: '#DC2626',
    textAlign: 'center',
  },
  backErrorButton: {
    marginTop: 15,
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0F9D8A',
  },
  backErrorText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
