import { supabaseAdmin } from '../config/supabase.js';

async function getAvgRatings(novelIds = []) {
  const result = {};
  if (!novelIds.length) return result;
  try {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('novel_id, rating')
      .in('novel_id', novelIds);
    if (error) return result;
    const acc = {};
    for (const r of data) {
      if (!acc[r.novel_id]) acc[r.novel_id] = { sum: 0, count: 0 };
      acc[r.novel_id].sum += r.rating;
      acc[r.novel_id].count += 1;
    }
    for (const [k, v] of Object.entries(acc)) {
      result[k] = Number((v.sum / v.count).toFixed(1));
    }
  } catch (e) {
    console.warn('getAvgRatings', e.message);
  }
  return result;
}

export const getDashboardHome = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Perfil
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('mis_listas, mis_guardados, continuar_leyendo')
      .eq('id', userId)
      .maybeSingle();

    const libraryStats = profile?.mis_listas || { guardadas: 0, terminadas: 0 };
    const continuarRaw = profile?.continuar_leyendo || null;

    // Top 5
    const { data: top5Raw } = await supabaseAdmin
      .from('novels')
      .select('id, title, cover_url, genre, views')
      .eq('visibility', 'public')
      .eq('status', 'published')
      .order('views', { ascending: false })
      .limit(5);

    // Recomendados (20)
    const { data: recoRaw } = await supabaseAdmin
      .from('novels')
      .select('id, title, cover_url, genre')
      .eq('visibility', 'public')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20);

    // Nuevos semanales (últimos 7 días)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: newRaw } = await supabaseAdmin
      .from('novels')
      .select('id, title, cover_url, genre, created_at')
      .eq('visibility', 'public')
      .eq('status', 'published')
      .gte('created_at', weekAgo)
      .order('created_at', { ascending: false })
      .limit(5);

    // Continuar lectura
    let continueReading = null;
    if (continuarRaw?.novel_id) {
      const { data: n } = await supabaseAdmin
        .from('novels')
        .select('id, title, cover_url, structure')
        .eq('id', continuarRaw.novel_id)
        .maybeSingle();
      if (n) {
        const clovers = n.structure?.clovers || [];
        const clover = clovers.find((c) => c.id === continuarRaw.clover_id);
        const petal = clover?.petals?.find((p) => p.id === continuarRaw.petal_id);
        continueReading = {
          novel_id: n.id,
          title: n.title,
          cover_url: n.cover_url,
          clover_title: clover?.title || null,
          petal_title: petal?.title || null,
          progress_percent: continuarRaw.progress_percent || 0,
        };
      }
    }

    // Ratings
    const ids = [
      ...(top5Raw || []).map((n) => n.id),
      ...(recoRaw || []).map((n) => n.id),
      ...(newRaw || []).map((n) => n.id),
    ];
    const avgMap = await getAvgRatings(ids);

    const enrich = (n) => ({ ...n, rating: avgMap[n.id] || 0 });

    res.json({
      top5: (top5Raw || []).map(enrich),
      libraryStats,
      continueReading,
      recommended: (recoRaw || []).map(enrich),
      newWeekly: (newRaw || []).map(enrich),
    });
  } catch (e) {
    console.error('getDashboardHome', e);
    res.status(500).json({ error: e.message });
  }
};

