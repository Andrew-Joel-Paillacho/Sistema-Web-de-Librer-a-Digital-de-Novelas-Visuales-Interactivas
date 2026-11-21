import '../styles/ExitConfirmModal.css';

const ExitConfirmModal = ({ saving, onSave, onDiscard, onCancel }) => {
  return (
    <div className="ecm-overlay" onClick={onCancel}>
      <div className="ecm-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Tienes cambios sin guardar</h3>
        <p>Si sales ahora, se perderán los cambios que no hayas guardado.</p>
        <div className="ecm-actions">
          <button
            className="ecm-btn ecm-save"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? 'Guardando…' : 'Guardar y salir'}
          </button>
          <button
            className="ecm-btn ecm-discard"
            onClick={onDiscard}
            disabled={saving}
          >
            Salir sin guardar
          </button>
          <button
            className="ecm-btn ecm-cancel"
            onClick={onCancel}
            disabled={saving}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExitConfirmModal;