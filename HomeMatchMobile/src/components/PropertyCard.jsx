import React, {
  useCallback,
  useState,
} from 'react';

import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {useFocusEffect} from '@react-navigation/native';

import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';

import {API_ORIGIN} from '../services/api';

import {
  isFavorite,
  toggleFavorite,
} from '../services/favoriteService';

const getPropertyType = type => {
  switch (type) {
    case 'house':
      return 'บ้านเดี่ยว';

    case 'townhouse':
      return 'ทาวน์เฮ้าส์';

    case 'condo':
      return 'คอนโด';

    case 'land':
      return 'ที่ดิน';

    default:
      return 'อสังหาริมทรัพย์';
  }
};

const PropertyCard = ({
  property,
  onPress,
  onFavoriteChange,
}) => {
  const [liked, setLiked] =
    useState(false);

  // โหลดสถานะ Favorite ทุกครั้งที่กลับมาหน้านี้
  useFocusEffect(
    useCallback(() => {
      let active = true;

      const checkFavorite = async () => {
        const result = await isFavorite(
          property?._id,
        );

        if (active) {
          setLiked(result);
        }
      };

      if (property?._id) {
        checkFavorite();
      }

      return () => {
        active = false;
      };
    }, [property?._id]),
  );

  const imageUrl =
    property?.images?.length > 0
      ? `${API_ORIGIN}${property.images[0]}`
      : null;

  const location = [
    property?.location?.district,
    property?.location?.province,
  ]
    .filter(Boolean)
    .join(', ');

  const price = Number(
    property?.price || 0,
  ).toLocaleString('th-TH');

  const handleFavorite = async event => {
    // ไม่ให้กดหัวใจแล้วเปิดหน้า Detail
    event?.stopPropagation?.();

    const result =
      await toggleFavorite(property);

    setLiked(result.isFavorite);

    onFavoriteChange?.(
      property,
      result.isFavorite,
    );
  };

  return (
    <Pressable
      style={styles.card}
      onPress={() =>
        onPress?.(property)
      }>

      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image
            source={{uri: imageUrl}}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noImage}>
            <MaterialDesignIcons
              name="image-outline"
              size={35}
              color="#94A3B8"
            />

            <Text style={styles.noImageText}>
              ไม่มีรูปภาพ
            </Text>
          </View>
        )}

        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>
            {getPropertyType(
              property?.type,
            )}
          </Text>
        </View>

        {/* FAVORITE */}

        <Pressable
          style={styles.favoriteButton}
          onPress={handleFavorite}
          hitSlop={8}>

          <MaterialDesignIcons
            name={
              liked
                ? 'heart'
                : 'heart-outline'
            }
            size={22}
            color={
              liked
                ? '#EF4444'
                : '#64748B'
            }
          />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.locationRow}>
          <MaterialDesignIcons
            name="map-marker-outline"
            size={13}
            color="#94A3B8"
          />

          <Text
            style={styles.location}
            numberOfLines={1}>
            {location ||
              'ไม่ระบุทำเล'}
          </Text>
        </View>

        <Text
          style={styles.title}
          numberOfLines={1}>
          {property?.title ||
            'ไม่มีชื่อประกาศ'}
        </Text>

        <Text style={styles.price}>
          ฿ {price}
        </Text>

        <View style={styles.details}>
          <View style={styles.detailItem}>
            <MaterialDesignIcons
              name="bed-outline"
              size={15}
              color="#64748B"
            />

            <Text style={styles.detail}>
              {property?.bedrooms ?? 0}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <MaterialDesignIcons
              name="shower"
              size={15}
              color="#64748B"
            />

            <Text style={styles.detail}>
              {property?.bathrooms ?? 0}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <MaterialDesignIcons
              name="floor-plan"
              size={15}
              color="#64748B"
            />

            <Text style={styles.detail}>
              {property?.area ?? 0}{' '}
              ตร.ม.
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default PropertyCard;

const styles = StyleSheet.create({
  card: {
    width: 190,

    borderRadius: 16,

    backgroundColor: '#FFFFFF',

    overflow: 'hidden',

    borderWidth: 1,
    borderColor: '#F1F5F9',

    elevation: 3,

    marginBottom: 5,
  },

  imageContainer: {
    width: '100%',
    height: 130,

    position: 'relative',

    backgroundColor: '#F1F5F9',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  noImage: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',
  },

  noImageText: {
    marginTop: 4,

    color: '#94A3B8',

    fontSize: 10,
  },

  typeBadge: {
    position: 'absolute',

    top: 10,
    left: 10,

    paddingHorizontal: 9,
    paddingVertical: 5,

    borderRadius: 12,

    backgroundColor:
      'rgba(15, 118, 110, 0.92)',
  },

  typeText: {
    color: '#FFFFFF',

    fontSize: 9,
    fontWeight: '700',
  },

  favoriteButton: {
    position: 'absolute',

    top: 9,
    right: 9,

    width: 36,
    height: 36,

    borderRadius: 18,

    backgroundColor: '#FFFFFF',

    alignItems: 'center',
    justifyContent: 'center',

    elevation: 5,

    zIndex: 20,
  },

  content: {
    padding: 12,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  location: {
    flex: 1,

    marginLeft: 3,

    color: '#94A3B8',

    fontSize: 10,
  },

  title: {
    marginTop: 6,

    color: '#1E293B',

    fontSize: 14,
    fontWeight: '800',
  },

  price: {
    marginTop: 6,

    color: '#0F766E',

    fontSize: 15,
    fontWeight: '900',
  },

  details: {
    marginTop: 9,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 9,
  },

  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: 3,
  },

  detail: {
    color: '#64748B',

    fontSize: 9,
  },
});