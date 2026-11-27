import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/DashboardHeader';
import DashboardFooter from '../components/DashboardFooter';
import { updateProfileApi, upgradeRoleApi } from './api/auth';
import { supabase } from '../utils/supabaseClient';
import '../styles/Dashboard.css';
import '../styles/DashboardHome.css';

const Settings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState({});
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [loadingRole, setLoadingRole] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  
  const [msgInfo, setMsgInfo] = useState({ type: '', text: '' });
  const [msgRole, setMsgRole] = useState({ type: '', text: '' });

  // Formulario 1: Info
  const [formInfo, setFormInfo] = useState({
    nombre: '', username: '', avatar_url: ''
  });
  // Checkbox y contraseñas
  const [changePassword, setChangePassword] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });

  // Formulario 2: Rol
  const [formRole, setFormRole] = useState({ email: '', password: '' });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      setFormInfo({
        nombre: parsed.nombre || '',
        username: parsed.username || '',
        avatar_url: parsed.avatar_url || ''
      });
      setFormRole({ email: parsed.email || '', password: '' });
    }
  }, []);

  // Función helper para cerrar sesión y redirigir
  const forceLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('persistSession');
    sessionStorage.clear();
    navigate('/login', { replace: true });
  };

  const handleImageUpload = async (e) => {
    try {
      setUploadingImg(true);
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen.');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('KleeBunko_ProfileImg')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('KleeBunko_ProfileImg').getPublicUrl(fileName);
      
      setFormInfo(prev => ({ ...prev, avatar_url: data.publicUrl }));
      setMsgInfo({ type: 'success', text: 'Imagen lista. Guarda los cambios para aplicarla.' });
    } catch (err) {
      setMsgInfo({ type: 'error', text: 'Error al subir imagen: ' + err.message });
    } finally {
      setUploadingImg(false);
    }
  };

  const handleInfoSubmit = async (e) => {
    e.preventDefault();
    if (user.klee_coins < 3) return setMsgInfo({ type: 'error', text: 'Necesitas al menos 3 Klee Coins.' });
    if (uploadingImg) return setMsgInfo({ type: 'error', text: 'Espera a que la imagen termine de subir.' });

    setLoadingInfo(true);
    setMsgInfo({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const payload = { ...formInfo };
      
      // Si el checkbox está activo, enviamos las contraseñas
      if (changePassword) {
        if (!passwords.currentPassword || !passwords.newPassword) {
          throw new Error('Debes llenar ambos campos de contraseña.');
        }
        payload.currentPassword = passwords.currentPassword;
        payload.password = passwords.newPassword;
      }

      const res = await updateProfileApi(token, payload);
      
      setMsgInfo({ type: 'success', text: res.message });
      // Esperar 2 segundos y cerrar sesión
      setTimeout(() => {
        alert("Sesión cerrada. Por favor, inicia sesión de nuevo.");
        forceLogout();
      }, 2000);

    } catch (err) {
      setMsgInfo({ type: 'error', text: err.message });
      setLoadingInfo(false);
    }
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    
    // Advertencia de cierre de sesión
    const confirmMsg = '¿Estás seguro de que deseas actualizar tu rol a Dual? Se descontarán 3 Klee Coins y TU SESIÓN SE CERRARÁ automáticamente para aplicar los cambios.';
    if (!window.confirm(confirmMsg)) return;
    
    if (user.klee_coins < 3) return setMsgRole({ type: 'error', text: 'Necesitas al menos 3 Klee Coins.' });

    setLoadingRole(true);
    setMsgRole({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const res = await upgradeRoleApi(token, formRole);
      
      setMsgRole({ type: 'success', text: res.message });
      setTimeout(() => {
        alert("¡Felicidades! Ahora eres Dual. Inicia sesión de nuevo.");
        forceLogout();
      }, 2000);

    } catch (err) {
      setMsgRole({ type: 'error', text: err.message });
      setLoadingRole(false);
    }
  };

  return (
    <div className="dashboard-container">
      <DashboardHeader mode="reader" />
      
      <main className="dashboard-home" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ color: 'var(--color_principal_uno)', marginBottom: '10px' }}>Ajustes de Cuenta</h1>
        <p style={{ color: '#9aa3af', marginBottom: '40px' }}>
          Saldo actual: <strong>{user.klee_coins ?? 0} Klee Coins</strong>
        </p>

        {/* SECCIÓN 1: Información */}
        <section style={{ background: 'var(--color_principal_cinco)', padding: '24px', borderRadius: '12px', marginBottom: '30px', border: '1px solid #263041' }}>
          <h2 style={{ color: 'var(--color_principal_uno)', fontSize: '1.2rem', marginBottom: '16px' }}>Actualizar Información</h2>
          
          {msgInfo.text && (
            <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '6px', color: msgInfo.type === 'error' ? '#ef4444' : '#10b981', background: msgInfo.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' }}>
              {msgInfo.text}
            </div>
          )}

          <form onSubmit={handleInfoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Foto */}
            <div className="form-group">
              <label style={{ color: 'var(--color_principal_uno)' }}>Foto de Perfil</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--color_principal_cuatro)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--color_principal_dos)' }}>
                  {formInfo.avatar_url ? (
                    <img src={formInfo.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: 'var(--color_principal_uno)' }}>{(user.nombre || 'U').charAt(0)}</span>
                  )}
                </div>
                <div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImg} style={{ display: 'none' }} id="avatar-upload" />
                  <label htmlFor="avatar-upload" style={{ background: 'var(--color_principal_tres)', color: 'var(--color_principal_cuatro)', padding: '8px 16px', borderRadius: '6px', cursor: uploadingImg ? 'wait' : 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    {uploadingImg ? 'Subiendo...' : 'Subir Imagen / GIF'}
                  </label>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label style={{ color: 'var(--color_principal_uno)' }}>Nombre</label>
              <input type="text" value={formInfo.nombre} onChange={(e) => setFormInfo({...formInfo, nombre: e.target.value})} placeholder="Tu nombre" />
            </div>
            <div className="form-group">
              <label style={{ color: 'var(--color_principal_uno)' }}>Nombre de usuario</label>
              <input type="text" value={formInfo.username} onChange={(e) => setFormInfo({...formInfo, username: e.target.value})} placeholder="Username" />
            </div>

            {/* CHECKBOX DE CONTRASEÑA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
              <input 
                type="checkbox" 
                id="changePassCheck"
                checked={changePassword} 
                onChange={(e) => {
                  setChangePassword(e.target.checked);
                  if (!e.target.checked) setPasswords({ currentPassword: '', newPassword: '' });
                }}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="changePassCheck" style={{ color: 'var(--color_principal_uno)', cursor: 'pointer', fontSize: '0.9rem' }}>
                Actualizar contraseña
              </label>
            </div>

            {/* CAMPOS DE CONTRASEÑA CONDICIONALES */}
            {changePassword && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid var(--color_principal_tres)' }}>
                <div className="form-group">
                  <label style={{ color: 'var(--color_principal_uno)' }}>Contraseña Actual</label>
                  <input 
                    type="password" 
                    value={passwords.currentPassword} 
                    onChange={(e) => setPasswords({...passwords, currentPassword: e.target.value})} 
                    placeholder="Tu contraseña actual" 
                  />
                </div>
                <div className="form-group">
                  <label style={{ color: 'var(--color_principal_uno)' }}>Nueva Contraseña</label>
                  <input 
                    type="password" 
                    value={passwords.newPassword} 
                    onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})} 
                    placeholder="Mínimo 6 caracteres" 
                  />
                </div>
              </div>
            )}
            
            <button type="submit" className="btn-login" style={{ marginTop: '10px', opacity: user.klee_coins < 3 || uploadingImg ? 0.5 : 1 }} disabled={loadingInfo || user.klee_coins < 3 || uploadingImg}>
              {loadingInfo ? 'Guardando...' : 'Guardar Cambios (Costo: 3 🪙)'}
            </button>
          </form>
        </section>

        {/* SECCIÓN 2: Rol */}
        {user.role !== 'dual' && (
          <section style={{ background: 'var(--color_principal_cinco)', padding: '24px', borderRadius: '12px', border: '1px solid #263041' }}>
            <h2 style={{ color: 'var(--color_principal_tres)', fontSize: '1.2rem', marginBottom: '16px' }}>Actualizar a Rol Dual</h2>
            <p style={{ color: '#9aa3af', fontSize: '0.9rem', marginBottom: '20px' }}>
              Conviértete en Dual para leer y crear historias con la misma cuenta. Cuesta 3 Klee Coins.
            </p>

            {msgRole.text && (
              <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '6px', color: msgRole.type === 'error' ? '#ef4444' : '#10b981', background: msgRole.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)' }}>
                {msgRole.text}
              </div>
            )}

            <form onSubmit={handleRoleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label style={{ color: 'var(--color_principal_uno)' }}>Confirma tu Correo</label>
                <input type="email" value={formRole.email} onChange={(e) => setFormRole({...formRole, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label style={{ color: 'var(--color_principal_uno)' }}>Confirma tu Contraseña</label>
                <input type="password" value={formRole.password} onChange={(e) => setFormRole({...formRole, password: e.target.value})} required />
              </div>
              
              <button type="submit" style={{ padding: '12px', background: 'var(--color_principal_tres)', color: 'var(--color_principal_cuatro)', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', opacity: user.klee_coins < 3 ? 0.5 : 1 }} disabled={loadingRole || user.klee_coins < 3}>
                {loadingRole ? 'Actualizando...' : 'Actualizar Rol (Costo: 3 🪙)'}
              </button>
            </form>
          </section>
        )}

        <DashboardFooter />
      </main>
    </div>
  );
};

export default Settings;