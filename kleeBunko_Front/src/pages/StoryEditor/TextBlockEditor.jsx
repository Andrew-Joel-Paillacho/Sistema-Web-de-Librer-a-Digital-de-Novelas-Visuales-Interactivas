import { useState } from 'react';
import CharacterPicker from './CharacterPicker';

const TextBlockEditor = ({ block, index, characters, onChange, onRemove }) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  // Compatibilidad con historias antiguas que usaban block.character
  const selectedChars = block.characters || (block.character ? [block.character] : []);

  const handlePick = (character) => {
    // Evitar duplicados exactos
    const exists = selectedChars.find(
      (c) => c.id === character.id && c.moodId === character.moodId
    );
    if (!exists && selectedChars.length < 5) {
      onChange({ ...block, characters: [...selectedChars, character] });
    }
  };

  const handleRemoveChar = (charId, moodId) => {
    const newChars = selectedChars.filter(
      (c) => !(c.id === charId && c.moodId === moodId)
    );
    onChange({ ...block, characters: newChars });
  };

  return (
    <div className="cs-text-block">
      <div className="cs-text-block-head">
        <span className="cs-text-index">Texto {index + 1}</span>

        <div className="cs-chars-list">
          {selectedChars.map((char, i) => {
            const label = char.moodName
              ? `${char.name} (${char.moodName})`
              : char.name;
            return (
              <div key={`${char.id}-${char.moodId || 'none'}-${i}`} className="cs-char-tag">
                <span>{label}</span>
                <button type="button" onClick={() => handleRemoveChar(char.id, char.moodId)}>
                  ×
                </button>
              </div>
            );
          })}

          {selectedChars.length < 5 && (
            <button
              type="button"
              className="cs-char-add-btn"
              onClick={() => setPickerOpen(true)}
              title="Añadir personaje"
            >
              + Añadir
            </button>
          )}
        </div>
      </div>

      <textarea
        className="cs-text-area"
        maxLength={500}
        rows={4}
        placeholder={
          selectedChars.length > 0
            ? `Escribiendo diálogo para ${selectedChars.map((c) => c.name).join(', ')}...`
            : 'Texto sin personaje asignado (se guardará como ".")'
        }
        value={block.text}
        onChange={(e) => onChange({ ...block, text: e.target.value })}
      />

      <div className="cs-text-block-foot">
        <span>{block.text.length}/500</span>
        <button className="cs-btn-ghost danger" onClick={onRemove}>
          Eliminar texto
        </button>
      </div>

      {pickerOpen && (
        <CharacterPicker
          characters={characters}
          selected={selectedChars}
          onPick={handlePick}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
};

export default TextBlockEditor;