export const createReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { novel_id, review, rating } = req.body;
    
    if (!novel_id || !rating) return res.status(400).json({ error: 'Faltan datos' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating inválido' });

    // Verificamos si el usuario ya había reseñado esta novela
    const { data: existing } = await supabaseAdmin
      .from('reviews')
      .select('id')
      .eq('novel_id', novel_id)
      .eq('user_id', userId)
      .maybeSingle();

    let result;
    if (existing) {
      // Si ya existe, actualizamos
      const { data, error } = await supabaseAdmin
        .from('reviews')
        .update({ review: review || null, rating, created_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select().single();
      if (error) throw error;
      result = data;
    } else {
      // Si no existe, insertamos
      const { data, error } = await supabaseAdmin
        .from('reviews')
        .insert({ novel_id, user_id: userId, review: review || null, rating })
        .select().single();
      if (error) throw error;
      result = data;
    }

    res.status(201).json(result);
  } catch (e) {
    console.error('createReview', e);
    res.status(500).json({ error: e.message });
  }
};

export const getReviewsByNovel = async (req, res) => {
  try {
    // Hacemos un JOIN con 'profiles' usando el user_id
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select(`
        *,
        profile:user_id ( nombre, username )
      `)
      .eq('novel_id', req.params.novelId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('getReviewsByNovel', e);
    res.status(500).json({ error: e.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const reviewId = req.params.id;

    const { error } = await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', userId); // Seguridad: solo el creador puede borrar

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    console.error('deleteReview', e);
    res.status(500).json({ error: e.message });
  }
};

// guardar progreso de lectura
export const updateContinueReading = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { novel_id, clover_id, petal_id, text_id, progress_percent } = req.body;
    if (!novel_id) return res.status(400).json({ error: 'Falta novel_id' });

    const payload = {
      novel_id,
      clover_id: clover_id || null,
      petal_id: petal_id || null,
      text_id: text_id || null,
      progress_percent: progress_percent ?? 0,
      last_read_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ continuar_leyendo: payload })
      .eq('id', userId);
    if (error) throw error;
    res.json({ ok: true, continuar_leyendo: payload });
  } catch (e) {
    console.error('updateContinueReading', e);
    res.status(500).json({ error: e.message });
  }
};

async function fetchReviewsInChunks(novelIds) {
  if (!novelIds.length) return [];
  const CHUNK = 500;
  const all = [];
  for (let i = 0; i < novelIds.length; i += CHUNK) {
    const slice = novelIds.slice(i, i + CHUNK);
    const { data } = await supabaseAdmin
      .from('reviews')
      .select('novel_id, rating')
      .in('novel_id', slice);
    if (data) all.push(...data);
  }
  return all;
}

function buildAvgMap(reviews) {
  const acc = {};
  for (const r of reviews) {
    if (!acc[r.novel_id]) acc[r.novel_id] = { sum: 0, count: 0 };
    acc[r.novel_id].sum += r.rating;
    acc[r.novel_id].count += 1;
  }
  const out = {};
  for (const [id, v] of Object.entries(acc)) out[id] = v.sum / v.count;
  return out;
}

const PAGE_SIZE_LIBRARY = 77; // 7 columnas × 11 filas

const DATE_FILTERS = {
  today: () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  },
  week: () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  },
  month: () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  },
};

export const getLibrary = async (req, res) => {
  try {
    const {
      genre = '',
      sort = 'name',
      q = '',
      date = '',
      page = '1',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const from = (pageNum - 1) * PAGE_SIZE_LIBRARY;
    const to = from + PAGE_SIZE_LIBRARY - 1;

    let query = supabaseAdmin
      .from('novels')
      .select('id, title, cover_url, genre, created_at, updated_at', { count: 'exact' })
      .eq('visibility', 'public')
      .eq('status', 'published');

    if (genre) query = query.eq('genre', genre);
    if (q) query = query.ilike('title', `%${q}%`);
    if (date && DATE_FILTERS[date]) {
      query = query.gte('created_at', DATE_FILTERS[date]());
    }
    // ----- Orden por calificación: se resuelve en memoria -----
    if (sort === 'rating') {
      const { data: allNovels, error } = await query;
      if (error) throw error;

      const ids = (allNovels || []).map((n) => n.id);
      const reviews = await fetchReviewsInChunks(ids);
      const avgMap = buildAvgMap(reviews);

      const enriched = (allNovels || []).map((n) => ({
        ...n,
        rating: Number((avgMap[n.id] || 0).toFixed(1)),
      }));
      enriched.sort((a, b) => b.rating - a.rating);

      const total = enriched.length;
      const pageItems = enriched.slice(from, to + 1);

      return res.json({
        novels: pageItems,
        total,
        page: pageNum,
        pageSize: PAGE_SIZE_LIBRARY,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE_LIBRARY)),
        sort,
        genre,
        date,
        q,
      });
    }

    // ----- Resto de órdenes: SQL + range -----
    const orderMap = {
      name:    { column: 'title',      ascending: true  },
      created: { column: 'created_at', ascending: false },
      updated: { column: 'updated_at', ascending: false },
    };
    const order = orderMap[sort] || orderMap.name;

    const { data, count, error } = await query
      .order(order.column, { ascending: order.ascending })
      .range(from, to);

    if (error) throw error;

    const ids = (data || []).map((n) => n.id);
    const reviews = await fetchReviewsInChunks(ids);
    const avgMap = buildAvgMap(reviews);

    const enriched = (data || []).map((n) => ({
      ...n,
      rating: Number((avgMap[n.id] || 0).toFixed(1)),
    }));

    res.json({
      novels: enriched,
      total: count || 0,
      page: pageNum,
      pageSize: PAGE_SIZE_LIBRARY,
      totalPages: Math.max(1, Math.ceil((count || 0) / PAGE_SIZE_LIBRARY)),
      sort,
      genre,
      date,
      q,
    });
  } catch (e) {
    console.error('getLibrary', e);
    res.status(500).json({ error: e.message });
  }
};

