
import { getToken } from "./authService";
import api from "./api";

// Android Emulator ใช้ 10.0.2.2 แทน localhost
// หากทดสอบบนมือถือจริง ให้เปลี่ยนเป็น IP เครื่องคอมพิวเตอร์


const getHeaders = async () => {
  const token = await getToken();

  if (!token) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนเสนอราคา");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

// ส่งข้อเสนอซื้อบ้าน
export const createPurchaseOffer = async ({
  propertyId,
  offerPrice,
  message,
}) => {
  const headers = await getHeaders();

  const response = await api.post(
    `/offers`,
    {
      propertyId,
      offerPrice: Number(offerPrice),
      message: message || "",
    },
    { headers }
  );

  return response.data;
};

// ดูข้อเสนอของ Buyer
export const getMyPurchaseOffers = async () => {
  const headers = await getHeaders();

  const response = await api.get(
    `/offers/my`,
    { headers }
  );

  return response.data;
};

// ยกเลิกข้อเสนอที่รอพิจารณา
export const cancelPurchaseOffer = async (offerId) => {
  const headers = await getHeaders();

  const response = await api.patch(
    `/offers/${offerId}/cancel`,
    {},
    { headers }
  );

  return response.data;
};
