import React, {
  useCallback,
  useState,
} from 'react';

import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  useFocusEffect,
} from '@react-navigation/native';

import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';

import {
  API_ORIGIN,
} from '../services/api';

import {
  getFavorites,
  removeFavorite,
} from '../services/favoriteService';

const FavoriteScreen = ({
  navigation,
}) => {
  const [favorites, setFavorites] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  // =====================================================
  // LOAD FAVORITES
  // =====================================================

  const loadFavorites =
    useCallback(async () => {
      try {
        setLoading(true);

        const data =
          await getFavorites();

        setFavorites(
          Array.isArray(data)
            ? data
            : [],
        );
      } catch (error) {
        console.log(
          'LOAD FAVORITES ERROR:',
          error,
        );

        setFavorites([]);
      } finally {
        setLoading(false);
      }
    }, []);

  // =====================================================
  // REFRESH WHEN FOCUS
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites]),
  );

  // =====================================================
  // REMOVE FAVORITE
  // =====================================================

  const handleRemove =
    async propertyId => {
      if (!propertyId) {
        return;
      }

      try {
        const newFavorites =
          await removeFavorite(
            propertyId,
          );

        setFavorites(
          Array.isArray(newFavorites)
            ? newFavorites
            : [],
        );
      } catch (error) {
        console.log(
          'REMOVE FAVORITE ERROR:',
          error,
        );
      }
    };

  // =====================================================
  // OPEN PROPERTY
  // =====================================================

  const handleOpenProperty =
    property => {
      if (!property?._id) {
        return;
      }

      navigation.navigate(
        'PropertyDetail',
        {
          propertyId:
            property._id,
        },
      );
    };

  // =====================================================
  // BACK
  // =====================================================

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

  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearch = () => {
    navigation.navigate(
      'MainTabs',
      {
        screen: 'Search',
      },
    );
  };

  // =====================================================
  // PROPERTY CARD
  // =====================================================

  const renderProperty = ({
    item,
  }) => {
    const imageUrl =
      item.images?.length > 0
        ? `${API_ORIGIN}${item.images[0]}`
        : null;

    const price = Number(
      item.price || 0,
    ).toLocaleString('th-TH');

    const location = [
      item.location?.district,
      item.location?.province,
    ]
      .filter(Boolean)
      .join(', ');

    return (
      <Pressable
        style={
          styles.propertyCard
        }
        onPress={() =>
          handleOpenProperty(
            item,
          )
        }>

        {/* IMAGE */}

        <View
          style={
            styles.imageContainer
          }>

          {imageUrl ? (
            <Image
              source={{
                uri: imageUrl,
              }}
              style={
                styles.propertyImage
              }
              resizeMode="cover"
            />
          ) : (
            <View
              style={
                styles.noImage
              }>

              <MaterialDesignIcons
                name="image-off-outline"
                size={38}
                color="#94A3B8"
              />

              <Text
                style={
                  styles.noImageText
                }>
                ไม่มีรูปภาพ
              </Text>

            </View>
          )}

          {/* FAVORITE BUTTON */}

          <Pressable
            style={
              styles.favoriteButton
            }
            hitSlop={10}
            onPress={event => {
              event.stopPropagation();

              handleRemove(
                item._id,
              );
            }}>

            <MaterialDesignIcons
              name="heart"
              size={24}
              color="#EF4444"
            />

          </Pressable>

        </View>

        {/* PROPERTY INFO */}

        <View
          style={
            styles.propertyInfo
          }>

          <Text
            style={
              styles.propertyTitle
            }
            numberOfLines={1}>

            {item.title}

          </Text>

          {/* LOCATION */}

          <View
            style={
              styles.locationRow
            }>

            <MaterialDesignIcons
              name="map-marker-outline"
              size={15}
              color="#94A3B8"
            />

            <Text
              style={
                styles.locationText
              }
              numberOfLines={1}>

              {location ||
                'ไม่ระบุที่อยู่'}

            </Text>

          </View>

          {/* DETAILS */}

          <View
            style={
              styles.detailsRow
            }>

            <View
              style={
                styles.detailItem
              }>

              <MaterialDesignIcons
                name="bed-outline"
                size={17}
                color="#64748B"
              />

              <Text
                style={
                  styles.detailText
                }>

                {item.bedrooms ?? 0}{' '}
                ห้องนอน

              </Text>

            </View>

            <View
              style={
                styles.detailItem
              }>

              <MaterialDesignIcons
                name="shower"
                size={17}
                color="#64748B"
              />

              <Text
                style={
                  styles.detailText
                }>

                {item.bathrooms ?? 0}{' '}
                ห้องน้ำ

              </Text>

            </View>

          </View>

          {/* PRICE + DETAIL */}

          <View
            style={
              styles.cardBottom
            }>

            <Text
              style={
                styles.price
              }>
              ฿{price}
            </Text>

            <View
              style={
                styles.detailButton
              }>

              <Text
                style={
                  styles.detailButtonText
                }>
                ดูรายละเอียด
              </Text>

              <MaterialDesignIcons
                name="chevron-right"
                size={19}
                color="#0F9D8A"
              />

            </View>

          </View>

        </View>

      </Pressable>
    );
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <View
      style={
        styles.container
      }>

      {/* =================================================
          HEADER
      ================================================= */}

      <View
        style={
          styles.header
        }>

        <View
          style={
            styles.headerLeft
          }>

          {/* BACK BUTTON */}

          <Pressable
            style={
              styles.backButton
            }
            hitSlop={10}
            onPress={
              handleBack
            }>

            <MaterialDesignIcons
              name="chevron-left"
              size={30}
              color="#FFFFFF"
            />

          </Pressable>

          {/* TITLE */}

          <View
            style={
              styles.headerTextContainer
            }>

            <Text
              style={
                styles.headerTitle
              }>
              รายการโปรด
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }>
              บ้านที่คุณบันทึกไว้
            </Text>

          </View>

        </View>

        {/* COUNT */}

        <View
          style={
            styles.favoriteCount
          }>

          <MaterialDesignIcons
            name="heart"
            size={17}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.favoriteCountText
            }>

            {favorites.length}

          </Text>

        </View>

      </View>

      {/* =================================================
          CONTENT
      ================================================= */}

      {loading ? (
        <View
          style={
            styles.centerContainer
          }>

          <MaterialDesignIcons
            name="heart-outline"
            size={45}
            color="#0F9D8A"
          />

          <Text
            style={
              styles.loadingText
            }>
            กำลังโหลดรายการโปรด...
          </Text>

        </View>
      ) : (
        <FlatList
          data={
            favorites
          }

          keyExtractor={
            item => item._id
          }

          renderItem={
            renderProperty
          }

          showsVerticalScrollIndicator={
            false
          }

          contentContainerStyle={[
            styles.listContent,

            favorites.length === 0 &&
              styles.emptyList,
          ]}

          ListHeaderComponent={
            favorites.length > 0 ? (
              <View
                style={
                  styles.listHeader
                }>

                <Text
                  style={
                    styles.listTitle
                  }>
                  บ้านที่บันทึกไว้
                </Text>

                <Text
                  style={
                    styles.listCount
                  }>

                  {favorites.length}{' '}
                  รายการ

                </Text>

              </View>
            ) : null
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
                  name="heart-outline"
                  size={55}
                  color="#0F9D8A"
                />

              </View>

              <Text
                style={
                  styles.emptyTitle
                }>
                ยังไม่มีรายการโปรด
              </Text>

              <Text
                style={
                  styles.emptyDescription
                }>
                กดไอคอนหัวใจบนบ้านที่คุณสนใจ
                แล้วบ้านจะถูกบันทึกไว้ที่นี่
              </Text>

              <Pressable
                style={
                  styles.searchButton
                }
                onPress={
                  handleSearch
                }>

                <MaterialDesignIcons
                  name="magnify"
                  size={20}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.searchButtonText
                  }>
                  ค้นหาบ้าน
                </Text>

              </Pressable>

            </View>
          }
        />
      )}

    </View>
  );
};