// detalle de novela para el lector
export const getNovelDetails = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { novelId } = req.params;

    const { data: novel, error } = await supabaseAdmin
      .from('novels')
      .select('id, title, cover_url, genre, synopsis, views, structure, creator_id, visibility, status')
      .eq('id', novelId)
      .maybeSingle();

    if (error) throw error;
    if (!novel) return res.status(404).json({ error: 'Historia no encontrada' });

    const isOwner = novel.creator_id === userId;
    const isPublic = novel.visibility === 'public' && novel.status === 'published';
    if (!isOwner && !isPublic) {
      return res.status(404).json({ error: 'Historia no encontrada' });
    }

    // Rating promedio
    const { data: reviews } = await supabaseAdmin
      .from('reviews')
      .select('rating')
      .eq('novel_id', novelId);

    let rating = 0;
    if (reviews?.length) {
      const sum = reviews.reduce((a, r) => a + r.rating, 0);
      rating = Number((sum / reviews.length).toFixed(1));
    }

    // Progreso guardado del usuario
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('continuar_leyendo')
      .eq('id', userId)
      .maybeSingle();

    let savedProgress = null;
    if (profile?.continuar_leyendo?.novel_id === novelId) {
      savedProgress = profile.continuar_leyendo;
    }

    const structure = novel.structure || {};

    // Personajes (solo mood neutral)
    const characters = (structure.characters || []).map((c) => {
      const moods = Array.isArray(c.moods) ? c.moods : [];
      const neutral =
        moods.find((m) => ['neutro', 'neutral'].includes((m.name || '').toLowerCase())) ||
        moods[0];
      return {
        id: c.id,
        name: c.name || 'Personaje',
        image_url: neutral?.imageUrl || null,
      };
    });

    // Tréboles + pétalos
    const clovers = (structure.clovers || []).map((c) => ({
      id: c.id,
      title: c.title || 'Sin título',
      petals: (c.petals || []).map((p) => ({
        id: p.id,
        title: p.title || 'Sin título',
        thumbnail: p.image?.url || null,
        textCount: Array.isArray(p.texts) ? p.texts.length : 0,
      })),
    }));

    res.json({
      id: novel.id,
      title: novel.title,
      cover_url: novel.cover_url,
      genre: novel.genre,
      synopsis: novel.synopsis,
      views: novel.views || 0,
      rating,
      characters,
      clovers,
      savedProgress,
    });
  } catch (e) {
    console.error('getNovelDetails', e);
    res.status(500).json({ error: e.message });
  }
};

// estructura completa para el lector visual
export const getNovelForReading = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { novelId } = req.params;

    const { data: novel, error } = await supabaseAdmin
      .from('novels')
      .select('*')
      .eq('id', novelId)
      .maybeSingle();

    if (error) throw error;
    if (!novel) return res.status(404).json({ error: 'Historia no encontrada' });

    const isOwner = novel.creator_id === userId;
    const isPublic = novel.visibility === 'public' && novel.status === 'published';
    if (!isOwner && !isPublic) return res.status(404).json({ error: 'Historia no encontrada' });

    // Obtener los guardados del perfil
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('mis_listas')
      .eq('id', userId)
      .maybeSingle();
      
    const defaultMisListas = { guardadas: 0, terminadas: 0, completadas: [], saves: {} };
    const savesData = profile?.mis_listas || defaultMisListas;

    const structure = novel.structure || {};

    const characters = (structure.characters || []).map((c) => ({
      id: c.id, name: c.name || 'Personaje',
      moods: (c.moods || []).map((m) => ({ id: m.id, name: m.name || 'Neutro', imageUrl: m.imageUrl || m.image?.url || null })),
    }));

    const clovers = (structure.clovers || []).map((c) => ({
      id: c.id, title: c.title || 'Sin título',
      petals: (c.petals || []).map((p) => ({
        id: p.id, title: p.title || 'Sin título', image: { url: p.image?.url || null },
        texts: (p.texts || []).map((t) => {
          const chars = Array.isArray(t.characters) ? t.characters : (t.character ? [t.character] : []);
          return {
            id: t.id, text: t.text || '',
            characters: chars.map((ch) => ({ id: ch.id, name: ch.name, moodId: ch.moodId || null, moodName: ch.moodName || null })),
          };
        }),
      })),
    }));

    res.json({
      id: novel.id, title: novel.title, cover_url: novel.cover_url,
      genre: novel.genre, synopsis: novel.synopsis, isOwner, characters, clovers,
      savesData // <-- Enviamos los guardados al frontend
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const saveGameSlot = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page, slot, saveData } = req.body;

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('mis_listas')
      .eq('id', userId)
      .maybeSingle();

    if (profErr) throw new Error('Error leyendo perfil: ' + profErr.message);

    // Inicialización segura
    let misListas = profile?.mis_listas || { guardadas: 0, terminadas: 0, completadas: [], saves: {} };
    if (!misListas.saves) misListas.saves = {};
    if (!misListas.saves[page]) misListas.saves[page] = {};

    const isNew = !misListas.saves[page][slot];
    
    // Guardamos la información en el cuadro exacto
    misListas.saves[page][slot] = { 
      ...saveData, 
      updated_at: new Date().toISOString() 
    };

    // Si era un cuadro vacío, sumamos 1 al contador de guardadas
    if (isNew) {
      misListas.guardadas = (misListas.guardadas || 0) + 1;
    }

    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({ mis_listas: misListas })
      .eq('id', userId);

    if (updateErr) throw new Error('Error guardando en BD: ' + updateErr.message);

    res.json({ ok: true, savesData: misListas });
  } catch (e) {
    console.error('saveGameSlot', e);
    res.status(500).json({ error: e.message });
  }
};

