import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { saveNovel, getNovel } from '../api/novels';
import CharactersStrip from '../StoryEditor/CharactersStrip';
import TextBlockEditor from '../StoryEditor/TextBlockEditor';
import { useCreatorNav } from '../../context/CreatorNavContext';
import '../../styles/CreateStory.css';
import mammoth from 'mammoth'

const uid = () => Math.random().toString(36).slice(2, 10);

// CORREGIDO: Usamos "characters" (plural) por defecto en lugar de "character"
const newText = () => ({ id: uid(), text: '', characters: [] });

const newPetal = (index) => ({
  id: uid(),
  title: `Pétalo ${index}`,
  autoTitle: true,
  image: { file: null, url: null },
  texts: [newText()],
});

const MAX_PETALS = 3;

const serializeStructureOf = (s) => ({
  clovers: s.clovers.map((c) => ({
    id: c.id,
    title: c.title,
    petals: c.petals.map((p) => ({
      id: p.id,
      title: p.title,
      image: { url: p.image?.url || null },
      texts: p.texts.map((t) => {
        // Validación segura para historias antiguas
        const charsArray = Array.isArray(t.characters) 
          ? t.characters 
          : (t.character ? [t.character] : []);

        return {
          id: t.id,
          text: t.text,
          characters: charsArray.map((c) => ({
            id: c.id,
            name: c.name,
            moodId: c.moodId || null,
            moodName: c.moodName || null,
          })),
        };
      }),
    })),
  })),
  characters: s.characters.map((ch) => ({
    id: ch.id,
    name: ch.name,
    moods: (ch.moods || []).map((m) => ({
      id: m.id,
      name: m.name,
      imageUrl: m.imageUrl || m.image?.url || null,
    })),
  })),
});

// Normaliza la estructura: agrupa de 3 en 3 y elimina cualquier rastro de "ungrouped"
const normalizeStructure = (state) => {
  // 1) Recolectamos todos los pétalos existentes (soporta datos viejos con ungroupedPetals)
  const allPetals = [
    ...(state.clovers || []).flatMap((c) => c.petals || []),
    ...(state.ungroupedPetals || []),
  ];

  // 2) Índice para reutilizar id/title de tréboles existentes
  const oldCloversBySignature = new Map();
  for (const c of (state.clovers || [])) {
    if (!c.petals) continue;
    const sig = c.petals.map((p) => p.id).join('|');
    oldCloversBySignature.set(sig, c);
  }

  // 3) Reagrupar
  const newClovers = [];
  let i = 0;
  let cloverIndex = 1;

  while (i < allPetals.length) {
    const group = allPetals.slice(i, i + MAX_PETALS);
    const sig = group.map((p) => p.id).join('|');
    const old = oldCloversBySignature.get(sig);
    
    const title = old && old.autoTitle === false
      ? old.title
      : `Trébol ${cloverIndex}`;

    newClovers.push({
      id: old?.id ?? uid(),
      title,
      autoTitle: old ? old.autoTitle : true,
      expanded: old?.expanded ?? true,
      petals: group,
    });
  
    cloverIndex++;
    i += MAX_PETALS;
  }

  // 4) Renumerar pétalos solo si son autoTitle
  let p = 1;
  for (const clover of newClovers) {
    for (const petal of clover.petals) {
      if (petal.autoTitle !== false) {
        petal.title = `Pétalo ${p}`;
        petal.autoTitle = true;
      }
      p++;
    }
  }

  // Retornamos el estado limpio (sin ungroupedPetals)
  return { ...state, clovers: newClovers, ungroupedPetals: undefined };
};

// Función para dividir textos de más de 500 caracteres
const splitTextIntoChunks = (text, maxLength = 500) => {
  const chunks = [];
  let currentText = text.trim();
  while (currentText.length > maxLength) {
    let splitIndex = currentText.lastIndexOf(' ', maxLength);
    if (splitIndex === -1) splitIndex = maxLength;
    chunks.push(currentText.slice(0, splitIndex).trim());
    currentText = currentText.slice(splitIndex).trim();
  }
  if (currentText.length > 0) chunks.push(currentText);
  return chunks;
};

