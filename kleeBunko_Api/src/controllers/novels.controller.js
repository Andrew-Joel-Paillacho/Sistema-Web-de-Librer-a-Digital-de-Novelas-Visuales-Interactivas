import { supabaseAdmin } from '../config/supabase.js';
import { uploadToBucket, safeName } from '../config/storage.js';

const LN_BUCKET = 'KleeBunko_CreadoresLN';
const COVER_BUCKET = 'KleeBunko_Portadas';
const CHAR_BUCKET = 'KleeBunko_Personajes';
const SCENE_BUCKET = 'KleeBunko_escenarios';

async function processMultimedia({ creatorId, storyTitle, structure, filesMap, coverFile }) {
  if (!structure) throw new Error('structure es obligatorio');

  structure.characters = structure.characters || [];
  structure.clovers = structure.clovers || [];

  const storySlug = safeName(storyTitle);

  // 1) Portada
  let coverUrl = null;
  if (coverFile) {
    const path = `${creatorId}/${storySlug}${ext(coverFile.originalname)}`;
    coverUrl = await uploadToBucket(COVER_BUCKET, path, coverFile);
  }

  // 2) Personajes y sus estados
  for (const ch of structure.characters) {
    const chSlug = safeName(ch.name);
    for (const mood of ch.moods || []) {
      const key = `character_${ch.id}_${mood.id}`;
      const f = filesMap[key];
      if (f) {
        const path = `${creatorId}/${storySlug}/${chSlug}/${safeName(mood.name)}${ext(f.originalname)}`;
        mood.imageUrl = await uploadToBucket(CHAR_BUCKET, path, f);
        mood.image = { url: mood.imageUrl };
      } else if (mood.image?.fileKey && filesMap[mood.image.fileKey]) {
        const f2 = filesMap[mood.image.fileKey];
        const path = `${creatorId}/${storySlug}/${chSlug}/${safeName(mood.name)}${ext(f2.originalname)}`;
        mood.imageUrl = await uploadToBucket(CHAR_BUCKET, path, f2);
        mood.image = { url: mood.imageUrl };
      }
      if (!mood.imageUrl && mood.image?.url) {
        mood.imageUrl = mood.image.url;
      }
    }
  }

  // 3) Escenarios (pétalos)
  for (const cl of structure.clovers) {
    for (const p of cl.petals || []) {
      const key = `escenario_${p.id}`;
      const f = filesMap[key] || (p.image?.fileKey && filesMap[p.image.fileKey]);
      if (f) {
        const path = `${creatorId}/${storySlug}/${safeName(p.title || p.id)}${ext(f.originalname)}`;
        p.image = { url: await uploadToBucket(SCENE_BUCKET, path, f) };
      } else if (p.image?.url) {
        p.image = { url: p.image.url };
      } else {
        p.image = { url: null };
      }
      if (p.image) delete p.image.fileKey;
    }
  }

  return { structure, coverUrl };
}

function ext(name) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i) : '.png';
}

function ensureAllPetalsGrouped(structure) {
  if (!structure) return structure;
  const clovers = structure.clovers || [];

  const ungroupedClover = clovers.find((c) => c.isUngrouped);
  const ungroupedPetals = ungroupedClover?.petals || [];
  const normalClovers = clovers.filter((c) => !c.isUngrouped);

  if (ungroupedPetals.length === 0) {
    return { ...structure, clovers: normalClovers };
  }

  const MAX = 3;
  const newClovers = [];
  let i = 0;
  let idx = normalClovers.length + 1;

  while (i < ungroupedPetals.length) {
    const group = ungroupedPetals.slice(i, i + MAX);

    // creamos un trébol real, aunque tenga 1 o 2 pétalos.
    newClovers.push({
      id:
        group.length === MAX
          ? `auto_clover_${idx}_${Date.now()}_${i}`
          : ungroupedClover.id || `auto_clover_${idx}_${Date.now()}_${i}`,
      title: `Trébol ${idx}`,
      autoTitle: true,
      petals: group,
    });

    idx++;
    i += MAX;
  }

  return {
    ...structure,
    clovers: [...normalClovers, ...newClovers],
  };
}

