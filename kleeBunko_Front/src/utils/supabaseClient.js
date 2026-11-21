// kleeBunko_Front/src/config/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// En Vite, las variables de entorno DEBEN empezar con VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Esto es importante para que detecte la sesión al volver del correo
    detectSessionInUrl: true,
    persistSession: true
  }
});