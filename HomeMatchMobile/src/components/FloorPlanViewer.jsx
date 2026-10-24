
import React, {useEffect, useState} from 'react';

import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {useNavigation} from '@react-navigation/native';

import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';

import {API_ORIGIN} from '../services/api';

// =====================================
// IMAGE URL
// =====================================

const getImageUrl = image => {
  const path =
    typeof image === 'string'
      ? image
      : image?.url ||
        image?.imageUrl ||
        image?.path ||
        image?.filename;

  if (!path || typeof path !== 'string') {
    return null;
  }

  if (
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }

  if (!API_ORIGIN) {
    return null;
  }

  const baseUrl = API_ORIGIN.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');

  return `${baseUrl}/${cleanPath}`;
};

// =====================================
// MARKER POSITION
// =====================================

const clampPercent = value => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.min(100, Math.max(0, number));
};

// =====================================
// FLOOR PLAN VIEWER
// =====================================

const FloorPlanViewer = ({
  floorPlans = [],
  propertyId,
}) => {
  const navigation = useNavigation();

  const {width: screenWidth} = useWindowDimensions();

  const [selectedFloorIndex, setSelectedFloorIndex] =
    useState(0);

  const [selectedRoom, setSelectedRoom] =
    useState(null);

  const [imageRatio, setImageRatio] =
    useState(1.4);

  const [imageLoading, setImageLoading] =
    useState(false);

  // =====================================
  // CURRENT FLOOR
  // =====================================

  const plans = Array.isArray(floorPlans)
    ? floorPlans
    : [];

  const currentFloor = plans[selectedFloorIndex];

  const floorPlanImageUrl = getImageUrl(
    currentFloor?.imageUrl,
  );

  const rooms = Array.isArray(currentFloor?.rooms)
    ? currentFloor.rooms
    : [];

  // =====================================
  // RESET FLOOR
  // =====================================

  useEffect(() => {
    if (selectedFloorIndex >= plans.length) {
      setSelectedFloorIndex(0);
      setSelectedRoom(null);
    }
  }, [plans.length, selectedFloorIndex]);

  // =====================================
  // GET IMAGE SIZE
  // =====================================

  useEffect(() => {
    let active = true;

    if (!floorPlanImageUrl) {
      setImageRatio(1.4);
      setImageLoading(false);

      return () => {
        active = false;
      };
    }

    setImageLoading(true);
    setImageRatio(1.4);

    Image.getSize(
      floorPlanImageUrl,
      (width, height) => {
        if (!active) return;

        if (width > 0 && height > 0) {
          setImageRatio(width / height);
        }

        setImageLoading(false);
      },
      error => {
        if (!active) return;

        console.log(
          'Floor Plan Image Size Error:',
          error,
        );

        setImageRatio(1.4);
        setImageLoading(false);
      },
    );

    return () => {
      active = false;
    };
  }, [floorPlanImageUrl]);

  // =====================================
  // SELECT FLOOR
  // =====================================

  const handleSelectFloor = index => {
    setSelectedFloorIndex(index);
    setSelectedRoom(null);
  };

  // =====================================
  // CUSTOMIZE ROOM
  // =====================================

  const handleCustomizeRoom = () => {
    if (!selectedRoom || !currentFloor) {
      return;
    }

    const room = selectedRoom;

    setSelectedRoom(null);

    navigation.navigate('RoomCustomizer', {
      propertyId: propertyId || null,
      room,
      floor: currentFloor.floor,
      floorPlanImage: currentFloor.imageUrl,
    });
  };

  // =====================================
  // EMPTY
  // =====================================

  if (plans.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialDesignIcons
          name="floor-plan"
          size={42}
          color="#94A3B8"
        />

        <Text style={styles.emptyTitle}>
          ยังไม่มีแปลนบ้าน
        </Text>

        <Text style={styles.emptyDescription}>
          ผู้ขายยังไม่ได้เพิ่มแปลน 2D
          สำหรับประกาศนี้
        </Text>
      </View>
    );
  }

  const planWidth = Math.max(
    200,
    screenWidth - 40,
  );

  // =====================================
  // UI
  // =====================================

  return (
    <View style={styles.container}>
      {/* FLOOR SELECTOR */}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.floorSelector}>
        {plans.map((plan, index) => {
          const active = selectedFloorIndex === index;

          return (
            <Pressable
              key={
                plan._id ||
                `${plan.floor}-${index}`
              }
              style={[
                styles.floorButton,
                active && styles.floorButtonActive,
              ]}
              onPress={() => handleSelectFloor(index)}>
              <MaterialDesignIcons
                name="layers-outline"
                size={17}
                color={
                  active ? '#FFFFFF' : '#64748B'
                }
              />

              <Text
                style={[
                  styles.floorButtonText,
                  active &&
                    styles.floorButtonTextActive,
                ]}>
                ชั้น {plan.floor}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* PLAN INFO */}

      <View style={styles.planInfo}>
        <View>
          <Text style={styles.planTitle}>
            แปลนชั้น {currentFloor?.floor}
          </Text>

          <Text style={styles.roomCount}>
            {rooms.length} ห้อง
          </Text>
        </View>

        <View style={styles.tapBadge}>
          <MaterialDesignIcons
            name="gesture-tap"
            size={15}
            color="#0F766E"
          />

          <Text style={styles.tapBadgeText}>
            แตะ Marker
          </Text>
        </View>
      </View>

      {/* FLOOR PLAN */}

      {floorPlanImageUrl ? (
        <View
          style={[
            styles.planContainer,
            {
              width: planWidth,
              aspectRatio: imageRatio,
            },
          ]}>
          <Image
            source={{uri: floorPlanImageUrl}}
            style={styles.planImage}
            resizeMode="contain"
          />

          {imageLoading && (
            <View style={styles.imageLoadingContainer}>
              <ActivityIndicator
                size="large"
                color="#0F9D8A"
              />

              <Text style={styles.imageLoadingText}>
                กำลังโหลดแปลน...
              </Text>
            </View>
          )}

          {/* ROOM MARKERS */}

          {!imageLoading &&
            rooms.map((room, index) => {
              const x = clampPercent(room.x);
              const y = clampPercent(room.y);

              if (x === null || y === null) {
                return null;
              }

              return (
                <Pressable
                  key={
                    room._id ||
                    `${room.name}-${index}`
                  }
                  style={[
                    styles.markerContainer,
                    {
                      left: `${Math.min(95, Math.max(5, x))}%`,
                      top: `${Math.min(95, Math.max(5, y))}%`,
                    },
                  ]}
                  hitSlop={10}
                  onPress={() => setSelectedRoom(room)}>
                  <View style={styles.markerCircle}>
                    <MaterialDesignIcons
                      name="map-marker"
                      size={22}
                      color="#FFFFFF"
                    />
                  </View>

                  <View style={styles.markerLabel}>
                    <Text
                      style={styles.markerLabelText}
                      numberOfLines={1}>
                      {room.name || 'ห้อง'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
        </View>
      ) : (
        <View style={styles.noPlanContainer}>
          <MaterialDesignIcons
            name="image-off-outline"
            size={40}
            color="#94A3B8"
          />

          <Text style={styles.noPlanText}>
            ไม่มีรูปแปลนสำหรับชั้นนี้
          </Text>
        </View>
      )}

      {/* HELP */}

      <View style={styles.helpContainer}>
        <MaterialDesignIcons
          name="information-outline"
          size={17}
          color="#64748B"
        />

        <Text style={styles.helpText}>
          แตะจุดบนแปลนเพื่อดูรายละเอียดของแต่ละห้อง
        </Text>
      </View>

      {/* ROOM MODAL */}

      <Modal
        visible={!!selectedRoom}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSelectedRoom(null)}>
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setSelectedRoom(null)}
          />

          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />

            {/* ROOM HEADER */}

            <View style={styles.roomHeader}>
              <View style={styles.roomIcon}>
                <MaterialDesignIcons
                  name="door"
                  size={25}
                  color="#0F766E"
                />
              </View>

              <View style={styles.roomHeaderText}>
                <Text style={styles.roomTitle}>
                  {selectedRoom?.name || 'ห้อง'}
                </Text>

                <Text style={styles.roomFloor}>
                  ชั้น {currentFloor?.floor}
                </Text>
              </View>

              <Pressable
                style={styles.closeButton}
                onPress={() => setSelectedRoom(null)}>
                <MaterialDesignIcons
                  name="close"
                  size={23}
                  color="#475569"
                />
              </Pressable>
            </View>

            {/* SCROLLABLE CONTENT */}

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={
                styles.modalScrollContent
              }
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled>
              <View
                style={
                  styles.roomDescriptionContainer
                }>
                <Text
                  style={
                    styles.roomDescriptionTitle
                  }>
                  รายละเอียดห้อง
                </Text>

                <Text style={styles.roomDescription}>
                  {selectedRoom?.description ||
                    'ยังไม่มีรายละเอียดห้อง'}
                </Text>
              </View>

              <Text style={styles.roomImageTitle}>
                รูปภาพห้อง
              </Text>

              {selectedRoom?.images?.length > 0 ? (
                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={
                    styles.roomImageList
                  }>
                  {selectedRoom.images.map(
                    (image, index) => {
                      const url = getImageUrl(image);

                      if (!url) return null;

                      return (
                        <Image
                          key={`${index}-${url}`}
                          source={{uri: url}}
                          style={styles.roomImage}
                          resizeMode="cover"
                        />
                      );
                    },
                  )}
                </ScrollView>
              ) : (
                <View
                  style={
                    styles.noRoomImageContainer
                  }>
                  <MaterialDesignIcons
                    name="image-outline"
                    size={35}
                    color="#CBD5E1"
                  />

                  <Text
                    style={styles.noRoomImageText}>
                    ไม่มีรูปภาพห้อง
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* CUSTOMIZE BUTTON */}

            <Pressable
              style={styles.customizeButton}
              onPress={handleCustomizeRoom}>
              <View
                style={styles.customizeButtonIcon}>
                <MaterialDesignIcons
                  name="sofa-outline"
                  size={23}
                  color="#FFFFFF"
                />
              </View>

              <View
                style={
                  styles.customizeButtonContent
                }>
                <Text
                  style={
                    styles.customizeButtonTitle
                  }>
                  ปรับแต่งห้อง
                </Text>

                <Text
                  style={
                    styles.customizeButtonDescription
                  }>
                  ทดลองจัดวางเฟอร์นิเจอร์และออกแบบห้อง
                </Text>
              </View>

              <MaterialDesignIcons
                name="chevron-right"
                size={25}
                color="#FFFFFF"
              />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default FloorPlanViewer;

// =====================================
// STYLES
// =====================================

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  floorSelector: {
    gap: 8,
    paddingBottom: 14,
  },

  floorButton: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  floorButtonActive: {
    backgroundColor: '#0F9D8A',
    borderColor: '#0F9D8A',
  },

  floorButtonText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },

  floorButtonTextActive: {
    color: '#FFFFFF',
  },

  planInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  planTitle: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '800',
  },

  roomCount: {
    marginTop: 2,
    color: '#94A3B8',
    fontSize: 11,
  },

  tapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#CCFBF1',
  },

  tapBadgeText: {
    color: '#0F766E',
    fontSize: 10,
    fontWeight: '700',
  },

  planContainer: {
    position: 'relative',
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  planImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },

  imageLoadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },

  imageLoadingText: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 11,
  },

  markerContainer: {
    position: 'absolute',
    alignItems: 'center',
    transform: [
      {translateX: -18},
      {translateY: -18},
    ],
    zIndex: 20,
  },

  markerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F9D8A',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },

  markerLabel: {
    marginTop: 3,
    maxWidth: 90,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor:
      'rgba(15, 118, 110, 0.92)',
  },

  markerLabelText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },

  helpContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  helpText: {
    color: '#64748B',
    fontSize: 10,
  },

  emptyContainer: {
    minHeight: 180,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  emptyTitle: {
    marginTop: 10,
    color: '#475569',
    fontSize: 14,
    fontWeight: '800',
  },

  emptyDescription: {
    marginTop: 5,
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
  },

  noPlanContainer: {
    height: 180,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  noPlanText: {
    marginTop: 8,
    color: '#94A3B8',
    fontSize: 11,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.50)',
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  modalContent: {
    maxHeight: '85%',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 25,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },

  modalHandle: {
    width: 45,
    height: 5,
    borderRadius: 5,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 18,
  },

  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  roomIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  roomHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  roomTitle: {
    color: '#1E293B',
    fontSize: 18,
    fontWeight: '800',
  },

  roomFloor: {
    marginTop: 3,
    color: '#94A3B8',
    fontSize: 11,
  },

  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalScroll: {
    flexShrink: 1,
    marginTop: 4,
  },

  modalScrollContent: {
    paddingBottom: 8,
  },

  roomDescriptionContainer: {
    marginTop: 20,
    padding: 14,
    borderRadius: 13,
    backgroundColor: '#F8FAFC',
  },

  roomDescriptionTitle: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },

  roomDescription: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 12,
    lineHeight: 19,
  },

  roomImageTitle: {
    marginTop: 20,
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '800',
  },

  roomImageList: {
    marginTop: 10,
    gap: 10,
  },

  roomImage: {
    width: 210,
    height: 140,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },

  noRoomImageContainer: {
    height: 100,
    marginTop: 10,
    borderRadius: 13,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  noRoomImageText: {
    marginTop: 5,
    color: '#94A3B8',
    fontSize: 11,
  },

  customizeButton: {
    minHeight: 72,
    marginTop: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#0F9D8A',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
  },

  customizeButtonIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor:
      'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  customizeButtonContent: {
    flex: 1,
    marginLeft: 12,
  },

  customizeButtonTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  customizeButtonDescription: {
    marginTop: 3,
    color: '#CCFBF1',
    fontSize: 10,
  },
});
