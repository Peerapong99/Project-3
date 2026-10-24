import api from './api';
import {getToken} from './authService';

// =====================================================
// GET MY NOTIFICATIONS
// GET /api/notifications
// =====================================================

export const getMyNotifications = async () => {
  const token = await getToken();

  if (!token) {
    throw new Error('NOT_LOGGED_IN');
  }

  const response = await api.get(
    '/notifications',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};

// =====================================================
// GET UNREAD COUNT
// GET /api/notifications/unread-count
// =====================================================

export const getUnreadNotificationCount =
  async () => {
    const token = await getToken();

    if (!token) {
      throw new Error('NOT_LOGGED_IN');
    }

    const response = await api.get(
      '/notifications/unread-count',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response.data;
  };

// =====================================================
// MARK ONE AS READ
// PATCH /api/notifications/:id/read
// =====================================================

export const markNotificationAsRead =
  async notificationId => {
    const token = await getToken();

    if (!token) {
      throw new Error('NOT_LOGGED_IN');
    }

    const response = await api.patch(
      `/notifications/${notificationId}/read`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response.data;
  };

// =====================================================
// MARK ALL AS READ
// PATCH /api/notifications/read-all
// =====================================================

export const markAllNotificationsAsRead =
  async () => {
    const token = await getToken();

    if (!token) {
      throw new Error('NOT_LOGGED_IN');
    }

    const response = await api.patch(
      '/notifications/read-all',
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response.data;
  };