// Función principal para procesar el documento de texto
const parseStoryDocument = (text, existingCharacters) => {
  const lines = text.split('\n');
  const newPetals = [];
  let currentPetal = { title: 'Pétalo 1', texts: [] };
  const charactersMap = new Map(existingCharacters.map((c) => [c.name.toLowerCase(), { ...c }]));

  const getOrCreateCharacter = (nameStr, moodStr) => {
    const name = nameStr.trim();
    const moodName = moodStr ? moodStr.trim() : 'Neutro';
    const lowerName = name.toLowerCase();

    let char = charactersMap.get(lowerName);
    if (!char) {
      char = { id: uid(), name, moods: [{ id: uid(), name: 'Neutro', image: { file: null, url: null } }] };
      charactersMap.set(lowerName, char);
    }

    let mood = char.moods.find((m) => m.name.toLowerCase() === moodName.toLowerCase());
    if (!mood) {
      mood = { id: uid(), name: moodName, image: { file: null, url: null } };
      char.moods.push(mood);
    }
    
    return { id: char.id, name: char.name, moodId: mood.id, moodName: mood.name };
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detectar nuevo pétalo
    const petalMatch = line.match(/^\{petalo(?::\s*([^}]+))?\}$/i);
    if (petalMatch) {
      if (currentPetal.texts.length > 0) newPetals.push(currentPetal);
      currentPetal = {
        title: petalMatch[1] ? petalMatch[1].trim() : `Pétalo ${newPetals.length + 1}`,
        texts: []
      };
      continue;
    }

    // Detectar diálogo (Nombre: Texto) o (Nombre (Ánimo): Texto)
    const dialogueMatch = line.match(/^([^:]+):\s*(.*)$/);
    let textBlocks = [];

    if (dialogueMatch) {
      const prefix = dialogueMatch[1];
      const content = dialogueMatch[2];
      
      const chars = [];
      // Separar por comas
      const charStrings = prefix.split(',');
      for (const cs of charStrings) {
        if (chars.length >= 5) break; // Máximo 5 personajes
        // Extraer Nombre y (Ánimo)
        const match = cs.trim().match(/^(.+?)(?:\s*\((.+)\))?$/);
        if (match) {
          chars.push(getOrCreateCharacter(match[1], match[2]));
        }
      }

      const chunks = splitTextIntoChunks(content);
      textBlocks = chunks.map((chunk) => ({
        id: uid(),
        text: chunk,
        characters: chars,
      }));
    } else {
      // Narración normal
      const chunks = splitTextIntoChunks(line);
      textBlocks = chunks.map((chunk) => ({
        id: uid(),
        text: chunk,
        characters: [],
      }));
    }

    currentPetal.texts.push(...textBlocks);
  }

  if (currentPetal.texts.length > 0) newPetals.push(currentPetal);

  // Empaquetar los pétalos en la estructura para que normalizeStructure los agrupe en tréboles
  const allParsedPetals = newPetals.map((p) => ({
    id: uid(),
    title: p.title,
    autoTitle: !p.title.startsWith('Pétalo '), // Si tiene título personalizado, no es auto
    image: { file: null, url: null },
    texts: p.texts,
  }));

  return {
    clovers: [{ id: 'temp', petals: allParsedPetals }],
    characters: Array.from(charactersMap.values()),
  };
};

