const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const handle = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de red');
  return data;
};

export const getTopByRating = async (limit = 3) => {
  const res = await fetch(`${API_URL}/public/top-by-rating?limit=${limit}`);
  return handle(res);
};

export const getTopByViews = async (limit = 8) => {
  const res = await fetch(`${API_URL}/public/top-by-views?limit=${limit}`);
  return handle(res);
};