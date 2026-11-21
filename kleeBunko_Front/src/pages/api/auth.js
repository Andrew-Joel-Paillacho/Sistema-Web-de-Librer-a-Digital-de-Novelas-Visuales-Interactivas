const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Registro
export const registerUser = async ({ nombre, username, email, password, confirmPassword }) => {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, username, email, password, confirmPassword }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrarse');
  return data;
};

// Login
export const loginUser = async ({ identifier, password }) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
  return data;
};

// Obtener usuario actual (ruta protegida)
export const getMe = async (token) => {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'No autorizado');
  return data;
};

// Logout
export const logoutUser = async (token) => {
  try {
    const res = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Error al cerrar sesión');
    }
    return res.json();
  } catch (error) {
    // Loguea pero no relanzas para no bloquear el logout del cliente
    console.error('Error en logoutUser:', error);
    return { message: 'Sesión cerrada localmente' };
  }
};

const handleAuthError = (res) => {
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
};