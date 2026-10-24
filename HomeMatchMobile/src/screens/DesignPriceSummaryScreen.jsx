import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons/static';
import {
  getDesignPriceSummary,
  saveDesignPriceSummary,
} from '../services/roomDesignService';
import { parseBudget, calculateBudget } from '../utils/designBudget';
import { exportDesignPdf } from '../services/designPdfService';
import { startConversation, shareDesignMessage } from '../services/chatService';
import { getStoredUser } from '../services/authService';

const images = {
  bed: require('../assets/Bed.png'),
  sofa: require('../assets/Sofa.png'),
  table: require('../assets/Table.png'),
  cabinet: require('../assets/Cabinet.png'),
  tv: require('../assets/TV.png'),
  plant: require('../assets/Plant.png'),
  toilet: require('../assets/Toilet.png'),
  sink: require('../assets/Sink.png'),
  bathtub: require('../assets/Bathtub.png'),
};
const floorColors = {
  'light-wood': '#D9B98C',
  'dark-wood': '#8B6848',
  tile: '#E7E5E4',
  marble: '#F1F1EF',
  concrete: '#C9CDD1',
};
const money = value =>
  typeof value === 'number' && Number.isFinite(value)
    ? `${value.toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} บาท`
    : 'ยังไม่มีข้อมูลราคา';

function PlanPreview({ design }) {
  const [width, setWidth] = useState(0);
  const items = design.furniture || [];
  const savedWidth = design.canvasSize?.width;
  const savedHeight = design.canvasSize?.height;
  const hasCanvas =
    Number.isFinite(savedWidth) &&
    savedWidth > 0 &&
    Number.isFinite(savedHeight) &&
    savedHeight > 0;
  // Legacy designs have no viewport; fit their saved pixel extents without changing them.
  const originalWidth = hasCanvas
    ? savedWidth
    : Math.max(300, ...items.map(item => item.x + item.width + 8));
  const originalHeight = hasCanvas
    ? savedHeight
    : Math.max(360, ...items.map(item => item.y + item.height + 8));
  const scale = width > 0 ? width / originalWidth : 0;
  const height = width > 0 ? (width * originalHeight) / originalWidth : 240;
  const wallColor = /^#[0-9a-f]{6}$/i.test(design.selectedWall?.color || '')
    ? design.selectedWall.color
    : '#FFFFFF';
  return (
    <>
      <View
        onLayout={event => setWidth(event.nativeEvent.layout.width)}
        style={[
          styles.plan,
          {
            height,
            backgroundColor: floorColors[design.selectedFloor?.id] || '#E2E8F0',
            borderColor: wallColor,
          },
        ]}
        accessibilityLabel="ภาพตัวอย่างห้องที่บันทึก"
      >
        {scale > 0 &&
          items.map(item => (
            <View
              key={item.id}
              style={{
                position: 'absolute',
                left: item.x * scale,
                top: item.y * scale,
                width: Math.max(1, item.width * scale),
                height: Math.max(1, item.height * scale),
                transform: [{ rotate: `${item.rotation || 0}deg` }],
              }}
            >
              {images[item.type] ? (
                <Image
                  source={images[item.type]}
                  style={styles.fill}
                  resizeMode="contain"
                />
              ) : (
                <Text numberOfLines={1}>{item.name || item.type}</Text>
              )}
            </View>
          ))}
      </View>
      {!hasCanvas && (
        <Text style={styles.hint}>
          แบบเก่ายังไม่มีขนาด Canvas
          ภาพนี้จัดให้พอดีหน้าจอจากตำแหน่งที่บันทึกไว้
        </Text>
      )}
      <Text style={styles.hint}>
        ภาพประกอบแบบห้อง ไม่ใช่แปลนก่อสร้างหรือพื้นที่วัดจริง
      </Text>
    </>
  );
}

function PriceRow({ item }) {
  return (
    <View style={styles.priceRow}>
      {images[item.key] ? (
        <Image
          source={images[item.key]}
          style={styles.itemImage}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.itemImage}>
          <MaterialDesignIcons
            name={item.category === 'wall' ? 'wall' : 'floor-plan'}
            size={28}
            color="#0F9D8A"
          />
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.hint}>
          {item.quantity === null
            ? 'ยังไม่มีข้อมูลพื้นที่'
            : `${item.quantity} ${item.unit}`}{' '}
          × {money(item.unitPrice)}
          {item.unitPrice !== null ? `/${item.unit}` : ''}
        </Text>
        {!!item.priceSource && (
          <Text style={styles.hint}>อ้างอิง: {item.priceSource}</Text>
        )}
        <Text style={[styles.lineTotal, item.total === null && styles.unknown]}>
          {item.total === null
            ? item.missingPrice
              ? 'ยังไม่มีข้อมูลราคา'
              : 'ยังคำนวณไม่ได้'
            : money(item.total)}
        </Text>
      </View>
    </View>
  );
}

