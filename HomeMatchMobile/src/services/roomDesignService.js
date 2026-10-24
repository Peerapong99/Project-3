
import api from "./api";

// ==========================================
// 1. โหลดแบบตกแต่งห้องตามบ้าน ชั้น และห้อง
// ==========================================
export const getRoomDesign = async (
  propertyId,
  floor,
  roomId
) => {
  const response = await api.get("/room-designs", {
    params: {
      propertyId,
      floor,
      roomId,
    },
  });

  return response.data;
};

// ==========================================
// 2. บันทึกหรืออัปเดตแบบตกแต่งห้อง
// ==========================================
export const saveRoomDesign = async (designData) => {
  const response = await api.put(
    "/room-designs",
    designData
  );

  return response.data;
};

// ==========================================
// 3. ลบแบบตกแต่งห้อง
// ==========================================
export const deleteRoomDesign = async (
  propertyId,
  floor,
  roomId
) => {
  const response = await api.delete("/room-designs", {
    params: {
      propertyId,
      floor,
      roomId,
    },
  });

  return response.data;
};

// ==========================================
// 4. โหลดแบบห้องทั้งหมดของผู้ใช้ (ใหม่)
// ==========================================
export const getMyDesigns = async () => {
  const response = await api.get(
    "/room-designs/my-designs"
  );

  return response.data;
};

// unitPrice === null means unknown, never an automatic zero.
export const getDesignCatalog = async () => {
  const response = await api.get('/room-designs/catalog');
  return response.data;
};
export const getDesignPriceSummary = async designId => {
  const response = await api.get(`/room-designs/${encodeURIComponent(designId)}/price-summary`);
  return response.data;
};
export const saveDesignPriceSummary = async (designId, data) => {
  const response = await api.patch(`/room-designs/${encodeURIComponent(designId)}/price-summary`, data);
  return response.data;
};
export const deleteDesignById = async designId => {
  const response = await api.delete('/room-designs/' + encodeURIComponent(designId));
  return response.data;
};
