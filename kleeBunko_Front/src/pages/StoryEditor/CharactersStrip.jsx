import { useState } from 'react';

const MOODS = [
  'Neutro', 'Feliz', 'Triste', 'Enojado', 'Sorprendido',
  'Asustado', 'Pensativo', 'Sonrojado', 'Determinado', 'Confundido',
];

const uid = () => Math.random().toString(36).slice(2, 10);

const CharactersStrip = ({ characters, onChange }) => {
  const [addOpen, setAddOpen] = useState(false);
  const [moodModalFor, setMoodModalFor] = useState(null);

  const addCharacter = (name) => {
    const ch = {
      id: uid(),
      name,
      moods: [{ id: uid(), name: 'Neutro', image: { file: null, url: null } }],
    };
    onChange([...characters, ch]);
  };

  const removeCharacter = (id) => {
    if (!confirm('¿Eliminar personaje?')) return;
    onChange(characters.filter((c) => c.id !== id));
  };

  const addMood = (charId, moodName) => {
    onChange(
      characters.map((c) =>
        c.id === charId
          ? {
              ...c,
              moods: [
                ...c.moods,
                { id: uid(), name: moodName, image: { file: null, url: null } },
              ],
            }
          : c
      )
    );
  };

  const pickMoodImage = (charId, moodId, file) => {
    if (!file) return;
    onChange(
      characters.map((c) =>
        c.id === charId
          ? {
              ...c,
              moods: c.moods.map((m) =>
                m.id === moodId
                  ? { ...m, image: { file, url: URL.createObjectURL(file) } }
                  : m
              ),
            }
          : c
      )
    );
  };

  return (
    <div className="cs-meta-group">
      <label>Personajes</label>
      <div className="cstrip">
        {characters.map((ch) => (
          <div key={ch.id} className="cstrip-char">
            <div className="cstrip-char-head">
              <span>{ch.name}</span>
              <button
                className="cstrip-del"
                onClick={() => removeCharacter(ch.id)}
                title="Eliminar personaje"
              >
                ×
              </button>
            </div>

            <div className="cstrip-moods">
              {ch.moods.map((m) => (
                <div key={m.id} className="cstrip-mood">
                  <label
                    className="cstrip-mood-img cstrip-mood-clickable"
                    style={{
                      backgroundImage: m.image?.url ? `url(${m.image.url})` : 'none',
                    }}
                    title={m.image?.url ? 'Cambiar imagen' : 'Añadir imagen'}
                  >
                    {!m.image?.url && (
                      <svg
                        className="cstrip-mood-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => pickMoodImage(ch.id, m.id, e.target.files?.[0])}
                    />
                  </label>
                  <span className="cstrip-mood-name">{m.name}</span>
                </div>
              ))}

              <button
                className="cstrip-mood-add"
                onClick={() => setMoodModalFor(ch.id)}
                title="Añadir estado"
              >
                <div className="cstrip-mood-add-circle">+</div>
                <span className="cstrip-mood-add-label">Estado</span>
              </button>
            </div>
          </div>
        ))}

        <button className="cstrip-add" onClick={() => setAddOpen(true)}>
          <div className="cstrip-add-circle">+</div>
          <span>Agregar</span>
        </button>
      </div>

      {addOpen && (
        <AddCharacterModal
          onClose={() => setAddOpen(false)}
          onConfirm={(name) => {
            addCharacter(name);
            setAddOpen(false);
          }}
        />
      )}

      {moodModalFor && (
        <MoodPickerModal
          existingMoods={
            characters.find((c) => c.id === moodModalFor)?.moods.map((m) => m.name) || []
          }
          onClose={() => setMoodModalFor(null)}
          onPick={(moodName) => {
            addMood(moodModalFor, moodName);
            setMoodModalFor(null);
          }}
        />
      )}
    </div>
  );
};

const AddCharacterModal = ({ onClose, onConfirm }) => {
  const [name, setName] = useState('');
  return (
    <div className="cp-overlay" onClick={onClose}>
      <div className="cp-modal small" onClick={(e) => e.stopPropagation()}>
        <div className="cp-head">
          <h4>Nuevo personaje</h4>
          <button className="cp-close" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: 16 }}>
          <input
            className="cs-input"
            placeholder="Nombre del personaje"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <p style={{ fontSize: 12, color: '#9aa3af', marginTop: 8 }}>
            Se creará con un estado <strong>Neutro</strong> por defecto.
            Luego podrás agregar más estados e imágenes.
          </p>
          <button
            className="cs-btn-turquesa"
            style={{ marginTop: 12, width: '100%' }}
            disabled={!name.trim()}
            onClick={() => onConfirm(name.trim())}
          >
            Crear
          </button>
        </div>
      </div>
    </div>
  );
};

const MoodPickerModal = ({ existingMoods, onPick, onClose }) => {
  const [custom, setCustom] = useState('');
  const [adding, setAdding] = useState(false);

  const options = MOODS.filter((m) => !existingMoods.includes(m));

  return (
    <div className="cp-overlay" onClick={onClose}>
      <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cp-head">
          <h4>Elegir estado</h4>
          <button className="cp-close" onClick={onClose}>×</button>
        </div>

        <div className="mpm-grid">
          {options.map((m) => (
            <button key={m} className="mpm-option" onClick={() => onPick(m)}>
              {m}
            </button>
          ))}
          {options.length === 0 && (
            <p className="cp-empty">Ya tienes todos los estados predefinidos.</p>
          )}
        </div>

        <div className="mpm-footer">
          {!adding ? (
            <button className="cs-btn-outline" onClick={() => setAdding(true)}>
              + Agregar estado
            </button>
          ) : (
            <div className="mpm-add-row">
              <input
                className="cs-input"
                placeholder="Nombre del estado"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                autoFocus
              />
              <button
                className="cs-btn-turquesa"
                disabled={!custom.trim()}
                onClick={() => onPick(custom.trim())}
              >
                Añadir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharactersStrip;