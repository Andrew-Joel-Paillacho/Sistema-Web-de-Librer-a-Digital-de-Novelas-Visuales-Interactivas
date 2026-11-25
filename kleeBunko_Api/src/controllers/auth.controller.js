import { supabaseAdmin, supabase, createAuthClient } from '../config/supabase.js';
import jwt from 'jsonwebtoken';

const VALID_ROLES = ['reader', 'creator', 'dual'];

// Helper para generar JWT con tipo
const generarToken = (payload, tipo, expiresIn = '7d') => {
  return jwt.sign({ ...payload, tipo }, process.env.JWT_SECRET, { expiresIn });
};

// Helper: parsea el identificador con prefijo
const parseIdentifier = (raw) => {
  if (typeof raw !== 'string') return { type: 'user', identifier: raw };

  if (raw.startsWith('admin.master.')) {
    return { type: 'master', email: raw.slice('admin.master.'.length).trim() };
  }
  if (raw.startsWith('admin.common.')) {
    return { type: 'administrator', email: raw.slice('admin.common.'.length).trim() };
  }
  return { type: 'user', identifier: raw.trim() };
};

// REGISTRO
export const register = async (req, res) => {
  const { nombre, username, email, password, confirmPassword, role } = req.body;

  if (!nombre || !username || !email || !password || !confirmPassword) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Debes seleccionar un tipo de cuenta válido (reader/creator/dual)' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Las contraseñas no coinciden' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    // 1. VERIFICAR SI EL USERNAME YA EXISTE EN LA TABLA 'profiles'
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (checkError) {
      console.error("Error al verificar username:", checkError);
      return res.status(500).json({ error: 'Error interno al verificar el usuario' });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
    }

    // 2. Crear usuario en Supabase Auth usando un cliente limpio
    const authClient = createAuthClient();
    const { data, error } = await authClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
          username,
          role
        },
        emailRedirectTo: 'http://localhost:5173/login'
      }
    });

    if (error) {
      if (error.message.includes('already been registered')) {
        return res.status(400).json({ error: 'El correo ya está registrado' });
      }
      return res.status(400).json({ error: error.message });
    }

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }


    // === NUEVO: persistir el rol en profiles ===
    if (data.user) {
      // Le ponemos el rol elegido:
      const { error: roleError } = await supabaseAdmin
        .from('profiles')
        .update({ role, nombre, username })
        .eq('id', data.user.id);

      if (roleError) {
        console.error('Error al guardar rol en profiles:', roleError);
      }
    }

    res.status(201).json({
      message: 'Usuario registrado. Por favor, revisa tu correo para confirmar la cuenta antes de iniciar sesión.'
    });

  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// LOGIN
export const login = async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Usuario/correo y contraseña son obligatorios' });
  }

  try {
    const parsed = parseIdentifier(identifier);

    // ---------- LOGIN DE ADMINISTRADOR ----------
    if (parsed.type === 'master' || parsed.type === 'administrator') {
      if (!parsed.email) {
        return res.status(400).json({ error: 'Debes indicar el correo después del prefijo admin.master. / admin.common.' });
      }

      // 1. Buscar en admin_users con el rol correcto
      const { data: adminRow, error: adminErr } = await supabaseAdmin
        .from('admin_users')
        .select('*')
        .eq('email', parsed.email)
        .eq('role', parsed.type)
        .maybeSingle();

      if (adminErr) {
        console.error('admin login lookup', adminErr);
        return res.status(500).json({ error: 'Error interno del servidor' });
      }

      if (!adminRow) {
        return res.status(401).json({
          error: parsed.type === 'master'
            ? 'No existe un administrador master con ese correo'
            : 'No existe un administrador con ese correo',
        });
      }

      if (adminRow.is_blocked) {
        return res.status(403).json({ error: 'Esta cuenta de administrador está bloqueada' });
      }

      // 2. Validar contraseña contra Supabase Auth (Usando cliente limpio)
      const authClient = createAuthClient();
      const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
        email: parsed.email,
        password,
      });

      if (authError) {
        if (authError.message.includes('Email not confirmed')) {
          return res.status(403).json({ error: 'Debes confirmar tu correo electrónico antes de iniciar sesión' });
        }
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      if (!authData.user.email_confirmed_at) {
        return res.status(403).json({ error: 'Debes confirmar tu correo electrónico antes de iniciar sesión' });
      }

      const token = jwt.sign(
        {
          userId: adminRow.id,
          email: adminRow.email,
          username: adminRow.username,
          role: adminRow.role,
          isAdmin: true,
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        message: 'Login exitoso',
        token,
        user: {
          id: adminRow.id,
          email: adminRow.email,
          nombre: adminRow.full_name,
          username: adminRow.username,
          role: adminRow.role,
          isAdmin: true,
        },
      });
    }

    // ---------- LOGIN DE USUARIO NORMAL ----------
    let email = parsed.identifier;

    if (!email.includes('@')) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('username', email)
        .maybeSingle();

      if (profileError || !profile) {
        return res.status(401).json({ error: 'Credenciales inválidas o correo no confirmado' });
      }
      email = profile.email;
    }

    // Validar contraseña (Usando cliente limpio)
    const authClient = createAuthClient();
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      if (authError.message.includes('Email not confirmed')) {
        return res.status(403).json({ error: 'Debes confirmar tu correo electrónico antes de iniciar sesión' });
      }
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!authData.user.email_confirmed_at) {
      return res.status(403).json({ error: 'Debes confirmar tu correo electrónico antes de iniciar sesión' });
    }

    // Verificación defensiva: si este usuario es en realidad un admin sin prefijo, lo bloqueamos
    const { data: maybeAdmin } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (maybeAdmin) {
      return res.status(403).json({
        error: 'Debes usar el prefijo de administrador para iniciar sesión como administrador',
      });
    }

    // === NUEVO: leer rol real desde profiles ===
    const { data: profile, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('role, nombre, username, email')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileFetchError) {
      console.error('Error leyendo profile:', profileFetchError);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }

    const userRole =
      profile?.role ||
      authData.user.user_metadata?.role ||
      'reader';

    const userPayload = {
      id: authData.user.id,
      email: profile?.email || authData.user.email,
      nombre: profile?.nombre || authData.user.user_metadata?.nombre,
      username: profile?.username || authData.user.user_metadata?.username,
      role: userRole,
      isAdmin: false,
    };
    
    const token = jwt.sign(
      {
        userId: authData.user.id,
        email: authData.user.email,
        username: authData.user.user_metadata?.username,
        role: userRole,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login exitoso',
      token,
      user: userPayload,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// LOGOUT
export const logout = async (req, res) => {
  try {
    const userId = req.user.userId;
    // Mantenemos tu lógica de logout
    const { error } = await supabaseAdmin.auth.admin.signOut(userId); 
    
    if (error) {
      console.warn('Advertencia al cerrar sesión en Supabase:', error.message);
    }
    res.status(200).json({ message: 'Sesión cerrada exitosamente' });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
