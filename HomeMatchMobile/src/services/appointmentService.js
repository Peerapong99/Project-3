import api from './api';
import {getToken} from './authService';

// =========================
// CREATE APPOINTMENT
// =========================

export const createAppointment = async ({
  propertyId,
  appointmentDate,
  appointmentTime,
  message,
}) => {
  const token = await getToken();

  if (!token) {
    throw new Error('NOT_LOGGED_IN');
  }

  const response = await api.post(
    '/appointments',
    {
      propertyId,
      appointmentDate,
      appointmentTime,
      message,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};

// =========================
// GET BUYER APPOINTMENTS
// =========================

export const getMyAppointments = async () => {
  const token = await getToken();

  if (!token) {
    throw new Error('NOT_LOGGED_IN');
  }

  const response = await api.get(
    '/appointments/my',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};

// =========================
// CANCEL APPOINTMENT
// =========================

export const cancelAppointment = async appointmentId => {
  const token = await getToken();

  if (!token) {
    throw new Error('NOT_LOGGED_IN');
  }

  const response = await api.patch(
    `/appointments/${appointmentId}/cancel`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};