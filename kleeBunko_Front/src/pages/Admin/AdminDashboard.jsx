import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo_kleeBunko.png';
import { logoutUser } from '../api/auth';
import {
  listAdmins, 
  createAdmin, 
  updateAdmin, 
  blockAdmin, 
  deleteAdmin,
  updateMasterProfile, 
  getReports, 
  getReviewQueue, 
  sendToReview, 
  resolveReportAction,
  getAdminActivity
} from '../api/admin';
import AdminCatalog from './AdminCatalog';
import '../../styles/Admin.css';

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', roles: ['master', 'administrator'] },
  { id: 'create-admin', label: 'Crear administrador', roles: ['master'] },
  { id: 'admins', label: 'Administradores', roles: ['master'] },
  { id: 'activity', label: 'Actividad administrativa', roles: ['master'] },
  { id: 'review', label: 'Cola de revisión', roles: ['master', 'administrator'] },
  { id: 'catalog', label: 'Catálogo', roles: ['master', 'administrator'] },
  { id: 'reports', label: 'Reportes', roles: ['master', 'administrator'] },
  { id: 'info', label: 'Info', roles: ['master'] },
];

const AdminDashboard = () => {
  const [user, setUser] = useState({ nombre: '', email: '', role: '', isAdmin: false });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Estados Admin
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados Reportes y Cola (¡AQUÍ ESTABAN LOS QUE FALTABAN!)
  const [reports, setReports] = useState([]);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Estados de Acciones (Menú y Modales)
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [blockModalOpen, setBlockModalOpen] = useState(null);

  // Estados conseguir actividad de administradores
  const [activityList, setActivityList] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Formularios
  const [createForm, setCreateForm] = useState({ full_name: '', username: '', email: '', password: '', confirmPassword: '' });
  const [editForm, setEditForm] = useState({ id: '', full_name: '', username: '', email: '' });
  const [infoForm, setInfoForm] = useState({ full_name: '', username: '', email: '' });

  const isMaster = user.role === 'master';

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      setInfoForm({ full_name: parsed.nombre || '', username: parsed.username || '', email: parsed.email || '' });
    }
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    if ((activeTab === 'admins' || activeTab === 'dashboard') && isMaster) {
      fetchAdmins();
    }
    if (activeTab === 'reports') {
      fetchReports();
    }
    if (activeTab === 'review') {
      fetchReviews();
    }
    if (activeTab === 'activity' && isMaster) {
      fetchActivity();
    }
  }, [activeTab, isMaster]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await listAdmins();
      setAdmins(res.admins || []);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const fetchReports = async () => {
    try {
      setLoadingData(true);
      const res = await getReports();
      setReports(res.reports || []);
    } catch (err) { setError(err.message); } finally { setLoadingData(false); }
  };

  const fetchReviews = async () => {
    try {
      setLoadingData(true);
      const res = await getReviewQueue();
      setReviewQueue(res.reviewQueue || []);
    } catch (err) { setError(err.message); } finally { setLoadingData(false); }
  };

  const fetchActivity = async () => {
    try {
      setLoadingActivity(true);
      const res = await getAdminActivity();
      setActivityList(res.activity || []);
    } catch (err) { setError(err.message); } finally { setLoadingActivity(false); }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('token');
    try { if (token) await logoutUser(token); } catch (e) { console.error(e); }
    finally {
      localStorage.removeItem('token'); localStorage.removeItem('user');
      localStorage.removeItem('persistSession'); sessionStorage.clear();
      navigate('/login');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const handleReviewClick = async (reportId) => {
    try {
      await sendToReview(reportId);
      fetchReports(); // Recarga la lista de reportes para que desaparezca el que tomamos
    } catch (err) { alert(err.message); }
  };

  const handleResolve = async (reportId, action, duration = null) => {
    try {
      await resolveReportAction(reportId, { action, duration });
      setBlockModalOpen(null);
      setActionMenuOpen(null);
      fetchReviews(); // Recarga la cola para que desaparezca el que resolvimos
    } catch (err) { alert(err.message); }
  };

  // --- ACCIONES DE FORMULARIOS ---
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (createForm.password !== createForm.confirmPassword) {
      return setError('Las contraseñas no coinciden');
    }
    try {
      setLoading(true);
      await createAdmin({
        full_name: createForm.full_name,
        username: createForm.username,
        email: createForm.email,
        password: createForm.password
      });
      setSuccess('Administrador creado correctamente');
      setCreateForm({ full_name: '', username: '', email: '', password: '', confirmPassword: '' });
      fetchAdmins();
      setActiveTab('admins');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAdmin = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      setLoading(true);
      await updateAdmin(editForm.id, {
        full_name: editForm.full_name,
        username: editForm.username,
        email: editForm.email
      });
      setSuccess('Administrador actualizado');
      setEditForm({ id: '', full_name: '', username: '', email: '' });
      fetchAdmins();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      setLoading(true);
      const res = await updateMasterProfile(infoForm);
      const updatedUser = { ...user, nombre: res.admin.full_name, username: res.admin.username, email: res.admin.email };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setSuccess('Tu perfil ha sido actualizado correctamente.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (id, currentStatus) => {
    if (!confirm(`¿${currentStatus ? 'Desbloquear' : 'Bloquear'} a este administrador?`)) return;
    try {
      await blockAdmin(id, !currentStatus);
      fetchAdmins();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar permanentemente a este administrador? Esta acción no se puede deshacer.')) return;
    try {
      await deleteAdmin(id);
      fetchAdmins();
    } catch (err) { alert(err.message); }
  };

  const availableMenu = MENU_ITEMS.filter(item => item.roles.includes(user.role));

  const getReportBadge = (report) => {
    if (report.review_id) return { text: 'Reseña', className: 'badge-review' };
    if (report.text_position) return { text: 'Texto', className: 'badge-text' };
    return { text: 'Novela', className: 'badge-novel' };
  };

  // Componente de la tarjeta de reporte
  const ReportCard = ({ report, isQueue }) => {
    const badge = getReportBadge(report);
    const date = new Date(report.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  
    return (
      <div className="report-card">
        <span className={`report-badge ${badge.className}`}>{badge.text}</span>
        
        <div className="report-card-left">
          <div className="report-cover" style={{ backgroundImage: report.novels?.cover_url ? `url(${report.novels.cover_url})` : 'none' }}>
            {!report.novels?.cover_url && <span>Sin Portada</span>}
          </div>
        </div>

        <div className="report-card-right">
          <h3 className="report-novel-title">{report.novels?.title || 'Novela Desconocida'}</h3>
          <p className="report-date">Reportado el {date}</p>
          
          <div className="report-footer-row">
            <div className="report-reason-box">
              <span className="report-reason-label">Motivo:</span>
              <p className="report-reason-text">{report.reason}</p>
            </div>

            <div className="report-action-container">
              {!isQueue ? (
                <button className="btn-round-action btn-review" onClick={() => handleReviewClick(report.id)}>
                  Revisar
                </button>
              ) : (
                <div className="action-dropdown-wrapper">
                  <button className="btn-round-action btn-actions" onClick={() => setActionMenuOpen(actionMenuOpen === report.id ? null : report.id)}>
                    Acciones
                  </button>
                  
                  {actionMenuOpen === report.id && (
                    <div className="action-menu">
                      <button onClick={() => handleResolve(report.id, 'notify')}>Notificar</button>
                      <button onClick={() => { setBlockModalOpen(report.id); setActionMenuOpen(null); }}>
                        Bloquear
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-container">
      {/* ================= HEADER ================= */}
      <header className="admin-header">
        <div className="admin-header-left">
          <div className="admin-header-brand">
            <img src={logo} alt="Logo" className="admin-header-logo" />
            <h1 className="admin-header-title">
              <span className="title-word-one">Klee</span>
              <span className="title-word-two">Bunko</span>
            </h1>
          </div>
          {user.isAdmin && (
            <span className={`admin-role-badge admin-role-badge-${user.role}`}>
              {isMaster ? 'Master' : 'Administrador'}
            </span>
          )}
        </div>

        <div className="admin-header-profile" onClick={() => setIsDropdownOpen(v => !v)}>
          <div className="admin-profile-avatar">{getInitials(user.nombre)}</div>
          <span className="admin-profile-name">{user.nombre || 'Admin'}</span>
          <svg className={`admin-profile-arrow ${isDropdownOpen ? 'open' : ''}`} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>

          {isDropdownOpen && (
            <div className="admin-profile-dropdown" ref={dropdownRef}>
              <div className="admin-dropdown-header">
                <p className="admin-dropdown-name">{user.nombre}</p>
                <p className="admin-dropdown-email">{user.email}</p>
              </div>
              <div className="admin-dropdown-menu">
                <button onClick={handleLogout} className="admin-dropdown-item logout">Cerrar Sesión</button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ================= BODY ================= */}
      <div className="admin-body">
        <aside className="admin-sidebar">
          <h2 className="admin-sidebar-title">Menú</h2>
          <div className="admin-sidebar-divider"></div>
          <nav className="admin-sidebar-nav">
            {availableMenu.map((item) => (
              <button
                key={item.id}
                className={`admin-menu-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => { setActiveTab(item.id); setError(''); setSuccess(''); }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="admin-main-content">
          {error && <div className="admin-alert admin-alert-error">{error}</div>}
          {success && <div className="admin-alert admin-alert-success">{success}</div>}

          {/* --- TAB: DASHBOARD --- */}
          {activeTab === 'dashboard' && (
            <div className="admin-tab-content">
              <h2 className="admin-tab-title">Dashboard</h2>
              <p className="admin-tab-sub">Resumen general de la administración.</p>
              
              {isMaster ? (
                <div className="admin-stats-grid">
                  <div className="admin-stat-card">
                    <span className="admin-stat-num">{admins.length}</span>
                    <span className="admin-stat-label">Administradores Totales</span>
                  </div>
                  <div className="admin-stat-card">
                    <span className="admin-stat-num">{admins.filter(a => !a.is_blocked).length}</span>
                    <span className="admin-stat-label">Activos</span>
                  </div>
                  <div className="admin-stat-card">
                    <span className="admin-stat-num">{admins.filter(a => a.is_blocked).length}</span>
                    <span className="admin-stat-label">Bloqueados</span>
                  </div>
                </div>
              ) : (
                <div className="admin-placeholder">
                  <p>Bienvenido al panel de administración. Usa el menú lateral para navegar.</p>
                </div>
              )}
            </div>
          )}

          {/* --- TAB: CREAR ADMINISTRADOR --- */}
          {activeTab === 'create-admin' && isMaster && (
            <div className="admin-tab-content">
              <h2 className="admin-tab-title">Crear Administrador</h2>
              <p className="admin-tab-sub">Añade un nuevo miembro al equipo administrativo.</p>
              
              <form className="admin-form-card" onSubmit={handleCreateAdmin}>
                <div className="admin-form-group">
                  <label>Nombre completo</label>
                  <input type="text" value={createForm.full_name} onChange={e => setCreateForm({...createForm, full_name: e.target.value})} required />
                </div>
                <div className="admin-form-group">
                  <label>Nombre de usuario</label>
                  <input type="text" value={createForm.username} onChange={e => setCreateForm({...createForm, username: e.target.value})} required />
                </div>
                <div className="admin-form-group">
                  <label>Correo electrónico</label>
                  <input type="email" value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})} required />
                </div>
                <div className="admin-form-group">
                  <label>Contraseña</label>
                  <input type="password" value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})} minLength={6} required />
                </div>
                <div className="admin-form-group">
                  <label>Confirmar contraseña</label>
                  <input type="password" value={createForm.confirmPassword} onChange={e => setCreateForm({...createForm, confirmPassword: e.target.value})} minLength={6} required />
                </div>
                <button type="submit" className="admin-btn-primary" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear administrador'}
                </button>
              </form>
            </div>
          )}

          {/* --- TAB: LISTA DE ADMINISTRADORES --- */}
          {activeTab === 'admins' && isMaster && (
            <div className="admin-tab-content">
              <h2 className="admin-tab-title">Administradores</h2>
              <p className="admin-tab-sub">Listado y gestión del equipo.</p>
              
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Usuario</th>
                      <th>Correo</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map(adm => (
                      <tr key={adm.id} className={adm.is_blocked ? 'row-blocked' : ''}>
                        <td>{adm.full_name}</td>
                        <td>{adm.username}</td>
                        <td>{adm.email}</td>
                        <td>
                          <span className={`role-chip role-${adm.role}`}>
                            {adm.role === 'master' ? 'Master' : 'Admin'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-chip ${adm.is_blocked ? 'status-blocked' : 'status-active'}`}>
                            {adm.is_blocked ? 'Bloqueado' : 'Activo'}
                          </span>
                        </td>
                        <td>
                          {adm.role === 'master' ? (
                            <span className="admin-muted">—</span>
                          ) : (
                            <div className="admin-actions">
                              <button onClick={() => setEditForm(adm)}>Editar</button>
                              <button onClick={() => handleBlock(adm.id, adm.is_blocked)}>{adm.is_blocked ? 'Desbloquear' : 'Bloquear'}</button>
                              <button className="danger" onClick={() => handleDelete(adm.id)}>Eliminar</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- TAB: ACTIVIDAD ADMINISTRATIVA (Solo Master) --- */}
          {activeTab === 'activity' && isMaster && (
            <div className="admin-tab-content">
              <h2 className="admin-tab-title">Actividad Administrativa</h2>
              <p className="admin-tab-sub">Registro de todos los reportes tomados por el equipo.</p>
              
              {loadingActivity ? (
                <p className="admin-empty">Cargando historial...</p>
              ) : activityList.length === 0 ? (
                <div className="admin-placeholder"><p>No hay actividad registrada aún.</p></div>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Administrador</th>
                        <th>Novela Reportada</th>
                        <th>Acción Tomada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityList.map(act => {
                        const date = new Date(act.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
                        const isPending = act.accion_tomada === 'en_revision';
                        
                        return (
                          <tr key={act.id}>
                            <td>{date}</td>
                            <td>
                              <div style={{fontWeight: '600'}}>{act.admin_users?.full_name || 'Admin'}</div>
                              <div style={{fontSize: '0.75rem', color: '#9aa3af'}}>{act.admin_users?.email}</div>
                            </td>
                            <td>{act.reports?.novels?.title || 'Novela eliminada'}</td>
                            <td>
                              <span className={`status-chip ${isPending ? 'status-pending' : 'status-resolved-chip'}`}>
                                {isPending ? 'En revisión' : act.accion_tomada}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* --- TAB: COLA DE REVISIÓN --- */}
          {activeTab === 'review' && (
            <div className="admin-tab-content">
              <h2 className="admin-tab-title">Cola de Revisión</h2>
              <p className="admin-tab-sub">Reportes que has tomado y están bajo tu revisión.</p>
              
              {loadingData ? (
                <p className="admin-empty">Cargando cola...</p>
              ) : reviewQueue.length === 0 ? (
                <div className="admin-placeholder"><p>No tienes reportes en tu cola.</p></div>
              ) : (
                <div className="admin-reports-grid">
                  {reviewQueue.map(item => (
                    <ReportCard key={item.id} report={item.reports} isQueue={true} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --- TAB: CATÁLOGO --- */}
          {activeTab === 'catalog' && (
            <AdminCatalog />
          )}

          {/* --- TAB: REPORTES --- */}
          {activeTab === 'reports' && (
            <div className="admin-tab-content">
              <h2 className="admin-tab-title">Reportes</h2>
              <p className="admin-tab-sub">Revisa las infracciones y quejas de la comunidad.</p>
              
              {loadingData ? (
                <p className="admin-empty">Cargando reportes...</p>
              ) : reports.length === 0 ? (
                <div className="admin-placeholder"><p>No hay reportes pendientes.</p></div>
              ) : (
                <div className="admin-reports-grid">
                  {reports.map(report => <ReportCard key={report.id} report={report} isQueue={false} />)}
                </div>
              )}
            </div>
          )}

          {/* --- TAB: INFO --- */}
          {activeTab === 'info' && isMaster && (
            <div className="admin-tab-content">
              <h2 className="admin-tab-title">Mi Información</h2>
              <p className="admin-tab-sub">Actualiza tus datos de acceso. Si cambias el correo, deberás usarlo en tu próximo inicio de sesión.</p>
              
              <form className="admin-form-card" onSubmit={handleUpdateInfo}>
                <div className="admin-form-group">
                  <label>Nombre completo</label>
                  <input type="text" value={infoForm.full_name} onChange={e => setInfoForm({...infoForm, full_name: e.target.value})} required />
                </div>
                <div className="admin-form-group">
                  <label>Nombre de usuario</label>
                  <input type="text" value={infoForm.username} onChange={e => setInfoForm({...infoForm, username: e.target.value})} required />
                </div>
                <div className="admin-form-group">
                  <label>Correo electrónico</label>
                  <input type="email" value={infoForm.email} onChange={e => setInfoForm({...infoForm, email: e.target.value})} required />
                </div>
                <button type="submit" className="admin-btn-primary" disabled={loading}>
                  {loading ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </form>
            </div>
          )}

        </main>
      </div>

      {/* MODAL DE EDICIÓN RÁPIDA */}
      {editForm.id && (
        <div className="admin-modal-overlay" onClick={() => setEditForm({ id: '', full_name: '', username: '', email: '' })}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3 className="admin-modal-title">Editar Administrador</h3>
            <form onSubmit={handleUpdateAdmin} className="admin-form">
              <div className="admin-form-group">
                <label>Nombre completo</label>
                <input type="text" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} required />
              </div>
              <div className="admin-form-group">
                <label>Nombre de usuario</label>
                <input type="text" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} required />
              </div>
              <div className="admin-form-group">
                <label>Correo electrónico</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} required />
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="admin-btn-secondary" onClick={() => setEditForm({ id: '', full_name: '', username: '', email: '' })}>Cancelar</button>
                <button type="submit" className="admin-btn-primary" disabled={loading}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE BLOQUEO */}
      {blockModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setBlockModalOpen(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3 className="admin-modal-title">Aplicar Bloqueo</h3>
            <p className="admin-tab-sub" style={{marginBottom: '20px'}}>Selecciona la duración del bloqueo para el infractor.</p>
            
            <div className="block-options-grid">
              <button onClick={() => handleResolve(blockModalOpen, 'block', '1_week')}>1 Semana</button>
              <button onClick={() => handleResolve(blockModalOpen, 'block', '2_weeks')}>2 Semanas</button>
              <button onClick={() => handleResolve(blockModalOpen, 'block', '1_month')}>1 Mes</button>
              <button onClick={() => handleResolve(blockModalOpen, 'block', '3_months')}>3 Meses</button>
              <button onClick={() => handleResolve(blockModalOpen, 'block', '6_months')}>6 Meses</button>
              <button className="btn-danger" onClick={() => handleResolve(blockModalOpen, 'block', 'permanent')}>Definitivo</button>
            </div>
            
            <div className="admin-modal-actions" style={{marginTop: '24px'}}>
              <button className="admin-btn-secondary" onClick={() => setBlockModalOpen(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;