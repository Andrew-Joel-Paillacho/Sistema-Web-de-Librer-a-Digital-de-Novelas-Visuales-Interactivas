const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Helper para obtener los headers con el token
const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// 1. Dashboard
export const getDashboardHome = async () => {
  const res = await fetch(`${API_URL}/readers/dashboard`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error al cargar el dashboard');
  return res.json();
};

// 2. Biblioteca
export const getLibrary = async ({ genre = '', sort = 'name', q = '', date = '', page = 1 } = {}) => {
  const params = new URLSearchParams();
  if (genre) params.set('genre', genre);
  if (sort) params.set('sort', sort);
  if (q) params.set('q', q);
  if (date) params.set('date', date);
  if (page) params.set('page', page.toString());

  const res = await fetch(`${API_URL}/readers/library?${params.toString()}`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error al cargar la biblioteca');
  return res.json();
};

// 3. Detalles de la novela (Lobby / Ficha)
export const getNovelDetails = async (novelId) => {
  const res = await fetch(`${API_URL}/readers/novels/${novelId}`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error al cargar los detalles de la novela');
  return res.json();
};

// 4. Obtener la novela completa para el Lector Visual
export const getNovelForReading = async (novelId) => {
  const res = await fetch(`${API_URL}/readers/novels/${novelId}/read`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error al cargar la historia para leer');
  return res.json();
};

// 5. Guardar progreso de lectura
export const saveContinueReading = async (payload) => {
  const res = await fetch(`${API_URL}/readers/continue-reading`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Error al guardar el progreso');
  return res.json();
};

// 6. Reseñas
export const createReview = async (payload) => {
  const res = await fetch(`${API_URL}/readers/reviews`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Error al crear la reseña');
  return res.json();
};

export const getReviewsByNovel = async (novelId) => {
  const res = await fetch(`${API_URL}/readers/reviews/${novelId}`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Error al cargar las reseñas');
  return res.json();
};

export const deleteReview = async (reviewId) => {
  const res = await fetch(`${API_URL}/readers/reviews/${reviewId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Error al eliminar la reseña');
  return res.json();
};

// 7. Guardado de partidas
export const saveGameSlot = async (page, slot, saveData) => {
  const res = await fetch(`${API_URL}/readers/save-slot`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ page, slot, saveData }),
  });

  // Verificamos si la respuesta es JSON antes de intentar parsearla
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("Ruta no encontrada en el servidor (Error 404). Revisa tus rutas en Express.");
  }

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Error al guardar la ranura');
  }
  return res.json();
};

export const finishNovel = async (novel_id) => {
  const res = await fetch(`${API_URL}/readers/finish-novel`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ novel_id }),
  });

  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("Ruta no encontrada en el servidor (Error 404). Revisa tus rutas en Express.");
  }

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Error al completar la novela');
  }
  return res.json();
};

export const deleteGameSlot = async (page, slot) => {
  const res = await fetch(`${API_URL}/readers/delete-slot`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ page, slot }),
  });

  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new Error("Ruta no encontrada (Error 404).");
  }

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Error al eliminar la ranura');
  }
  return res.json();
};

// 8. Reportes
export const reportNovel = async (payload) => {
  const res = await fetch(`${API_URL}/readers/report`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error("Error del backend:", errorData);
    throw new Error(errorData.error || 'Error al enviar el reporte');
  }
  return res.json();
};
