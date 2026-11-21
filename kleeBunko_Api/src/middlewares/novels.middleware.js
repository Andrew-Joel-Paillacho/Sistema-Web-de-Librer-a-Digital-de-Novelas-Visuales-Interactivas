import multer from 'multer';

// Guardamos en memoria y subimos a Supabase manualmente
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB por archivo
});

/**
 * Estructura esperada del multipart/form-data:
 *  - meta: string JSON { title, genre, synopsis, visibility, status, charactersMeta, structure }
 *  - cover: 1 archivo (opcional)
 *  - escenario_<petalId>: archivo de escenario por cada pétalo
 *  - character_<charId>_<moodId>: archivo de imagen del personaje/estado
 */
export const normalizeFieldName = (req, res, next) => {
  // multer expone req.files como array; lo indexamos por fieldname
  if (Array.isArray(req.files)) {
    const map = {};
    for (const f of req.files) map[f.fieldname] = f;
    req.filesMap = map;
  }
  next();
};

export const parseMeta = (req, res, next) => {
  try {
    if (!req.body.meta) {
      return res.status(400).json({ error: 'Falta el campo meta' });
    }
    req.meta = JSON.parse(req.body.meta);
    next();
  } catch (e) {
    return res.status(400).json({ error: 'meta inválido (JSON malformado)' });
  }
};