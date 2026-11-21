import '../../styles/CreateStoryModal.css';

const CreateStoryModal = ({ open, onClose, onCreate }) => {
  if (!open) return null;
  return (
    <div className="csm-overlay" onClick={onClose}>
      <div className="csm-modal" onClick={(e) => e.stopPropagation()}>
        <h3>¿Qué tipo de historia quieres crear?</h3>
        <div className="csm-options">
          <button className="csm-option" onClick={() => onCreate('linear')}>
            <div className="csm-icon">📖</div>
            <strong>Lineal</strong>
            <p>Historia secuencial con tréboles y pétalos.</p>
          </button>
          <button className="csm-option disabled" disabled>
            <div className="csm-icon">🌳</div>
            <strong>Ramificada</strong>
            <p>Próximamente</p>
          </button>
        </div>
        <button className="csm-close" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
};

export default CreateStoryModal;