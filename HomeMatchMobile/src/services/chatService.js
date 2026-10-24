import api from './api';
import {getToken} from './authService';

// =====================================================
// HEADER
// =====================================================

const getAuthConfig = async () => {
  const token = await getToken();

  if (!token) {
    throw new Error('NOT_LOGGED_IN');
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// =====================================================
// START / GET CONVERSATION
// Buyer เริ่มคุยจากหน้ารายละเอียดบ้าน
// =====================================================

export const startConversation = async propertyId => {
  const config = await getAuthConfig();

  const response = await api.post(
    '/chat/conversations',
    {
      propertyId,
    },
    config,
  );

  return response.data;
};

// =====================================================
// GET MY CONVERSATIONS
// Buyer / Seller
// =====================================================

export const getMyConversations = async () => {
  const config = await getAuthConfig();

  const response = await api.get(
    '/chat/conversations',
    config,
  );

  return response.data;
};

// =====================================================
// GET MESSAGES
// =====================================================

export const getMessages = async conversationId => {
  const config = await getAuthConfig();

  const response = await api.get(
    `/chat/conversations/${conversationId}/messages`,
    config,
  );

  return response.data;
};

// =====================================================
// SEND MESSAGE
// =====================================================

export const sendMessage = async (
  conversationId,
  message,
) => {
  const config = await getAuthConfig();

  const response = await api.post(
    `/chat/conversations/${conversationId}/messages`,
    {
      message,
    },
    config,
  );

  return response.data;
};

// =====================================================
// MARK READ
// =====================================================

export const markConversationAsRead = async conversationId => {
  const config = await getAuthConfig();

  const response = await api.patch(
    `/chat/conversations/${conversationId}/read`,
    {},
    config,
  );

  return response.data;
};
export const shareDesignMessage = async (conversationId, data) => {
  const response = await api.post(`/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {message:'แชร์แบบห้องและสรุปราคาประมาณการ',...data}, await getAuthConfig());
  return response.data;
};
export const getSharedDesign = async (conversationId, messageId) => {
  const response = await api.get(`/chat/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/design`, await getAuthConfig());
  return response.data;
};