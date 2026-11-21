import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;


if (!url || !anon) {
  console.error('Error: SUPABASE_URL o SUPABASE_ANON_KEY no están definidos en .env');
}
if (!service) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY no está definido en .env');
}

// Cliente EXCLUSIVO para operaciones de base de datos (insertar, actualizar, eliminar)
export const supabaseAdmin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const supabase = createClient(url, anon);

// Cliente EXCLUSIVO para operaciones de autenticación (login, crear usuarios)
export const supabaseAdminAuth = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Función para crear un cliente NUEVO y limpio para hacer login
export const createAuthClient = () => {
  return createClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};