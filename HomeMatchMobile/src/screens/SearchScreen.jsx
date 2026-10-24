
import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {useFocusEffect} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';

import api, {API_ORIGIN} from '../services/api';
import {
  getFavorites,
  toggleFavorite,
} from '../services/favoriteService';

const GREEN = '#0F9D8A';

const propertyTypes = [
  {label: 'ทั้งหมด', value: 'all'},
  {label: 'บ้านเดี่ยว', value: 'house'},
  {label: 'ทาวน์เฮาส์', value: 'townhouse'},
  {label: 'คอนโด', value: 'condo'},
  {label: 'ที่ดิน', value: 'land'},
];

const sortOptions = [
  {label: 'ล่าสุด', value: 'newest'},
  {label: 'ราคาต่ำ → สูง', value: 'priceAsc'},
  {label: 'ราคาสูง → ต่ำ', value: 'priceDesc'},
];

const roomOptions = [0, 1, 2, 3, 4, 5];

const formatPrice = value =>
  Number(value || 0).toLocaleString('th-TH');

const getImageUrl = image => {
  if (!image || typeof image !== 'string') {
    return null;
  }

  if (image.startsWith('http')) {
    return image;
  }

  return `${API_ORIGIN}${image}`;
};

const SearchScreen = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const [properties, setProperties] = useState([]);
  const [favorites, setFavorites] = useState([]);

  const [searchText, setSearchText] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  // Advanced Filter
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedrooms, setBedrooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [sortBy, setSortBy] = useState('newest');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // ============================
  // LOAD PROPERTIES
  // ============================

  const loadProperties = useCallback(async () => {
    try {
      setError('');

      const response = await api.get('/properties/public');

      const data =
        response.data?.properties ||
        response.data ||
        [];

      setProperties(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('SEARCH PROPERTY ERROR:', err);
      setError('ไม่สามารถโหลดข้อมูลบ้านได้');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ============================
  // LOAD FAVORITES
  // ============================

  const loadFavorites = useCallback(async () => {
    try {
      const data = await getFavorites();
      setFavorites(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('LOAD FAVORITES ERROR:', err);
    }
  }, []);

  // โหลดใหม่ทุกครั้งที่กลับมาหน้า Search
  // รวมถึงหลัง Seller ปิดการขาย

  useFocusEffect(
    useCallback(() => {
      loadProperties();
      loadFavorites();
    }, [loadProperties, loadFavorites]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadProperties();
    loadFavorites();
  };

  const clearFilters = () => {
    setSearchText('');
    setSelectedType('all');
    setMinPrice('');
    setMaxPrice('');
    setBedrooms(0);
    setBathrooms(0);
    setSortBy('newest');
  };

  // ============================
  // FAVORITE
  // ============================

  const favoriteIds = useMemo(
    () => new Set(favorites.map(item => String(item._id))),
    [favorites],
  );

  const handleFavorite = async property => {
    try {
      const result = await toggleFavorite(property);
      setFavorites(result.favorites || []);
    } catch (err) {
      console.log('TOGGLE FAVORITE ERROR:', err);
    }
  };

  const openProperty = property => {
    if (!property?._id) {
      return;
    }

    navigation.navigate('PropertyDetail', {
      propertyId: property._id,
    });
  };

  // ============================
  // FILTER + SORT
  // ============================

  const filteredProperties = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    const minimum =
      minPrice.trim() === '' ? null : Number(minPrice);

    const maximum =
      maxPrice.trim() === '' ? null : Number(maxPrice);

    const result = properties.filter(property => {
      // ไม่แสดงบ้านที่ปิดการขายแล้ว
      if (property.status !== 'approved') {
        return false;
      }

      const matchType =
        selectedType === 'all' ||
        property.type === selectedType;

      const location = property.location;

      const locationText =
        typeof location === 'string'
          ? location
          : [
              location?.address,
              location?.district,
              location?.province,
            ]
              .filter(Boolean)
              .join(' ');

      const searchableText = [
        property.title,
        property.description,
        locationText,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchSearch =
        !keyword || searchableText.includes(keyword);

      const price = Number(property.price || 0);

      const matchMin =
        minimum === null || price >= minimum;

      const matchMax =
        maximum === null || price <= maximum;

      // 0 หมายถึงไม่จำกัด
      // ค่าอื่นหมายถึงอย่างน้อย N ห้อง

      const matchBedrooms =
        bedrooms === 0 ||
        Number(property.bedrooms || 0) >= bedrooms;

      const matchBathrooms =
        bathrooms === 0 ||
        Number(property.bathrooms || 0) >= bathrooms;

      return (
        matchType &&
        matchSearch &&
        matchMin &&
        matchMax &&
        matchBedrooms &&
        matchBathrooms
      );
    });

    return result.sort((a, b) => {
      if (sortBy === 'priceAsc') {
        return Number(a.price || 0) - Number(b.price || 0);
      }

      if (sortBy === 'priceDesc') {
        return Number(b.price || 0) - Number(a.price || 0);
      }

      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });
  }, [
    properties,
    searchText,
    selectedType,
    minPrice,
    maxPrice,
    bedrooms,
    bathrooms,
    sortBy,
  ]);

  const activeFilterCount = [
    selectedType !== 'all',
    minPrice !== '',
    maxPrice !== '',
    bedrooms > 0,
    bathrooms > 0,
    sortBy !== 'newest',
  ].filter(Boolean).length;

  // ============================
  // CHIP
  // ============================

  const renderChip = (label, selected, onPress) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={[
        styles.chip,
        selected && styles.chipSelected,
      ]}>
      <Text
        style={[
          styles.chipText,
          selected && styles.chipTextSelected,
        ]}>
        {label}
      </Text>
    </Pressable>
  );

  // ============================
  // PROPERTY CARD
  // ============================

  const renderProperty = ({item}) => {
    const imageUrl = getImageUrl(item.images?.[0]);

    const liked = favoriteIds.has(String(item._id));

    const location =
      typeof item.location === 'string'
        ? item.location
        : [
            item.location?.district,
            item.location?.province,
          ]
            .filter(Boolean)
            .join(', ');

    return (
      <Pressable
        style={styles.propertyCard}
        onPress={() => openProperty(item)}>
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image
              source={{uri: imageUrl}}
              style={styles.propertyImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImage}>
              <MaterialDesignIcons
                name="image-off-outline"
                size={38}
                color="#94A3B8"
              />
            </View>
          )}

          <Pressable
            style={styles.favoriteButton}
            hitSlop={10}
            onPress={event => {
              event.stopPropagation();
              handleFavorite(item);
            }}>
            <MaterialDesignIcons
              name={liked ? 'heart' : 'heart-outline'}
              size={23}
              color={liked ? '#EF4444' : '#64748B'}
            />
          </Pressable>
        </View>

        <View style={styles.propertyInfo}>
          <Text style={styles.propertyTitle} numberOfLines={1}>
            {item.title}
          </Text>

          <View style={styles.locationRow}>
            <MaterialDesignIcons
              name="map-marker-outline"
              size={16}
              color="#94A3B8"
            />

            <Text style={styles.locationText} numberOfLines={1}>
              {location || 'ไม่ระบุที่อยู่'}
            </Text>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <MaterialDesignIcons
                name="bed-outline"
                size={17}
                color="#64748B"
              />
              <Text style={styles.detailText}>
                {item.bedrooms ?? 0} ห้องนอน
              </Text>
            </View>

            <View style={styles.detailItem}>
              <MaterialDesignIcons
                name="shower"
                size={17}
                color="#64748B"
              />
              <Text style={styles.detailText}>
                {item.bathrooms ?? 0} ห้องน้ำ
              </Text>
            </View>
          </View>

          <View style={styles.cardBottom}>
            <Text style={styles.price}>
              ฿{formatPrice(item.price)}
            </Text>

            <View style={styles.areaBadge}>
              <Text style={styles.areaText}>
                {item.area ?? 0} ตร.ม.
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  // ============================
  // UI
  // ============================

  return (
    <View style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top + 20}]}>
        <Text style={styles.headerTitle}>ค้นหาบ้าน</Text>
        <Text style={styles.headerSubtitle}>
          ค้นหาบ้านที่เหมาะกับคุณ
        </Text>

        <View style={styles.searchContainer}>
          <MaterialDesignIcons
            name="magnify"
            size={23}
            color="#94A3B8"
          />

          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="ค้นหาชื่อบ้าน หรือทำเล"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />

          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText('')}>
              <MaterialDesignIcons
                name="close-circle"
                size={21}
                color="#CBD5E1"
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* PROPERTY TYPES */}
      <View style={styles.typeSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalChips}>
          {propertyTypes.map(type =>
            renderChip(
              type.label,
              selectedType === type.value,
              () => setSelectedType(type.value),
            ),
          )}
        </ScrollView>
      </View>

      {/* ADVANCED FILTER BUTTON */}
      <View style={styles.filterToolbar}>
        <Pressable
          style={[
            styles.advancedButton,
            showFilters && styles.advancedButtonActive,
          ]}
          onPress={() => setShowFilters(!showFilters)}>
          <MaterialDesignIcons
            name="tune-variant"
            size={20}
            color={showFilters ? '#FFFFFF' : GREEN}
          />

          <Text
            style={[
              styles.advancedButtonText,
              showFilters && {color: '#FFFFFF'},
            ]}>
            ตัวกรองเพิ่มเติม
            {activeFilterCount > 0
              ? ` (${activeFilterCount})`
              : ''}
          </Text>

          <MaterialDesignIcons
            name={showFilters ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={showFilters ? '#FFFFFF' : GREEN}
          />
        </Pressable>

        <Pressable onPress={clearFilters}>
          <Text style={styles.clearText}>ล้างทั้งหมด</Text>
        </Pressable>
      </View>

      {/* ADVANCED FILTER PANEL */}
      {showFilters && (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>ช่วงราคา (บาท)</Text>

          <View style={styles.priceInputRow}>
            <TextInput
              value={minPrice}
              onChangeText={text =>
                setMinPrice(text.replace(/[^0-9]/g, ''))
              }
              keyboardType="numeric"
              placeholder="ราคาต่ำสุด"
              placeholderTextColor="#94A3B8"
              style={styles.priceInput}
            />

            <Text style={styles.priceDash}>—</Text>

            <TextInput
              value={maxPrice}
              onChangeText={text =>
                setMaxPrice(text.replace(/[^0-9]/g, ''))
              }
              keyboardType="numeric"
              placeholder="ราคาสูงสุด"
              placeholderTextColor="#94A3B8"
              style={styles.priceInput}
            />
          </View>

          <Text style={styles.filterLabel}>
            ห้องนอนขั้นต่ำ
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roomRow}>
            {roomOptions.map(number =>
              renderChip(
                number === 0 ? 'ทั้งหมด' : `${number}+`,
                bedrooms === number,
                () => setBedrooms(number),
              ),
            )}
          </ScrollView>

          <Text style={styles.filterLabel}>
            ห้องน้ำขั้นต่ำ
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roomRow}>
            {roomOptions.map(number =>
              renderChip(
                number === 0 ? 'ทั้งหมด' : `${number}+`,
                bathrooms === number,
                () => setBathrooms(number),
              ),
            )}
          </ScrollView>

          <Text style={styles.filterLabel}>
            เรียงลำดับ
          </Text>

          <View style={styles.sortRow}>
            {sortOptions.map(option => (
              <Pressable
                key={option.value}
                style={[
                  styles.sortButton,
                  sortBy === option.value &&
                    styles.sortButtonSelected,
                ]}
                onPress={() => setSortBy(option.value)}>
                <Text
                  style={[
                    styles.sortText,
                    sortBy === option.value &&
                      styles.sortTextSelected,
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={styles.applyButton}
            onPress={() => setShowFilters(false)}>
            <Text style={styles.applyButtonText}>
              ดูผลการค้นหา ({filteredProperties.length})
            </Text>
          </Pressable>
        </View>
      )}

      {/* RESULT HEADER */}
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>
          ผลการค้นหา
        </Text>

        <Text style={styles.resultCount}>
          {filteredProperties.length} รายการ
        </Text>
      </View>

      {/* LIST */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loadingText}>
            กำลังค้นหาบ้าน...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <MaterialDesignIcons
            name="alert-circle-outline"
            size={44}
            color="#EF4444"
          />

          <Text style={styles.errorText}>{error}</Text>

          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              loadProperties();
            }}>
            <Text style={styles.retryText}>ลองใหม่</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredProperties}
          renderItem={renderProperty}
          keyExtractor={item => String(item._id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.propertyList,
            filteredProperties.length === 0 &&
              styles.emptyList,
          ]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[GREEN]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialDesignIcons
                name="home-search-outline"
                size={55}
                color={GREEN}
              />

              <Text style={styles.emptyTitle}>
                ไม่พบบ้านที่ตรงกับเงื่อนไข
              </Text>

              <Text style={styles.emptyText}>
                ลองเปลี่ยนคำค้นหา ราคา หรือจำนวนห้อง
              </Text>

              <Pressable
                style={styles.clearButton}
                onPress={clearFilters}>
                <Text style={styles.clearButtonText}>
                  ล้างตัวกรองทั้งหมด
                </Text>
              </Pressable>
            </View>
          }
        />
      )}
    </View>
  );
};

