import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo_kleeBunko.png';
import { logoutUser } from '../pages/api/auth';

const NAV_ITEMS = [
  { to: '/dashboard',            label: 'Inicio' },
  { to: '/dashboard/biblioteca', label: 'Biblioteca' },
  { to: '/dashboard/comunidad',  label: 'Comunidad' },
  { to: '/dashboard/crear',      label: 'Crear' },
];

const DashboardHeader = ({ onSearch, onFilter, searchValue = '', hasActiveFilters = false, activeFilterCount = 0 }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user, setUser] = useState({ nombre: '', email: '', username: '' });
  const [search, setSearch] = useState(searchValue);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => { setSearch(searchValue); }, [searchValue]);

  useEffect(() => {
    const fn = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    try { if (token) await logoutUser(token); }
    catch (e) { console.error(e); }
    finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('persistSession');
      sessionStorage.clear();
      navigate('/login');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const term = search.trim();
    if (onSearch) onSearch(term);
    else navigate(`/dashboard/biblioteca${term ? `?q=${encodeURIComponent(term)}` : ''}`);
  };

  const clickFilter = () => {
    if (onFilter) onFilter();
    else navigate('/dashboard/biblioteca');
  };

  const isActive = (to) =>
    to === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(to);

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <img src={logo} alt="Logo KleeBunko" className="header-logo" />
        <h1 className="header-title">
          <span className="title-word-one">Klee</span>
          <span className="title-word-two">Bunko</span>
        </h1>
      </div>

      <nav className="dashboard-nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`dash-nav-link ${isActive(item.to) ? 'active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <form className="header-search-bar" onSubmit={submitSearch}>
        <div className="search-input-wrapper">
          <svg className="search-icon" xmlns="http://www.w3.org/2000/svg"
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar historias..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          className={`filter-btn ${hasActiveFilters ? 'active' : ''}`}
          aria-label="Filtros"
          onClick={clickFilter}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
          {activeFilterCount > 0 && (
            <span className="filter-badge">{activeFilterCount}</span>
          )}
        </button>
      </form>

      <div className="header-profile" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
        <div className="profile-avatar">{getInitials(user.nombre)}</div>
        <span className="profile-name">{user.nombre || 'Usuario'}</span>
        <svg className={`profile-arrow ${isDropdownOpen ? 'open' : ''}`}
          xmlns="http://www.w3.org/2000/svg" width="16" height="16"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>

        {isDropdownOpen && (
          <div className="profile-dropdown" ref={dropdownRef}>
            <div className="dropdown-header">
              <p className="dropdown-name">{user.nombre || 'Usuario'}</p>
              <p className="dropdown-email">{user.email || 'correo@ejemplo.com'}</p>
            </div>
            <div className="dropdown-coins">
              <span>Monedas Klee</span>
              <div className="coins-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="8" cy="8" r="6" />
                  <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
                </svg>
                150
              </div>
            </div>
            <div className="dropdown-menu">
              <Link to="/dashboard/perfil" className="dropdown-item">Mi Perfil</Link>
              <Link to="/dashboard/ajustes" className="dropdown-item">Ajustes</Link>
              <button onClick={handleLogout} className="dropdown-item logout">
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default DashboardHeader;