
import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {useFocusEffect} from '@react-navigation/native';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';

import PropertyCard from '../components/PropertyCard';
import api from '../services/api';
import {getUnreadNotificationCount} from '../services/notificationService';

const GREEN = '#0F766E';

const TYPES = [
  {label: 'ทั้งหมด', value: 'all'},
  {label: 'บ้านเดี่ยว', value: 'house'},
  {label: 'ทาวน์เฮาส์', value: 'townhouse'},
  {label: 'คอนโด', value: 'condo'},
  {label: 'ที่ดิน', value: 'land'},
];

const SORTS = [
  {label: 'ล่าสุด', value: 'newest'},
  {label: 'ราคาต่ำ → สูง', value: 'asc'},
  {label: 'ราคาสูง → ต่ำ', value: 'desc'},
];

const HomeScreen = ({navigation}) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // SEARCH
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedrooms, setBedrooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [sortBy, setSortBy] = useState('newest');
  const [showAll, setShowAll] = useState(false);

  // LOAD PROPERTIES
  const loadProperties = useCallback(async () => {
    try {
      setError('');
      const response = await api.get('/properties/public');

      const data = response.data?.properties || [];
      setProperties(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Load Properties Error:', err);
      setError('ไม่สามารถโหลดข้อมูลบ้านได้');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // NOTIFICATIONS
  const loadNotificationCount = useCallback(async () => {
    try {
      const result = await getUnreadNotificationCount();
      setUnreadNotificationCount(result?.count || 0);
    } catch (err) {
      setUnreadNotificationCount(0);
    }
  }, []);

  // REFRESH WHEN HOME FOCUSED
  useFocusEffect(
    useCallback(() => {
      loadProperties();
      loadNotificationCount();
    }, [loadProperties, loadNotificationCount]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadProperties(),
      loadNotificationCount(),
    ]);
    setRefreshing(false);
  };

  // NAVIGATION
  const handlePropertyPress = property => {
    if (!property?._id) return;

    navigation.navigate('PropertyDetail', {
      propertyId: property._id,
    });
  };

  const handleFavorite = () => navigation.navigate('Favorite');

  const handleAppointment = () =>
    navigation.navigate('BuyerAppointment');

  const handleMyDesigns = () => navigation.navigate('MyDesigns');

  const handleNotification = () =>
    navigation.navigate('Notification');

  // FILTERS
  const filteredProperties = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    const minimum = minPrice === '' ? null : Number(minPrice);
    const maximum = maxPrice === '' ? null : Number(maxPrice);

    const result = properties.filter(property => {
      if (property.status !== 'approved') return false;

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

      const searchable = [
        property.title,
        property.description,
        locationText,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const price = Number(property.price || 0);

      return (
        (!keyword || searchable.includes(keyword)) &&
        (selectedType === 'all' || property.type === selectedType) &&
        (minimum === null || price >= minimum) &&
        (maximum === null || price <= maximum) &&
        (bedrooms === 0 ||
          Number(property.bedrooms || 0) >= bedrooms) &&
        (bathrooms === 0 ||
          Number(property.bathrooms || 0) >= bathrooms)
      );
    });

    result.sort((a, b) => {
      if (sortBy === 'asc') {
        return Number(a.price || 0) - Number(b.price || 0);
      }

      if (sortBy === 'desc') {
        return Number(b.price || 0) - Number(a.price || 0);
      }

      return (
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime()
      );
    });

    return result;
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

  const isSearching =
    searchText.trim() !== '' ||
    selectedType !== 'all' ||
    minPrice !== '' ||
    maxPrice !== '' ||
    bedrooms > 0 ||
    bathrooms > 0 ||
    sortBy !== 'newest';

  const clearFilters = () => {
    setSearchText('');
    setSelectedType('all');
    setMinPrice('');
    setMaxPrice('');
    setBedrooms(0);
    setBathrooms(0);
    setSortBy('newest');
    setShowAll(false);
  };

  const Chip = ({label, active, onPress}) => (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );

  const QuickMenuCard = ({
    title,
    description,
    icon,
    iconColor,
    iconBackground,
    onPress,
  }) => (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.quickMenuCard,
        pressed && {opacity: 0.7},
      ]}>
      <View
        style={[
          styles.quickMenuIcon,
          {backgroundColor: iconBackground},
        ]}>
        <MaterialDesignIcons
          name={icon}
          size={25}
          color={iconColor}
        />
      </View>

      <View style={styles.quickMenuTextContainer}>
        <Text style={styles.quickMenuTitle}>{title}</Text>
        <Text style={styles.quickMenuDescription}>
          {description}
        </Text>
      </View>

      <MaterialDesignIcons
        name="chevron-right"
        size={22}
        color="#CBD5E1"
      />
    </Pressable>
  );

  const renderPropertyList = (items, prefix) => {
    if (items.length === 0) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.propertyList}>
        {items.map(property => (
          <PropertyCard
            key={`${prefix}-${property._id}`}
            property={property}
            onPress={handlePropertyPress}
          />
        ))}
      </ScrollView>
    );
  };

  const renderEmpty = message => (
    <View style={styles.stateContainer}>
      <MaterialDesignIcons
        name="home-search-outline"
        size={42}
        color="#94A3B8"
      />
      <Text style={styles.stateText}>{message}</Text>
      {isSearching && (
        <Pressable onPress={clearFilters} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>ล้างตัวกรอง</Text>
        </Pressable>
      )}
    </View>
  );

  const renderResults = () => {
    if (loading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.stateText}>กำลังโหลดข้อมูลบ้าน...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={loadProperties}>
            <Text style={styles.retryText}>ลองใหม่</Text>
          </Pressable>
        </View>
      );
    }

    if (filteredProperties.length === 0) {
      return renderEmpty(
        isSearching
          ? 'ไม่พบบ้านที่ตรงกับการค้นหา'
          : 'ยังไม่มีบ้านที่ได้รับการอนุมัติ',
      );
    }

    // ค้นหาอยู่: แสดงผลลัพธ์ใน Home โดยตรง
    if (isSearching || showAll) {
      return (
        <View style={styles.resultGrid}>
          {filteredProperties.map(property => (
            <View
              key={property._id}
              style={styles.resultCard}>
              <PropertyCard
                property={property}
                onPress={handlePropertyPress}
              />
            </View>
          ))}
        </View>
      );
    }

    // หน้าหลักปกติ: คงหมวดเดิม
    return (
      <>
        {renderPropertyList(filteredProperties, 'recommended')}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>↗ บ้านใหม่ล่าสุด</Text>
          <Pressable onPress={() => setShowAll(true)}>
            <Text style={styles.seeAll}>ดูทั้งหมด ›</Text>
          </Pressable>
        </View>

        {renderPropertyList(
          filteredProperties.slice(0, 10),
          'latest',
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>☆ ยอดนิยม</Text>
          <Pressable onPress={() => setShowAll(true)}>
            <Text style={styles.seeAll}>ดูทั้งหมด ›</Text>
          </Pressable>
        </View>

        {renderPropertyList(
          filteredProperties.slice(0, 10),
          'popular',
        )}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={GREEN}
          />
        }>

        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.welcomeText}>สวัสดีตอนเช้า</Text>
              <Text style={styles.userText}>สวัสดี 👋</Text>
            </View>

            <Pressable
              onPress={handleNotification}
              style={styles.notification}>
              <MaterialDesignIcons
                name={
                  unreadNotificationCount > 0
                    ? 'bell'
                    : 'bell-outline'
                }
                size={23}
                color="#334155"
              />

              {unreadNotificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotificationCount > 99
                      ? '99+'
                      : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* SEARCH IN HOME */}
          <View style={styles.searchContainer}>
            <MaterialDesignIcons
              name="magnify"
              size={23}
              color={GREEN}
            />

            <TextInput
              style={styles.searchInput}
              placeholder="ค้นหาชื่อบ้าน หรือทำเล"
              placeholderTextColor="#94A3B8"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
            />

            {searchText.length > 0 && (
              <Pressable onPress={() => setSearchText('')}>
                <MaterialDesignIcons
                  name="close-circle"
                  size={20}
                  color="#94A3B8"
                />
              </Pressable>
            )}

            <Pressable
              style={styles.filterButton}
              onPress={() => setShowFilters(!showFilters)}>
              <MaterialDesignIcons
                name="tune-variant"
                size={21}
                color={GREEN}
              />
            </Pressable>
          </View>
        </View>

        {/* ADVANCED FILTERS */}
        {showFilters && (
          <View style={styles.filterPanel}>
            <View style={styles.filterHeading}>
              <Text style={styles.filterTitle}>
                ตัวกรองการค้นหา
              </Text>

              <Pressable onPress={clearFilters}>
                <Text style={styles.seeAll}>ล้างทั้งหมด</Text>
              </Pressable>
            </View>

            <Text style={styles.filterLabel}>ประเภทอสังหาริมทรัพย์</Text>
            <View style={styles.chipRow}>
              {TYPES.map(type => (
                <Chip
                  key={type.value}
                  label={type.label}
                  active={selectedType === type.value}
                  onPress={() => setSelectedType(type.value)}
                />
              ))}
            </View>

            <Text style={styles.filterLabel}>ช่วงราคา (บาท)</Text>
            <View style={styles.priceRow}>
              <TextInput
                style={styles.priceInput}
                placeholder="ต่ำสุด"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={minPrice}
                onChangeText={value =>
                  setMinPrice(value.replace(/[^0-9]/g, ''))
                }
              />

              <Text style={{color: '#64748B'}}>ถึง</Text>

              <TextInput
                style={styles.priceInput}
                placeholder="สูงสุด"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={maxPrice}
                onChangeText={value =>
                  setMaxPrice(value.replace(/[^0-9]/g, ''))
                }
              />
            </View>

            <Text style={styles.filterLabel}>ห้องนอนขั้นต่ำ</Text>
            <View style={styles.chipRow}>
              {[0, 1, 2, 3, 4, 5].map(number => (
                <Chip
                  key={number}
                  label={number === 0 ? 'ทั้งหมด' : `${number}+`}
                  active={bedrooms === number}
                  onPress={() => setBedrooms(number)}
                />
              ))}
            </View>

            <Text style={styles.filterLabel}>ห้องน้ำขั้นต่ำ</Text>
            <View style={styles.chipRow}>
              {[0, 1, 2, 3, 4, 5].map(number => (
                <Chip
                  key={number}
                  label={number === 0 ? 'ทั้งหมด' : `${number}+`}
                  active={bathrooms === number}
                  onPress={() => setBathrooms(number)}
                />
              ))}
            </View>

            <Text style={styles.filterLabel}>เรียงลำดับ</Text>
            <View style={styles.chipRow}>
              {SORTS.map(sort => (
                <Chip
                  key={sort.value}
                  label={sort.label}
                  active={sortBy === sort.value}
                  onPress={() => setSortBy(sort.value)}
                />
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

        {/* CONTENT */}
        <View style={styles.content}>
          {/* แสดงเมนูเดิมเมื่อไม่ได้ค้นหา */}
          {!isSearching && !showAll && (
            <>
              <View style={styles.myMenuHeader}>
                <Text style={styles.myMenuTitle}>เมนูของฉัน</Text>
              </View>

              <View style={styles.quickMenuContainer}>
                <QuickMenuCard
                  title="แบบห้องของฉัน"
                  description="ดูและแก้ไขแบบห้อง 2D ที่บันทึกไว้"
                  icon="floor-plan"
                  iconColor={GREEN}
                  iconBackground="#CCFBF1"
                  onPress={handleMyDesigns}
                />

                <QuickMenuCard
                  title="รายการโปรด"
                  description="บ้านที่คุณบันทึกไว้"
                  icon="heart-outline"
                  iconColor="#E11D48"
                  iconBackground="#FFF1F2"
                  onPress={handleFavorite}
                />

                <QuickMenuCard
                  title="การนัดหมาย"
                  description="ดูสถานะการนัดหมาย"
                  icon="calendar-month-outline"
                  iconColor={GREEN}
                  iconBackground="#F0FDFA"
                  onPress={handleAppointment}
                />
              </View>
            </>
          )}

          {/* PROPERTY HEADER */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isSearching
                ? '🔎 ผลการค้นหา'
                : showAll
                ? 'บ้านทั้งหมด'
                : '✨ แนะนำสำหรับคุณ'}
            </Text>

            {isSearching || showAll ? (
              <Pressable
                onPress={() => {
                  clearFilters();
                  setShowFilters(false);
                }}>
                <Text style={styles.seeAll}>กลับหน้าหลัก</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setShowAll(true)}>
                <Text style={styles.seeAll}>ดูทั้งหมด ›</Text>
              </Pressable>
            )}
          </View>

          {(isSearching || showAll) && !loading && !error && (
            <Text style={styles.resultCount}>
              พบ {filteredProperties.length} รายการ
            </Text>
          )}

          {renderResults()}

          <View style={styles.bottomSpace} />
        </View>
      </ScrollView>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    backgroundColor: GREEN,
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  welcomeText: {
    color: '#CCFBF1',
    fontSize: 12,
  },

  userText: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    marginTop: 4,
  },

  notification: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  searchContainer: {
    height: 52,
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 6,
  },

  searchInput: {
    flex: 1,
    height: '100%',
    color: '#1E293B',
    fontSize: 14,
    paddingHorizontal: 10,
  },

  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    paddingTop: 4,
  },

  myMenuHeader: {
    paddingHorizontal: 18,
    marginTop: 20,
    marginBottom: 11,
  },

  myMenuTitle: {
    color: '#1E293B',
    fontSize: 17,
    fontWeight: '800',
  },

  quickMenuContainer: {
    paddingHorizontal: 18,
    gap: 10,
  },

  quickMenuCard: {
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },

  quickMenuIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickMenuTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  quickMenuTitle: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '800',
  },

  quickMenuDescription: {
    marginTop: 4,
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },

  sectionHeader: {
    paddingHorizontal: 18,
    marginTop: 22,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: '#1E293B',
    fontSize: 17,
    fontWeight: '800',
  },

  seeAll: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '700',
  },

  propertyList: {
    paddingHorizontal: 18,
    gap: 12,
  },

  resultCount: {
    paddingHorizontal: 18,
    marginBottom: 12,
    color: '#64748B',
    fontSize: 12,
  },

  resultGrid: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  resultCard: {
    width: '47%',
  },

  stateContainer: {
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  stateText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },

  errorContainer: {
    marginHorizontal: 18,
    padding: 20,
    minHeight: 130,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorText: {
    color: '#DC2626',
    fontSize: 13,
  },

  retryText: {
    marginTop: 10,
    color: GREEN,
    fontWeight: '800',
  },

  bottomSpace: {
    height: 50,
  },

  // FILTERS
  filterPanel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  filterHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  filterTitle: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '800',
  },

  filterLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 10,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },

  chipActive: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  chipText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },

  chipTextActive: {
    color: '#FFFFFF',
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  priceInput: {
    flex: 1,
    height: 45,
    minWidth: 0,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    color: '#1E293B',
  },

  applyButton: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 22,
  },

  applyButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  clearButton: {
    marginTop: 15,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#CCFBF1',
  },

  clearButtonText: {
    color: GREEN,
    fontWeight: '700',
  },
});
