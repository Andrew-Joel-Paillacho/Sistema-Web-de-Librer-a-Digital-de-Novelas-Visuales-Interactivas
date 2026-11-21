import { supabaseAdmin, supabaseAdminAuth } from '../config/supabase.js';

// ---------- HELPERS ----------
const validateAdminPayload = ({ full_name, username, email }) => {
  if (!full_name || !username || !email) {
    return 'Nombre completo, usuario y correo son obligatorios';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'El correo no tiene un formato válido';
  }
  if (username.length < 3) {
    return 'El nombre de usuario debe tener al menos 3 caracteres';
  }
  return null;
};

// Elimina (si existe) el perfil que el trigger handle_new_user creó por error
const cleanupProfileFor = async (id) => {
  try {
    await supabaseAdmin.from('profiles').delete().eq('id', id);
  } catch (e) {
    console.warn('cleanupProfileFor:', e.message);
  }
};

// ---------- GET /api/admin/me ----------
export const getAdminMe = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('id', req.user.userId)
      .maybeSingle();

    if (error || !data) return res.status(404).json({ error: 'Administrador no encontrado' });

    res.json({
      id: data.id,
      full_name: data.full_name,
      username: data.username,
      email: data.email,
      role: data.role,
      is_blocked: data.is_blocked,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ---------- PUT /api/admin/me  (solo master actualiza su info) ----------
export const updateMasterProfile = async (req, res) => {
  try {
    if (req.user.role !== 'master') {
      return res.status(403).json({ error: 'Solo el Master puede actualizar su propio perfil por esta ruta' });
    }

    const { full_name, username, email } = req.body;
    const invalid = validateAdminPayload({ full_name, username, email });
    if (invalid) return res.status(400).json({ error: invalid });

    const id = req.user.userId;

    // Validar que username/email no estén en uso por OTRO admin
    const { data: conflict } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .neq('id', id)
      .maybeSingle();

    if (conflict) {
      return res.status(400).json({ error: 'El nombre de usuario o el correo ya están en uso' });
    }

    // Actualizar email en Supabase Auth si cambió
    const { data: current } = await supabaseAdmin
      .from('admin_users')
      .select('email')
      .eq('id', id)
      .single();

    if (current && current.email !== email) {
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, {
        email,
        email_confirm: true,
      });
      if (authErr) {
        return res.status(400).json({ error: 'No se pudo actualizar el correo en Auth: ' + authErr.message });
      }
    }

    // Actualizar tabla admin_users
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .update({ full_name, username, email })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({
      message: 'Perfil actualizado correctamente',
      admin: {
        id: data.id,
        full_name: data.full_name,
        username: data.username,
        email: data.email,
        role: data.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ---------- GET /api/admin/admins ----------
export const listAdmins = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .order('role', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ admins: data || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ---------- POST /api/admin/admins  (solo master) ----------
export const createAdmin = async (req, res) => {
  try {
    const { full_name, username, email, password } = req.body;
    const invalid = validateAdminPayload({ full_name, username, email });
    if (invalid) return res.status(400).json({ error: invalid });
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // 1. Verificar duplicados
    const { data: dup } = await supabaseAdmin
      .from('admin_users')
      .select('id, username, email')
      .or(`username.eq.${username},email.eq.${email}`);

    if (dup && dup.length > 0) {
      return res.status(400).json({ error: 'Ya existe un administrador con ese usuario o correo' });
    }

    // 2. Verificar que el email no exista en profiles
    const { data: prof } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (prof) {
      return res.status(400).json({ error: 'Ese correo ya pertenece a un usuario normal' });
    }

    // 3. Crear usuario en Supabase Auth
    const { data: created, error: authErr } = await supabaseAdminAuth.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre: full_name, username },
    });

    if (authErr) {
      if (authErr.message.includes('already been registered')) {
        return res.status(400).json({ error: 'Ese correo ya está registrado en el sistema' });
      }
      return res.status(400).json({ error: authErr.message });
    }

    const newId = created.user.id;

    // 4. Insertar en admin_users (siempre como 'administrator', nunca 'master')
    const { data: adminRow, error: insertErr } = await supabaseAdmin
      .from('admin_users')
      .insert({ id: newId, full_name, username, email, role: 'administrator' })
      .select('*')
      .single();

    if (insertErr) {
      // rollback
      await supabaseAdmin.auth.admin.deleteUser(newId).catch(() => {});
      return res.status(500).json({ error: 'No se pudo crear el administrador: ' + insertErr.message });
    }

    // 5. Limpiar el perfil que el trigger haya creado
    await cleanupProfileFor(newId);

    res.status(201).json({
      message: 'Administrador creado correctamente',
      admin: adminRow,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ---------- PUT /api/admin/admins/:id  (solo master) ----------
export const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, username, email } = req.body;
    const invalid = validateAdminPayload({ full_name, username, email });
    if (invalid) return res.status(400).json({ error: invalid });

    const { data: target } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!target) return res.status(404).json({ error: 'Administrador no encontrado' });
    if (target.role === 'master') {
      return res.status(403).json({ error: 'No puedes editar al Master desde aquí' });
    }

    // Conflictos
    const { data: conflict } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .neq('id', id)
      .maybeSingle();

    if (conflict) return res.status(400).json({ error: 'El usuario o correo ya están en uso' });

    // Actualizar email en Auth si cambió
    if (target.email !== email) {
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, {
        email,
        email_confirm: true,
      });
      if (authErr) return res.status(400).json({ error: authErr.message });
    }

    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .update({ full_name, username, email })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: 'Administrador actualizado', admin: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ---------- PATCH /api/admin/admins/:id/block  (solo master) ----------
export const blockAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { blocked } = req.body;

    if (typeof blocked !== 'boolean') {
      return res.status(400).json({ error: 'El campo "blocked" debe ser booleano' });
    }

    const { data: target } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .eq('id', id)
      .maybeSingle();

    if (!target) return res.status(404).json({ error: 'Administrador no encontrado' });
    if (target.role === 'master') {
      return res.status(403).json({ error: 'No puedes bloquear al Master' });
    }

    const { data, error } = await supabaseAdmin
      .from('admin_users')
      .update({ is_blocked: blocked })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    res.json({
      message: blocked ? 'Administrador bloqueado' : 'Administrador desbloqueado',
      admin: data,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ---------- DELETE /api/admin/admins/:id  (solo master) ----------
export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: target } = await supabaseAdmin
      .from('admin_users')
      .select('role')
      .eq('id', id)
      .maybeSingle();

    if (!target) return res.status(404).json({ error: 'Administrador no encontrado' });
    if (target.role === 'master') {
      return res.status(403).json({ error: 'No puedes eliminar al Master' });
    }

    // Borrar de Auth (CASCADE elimina admin_users)
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authErr) return res.status(400).json({ error: authErr.message });

    res.json({ message: 'Administrador eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ---------- GET /api/admin/reports ----------
export const getReports = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('reports')
      .select(`*, novels (title, cover_url)`)
      .eq('status', 'sin_accion') // <--- FILTRO CLAVE
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ reports: data || [] });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ---------- PUT /api/admin/reports/:id/review ----------
export const sendToReviewQueue = async (req, res) => {
  const { id } = req.params;
  const admin_id = req.user.userId;

  try {
    const { data: report } = await supabaseAdmin.from('reports').select('*').eq('id', id).single();
    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });

    await supabaseAdmin.from('reports').update({ status: 'en_revision' }).eq('id', id);

    let type = 'novela';
    if (report.review_id) type = 'reseña';
    else if (report.text_position) type = 'texto';

    await supabaseAdmin.from('review_queue').insert({
      report_id: id,
      admin_id,
      report_type: type,
      accion_tomada: 'en_revision' // <-- Nuevo campo
    });

    res.json({ message: 'Reporte enviado a la cola de revisión' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getReviewQueue = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('review_queue')
      .select(`
        id,
        report_type,
        created_at,
        reports (
          *,
          novels (title, cover_url)
        )
      `)
      .eq('admin_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ reviewQueue: data || [] });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// ---------- POST /api/admin/reports/:id/resolve ----------
export const resolveReport = async (req, res) => {
  const { id } = req.params;
  const { action, duration } = req.body; 

  try {
    await supabaseAdmin.from('reports').update({ status: 'revisado' }).eq('id', id);
    
    // Formateamos el texto de la acción
    let accionTexto = 'Notificado';
    if (action === 'block') {
      const duraciones = {
        '1_week': '1 Semana', '2_weeks': '2 Semanas', '1_month': '1 Mes',
        '3_months': '3 Meses', '6_months': '6 Meses', 'permanent': 'Definitivo'
      };
      accionTexto = `Bloqueo (${duraciones[duration] || duration})`;
    }

    // En vez de borrar, actualizamos la acción tomada
    await supabaseAdmin.from('review_queue')
      .update({ accion_tomada: accionTexto })
      .eq('report_id', id);

    res.json({ message: `Reporte resuelto: ${accionTexto}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// función para ver toda la actividad (Solo Master)
export const getAdminActivity = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('review_queue')
      .select(`
        id,
        accion_tomada,
        created_at,
        admin_users ( full_name, email ),
        reports ( reason, novels (title) )
      `)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ activity: data || [] });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
