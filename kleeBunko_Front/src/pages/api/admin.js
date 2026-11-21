const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handle = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de servidor');
  return data;
};

export const getAdminMe = async () =>
  handle(await fetch(`${API_URL}/admin/me`, { headers: authHeaders() }));

export const updateMasterProfile = async (payload) =>
  handle(await fetch(`${API_URL}/admin/me`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }));

export const listAdmins = async () =>
  handle(await fetch(`${API_URL}/admin/admins`, { headers: authHeaders() }));

export const createAdmin = async (payload) =>
  handle(await fetch(`${API_URL}/admin/admins`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }));

export const updateAdmin = async (id, payload) =>
  handle(await fetch(`${API_URL}/admin/admins/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }));

export const blockAdmin = async (id, blocked) =>
  handle(await fetch(`${API_URL}/admin/admins/${id}/block`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ blocked }),
  }));

export const deleteAdmin = async (id) =>
  handle(await fetch(`${API_URL}/admin/admins/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }));

export const getReports = async () =>
  handle(await fetch(`${API_URL}/admin/reports`, { headers: authHeaders() }));

export const sendToReview = async (id) =>
  handle(await fetch(`${API_URL}/admin/reports/${id}/review`, {
    method: 'PUT',
    headers: authHeaders(),
  }));

export const resolveReportAction = async (id, payload) =>
  handle(await fetch(`${API_URL}/admin/reports/${id}/resolve`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }));

export const getReviewQueue = async () =>
  handle(await fetch(`${API_URL}/admin/reviews`, { headers: authHeaders() }));

export const getAdminActivity = async () =>
  handle(await fetch(`${API_URL}/admin/activity`, { headers: authHeaders() }));