const CreateStory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setIsDirty, registerEditor, unregisterEditor } = useCreatorNav();

  // Inicializamos con un trébol por defecto que ya incluye 1 pétalo
  const [structure, setStructure] = useState(() =>
    normalizeStructure({
      clovers: [{ id: 'temp', petals: [newPetal(1)] }],
      characters: [],
    })
  );
  
  const [meta, setMeta] = useState({
    title: '',
    genre: '',
    synopsis: '',
    visibility: 'private',
    status: 'draft',
  });
  const [cover, setCover] = useState({ file: null, url: null });
  const [activePetal, setActivePetal] = useState(null);
  const [saving, setSaving] = useState(false);

  const lastSavedRef = useRef(null);

  // ===== Serialización / files =====
  const serializeStructure = useCallback(
    () => serializeStructureOf(structure),
    [structure]
  );

  const buildFilesPayload = useCallback(() => {
    const files = {};
    if (cover.file) files.cover = cover.file;
    
    // Ahora solo recolectamos de los tréboles
    const allPetals = structure.clovers.flatMap((c) => c.petals);
    for (const p of allPetals) {
      if (p.image?.file) files[`escenario_${p.id}`] = p.image.file;
    }
    for (const ch of structure.characters) {
      for (const mood of ch.moods || []) {
        if (mood.image?.file) {
          files[`character_${ch.id}_${mood.id}`] = mood.image.file;
        }
      }
    }
    return files;
  }, [structure, cover]);

  const validateForPublish = () => {
    if (meta.visibility !== 'public') return null;
    if (!meta.title.trim()) return 'Falta el título';
    if (!meta.genre) return 'Falta el género';
    if (!cover.file && !cover.url) return 'Falta la portada';
    if (!meta.synopsis.trim()) return 'Falta la sinopsis';
    return null;
  };

  // ===== Persistencia =====
  const persist = useCallback(
    async (publish = false) => {
      setSaving(true);
      try {
        if (publish) {
          const err = validateForPublish();
          if (err) throw new Error(err);
        }

        const payload = {
          id,
          meta: {
            title: meta.title,
            genre: meta.genre,
            synopsis: meta.synopsis,
            visibility: meta.visibility,
            status: publish ? 'published' : meta.status,
            structure: serializeStructure(),
          },
          files: buildFilesPayload(),
        };

        const saved = await saveNovel(payload);

        setMeta((m) => ({
          ...m,
          status: saved.status,
          visibility: saved.visibility,
        }));
        setCover({ file: null, url: saved.cover_url || cover.url });

        if (saved.structure) {
          // Hidratación limpia de los tréboles guardados
          const hydrated = {
            characters: (saved.structure.characters || []).map((ch) => ({
              ...ch,
              moods: (ch.moods || []).map((m) => ({
                ...m,
                image: { file: null, url: m.imageUrl || null },
              })),
            })),
            clovers: (saved.structure.clovers || []).map((c) => ({
              ...c,
              expanded: true,
              petals: c.petals.map((p) => ({
                ...p,
                image: { file: null, url: p.image?.url || null },
                texts: (p.texts || []).map((t) => ({
                  ...t,
                  characters: Array.isArray(t.characters) 
                    ? t.characters 
                    : (t.character ? [t.character] : [])
                })),
              })),
            })),
          };

          const normalized = normalizeStructure(hydrated);
          setStructure(normalized);

          lastSavedRef.current = JSON.stringify({
            meta: {
              ...meta,
              status: saved.status,
              visibility: saved.visibility,
            },
            structure: serializeStructureOf(normalized),
            cover: saved.cover_url || cover.url || null,
          });
          setIsDirty(false);
        } else {
          lastSavedRef.current = JSON.stringify({
            meta: {
              ...meta,
              status: saved.status,
              visibility: saved.visibility,
            },
            structure: serializeStructure(),
            cover: saved.cover_url || cover.url || null,
          });
          setIsDirty(false);
        }

        if (!id) {
          navigate(`/dashboard/crear/editor/${saved.id}`, { replace: true });
        }
        if (publish) alert('¡Historia publicada!');
        return saved;
      } finally {
        setSaving(false);
      }
    },
    [id, meta, cover, serializeStructure, buildFilesPayload, navigate]
  );

  const handleImportDocument = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop().toLowerCase();

    // Función central para procesar el texto crudo (sin importar de dónde venga)
    const processText = (rawText) => {
      try {
        const parsedData = parseStoryDocument(rawText, structure.characters);
        const normalized = normalizeStructure(parsedData);
        setStructure(normalized);
        alert('¡Historia importada con éxito!');
      } catch (err) {
        console.error(err);
        alert('Error al procesar el texto de la historia.');
      }
    };

    if (fileExt === 'docx') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          // Mammoth extrae el texto plano manteniendo los saltos de línea
          const result = await mammoth.extractRawText({ arrayBuffer });
          processText(result.value);
        } catch (err) {
          console.error(err);
          alert('Error al leer el archivo Word. Asegúrate de que no esté dañado.');
        }
        event.target.value = ''; // Limpiar input
      };
      reader.readAsArrayBuffer(file);
    } 
    else if (fileExt === 'txt') {
      const reader = new FileReader();
      reader.onload = (e) => {
        processText(e.target.result);
        event.target.value = ''; // Limpiar input
      };
      reader.readAsText(file);
    } 
    else {
      alert('Formato no soportado. Por favor, sube un archivo .txt o .docx (el formato .doc antiguo no es compatible).');
      event.target.value = '';
    }
  };

  const handleManualSave = async () => {
    try {
      await persist(false);
    } catch (e) {
      alert(e.message || 'Error al guardar');
    }
  };

  // Registrar funciones en el contexto
  useEffect(() => {
    registerEditor({
      saveAndExit: async () => { await persist(false); },
      discard: () => setIsDirty(false),
    });
    return () => unregisterEditor();
  }, [registerEditor, unregisterEditor, persist, setIsDirty]);

  // Cargar si editamos
  useEffect(() => {
    if (!id) {
      lastSavedRef.current = JSON.stringify({
        meta,
        structure: serializeStructure(),
        cover: cover?.url || null,
      });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const n = await getNovel(id);
        if (cancelled) return;

        const nextMeta = {
          title: n.title || '',
          genre: n.genre || '',
          synopsis: n.synopsis || '',
          visibility: n.visibility || 'private',
          status: n.status || 'draft',
        };
        const nextCover = { file: null, url: n.cover_url || null };

        // Hidratación limpia desde la base de datos
        const nextStructure = {
          clovers: (n.structure?.clovers || []).map((c) => ({
            ...c,
            expanded: true,
            petals: c.petals.map((p) => ({
              ...p,
              image: { file: null, url: p.image?.url || null },
              texts: (p.texts || []).map((t) => ({
                ...t,
                characters: Array.isArray(t.characters) 
                  ? t.characters 
                  : (t.character ? [t.character] : [])
              })),
            })),
          })),
          characters: (n.structure?.characters || []).map((ch) => ({
            ...ch,
            moods: (ch.moods || []).map((m) => ({
              ...m,
              image: { file: null, url: m.imageUrl || null },
            })),
          })),
        };

        const normalized = normalizeStructure(nextStructure);

        setMeta(nextMeta);
        setCover(nextCover);
        setStructure(normalized);

        lastSavedRef.current = JSON.stringify({
          meta: nextMeta,
          structure: serializeStructureOf(normalized),
          cover: nextCover.url,
        });
        setIsDirty(false);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Marcar dirty
  useEffect(() => {
    if (lastSavedRef.current === null) return;
    const current = JSON.stringify({
      meta,
      structure: serializeStructure(),
      cover: cover?.url || null,
    });
    setIsDirty(current !== lastSavedRef.current);
  }, [meta, structure, cover, serializeStructure, setIsDirty]);

  // ===== Helpers =====
  const findPetal = (petalId) => {
    for (const clover of structure.clovers) {
      const petal = clover.petals.find((p) => p.id === petalId);
      if (petal) return { petal, clover };
    }
    return null;
  };

  const findCloverIdOfPetal = (state, petalId) => {
    const c = state.clovers.find((cl) => cl.petals.some((p) => p.id === petalId));
    return c ? c.id : null;
  };

  const updatePetalById = (petalId, updater) => {
    setStructure((s) => ({
      ...s,
      clovers: s.clovers.map((c) => ({
        ...c,
        petals: c.petals.map((p) => (p.id === petalId ? updater(p) : p)),
      })),
    }));
  };

  const handleAddPetal = () => {
    setStructure((s) => {
      const total = s.clovers.reduce((a, c) => a + c.petals.length, 0);
      const newP = newPetal(total + 1);

      // Juntamos todos, agregamos el nuevo y dejamos que normalizeStructure lo reagrupe
      const allPetals = [...s.clovers.flatMap((c) => c.petals), newP];
      const normalized = normalizeStructure({
        ...s,
        clovers: [{ id: 'temp', petals: allPetals }],
      });

      const parentCloverId = findCloverIdOfPetal(normalized, newP.id);
      setActivePetal({ petalId: newP.id, cloverId: parentCloverId });

      return normalized;
    });
  };

  const handleDeletePetal = (petalId) => {
    setStructure((s) => {
      const remainingPetals = s.clovers
        .flatMap((c) => c.petals)
        .filter((p) => p.id !== petalId);

      const normalized = normalizeStructure({
        ...s,
        clovers: remainingPetals.length > 0 ? [{ id: 'temp', petals: remainingPetals }] : [],
      });

      return normalized;
    });
    setActivePetal(null);
  };

  // ===== Panel activo =====
  const active = useMemo(() => {
    if (!activePetal) return null;
    return findPetal(activePetal.petalId);
  }, [activePetal, structure]);

  // ===== Imágenes =====
  const onPickCover = (file) => {
    if (!file) return;
    setCover({ file, url: URL.createObjectURL(file) });
  };

  const onPickPetalImage = (petalId, file) => {
    if (!file) return;
    updatePetalById(petalId, (p) => ({
      ...p,
      image: { file, url: URL.createObjectURL(file) },
    }));
  };

  // ===== Render =====
  return (
    <div className="cs-layout">
      {/* ===== IZQUIERDA ===== */}
      <aside className="cs-left">
        <div className="cs-left-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Estructura</h3>
          </div>
          <label className="cs-btn-turquesa" style={{ cursor: 'pointer', textAlign: 'center', fontSize: '0.8rem' }}>
            Importar desde archivo
            <input
              type="file"
              accept=".txt, .docx"
              hidden
              onChange={handleImportDocument}
            />
          </label>
        </div>

        <div className="cs-petal-list">
          {structure.clovers.map((clover) => (
            <div key={clover.id} className="cs-clover">
              <div className="cs-clover-head">
                <button
                  className="cs-clover-toggle"
                  onClick={() =>
                    setStructure((s) => ({
                      ...s,
                      clovers: s.clovers.map((c) =>
                        c.id === clover.id ? { ...c, expanded: !c.expanded } : c
                      ),
                    }))
                  }
                >
                  {clover.expanded ? '▾' : '▸'}
                </button>
                <input
                  className="cs-clover-title"
                  value={clover.title}
                  onChange={(e) =>
                    setStructure((s) => ({
                      ...s,
                      clovers: s.clovers.map((c) =>
                        c.id === clover.id
                          ? { ...c, title: e.target.value, autoTitle: false }
                          : c
                      ),
                    }))
                  }
                />
              </div>

              {clover.expanded && (
                <div className="cs-petal-list nested">
                  {clover.petals.map((petal) => (
                    <button
                      key={petal.id}
                      className={`cs-petal-row ${
                        activePetal?.petalId === petal.id ? 'active' : ''
                      }`}
                      onClick={() =>
                        setActivePetal({ petalId: petal.id, cloverId: clover.id })
                      }
                    >
                      <div
                        className="cs-petal-thumb"
                        style={{
                          backgroundImage: petal.image?.url
                            ? `url(${petal.image.url})`
                            : 'none',
                        }}
                      >
                        {!petal.image?.url && (
                          <svg
                            className="cs-petal-icon"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="48"
                            height="48"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        )}
                      </div>
                      <span className="cs-petal-label">{petal.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Botón agregar pétalo */}
          <button className="cs-petal-add-row" onClick={handleAddPetal}>
            <div className="cs-petal-thumb add">
              <span>+</span>
            </div>
            <span className="cs-petal-label">Agregar pétalo</span>
          </button>
        </div>
      </aside>

      {/* ===== CENTRO ===== */}
      <main className="cs-center">
        {!active && (
          <div className="cs-empty">
            <p>Selecciona un pétalo de la izquierda para empezar a editar.</p>
          </div>
        )}

        {active && (
          <div className="cs-petal-editor">
            <div className="cs-petal-editor-head">
              <input
                className="cs-input-title"
                value={active.petal.title}
                onChange={(e) =>
                  updatePetalById(active.petal.id, (p) => ({
                    ...p,
                    title: e.target.value,
                    autoTitle: false,
                  }))
                }
              />
              <label className="cs-btn-outline">
                {active.petal.image?.url ? 'Cambiar imagen' : 'Insertar imagen'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) =>
                    onPickPetalImage(active.petal.id, e.target.files?.[0])
                  }
                />
              </label>
              <button
                className="cs-btn-ghost danger"
                onClick={() => handleDeletePetal(active.petal.id)}
              >
                Eliminar pétalo
              </button>
            </div>

            {active.petal.image?.url && (
              <img
                className="cs-petal-preview"
                src={active.petal.image.url}
                alt={active.petal.title}
              />
            )}

            <div className="cs-texts">
              {active.petal.texts.map((textBlock, idx) => (
                <TextBlockEditor
                  key={textBlock.id}
                  block={textBlock}
                  index={idx}
                  characters={structure.characters}
                  onChange={(updated) =>
                    updatePetalById(active.petal.id, (p) => ({
                      ...p,
                      texts: p.texts.map((t) =>
                        t.id === textBlock.id ? updated : t
                      ),
                    }))
                  }
                  onRemove={() =>
                    updatePetalById(active.petal.id, (p) => ({
                      ...p,
                      texts: p.texts.filter((t) => t.id !== textBlock.id),
                    }))
                  }
                />
              ))}
              <button
                className="cs-btn-outline"
                onClick={() =>
                  updatePetalById(active.petal.id, (p) => ({
                    ...p,
                    texts: [...p.texts, newText()],
                  }))
                }
              >
                + Añadir texto
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ===== DERECHA ===== */}
      <aside className="cs-right">
        <div className="cs-right-head">
          <h3>Tu historia</h3>
          <div className="cs-right-actions">
            <button
              className="cs-btn-ghost"
              disabled={saving}
              onClick={handleManualSave}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>

        <div className="cs-meta-group">
          <label>Título</label>
          <input
            className="cs-input"
            value={meta.title}
            onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            placeholder="Título de la historia"
          />
        </div>

        <div className="cs-meta-group">
          <label>Género</label>
          <select
            className="cs-input"
            value={meta.genre}
            onChange={(e) => setMeta({ ...meta, genre: e.target.value })}
          >
            <option value="">— Selecciona —</option>
            <option value="fantasia">Fantasía</option>
            <option value="romance">Romance</option>
            <option value="misterio">Misterio</option>
            <option value="accion">Acción</option>
            <option value="terror">Terror</option>
            <option value="ciencia-ficcion">Ciencia ficción</option>
            <option value="slice-of-life">Slice of life</option>
          </select>
        </div>

        <div className="cs-meta-group">
          <label>Sinopsis ({meta.synopsis.length}/500)</label>
          <textarea
            className="cs-input"
            rows={5}
            maxLength={500}
            value={meta.synopsis}
            onChange={(e) => setMeta({ ...meta, synopsis: e.target.value })}
          />
        </div>

        <div className="cs-meta-group">
          <label>Portada</label>
          <div
            className="cs-cover-preview"
            style={{ backgroundImage: cover.url ? `url(${cover.url})` : 'none' }}
          >
            {!cover.url && <span>Sin portada</span>}
          </div>
          <label className="cs-btn-turquesa">
            {cover.url ? 'Cambiar portada' : 'Subir portada'}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onPickCover(e.target.files?.[0])}
            />
          </label>
        </div>

        <CharactersStrip
          characters={structure.characters}
          onChange={(chars) =>
            setStructure((s) => ({ ...s, characters: chars }))
          }
        />

        <div className="cs-meta-group">
          <label>Visibilidad</label>
          <div className="cs-visibility">
            <label className={meta.visibility === 'private' ? 'active' : ''}>
              <input
                type="radio"
                name="vis"
                value="private"
                checked={meta.visibility === 'private'}
                onChange={() => setMeta({ ...meta, visibility: 'private' })}
              />
              Privada
            </label>
            <label className={meta.visibility === 'public' ? 'active' : ''}>
              <input
                type="radio"
                name="vis"
                value="public"
                checked={meta.visibility === 'public'}
                onChange={() => setMeta({ ...meta, visibility: 'public' })}
              />
              Pública
            </label>
          </div>
        </div>

        {meta.visibility === 'public' && (
          <div className="cs-publish-block">
            <p className="cs-publish-checklist">
              Antes de publicar:
              <br />
              {meta.title.trim() ? '✅' : '⭕'} Título
              <br />
              {meta.genre ? '✅' : '⭕'} Género
              <br />
              {cover.file || cover.url ? '✅' : '⭕'} Portada
              <br />
              {meta.synopsis.trim() ? '✅' : '⭕'} Sinopsis
            </p>
            <button
              className="cs-btn-publish"
              disabled={saving}
              onClick={async () => {
                try {
                  await persist(true);
                } catch (e) {
                  alert(e.message || 'Error al publicar');
                }
              }}
            >
              {saving ? 'Publicando…' : 'Publicar'}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};

export default CreateStory;