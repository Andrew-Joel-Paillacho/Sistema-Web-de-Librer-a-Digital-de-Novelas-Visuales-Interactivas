import { useEffect, useState } from 'react';
import { GENRES } from '../utils/genres';
import '../styles/FilterPanel.css';

const DATE_OPTIONS = [
  { value: '',      label: 'Cualquier fecha' },
  { value: 'today', label: 'Hoy' },
  { value: 'week',  label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
];

const FilterPanel = ({ open, onClose, current = {}, onApply }) => {
  const [genre, setGenre] = useState(current.genre || '');
  const [date, setDate] = useState(current.date || '');

  useEffect(() => {
    if (open) {
      setGenre(current.genre || '');
      setDate(current.date || '');
    }
  }, [open, current]);

  if (!open) return null;

  const handleClear = () => {
    setGenre('');
    setDate('');
  };

  const handleApply = () => {
    onApply({ genre, date });
    onClose();
  };

  return (
    <div className="fp-overlay" onClick={onClose}>
      <div className="fp-panel" onClick={(e) => e.stopPropagation()}>
        <div className="fp-head">
          <h3>Filtrar historias</h3>
          <button className="fp-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="fp-body">
          <div className="fp-section">
            <label className="fp-label">Fecha de publicación</label>
            <div className="fp-options">
              {DATE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`fp-chip ${date === o.value ? 'active' : ''}`}
                  onClick={() => setDate(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="fp-section">
            <label className="fp-label">Género</label>
            <div className="fp-options">
              <button
                type="button"
                className={`fp-chip ${!genre ? 'active' : ''}`}
                onClick={() => setGenre('')}
              >
                Todos
              </button>
              {GENRES.map((g) => (
                <button
                  key={g.slug}
                  type="button"
                  className={`fp-chip ${genre === g.slug ? 'active' : ''}`}
                  onClick={() => setGenre(g.slug)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="fp-foot">
          <button type="button" className="fp-btn ghost" onClick={handleClear}>
            Limpiar
          </button>
          <button type="button" className="fp-btn primary" onClick={handleApply}>
            Aplicar filtros
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;