export const finishNovel = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { novel_id } = req.body;

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('mis_listas').eq('id', userId).maybeSingle();

    let misListas = profile?.mis_listas || { guardadas: 0, terminadas: 0, completadas: [], saves: {} };
    if (!misListas.completadas) misListas.completadas = [];

    // Si el usuario NO había terminado esta novela antes
    if (!misListas.completadas.includes(novel_id)) {
      misListas.completadas.push(novel_id);
      misListas.terminadas = (misListas.terminadas || 0) + 1;
      
      // 1. Guardamos que el usuario la terminó
      await supabaseAdmin.from('profiles').update({ mis_listas: misListas }).eq('id', userId);

      // 2. Buscamos los datos de la novela para ver quién es el creador
      const { data: novel } = await supabaseAdmin
        .from('novels').select('creator_id, views').eq('id', novel_id).maybeSingle();

      // 3. Aumentamos la vista SOLO si el que termina NO es el creador
      if (novel && novel.creator_id !== userId) {
        await supabaseAdmin
          .from('novels')
          .update({ views: (novel.views || 0) + 1 })
          .eq('id', novel_id);
      }
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('finishNovel', e);
    res.status(500).json({ error: e.message });
  }
};

export const deleteGameSlot = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page, slot } = req.body;

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('mis_listas')
      .eq('id', userId)
      .maybeSingle();

    if (profErr) throw new Error('Error leyendo perfil: ' + profErr.message);

    let misListas = profile?.mis_listas || { guardadas: 0, terminadas: 0, completadas: [], saves: {} };
    
    // Si la ranura existe, la eliminamos
    if (misListas.saves && misListas.saves[page] && misListas.saves[page][slot]) {
      delete misListas.saves[page][slot];
      
      // Restamos 1 al contador (sin bajar de 0)
      misListas.guardadas = Math.max(0, (misListas.guardadas || 1) - 1);

      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({ mis_listas: misListas })
        .eq('id', userId);

      if (updateErr) throw new Error('Error actualizando BD: ' + updateErr.message);
    }

    res.json({ ok: true, savesData: misListas });
  } catch (e) {
    console.error('deleteGameSlot', e);
    res.status(500).json({ error: e.message });
  }
};

export const reportNovel = async (req, res) => {
  try {
    const reporterId = req.user.userId;
    const { novel_id, text_position, review_id, reason } = req.body;

    // Validaciones estrictas
    if (!novel_id) return res.status(400).json({ error: 'Falta el ID de la novela' });
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: 'El motivo del reporte es obligatorio' });
    }

    let creator_id = null;

    if (review_id) {
      const { data: review, error: revErr } = await supabaseAdmin
        .from('reviews').select('user_id').eq('id', review_id).maybeSingle();
      if (revErr || !review) throw new Error('Reseña no encontrada');
      creator_id = review.user_id;
    } else {
      const { data: novel, error: novErr } = await supabaseAdmin
        .from('novels').select('creator_id').eq('id', novel_id).maybeSingle();
      if (novErr || !novel) throw new Error('Novela no encontrada');
      creator_id = novel.creator_id;
    }

    if (!creator_id) throw new Error('No se pudo encontrar al creador del contenido reportado');

    const { error } = await supabaseAdmin
      .from('reports')
      .insert({
        novel_id,
        creator_id,
        reporter_id: reporterId,
        text_position: text_position || null,
        review_id: review_id || null,
        reason: reason.trim()
      });

    if (error) {
      console.error('Error exacto de Supabase:', error);
      throw new Error(error.message);
    }

    res.status(201).json({ ok: true, message: 'Reporte enviado con éxito' });
  } catch (e) {
    console.error('reportNovel catch:', e);
    res.status(500).json({ error: e.message });
  }
};
