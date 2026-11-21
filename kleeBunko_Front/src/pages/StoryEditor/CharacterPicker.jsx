const CharacterPicker = ({ characters, selected = [], onPick, onClose }) => {
  const isSelected = (charId, moodId) => {
    return selected.some((c) => c.id === charId && c.moodId === moodId);
  };

  const isMaxReached = selected.length >= 5;

  return (
    <div className="cp-overlay" onClick={onClose}>
      <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cp-head">
          <h4>Seleccionar personaje ({selected.length}/5)</h4>
          <button className="cp-close" onClick={onClose}>×</button>
        </div>

        {characters.length === 0 && (
          <p className="cp-empty">
            Aún no has agregado personajes. Ve al panel derecho y crea uno.
          </p>
        )}

        <div className="cp-list">
          {characters.map((ch) => (
            <div key={ch.id} className="cp-char">
              <button
                className={`cp-char-name ${isSelected(ch.id, undefined) ? 'active' : ''}`}
                disabled={isMaxReached && !isSelected(ch.id, undefined)}
                onClick={() => !isSelected(ch.id, undefined) && onPick({ id: ch.id, name: ch.name })}
              >
                {ch.name}
                <span className="cp-mood-none">
                  {isSelected(ch.id, undefined) ? 'seleccionado' : 'sin estado'}
                </span>
              </button>

              {(ch.moods || []).length > 0 && (
                <div className="cp-moods">
                  {ch.moods.map((mood) => {
                    const sel = isSelected(ch.id, mood.id);
                    return (
                      <button
                        key={mood.id}
                        className={`cp-mood ${sel ? 'active' : ''}`}
                        disabled={isMaxReached && !sel}
                        onClick={() => !sel && onPick({
                          id: ch.id,
                          name: ch.name,
                          moodId: mood.id,
                          moodName: mood.name,
                        })}
                      >
                        {mood.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CharacterPicker;