export default FavoriteScreen;

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
      minHeight: 125,

      paddingHorizontal: 16,

      // เลื่อน Header ลงจาก Status Bar
      paddingTop: 40,

      paddingBottom: 20,

      backgroundColor:
        '#0F766E',

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
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

      backgroundColor:
        'rgba(255,255,255,0.15)',
    },

    headerTextContainer: {
      flex: 1,
    },

    headerTitle: {
      color: '#FFFFFF',

      fontSize: 25,
      fontWeight: '900',
    },

    headerSubtitle: {
      marginTop: 4,

      color: '#CCFBF1',

      fontSize: 12,
    },

    favoriteCount: {
      minWidth: 48,
      height: 38,

      paddingHorizontal: 12,

      borderRadius: 19,

      backgroundColor:
        'rgba(255,255,255,0.18)',

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',

      gap: 5,
    },

    favoriteCountText: {
      color: '#FFFFFF',

      fontSize: 13,
      fontWeight: '800',
    },

    // =================================================
    // LIST
    // =================================================

    listContent: {
      paddingHorizontal: 20,

      paddingBottom: 100,
    },

    listHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',

      paddingTop: 20,
      paddingBottom: 12,
    },

    listTitle: {
      color: '#1E293B',

      fontSize: 16,
      fontWeight: '800',
    },

    listCount: {
      color: '#94A3B8',

      fontSize: 11,
    },

    // =================================================
    // PROPERTY CARD
    // =================================================

    propertyCard: {
      marginBottom: 17,

      borderRadius: 17,

      overflow: 'hidden',

      backgroundColor:
        '#FFFFFF',

      elevation: 3,
    },

    imageContainer: {
      height: 185,

      position: 'relative',

      backgroundColor:
        '#E2E8F0',
    },

    propertyImage: {
      width: '100%',
      height: '100%',
    },

    noImage: {
      flex: 1,

      alignItems: 'center',
      justifyContent: 'center',
    },

    noImageText: {
      marginTop: 5,

      color: '#94A3B8',

      fontSize: 11,
    },

    favoriteButton: {
      position: 'absolute',

      top: 12,
      right: 12,

      width: 43,
      height: 43,

      borderRadius: 22,

      backgroundColor:
        '#FFFFFF',

      alignItems: 'center',
      justifyContent: 'center',

      elevation: 6,
    },

    propertyInfo: {
      padding: 15,
    },

    propertyTitle: {
      color: '#1E293B',

      fontSize: 16,
      fontWeight: '800',
    },

    locationRow: {
      marginTop: 6,

      flexDirection: 'row',
      alignItems: 'center',
    },

    locationText: {
      flex: 1,

      marginLeft: 3,

      color: '#94A3B8',

      fontSize: 11,
    },

    detailsRow: {
      flexDirection: 'row',
      alignItems: 'center',

      gap: 15,

      marginTop: 12,
    },

    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',

      gap: 4,
    },

    detailText: {
      color: '#64748B',

      fontSize: 10,
      fontWeight: '600',
    },

    cardBottom: {
      marginTop: 13,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    price: {
      color: '#0F9D8A',

      fontSize: 18,
      fontWeight: '900',
    },

    detailButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    detailButtonText: {
      color: '#0F9D8A',

      fontSize: 11,
      fontWeight: '700',
    },

    // =================================================
    // LOADING
    // =================================================

    centerContainer: {
      flex: 1,

      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingText: {
      marginTop: 10,

      color: '#64748B',

      fontSize: 12,
    },

    // =================================================
    // EMPTY
    // =================================================

    emptyList: {
      flexGrow: 1,
    },

    emptyContainer: {
      flex: 1,

      alignItems: 'center',
      justifyContent: 'center',

      paddingHorizontal: 30,

      paddingBottom: 80,
    },

    emptyIcon: {
      width: 110,
      height: 110,

      borderRadius: 55,

      backgroundColor:
        '#CCFBF1',

      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyTitle: {
      marginTop: 20,

      color: '#1E293B',

      fontSize: 19,
      fontWeight: '800',
    },

    emptyDescription: {
      marginTop: 8,

      maxWidth: 280,

      color: '#94A3B8',

      fontSize: 12,
      lineHeight: 19,

      textAlign: 'center',
    },

    searchButton: {
      marginTop: 20,

      height: 48,

      paddingHorizontal: 25,

      borderRadius: 14,

      backgroundColor:
        '#0F9D8A',

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',

      gap: 7,
    },

    searchButtonText: {
      color: '#FFFFFF',

      fontSize: 13,
      fontWeight: '800',
    },
  });