export default SearchScreen;

// ============================
// STYLES
// ============================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  header: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
  },

  headerSubtitle: {
    marginTop: 3,
    color: '#CCFBF1',
    fontSize: 12,
  },

  searchContainer: {
    height: 52,
    marginTop: 17,
    paddingHorizontal: 15,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    color: '#1E293B',
    fontSize: 14,
  },

  typeSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  horizontalChips: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },

  chip: {
    paddingHorizontal: 15,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  chipSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  chipText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },

  chipTextSelected: {
    color: '#FFFFFF',
  },

  filterToolbar: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },

  advancedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#F0FDFA',
  },

  advancedButtonActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  advancedButtonText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '700',
  },

  clearText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },

  filterPanel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  filterLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 10,
  },

  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  priceInput: {
    flex: 1,
    minWidth: 0,
    height: 45,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#1E293B',
    fontSize: 13,
    backgroundColor: '#F8FAFC',
  },

  priceDash: {
    color: '#94A3B8',
  },

  roomRow: {
    gap: 8,
    paddingBottom: 2,
  },

  sortRow: {
    flexDirection: 'row',
    gap: 7,
  },

  sortButton: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sortButtonSelected: {
    borderColor: GREEN,
    backgroundColor: '#CCFBF1',
  },

  sortText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
  },

  sortTextSelected: {
    color: '#0F766E',
  },

  applyButton: {
    marginTop: 20,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: 'center',
  },

  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },

  resultTitle: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '800',
  },

  resultCount: {
    color: '#64748B',
    fontSize: 12,
  },

  propertyList: {
    paddingHorizontal: 18,
    paddingBottom: 100,
  },

  emptyList: {
    flexGrow: 1,
  },

  propertyCard: {
    marginBottom: 16,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    elevation: 3,
  },

  imageContainer: {
    height: 185,
    position: 'relative',
    backgroundColor: '#E2E8F0',
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

  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
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
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
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
    fontSize: 11,
    fontWeight: '600',
  },

  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },

  price: {
    color: GREEN,
    fontSize: 19,
    fontWeight: '900',
  },

  areaBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  areaText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
  },

  loadingText: {
    marginTop: 12,
    color: '#64748B',
  },

  errorText: {
    marginTop: 12,
    color: '#EF4444',
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 15,
    paddingHorizontal: 25,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: GREEN,
  },

  retryText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 65,
    paddingHorizontal: 20,
  },

  emptyTitle: {
    marginTop: 15,
    color: '#1E293B',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },

  emptyText: {
    marginTop: 7,
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
  },

  clearButton: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GREEN,
  },

  clearButtonText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '800',
  },
});
