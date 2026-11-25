import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import DashboardHeader from '../../components/DashboardHeader';
import { useCreatorNav } from '../../context/CreatorNavContext';
import ExitConfirmModal from '../../components/ExitConfirmModal';
import '../../styles/Dashboard.css';

const CreatorLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { isDirty, saveAndExit, discard, openCreateModal } = useCreatorNav();

  const [exitPending, setExitPending] = useState(null);
  const [saving, setSaving] = useState(false);

  // Interceptamos los clics del menú para manejar cambios sin guardar
  const handleNavClick = (e, to) => {
    e.preventDefault();
    if (location.pathname === to) return; // ya estamos ahí

    // Lógica especial para la pestaña "Crear"
    const isCreateTab = to === '/dashboard/crear/editor';
    if (isCreateTab) {
      const inEditor = location.pathname.startsWith('/dashboard/crear/editor');
      if (!inEditor) {
        openCreateModal(); // Dispara tu modal de "tipo de historia"
        return;
      }
      return;
    }

    // Si hay cambios sin guardar, preguntamos
    if (isDirty) {
      setExitPending(to);
      return;
    }

    navigate(to);
  };

  const confirmSaveAndExit = async () => {
    setSaving(true);
    try {
      await saveAndExit();
      const to = exitPending;
      setExitPending(null);
      navigate(to);
    } catch (e) {
      alert('No se pudo guardar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDiscardAndExit = () => {
    const to = exitPending;
    discard();
    setExitPending(null);
    navigate(to);
  };

  return (
    <div className="dashboard-container">
      {/* Usamos el header compartido en modo "creator" */}
      <DashboardHeader mode="creator" onNavClick={handleNavClick} />

      <main className="dashboard-content" style={{ padding: 0 }}>
        <Outlet />
      </main>

      {/* Modal de "Guardar cambios antes de salir" */}
      {exitPending !== null && (
        <ExitConfirmModal
          saving={saving}
          onSave={confirmSaveAndExit}
          onDiscard={confirmDiscardAndExit}
          onCancel={() => setExitPending(null)}
        />
      )}
    </div>
  );
};

export default CreatorLayout;