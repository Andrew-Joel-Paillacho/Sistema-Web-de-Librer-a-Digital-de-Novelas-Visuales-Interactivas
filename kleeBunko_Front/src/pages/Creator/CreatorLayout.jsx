import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import logo from '../../assets/logo_kleeBunko.png';
import { logoutUser } from '../api/auth';
import { useCreatorNav } from '../../context/CreatorNavContext';
import ExitConfirmModal from '../../components/ExitConfirmModal';
import '../../styles/Dashboard.css';

const CreatorLayout = () => {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState({ nombre: '', email: '', kleeCoins: 10 });
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Contexto para dirty state + modal de crear
  const {
    isDirty,
    saveAndExit,
    discard,
    openCreateModal,
  } = useCreatorNav();

  // Modal de confirmación de salida
  const [exitPending, setExitPending] = useState(null); // string con el path destino
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const logout = async () => {
    try {
      const t = localStorage.getItem('token');
      if (t) await logoutUser(t);
    } catch (_) {}
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login');
  };

  const initials = (user.nombre || 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // ===== Interceptor de navegación entre tabs =====
  const handleTabClick = (e, to, isCreateTab) => {
    e.preventDefault();
    if (location.pathname === to) return; // ya estamos ahí

    // Caso especial: pestaña "Crear" y no hay editor abierto
    if (isCreateTab) {
      // Si no estamos en una ruta de editor, dispara el modal de "tipo de historia"
      const inEditor = location.pathname.startsWith('/dashboard/crear/editor');
      if (!inEditor) {
        // Si el usuario está en MyStories → pedir tipo desde ahí
        // Si está en Leer → igual, pedir tipo
        openCreateModal();
        return;
      }
      // Si ya está en editor, no hace nada
      return;
    }

    // Caso general: si hay cambios sin guardar, interceptar
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
      // Si el guardado falla, deja al usuario en el editor
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

  const cancelExit = () => setExitPending(null);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <img src={logo} alt="logo" className="header-logo" />
          <h1 className="header-title">
            <span className="title-word-one">Klee</span>
            <span className="title-word-two">Bunko</span>
          </h1>
        </div>

        <nav className="dashboard-nav">
          <a
            href="/dashboard/crear"
            className={`dash-nav-link ${
              location.pathname === '/dashboard/crear' ? 'active' : ''
            }`}
            onClick={(e) => handleTabClick(e, '/dashboard/crear', false)}
          >
            Mis Historias
          </a>
          <a
            href="/dashboard/crear/editor"
            className={`dash-nav-link ${
              location.pathname.startsWith('/dashboard/crear/editor') ? 'active' : ''
            }`}
            onClick={(e) => handleTabClick(e, '/dashboard/crear/editor', true)}
          >
            Crear
          </a>
          <a
            href="/dashboard/crear/leer"
            className={`dash-nav-link ${
              location.pathname === '/dashboard/crear/leer' ? 'active' : ''
            }`}
            onClick={(e) => handleTabClick(e, '/dashboard', false)}
          >
            Leer
          </a>
        </nav>

        <div className="header-profile" onClick={() => setOpen(!open)} ref={ref}>
          <div className="profile-avatar">{initials}</div>
          <span className="profile-name">{user.nombre || 'Usuario'}</span>
          <svg
            className={`profile-arrow ${open ? 'open' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>

          {open && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                <p className="dropdown-name">{user.nombre}</p>
                <p className="dropdown-email">{user.email}</p>
              </div>
              <div className="dropdown-coins">
                <span>Monedas Klee</span>
                <div className="coins-badge">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="8" cy="8" r="6" />
                    <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
                  </svg>
                  {user.kleeCoins ?? 10}
                </div>
              </div>
              <div className="dropdown-menu">
                <Link to="/dashboard/perfil" className="dropdown-item">Mi Perfil</Link>
                <Link to="/dashboard/ajustes" className="dropdown-item">Ajustes</Link>
                <button onClick={logout} className="dropdown-item logout">Cerrar Sesión</button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="dashboard-content" style={{ padding: 0 }}>
        <Outlet />
      </main>

      {/* Modal de "Guardar cambios antes de salir" */}
      {exitPending !== null && (
        <ExitConfirmModal
          saving={saving}
          onSave={confirmSaveAndExit}
          onDiscard={confirmDiscardAndExit}
          onCancel={cancelExit}
        />
      )}
    </div>
  );
};

export default CreatorLayout;