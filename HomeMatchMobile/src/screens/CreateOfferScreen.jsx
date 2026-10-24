
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";

import { createPurchaseOffer } from "../services/offerService";

export default function CreateOfferScreen({ route, navigation }) {
  const { propertyId, propertyTitle, propertyPrice } =
    route.params || {};

  const [offerPrice, setOfferPrice] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const formatPrice = (price) =>
    Number(price || 0).toLocaleString("th-TH");

  const handleSubmit = async () => {
    const price = Number(offerPrice.replace(/,/g, ""));

    if (!propertyId) {
      Alert.alert("ข้อผิดพลาด", "ไม่พบข้อมูลบ้าน");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกราคาที่ต้องการเสนอ");
      return;
    }

    try {
      setLoading(true);

      await createPurchaseOffer({
        propertyId,
        offerPrice: price,
        message: message.trim(),
      });

      Alert.alert(
        "สำเร็จ",
        "ส่งข้อเสนอซื้อบ้านเรียบร้อยแล้ว",
        [
          {
            text: "ตกลง",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.log("CREATE OFFER ERROR:", error);

      Alert.alert(
        "ส่งข้อเสนอไม่สำเร็จ",
        error.response?.data?.message ||
          error.message ||
          "กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>เสนอราคาซื้อบ้าน</Text>

      <Text style={styles.subtitle}>
        กรอกราคาที่ต้องการเสนอให้ผู้ขายพิจารณา
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>บ้านที่สนใจ</Text>
        <Text style={styles.houseTitle}>
          {propertyTitle || "ไม่ระบุชื่อบ้าน"}
        </Text>

        <Text style={styles.label}>ราคาประกาศ</Text>
        <Text style={styles.propertyPrice}>
          ฿{formatPrice(propertyPrice)}
        </Text>
      </View>

      <Text style={styles.label}>ราคาที่ต้องการเสนอ (บาท)</Text>

      <TextInput
        style={styles.input}
        placeholder="เช่น 3500000"
        keyboardType="numeric"
        value={offerPrice}
        onChangeText={setOfferPrice}
      />

      <Text style={styles.label}>
        ข้อความถึงผู้ขาย (ไม่บังคับ)
      </Text>

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="เช่น สนใจซื้อบ้านหลังนี้ ต้องการเจรจาราคา..."
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={1000}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.disabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>ส่งข้อเสนอซื้อ</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.note}>
        เมื่อส่งข้อเสนอแล้ว ผู้ขายจะสามารถยอมรับหรือปฏิเสธได้
        คุณสามารถยกเลิกข้อเสนอได้ขณะรอพิจารณา
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111638",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 8,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 10,
  },
  houseTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111638",
    marginBottom: 20,
  },
  propertyPrice: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#079486",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 16,
    color: "#111638",
    marginBottom: 22,
  },
  textArea: {
    minHeight: 120,
  },
  button: {
    backgroundColor: "#079486",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 5,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  note: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    marginTop: 18,
    lineHeight: 20,
  },
});