async function saveStoryJson(creatorId, title, structure) {
  const slug = safeName(title);
  const path = `${creatorId}/${slug}.json`;
  const { error } = await supabaseAdmin.storage
    .from(LN_BUCKET)
    .upload(path, Buffer.from(JSON.stringify(structure, null, 2)), {
      contentType: 'application/json',
      upsert: true,
    });
  if (error) throw new Error(`No se pudo guardar el JSON: ${error.message}`);

  const { data } = supabaseAdmin.storage.from(LN_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ---------- CREATE ----------
export const createNovel = async (req, res) => {
  try {
    const creatorId = req.user.userId;
    const bodyMeta = req.meta || {};

    const title = bodyMeta.title;
    const genre = bodyMeta.genre;
    const synopsis = bodyMeta.synopsis;
    const visibility = bodyMeta.visibility;
    const status = bodyMeta.status;
    const structure = bodyMeta.structure;

    if (!title) return res.status(400).json({ error: 'Falta título' });
    if (!structure) return res.status(400).json({ error: 'Falta structure' });

    const safeVisibility = ['private', 'public'].includes(visibility) ? visibility : 'private';
    const safeStatus = ['draft', 'published'].includes(status) ? status : 'draft';

    const safeStructure = ensureAllPetalsGrouped(structure);

    const { structure: finalStructure, coverUrl } = await processMultimedia({
      creatorId,
      storyTitle: title,
      structure: safeStructure,
      filesMap: req.filesMap || {},
      coverFile: req.filesMap?.cover,
    });

    const storyJsonUrl = await saveStoryJson(creatorId, title, finalStructure);

    const { data, error } = await supabaseAdmin
      .from('novels')
      .insert({
        creator_id: creatorId,
        title,
        genre: genre || null,
        synopsis: synopsis || null,
        cover_url: coverUrl,
        structure: finalStructure,
        visibility: safeVisibility,
        status: safeStatus,
        story_json_url: storyJsonUrl,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    console.error('createNovel', e);
    res.status(500).json({ error: e.message });
  }
};

// ---------- UPDATE ----------
export const updateNovel = async (req, res) => {
  try {
    const creatorId = req.user.userId;
    const novelId = req.params.id;
    const bodyMeta = req.meta || {};

    const title = bodyMeta.title;
    const genre = bodyMeta.genre;
    const synopsis = bodyMeta.synopsis;
    const visibility = bodyMeta.visibility;
    const status = bodyMeta.status;
    const structure = bodyMeta.structure;

    if (!structure) return res.status(400).json({ error: 'Falta structure' });

    const { data: existing, error: exErr } = await supabaseAdmin
      .from('novels')
      .select('*')
      .eq('id', novelId)
      .eq('creator_id', creatorId)
      .single();
    if (exErr || !existing) return res.status(404).json({ error: 'Novela no encontrada' });

    const safeVisibility = ['private', 'public'].includes(visibility) ? visibility : undefined;
    const safeStatus = ['draft', 'published'].includes(status) ? status : undefined;

    const safeStructure = ensureAllPetalsGrouped(structure);

    const { structure: finalStructure, coverUrl } = await processMultimedia({
      creatorId,
      storyTitle: title || existing.title,
      structure: safeStructure,
      filesMap: req.filesMap || {},
      coverFile: req.filesMap?.cover,
    });

    const storyJsonUrl = await saveStoryJson(
      creatorId,
      title || existing.title,
      finalStructure
    );

    const { data, error } = await supabaseAdmin
      .from('novels')
      .update({
        title: title ?? existing.title,
        genre: genre ?? existing.genre,
        synopsis: synopsis ?? existing.synopsis,
        cover_url: coverUrl ?? existing.cover_url,
        structure: finalStructure,
        visibility: safeVisibility ?? existing.visibility,
        status: safeStatus ?? existing.status,
        story_json_url: storyJsonUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', novelId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('updateNovel', e);
    res.status(500).json({ error: e.message });
  }
};

// ---------- LIST ----------
export const listMyNovels = async (req, res) => {
  const creatorId = req.user.userId;
  const { data, error } = await supabaseAdmin
    .from('novels')
    .select('id,title,genre,synopsis,cover_url,visibility,status,updated_at')
    .eq('creator_id', creatorId)
    .order('updated_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
};

// ---------- GET ONE ----------
export const getNovel = async (req, res) => {
  const creatorId = req.user.userId;
  const { data, error } = await supabaseAdmin
    .from('novels')
    .select('*')
    .eq('id', req.params.id)
    .eq('creator_id', creatorId)
    .single();
  if (error || !data) return res.status(404).json({ error: 'No encontrada' });
  res.json(data);
};

// ---------- DELETE ----------
export const deleteNovel = async (req, res) => {
  const creatorId = req.user.userId;
  const { error } = await supabaseAdmin
    .from('novels')
    .delete()
    .eq('id', req.params.id)
    .eq('creator_id', creatorId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
};