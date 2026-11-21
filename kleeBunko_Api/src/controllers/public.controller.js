import { supabaseAdmin } from '../config/supabase.js';

async function getAvgRatings(novelIds = []) {
  const result = {};
  if (!novelIds.length) return result;
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
  return result;
}

/** Top N por reseñas (rating descendente, desempate por visitas) */
export const getTopByRating = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 3, 20);
    const { data: novels, error } = await supabaseAdmin
      .from('novels')
      .select('id, title, cover_url, genre, synopsis, views')
      .eq('visibility', 'public')
      .eq('status', 'published');
    if (error) throw error;

    const ids = (novels || []).map((n) => n.id);
    const avgMap = await getAvgRatings(ids);

    const enriched = (novels || [])
      .map((n) => ({ ...n, rating: avgMap[n.id] || 0 }))
      .sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return (b.views || 0) - (a.views || 0);
      })
      .slice(0, limit);

    res.json(enriched);
  } catch (e) {
    console.error('getTopByRating', e);
    res.status(500).json({ error: e.message });
  }
};

/** Top N por visitas */
export const getTopByViews = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 8, 50);
    const { data, error } = await supabaseAdmin
      .from('novels')
      .select('id, title, cover_url, genre, views')
      .eq('visibility', 'public')
      .eq('status', 'published')
      .order('views', { ascending: false })
      .limit(limit);
    if (error) throw error;

    const ids = (data || []).map((n) => n.id);
    const avgMap = await getAvgRatings(ids);

    res.json((data || []).map((n) => ({ ...n, rating: avgMap[n.id] || 0 })));
  } catch (e) {
    console.error('getTopByViews', e);
    res.status(500).json({ error: e.message });
  }
};