export default function DesignPriceSummaryScreen({ navigation, route }) {
  const designId = route.params?.designId;
  const isFocused = useIsFocused();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [designName, setDesignName] = useState('');
  const [budgetText, setBudgetText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [useCurrentPrices, setUseCurrentPrices] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState('');
  useEffect(() => {
    if (!isFocused) return;
    let active = true;
    setLoading(true);
    setError('');
    setData(null);
    const load = async () => {
      try {
        if (!designId) throw new Error('ไม่พบรหัสแบบที่บันทึก');
        const result = await getDesignPriceSummary(designId);
        if (!result?.status || !result.design || !result.summary)
          throw new Error('ข้อมูลสรุปราคาไม่ครบถ้วน');
        if (active) {
          setData(result);
          setDesignName(
            result.design.designName || result.design.room || 'แบบห้องของฉัน',
          );
          setBudgetText(
            result.design.budget === null || result.design.budget === undefined
              ? ''
              : String(result.design.budget),
          );
          setUseCurrentPrices(false);
          setSaveError('');
        }
      } catch (failure) {
        if (active)
          setError(
            failure.response?.data?.message ||
              failure.message ||
              'โหลดสรุปราคาไม่สำเร็จ',
          );
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [designId, attempt, isFocused]);

  const edit = () => {
    const design = data?.design;
    if (!design) return;
    const state = navigation.getState();
    if (state.routes[state.index - 1]?.name === 'RoomCustomizer') {
      navigation.goBack();
      return;
    }
    const propertyId = design.propertyId?._id || design.propertyId;
    if (!propertyId) {
      setError('ประกาศบ้านของแบบนี้ไม่พร้อมใช้งาน');
      return;
    }
    navigation.navigate('RoomCustomizer', {
      propertyId: String(propertyId),
      floor: design.floor,
      room: { _id: design.roomId, id: design.roomId, name: design.room },
    });
  };
  const summary = useCurrentPrices ? data?.currentSummary : data?.summary;
  const parsedBudget = parseBudget(budgetText);
  const budgetPlan = calculateBudget(summary?.grandTotal, parsedBudget.value);
  const budgetColor = budgetPlan?.isOverBudget ? '#DC2626' : '#0F9D8A';
  const shareWithSeller = () => {
    if (sharing || saving || exporting || !data) return;
    if (
      designName.trim() !==
        (data.design.designName || data.design.room || 'แบบห้องของฉัน') ||
      parsedBudget.error ||
      parsedBudget.value !== (data.design.budget ?? null)
    ) {
      setShareError('กรุณาบันทึกชื่อแบบและงบประมาณล่าสุดก่อนแชร์');
      return;
    }
    const propertyId = data.design.propertyId?._id;
    if (!propertyId) {
      setShareError('ไม่พบประกาศบ้านสำหรับติดต่อผู้ขาย');
      return;
    }
    Alert.alert(
      'ส่งแบบให้ผู้ขาย',
      'ยืนยันส่งสำเนาการจัดวางเฟอร์นิเจอร์ ชื่อแบบ งบประมาณ และสรุปราคาให้ผู้ขายของบ้านนี้ผ่าน Chat? ผู้ขายจะดูได้เฉพาะสำเนาที่ส่งครั้งนี้',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ยืนยันส่งแบบ',
          onPress: async () => {
            setSharing(true);
            setShareError('');
            try {
              const user = await getStoredUser();
              if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนแชร์แบบ');
              if (user.role !== 'buyer')
                throw new Error('เฉพาะผู้ซื้อเท่านั้นที่ส่งแบบให้ผู้ขายได้');
              const result = await startConversation(String(propertyId));
              const conversation = result?.conversation;
              if (!conversation?._id) throw new Error('เปิดบทสนทนาไม่สำเร็จ');
              await shareDesignMessage(String(conversation._id), {
                designId,
                expectedUpdatedAt: data.design.updatedAt,
                pricingMode: useCurrentPrices ? 'current' : 'saved',
              });
              navigation.navigate('Chat', {
                conversationId: String(conversation._id),
                otherUserName: conversation.seller?.name || 'ผู้ขาย',
                propertyTitle: data.design.propertyId.title,
              });
            } catch (failure) {
              setShareError(
                failure.response?.data?.message ||
                  failure.message ||
                  'ส่งแบบไม่สำเร็จ',
              );
            } finally {
              setSharing(false);
            }
          },
        },
      ],
    );
  };
  const downloadPdf = () => {
    if (saving || exporting || sharing || !data) return;
    if (parsedBudget.error || !designName.trim()) {
      setPdfError(parsedBudget.error || 'กรุณาระบุชื่อแบบ');
      return;
    }
    Alert.alert(
      'ดาวน์โหลดสรุปราคา PDF',
      'ระบบจะเปิดหน้าพิมพ์ Android ให้เลือก “บันทึกเป็น PDF / Save as PDF” แล้วเลือกโฟลเดอร์จัดเก็บ เอกสารใช้ชื่อแบบและงบประมาณที่กรอก โดยไม่บันทึกทับแบบ',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'เปิดหน้าบันทึก PDF',
          onPress: async () => {
            setExporting(true);
            setPdfError('');
            try {
              await exportDesignPdf({
                designId,
                expectedUpdatedAt: data.design.updatedAt,
                designName: designName.trim(),
                budget: parsedBudget.value,
                useCurrentPrices,
              });
            } catch (failure) {
              setPdfError(
                failure.response?.data?.message ||
                  failure.message ||
                  'ส่งออก PDF ไม่สำเร็จ',
              );
            } finally {
              setExporting(false);
            }
          },
        },
      ],
    );
  };
  const saveSummary = () => {
    if (saving || exporting || sharing || !data) return;
    if (!designName.trim() || parsedBudget.error) {
      setSaveError(parsedBudget.error || 'กรุณาระบุชื่อแบบ');
      return;
    }
    Alert.alert(
      'บันทึกแบบและงบประมาณ',
      'ระบบจะบันทึกราคาอ้างอิงปัจจุบันลงในแบบนี้ ยอดอาจเปลี่ยนจากราคาที่บันทึกครั้งก่อน ต้องการดำเนินการต่อ?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'บันทึก',
          onPress: async () => {
            setSaving(true);
            setSaveError('');
            try {
              const result = await saveDesignPriceSummary(designId, {
                designName: designName.trim(),
                budget: parsedBudget.value,
                expectedUpdatedAt: data.design.updatedAt,
              });
              if (!result?.status || !result.design || !result.summary)
                throw new Error('บันทึกไม่สำเร็จ');
              setData(result);
              setUseCurrentPrices(false);
              Alert.alert(
                'บันทึกสำเร็จ',
                'บันทึกชื่อแบบ งบประมาณ และราคาประมาณการแล้ว',
              );
            } catch (failure) {
              setSaveError(
                failure.response?.data?.message ||
                  'บันทึกไม่สำเร็จ กรุณาลองใหม่',
              );
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityLabel="ย้อนกลับ"
          style={styles.back}
        >
          <MaterialDesignIcons name="arrow-left" size={24} color="#0F172A" />
        </Pressable>
        <Text style={styles.headerTitle}>สรุปราคาตกแต่ง</Text>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#0F9D8A" size="large" />
          <Text style={styles.hint}>กำลังตรวจสอบแบบและราคา...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <Pressable
            style={styles.button}
            onPress={() => setAttempt(value => value + 1)}
          >
            <Text style={styles.buttonText}>ลองใหม่</Text>
          </Pressable>
        </View>
      ) : (
        data && (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.card}>
              <Text style={styles.eyebrow}>HOMEMATCH · DESIGN ESTIMATE</Text>
              <Text style={styles.title}>
                {data.design.propertyId?.title || 'ประกาศบ้านไม่พร้อมใช้งาน'}
              </Text>
              <Text style={styles.subtitle}>
                {data.design.room || 'ห้องของคุณ'} · ชั้น {data.design.floor}
              </Text>
              <Text style={styles.hint}>
                ราคาซื้อบ้าน: {money(data.design.propertyId?.price)}{' '}
                (แยกจากค่าตกแต่ง)
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>แบบห้องที่บันทึกล่าสุด</Text>
              <PlanPreview design={data.design} />
            </View>
            {summary.furnitureItems.length === 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  ยังไม่ได้วางเฟอร์นิเจอร์
                </Text>
                <Text style={styles.hint}>
                  กลับไปจัดวางเฟอร์นิเจอร์เพื่อดูรายการและราคาประมาณการ
                </Text>
              </View>
            )}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                เฟอร์นิเจอร์ {data.design.furniture.length} ชิ้น
              </Text>
              {summary.furnitureItems.map(item => (
                <PriceRow key={item.key} item={item} />
              ))}
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>พื้นและผนัง</Text>
              {summary.materialItems.map(item => (
                <PriceRow key={`${item.category}:${item.key}`} item={item} />
              ))}
              <Text style={styles.hint}>
                คิดพื้นที่พื้นจากกว้าง × ยาว และผนังจากรอบห้อง × สูง 2.8 ม.
                โดยใช้ขนาดจำลอง 5 × 6 ม. ไม่หักพื้นที่ประตูและหน้าต่าง
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>ค่าตกแต่งอื่น ๆ</Text>
              <Text style={styles.hint}>
                ยังไม่มีรายการค่าใช้จ่ายเพิ่มเติมที่บันทึกในแบบ
              </Text>
            </View>
            {summary.unpricedItems.length > 0 && (
              <View style={styles.notice}>
                <Text style={styles.noticeTitle}>
                  รายการที่ยังไม่รวมในยอดประมาณการ
                </Text>
                {summary.unpricedItems.map(item => (
                  <Text
                    key={`${item.category}:${item.key}`}
                    style={styles.noticeText}
                  >
                    • {item.name}:{' '}
                    {[
                      item.missingPrice && 'ยังไม่มีข้อมูลราคา',
                      item.missingQuantity && 'ยังไม่มีข้อมูลพื้นที่',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                ))}
              </View>
            )}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>ชื่อแบบและงบประมาณ</Text>
              <Text style={styles.hint}>ชื่อแบบ</Text>
              <TextInput
                style={styles.input}
                value={designName}
                onChangeText={setDesignName}
                maxLength={150}
                editable={!saving && !exporting && !sharing}
                placeholder="ตั้งชื่อแบบของคุณ"
                placeholderTextColor="#94A3B8"
              />
              <Text style={styles.hint}>
                งบประมาณตกแต่ง (บาท) · เว้นว่างหากยังไม่กำหนด
              </Text>
              <TextInput
                style={styles.input}
                value={budgetText}
                onChangeText={setBudgetText}
                keyboardType="decimal-pad"
                editable={!saving && !exporting && !sharing}
                placeholder="กรอกงบประมาณ"
                placeholderTextColor="#94A3B8"
              />
              {!!parsedBudget.error && (
                <Text style={styles.error}>{parsedBudget.error}</Text>
              )}
              {budgetPlan && (
                <>
                  <Text style={styles.hint}>
                    งบประมาณที่ตั้งไว้: {money(parsedBudget.value)}
                  </Text>
                  <Text style={styles.hint}>
                    ค่าใช้จ่ายโดยประมาณ: {money(summary.grandTotal)}
                  </Text>
                  <View
                    style={styles.progressTrack}
                    accessibilityRole="progressbar"
                    accessibilityValue={{
                      min: 0,
                      max: 100,
                      now: Math.round(budgetPlan.progress * 100),
                    }}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${budgetPlan.progress * 100}%`,
                          backgroundColor: budgetColor,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.lineTotal, { color: budgetColor }]}>
                    {budgetPlan.isOverBudget
                      ? `เกินงบ ${money(budgetPlan.overBudget)}`
                      : `เงินคงเหลือ ${money(budgetPlan.remaining)}`}
                  </Text>
                  <Text style={styles.hint}>
                    {budgetPlan.percentage === null
                      ? 'งบประมาณ 0 บาท'
                      : `ใช้งบ ${budgetPlan.percentage.toFixed(1)}%`}
                  </Text>
                  {!summary.isComplete && (
                    <Text style={styles.noticeText}>
                      คำนวณจากรายการที่ทราบราคาและจำนวนเท่านั้น
                      ยอดคงเหลือยังไม่รวมรายการที่ขาดข้อมูล
                    </Text>
                  )}
                </>
              )}
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>
                {data.summarySource === 'saved' && !useCurrentPrices
                  ? 'ราคา ณ เวลาบันทึก'
                  : 'ราคาอ้างอิงปัจจุบัน'}
              </Text>
              <Text style={styles.hint}>
                {new Date(summary.calculatedAt).toLocaleString('th-TH')}
              </Text>
              {data.summarySource === 'saved' && (
                <Pressable
                  disabled={saving}
                  onPress={() => setUseCurrentPrices(value => !value)}
                >
                  <Text style={styles.lineTotal}>
                    {useCurrentPrices
                      ? 'กลับไปดูราคาที่บันทึกไว้'
                      : 'ดูราคาอ้างอิงปัจจุบัน'}
                  </Text>
                </Pressable>
              )}
            </View>
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>
                {summary.isComplete
                  ? 'รวมราคาตกแต่งโดยประมาณ'
                  : 'ยอดประมาณการเฉพาะรายการที่คำนวณได้'}
              </Text>
              <Text style={styles.total}>{money(summary.grandTotal)}</Text>
              <Text style={styles.totalHint}>
                ราคาประมาณการ ไม่ใช่ราคาจำหน่ายจริง และไม่รวมราคาซื้อบ้าน
              </Text>
            </View>
            {!!shareError && <Text style={styles.error}>{shareError}</Text>}
            <Pressable
              disabled={sharing || saving || exporting}
              onPress={shareWithSeller}
              style={[
                styles.button,
                (sharing || saving || exporting) && styles.disabled,
              ]}
            >
              <Text style={styles.buttonText}>
                {sharing ? 'กำลังส่งแบบ...' : 'ส่งแบบให้ผู้ขาย'}
              </Text>
            </Pressable>
            {!!pdfError && <Text style={styles.error}>{pdfError}</Text>}
            <Pressable
              style={[styles.button, (saving || exporting) && styles.disabled]}
              disabled={
                saving ||
                exporting ||
                !!parsedBudget.error ||
                !designName.trim()
              }
              onPress={downloadPdf}
            >
              <Text style={styles.buttonText}>
                {exporting ? 'กำลังเตรียม PDF...' : 'ดาวน์โหลดสรุปราคา PDF'}
              </Text>
            </Pressable>
            <Text style={styles.hint}>
              เลือก Save as PDF ในหน้าพิมพ์ แล้วบันทึกในโฟลเดอร์ที่ต้องการ
              เปิดไฟล์ภายหลังได้จากแอป Files ของ Android
            </Text>
            {!!saveError && (
              <View style={styles.notice}>
                <Text style={styles.error}>{saveError}</Text>
                <Pressable
                  disabled={saving}
                  onPress={() => setAttempt(value => value + 1)}
                >
                  <Text style={styles.lineTotal}>
                    โหลดแบบล่าสุด (ข้อมูลที่ยังไม่ได้บันทึกจะถูกแทนที่)
                  </Text>
                </Pressable>
              </View>
            )}
            <Pressable
              style={[styles.button, saving && styles.disabled]}
              disabled={saving || !!parsedBudget.error || !designName.trim()}
              onPress={saveSummary}
            >
              <Text style={styles.buttonText}>
                {saving ? 'กำลังบันทึก...' : 'บันทึกแบบและสรุปราคา'}
              </Text>
            </Pressable>
            <Pressable style={styles.button} disabled={saving} onPress={edit}>
              <Text style={styles.buttonText}>กลับไปแก้ไขแบบเดิม</Text>
            </Pressable>
          </ScrollView>
        )
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#D7E5E1',
    borderRadius: 12,
    padding: 12,
    color: '#0F172A',
    marginTop: 6,
    marginBottom: 14,
  },
  progressTrack: {
    height: 10,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginVertical: 12,
  },
  progressFill: { height: '100%', borderRadius: 8 },
  disabled: { opacity: 0.5 },
  screen: { flex: 1, backgroundColor: '#F3F8F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  back: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  content: { padding: 20, gap: 16, paddingBottom: 36 },
  card: { padding: 18, borderRadius: 18, backgroundColor: '#FFFFFF' },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F9D8A',
    marginBottom: 8,
  },
  title: { fontSize: 23, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 15, color: '#475569', marginVertical: 8 },
  hint: { fontSize: 12, color: '#64748B', lineHeight: 20 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  plan: {
    width: '100%',
    position: 'relative',
    borderWidth: 6,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  fill: { width: '100%', height: '100%' },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemImage: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  lineTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F9D8A',
    marginTop: 6,
  },
  unknown: { color: '#B45309' },
  notice: { backgroundColor: '#FFFBEB', padding: 16, borderRadius: 16 },
  noticeTitle: { color: '#92400E', fontWeight: '700', marginBottom: 8 },
  noticeText: { color: '#92400E', fontSize: 12, lineHeight: 21 },
  totalCard: { padding: 22, backgroundColor: '#0F9D8A', borderRadius: 18 },
  totalLabel: { color: '#FFFFFF', fontWeight: '600' },
  total: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  totalHint: { fontSize: 12, color: '#E0F7F1', lineHeight: 20 },
  button: { padding: 16, borderRadius: 14, backgroundColor: '#0F9D8A' },
  buttonText: { textAlign: 'center', color: '#FFFFFF', fontWeight: '700' },
  error: { color: '#DC2626', textAlign: 'center' },
});

export { PlanPreview, PriceRow, money };
