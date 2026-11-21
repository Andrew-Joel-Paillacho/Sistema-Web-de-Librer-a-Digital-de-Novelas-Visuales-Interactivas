const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handle = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de red');
  return data;
};

export const listMyNovels = async () => {
  const res = await fetch(`${API_URL}/novels`, { headers: authHeaders() });
  return handle(res);
};

export const getNovel = async (id) => {
  const res = await fetch(`${API_URL}/novels/${id}`, { headers: authHeaders() });
  return handle(res);
};

/**
 * Construye el FormData:
 * - meta: JSON {title,genre,synopsis,visibility,status,structure}
 * - cover: File (opcional)
 * - escenario_<petalId>: File
 * - character_<charId>_<moodId>: File
 */
export const saveNovel = async ({ id, meta, files }) => {
  const fd = new FormData();
  fd.append('meta', JSON.stringify(meta));
  for (const [key, file] of Object.entries(files || {})) {
    if (file) fd.append(key, file);
  }
  const url = id ? `${API_URL}/novels/${id}` : `${API_URL}/novels`;
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, { method, headers: authHeaders(), body: fd });
  return handle(res);
};

export const deleteNovel = async (id) => {
  const res = await fetch(`${API_URL}/novels/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handle(res);
};