import { supabaseAdmin } from '../config/supabase.js';

const safeName = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'archivo';

async function ensureFolder(bucket, path) {
  // Supabase no tiene "carpetas" reales; basta con subir un archivo
  // Devolvemos el path base, la creación se hace implícitamente al subir.
  return path;
}

export async function uploadToBucket(bucket, path, file, contentType) {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file.buffer, {
      contentType: contentType || file.mimetype,
      upsert: true,
    });
  if (error) throw new Error(`Error subiendo a ${bucket}/${path}: ${error.message}`);

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export { safeName, ensureFolder };