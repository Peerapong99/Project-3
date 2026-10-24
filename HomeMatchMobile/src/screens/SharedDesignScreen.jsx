import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { getSharedDesign } from '../services/chatService';
import { PlanPreview, PriceRow, money } from './DesignPriceSummaryScreen';

export default function SharedDesignScreen({ navigation, route }) {
  const { sharedConversationId, sharedMessageId } = route.params || {};
  const focused = useIsFocused();
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!focused) return;
    let active = true;
    setLoading(true);
    setError('');
    setData(null);
    async function load() {
      try {
        const result = await getSharedDesign(
          sharedConversationId,
          sharedMessageId,
        );
        if (!result?.status || !result.design || !result.summary)
          throw new Error('ข้อมูลแบบที่แชร์ไม่ครบถ้วน');
        if (active) setData(result);
      } catch (failure) {
        if (active)
          setError(
            failure.response?.data?.message || 'โหลดแบบที่แชร์ไม่สำเร็จ',
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [focused, sharedConversationId, sharedMessageId, attempt]);
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}>← กลับไป Chat</Text>
        </Pressable>
        <Text style={styles.title}>แบบที่ผู้ซื้อแชร์</Text>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0F9D8A" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => setAttempt(value => value + 1)}>
            <Text style={styles.link}>ลองใหม่</Text>
          </Pressable>
        </View>
      ) : (
        data && (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card}>
              <Text style={styles.title}>
                {data.design.designName || data.design.room}
              </Text>
              <Text>{data.design.propertyId?.title}</Text>
              <Text>
                ห้อง {data.design.room} · ชั้น {data.design.floor}
              </Text>
              <Text style={styles.hint}>
                แชร์เมื่อ {new Date(data.sharedAt).toLocaleString('th-TH')}
              </Text>
              <Text style={styles.hint}>
                สำเนา ณ เวลาที่ส่ง ผู้ขายแก้ไขไม่ได้
                และไม่มีสิทธิ์ดูการแก้แบบส่วนตัวครั้งถัดไป
              </Text>
            </View>
            <View style={styles.card}>
              <PlanPreview design={data.design} />
            </View>
            <View style={styles.card}>
              <Text style={styles.title}>เฟอร์นิเจอร์และวัสดุ</Text>
              {[
                ...data.summary.furnitureItems,
                ...data.summary.materialItems,
              ].map(item => (
                <PriceRow key={`${item.category}:${item.key}`} item={item} />
              ))}
            </View>
            <View style={styles.card}>
              <Text style={styles.title}>
                ยอดที่คำนวณได้ {money(data.summary.grandTotal)}
              </Text>
              <Text>
                งบประมาณ:{' '}
                {data.design.budget === null
                  ? 'ยังไม่ได้กำหนด'
                  : money(data.design.budget)}
              </Text>
              <Text style={styles.hint}>
                ราคาประมาณการ ไม่ใช่ราคาจำหน่ายจริง ไม่รวมราคาซื้อบ้าน
              </Text>
              {!data.summary.isComplete && (
                <Text style={styles.error}>
                  ยังไม่รวมรายการที่ไม่มีราคาหรือข้อมูลพื้นที่
                </Text>
              )}
            </View>
          </ScrollView>
        )
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F8F7' },
  header: { padding: 20, gap: 10, backgroundColor: '#FFFFFF' },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  link: { color: '#0F9D8A', fontWeight: '700' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  content: { padding: 20, gap: 16 },
  card: { padding: 18, borderRadius: 18, backgroundColor: '#FFFFFF' },
  hint: { color: '#64748B', fontSize: 12, lineHeight: 21, marginTop: 6 },
  error: { color: '#B45309' },
});
