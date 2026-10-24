
import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';

import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';

import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';

import {
  getMyDesigns,
  deleteDesignById,
} from '../services/roomDesignService';

const MyDesignsScreen = ({navigation}) => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ========================================
  // LOAD DESIGNS
  // ========================================

  const loadDesigns = useCallback(async () => {
    try {
      const response = await getMyDesigns();

      if (response?.status === false) {
        throw new Error(
          response.message || 'โหลดข้อมูลไม่สำเร็จ',
        );
      }

      setDesigns(
        Array.isArray(response?.designs)
          ? response.designs
          : [],
      );
    } catch (error) {
      console.log(
        'MY DESIGNS ERROR:',
        error.response?.data || error.message,
      );

      Alert.alert(
        'โหลดข้อมูลไม่สำเร็จ',
        error.response?.data?.message ||
          error.message ||
          'กรุณาลองใหม่อีกครั้ง',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // โหลดใหม่ทุกครั้งที่กลับมาหน้านี้
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadDesigns();
    }, [loadDesigns]),
  );

  // ========================================
  // PROPERTY ID
  // ========================================

  const getPropertyId = design => {
    if (
      design.propertyId &&
      typeof design.propertyId === 'object'
    ) {
      return design.propertyId._id;
    }

    return design.propertyId;
  };

  // ========================================
  // OPEN SAVED DESIGN
  // ========================================

  const handleEdit = design => {
    const propertyId = getPropertyId(design);

    if (!propertyId || !design.roomId) {
      Alert.alert(
        'ไม่สามารถเปิดแบบห้อง',
        'ไม่พบข้อมูลบ้านหรือรหัสห้อง',
      );
      return;
    }

    const savedRoomId = String(design.roomId);

    navigation.navigate('RoomCustomizer', {
      propertyId: String(propertyId),
      floor: design.floor,
      room: {
        _id: savedRoomId,
        id: savedRoomId,
        name:
          design.room ||
          `ห้อง ${savedRoomId}`,
      },
    });
  };

  // ========================================
  // DELETE DESIGN
  // ========================================

  const handleDelete = design => {
    Alert.alert(
      'ยืนยันการลบ',
      'คุณต้องการลบแบบห้องนี้หรือไม่?',
      [
        {
          text: 'ยกเลิก',
          style: 'cancel',
        },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDesignById(design._id);

              setDesigns(current =>
                current.filter(
                  item => item._id !== design._id,
                ),
              );

              Alert.alert(
                'สำเร็จ',
                'ลบแบบห้องเรียบร้อยแล้ว',
              );
            } catch (error) {
              console.log(
                'DELETE DESIGN ERROR:',
                error.response?.data ||
                  error.message,
              );

              Alert.alert(
                'เกิดข้อผิดพลาด',
                'ไม่สามารถลบแบบห้องได้',
              );
            }
          },
        },
      ],
    );
  };

  // ========================================
  // RENDER DESIGN
  // ========================================

  const renderItem = ({item}) => {
    const propertyTitle =
      typeof item.propertyId === 'object'
        ? item.propertyId?.title
        : null;

    const roomName =
      item.room || `ห้อง ${item.roomId}`;

    const updatedDate = item.updatedAt
      ? new Date(item.updatedAt).toLocaleDateString(
          'th-TH',
        )
      : '-';

    const furnitureCount =
      Array.isArray(item.furniture)
        ? item.furniture.length
        : 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.iconBox}>
            <MaterialDesignIcons
              name="floor-plan"
              size={30}
              color="#0F766E"
            />
          </View>

          <View style={styles.info}>
            <Text
              style={styles.title}
              numberOfLines={2}>
              {propertyTitle || 'แบบบ้านของฉัน'}
            </Text>

            <Text style={styles.roomName}>
              {item.designName || roomName}
            </Text>

            <Text style={styles.subtitle}>
              ชั้น {item.floor}
            </Text>
          </View>
        </View>

        <View style={styles.details}>
          <View style={styles.detailItem}>
            <MaterialDesignIcons
              name="sofa-outline"
              size={17}
              color="#64748B"
            />

            <Text style={styles.detailText}>
              เฟอร์นิเจอร์ {furnitureCount} ชิ้น
            </Text>
          </View>

          <View style={styles.detailItem}>
            <MaterialDesignIcons
              name="clock-outline"
              size={17}
              color="#64748B"
            />

            <Text style={styles.detailText}>
              แก้ไขล่าสุด {updatedDate}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={{paddingVertical:12,marginBottom:8}}
          onPress={() => navigation.navigate('DesignPriceSummary', {designId:String(item._id)})}>
          <Text style={{color:'#0F9D8A',fontWeight:'700'}}>ดูสรุปราคาตกแต่ง →</Text>
        </TouchableOpacity>
        {(item.budget !== null && item.budget !== undefined) && (
          <Text style={styles.detailText}>งบตกแต่ง {item.budget.toLocaleString('th-TH')} บาท</Text>
        )}
        {(item.estimatedTotal !== null && item.estimatedTotal !== undefined) && (
          <Text style={styles.detailText}>ยอดที่คำนวณได้ ณ เวลาบันทึก {item.estimatedTotal.toLocaleString('th-TH')} บาท</Text>
        )}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEdit(item)}>
            <MaterialDesignIcons
              name="pencil-outline"
              size={19}
              color="#FFFFFF"
            />

            <Text style={styles.editText}>
              เปิดแก้ไขแบบห้อง
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}>
            <MaterialDesignIcons
              name="delete-outline"
              size={23}
              color="#DC2626"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ========================================
  // UI
  // ========================================

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <MaterialDesignIcons
            name="arrow-left"
            size={25}
            color="#1E293B"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          แบบห้องของฉัน
        </Text>

        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#0F766E"
          />

          <Text style={styles.loadingText}>
            กำลังโหลดแบบห้อง...
          </Text>
        </View>
      ) : (
        <FlatList
          data={designs}
          keyExtractor={item => String(item._id)}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadDesigns();
              }}
              colors={['#0F766E']}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <MaterialDesignIcons
                  name="floor-plan"
                  size={45}
                  color="#0F766E"
                />
              </View>

              <Text style={styles.emptyTitle}>
                ยังไม่มีแบบห้องที่บันทึก
              </Text>

              <Text style={styles.emptySubtitle}>
                เลือกบ้านและเริ่มตกแต่งห้อง 2D
                {'\n'}
                จากนั้นบันทึกแบบห้องของคุณ
              </Text>

              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() =>
                  navigation.navigate('MainTabs')
                }>
                <Text style={styles.exploreText}>
                  กลับไปเลือกบ้าน
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default MyDesignsScreen;

// ========================================
// STYLES
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8FA',
  },

  header: {
    height: 62,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  backButton: {
    width: 35,
    height: 35,
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },

  list: {
    padding: 18,
    paddingBottom: 40,
    flexGrow: 1,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 17,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconBox: {
    width: 62,
    height: 62,
    backgroundColor: '#E7F8F4',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  info: {
    flex: 1,
  },

  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },

  roomName: {
    fontSize: 13,
    color: '#0F766E',
    fontWeight: '700',
    marginTop: 5,
  },

  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },

  details: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 9,
  },

  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  detailText: {
    fontSize: 12,
    color: '#64748B',
  },

  actions: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 10,
  },

  editButton: {
    flex: 1,
    height: 45,
    borderRadius: 11,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  editText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  deleteButton: {
    width: 48,
    height: 45,
    backgroundColor: '#FEE2E2',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 50,
  },

  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#334155',
    marginTop: 18,
  },

  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 21,
  },

  exploreButton: {
    marginTop: 23,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#0F766E',
  },

  exploreText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
