import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  getNovelForReading, 
  saveContinueReading, 
  saveGameSlot, 
  finishNovel,
  deleteGameSlot,
  reportNovel
} from './api/readers';
import logo from '../assets/logo_kleeBunko.png';
import '../styles/VisualNovelReader.css';

const PlayIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="6 3 20 12 6 21 6 3" />
  </svg>
);

const LoadIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

const SaveIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
    <polyline points="17 21 17 13 7 13 7 21"></polyline>
    <polyline points="7 3 7 8 15 8"></polyline>
  </svg>
);

const FlagIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
    <line x1="4" y1="22" x2="4" y2="15"></line>
  </svg>
);

const ExitIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const VisualNovelReader = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pos, setPos] = useState({ c: 0, p: 0, t: 0 });
  const [initialized, setInitialized] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savesData, setSavesData] = useState({});
  const [currentPage, setCurrentPage] = useState('1');
  const [overwritePending, setOverwritePending] = useState(null);
  const [isFinished, setIsFinished] = useState(false);

  const [user, setUser] = useState({ nombre: '', email: '' });

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getNovelForReading(id);
        if (!cancelled) {
          setNovel(data);
          setSavesData(data.savesData?.saves || {});
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!novel || initialized) return;
    const params = new URLSearchParams(location.search);
    const cId = params.get('c');
    const pId = params.get('p');
    const tId = params.get('t');

    let c = 0, p = 0, t = 0;
    if (cId) {
      const ci = novel.clovers.findIndex((cl) => cl.id === cId);
      if (ci >= 0) {
        c = ci;
        if (pId) {
          const pi = novel.clovers[ci].petals.findIndex((pt) => pt.id === pId);
          if (pi >= 0) {
            p = pi;
            if (tId) {
              const ti = novel.clovers[ci].petals[pi].texts.findIndex((tx) => tx.id === tId);
              if (ti >= 0) t = ti;
            }
          }
        }
      }
    }
    setPos({ c, p, t });
    setInitialized(true);
  }, [novel, initialized, location.search]);

  const currentClover = novel?.clovers[pos.c];
  const currentPetal = currentClover?.petals[pos.p];
  const currentText = currentPetal?.texts[pos.t];

  const progressPercent = useMemo(() => {
    if (!novel) return 0;
    const totalTexts = novel.clovers.reduce((sum, cl) => sum + cl.petals.reduce((s2, pt) => s2 + pt.texts.length, 0), 0);
    if (totalTexts === 0) return 0;
    let seen = 0;
    for (let ci = 0; ci < novel.clovers.length; ci++) {
      const cl = novel.clovers[ci];
      for (let pi = 0; pi < cl.petals.length; pi++) {
        const pt = cl.petals[pi];
        if (ci === pos.c && pi === pos.p) {
          seen += pos.t;
          return Math.round(((seen + 1) / totalTexts) * 100);
        }
        seen += pt.texts.length;
      }
    }
    return 100;
  }, [novel, pos]);

  useEffect(() => {
    if (!initialized || !novel || !currentClover || !currentPetal) return;
    saveContinueReading({
      novel_id: novel.id,
      clover_id: currentClover.id,
      petal_id: currentPetal.id,
      text_id: currentText?.id || null,
      progress_percent: progressPercent,
    }).catch(() => {});
  }, [pos, initialized, novel, currentClover, currentPetal, currentText, progressPercent]);

  const handleFinishNovel = async () => {
    if (isFinished) return;
    setIsFinished(true);
    try {
      await finishNovel(novel.id);
      alert('¡Has completado la historia!');
      navigate(`/dashboard/leer/${novel.id}`, { state: location.state });
    } catch (e) {
      console.error(e);
      navigate(`/dashboard/leer/${novel.id}`, { state: location.state });
    }
  };

  const advance = () => {
    if (!novel || sidebarOpen) return;
    const cl = novel.clovers[pos.c];
    const pt = cl?.petals[pos.p];
    if (!pt) return;

    if (pos.t < pt.texts.length - 1) {
      setPos((prev) => ({ ...prev, t: prev.t + 1 }));
      return;
    }
    if (pos.p < cl.petals.length - 1) {
      setPos((prev) => ({ ...prev, p: prev.p + 1, t: 0 }));
      return;
    }
    if (pos.c < novel.clovers.length - 1) {
      setPos((prev) => ({ ...prev, c: prev.c + 1, p: 0, t: 0 }));
      return;
    }
    handleFinishNovel();
  };

  const handleLoadSlot = (saveData) => {
    let c = 0, p = 0, t = 0;
    const ci = novel.clovers.findIndex(cl => cl.id === saveData.clover_id);
    if (ci >= 0) {
      c = ci;
      const pi = novel.clovers[ci].petals.findIndex(pt => pt.id === saveData.petal_id);
      if (pi >= 0) {
        p = pi;
        if (saveData.text_id) {
          const ti = novel.clovers[ci].petals[pi].texts.findIndex(tx => tx.id === saveData.text_id);
          if (ti >= 0) t = ti;
        }
      }
    }
    setPos({ c, p, t });
    setSidebarOpen(false);
  };

  const handleSaveSlot = async (slotNum, force = false) => {
    const existing = savesData[currentPage]?.[slotNum];
    if (existing && !force) {
      setOverwritePending(slotNum);
      return;
    }
    
    // AHORA GUARDAMOS LOS TÍTULOS DEL TRÉBOL Y PÉTALO
    const payload = {
      novel_id: novel.id,
      clover_id: currentClover.id,
      petal_id: currentPetal.id,
      text_id: currentText?.id || null,
      progress_percent: progressPercent,
      title: novel.title,
      cover_url: novel.cover_url,
      clover_title: currentClover.title,
      petal_title: currentPetal.title,
    };

    try {
      const res = await saveGameSlot(currentPage, slotNum, payload);
      setSavesData(res.savesData.saves || {});
      setOverwritePending(null);
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    }
  };

  const handleDeleteSlot = async (slotNum) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta partida guardada?')) return;
    try {
      const res = await deleteGameSlot(currentPage, slotNum);
      setSavesData(res.savesData.saves || {});
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const handleReportText = async () => {
    const reason = window.prompt('¿Por qué reportas este texto? (Obligatorio)');
    if (reason === null) return;
    if (reason.trim() === '') return alert('Debes escribir un motivo para reportar.');
    
    try {
      await reportNovel({
        novel_id: novel.id,
        text_position: { c: pos.c, p: pos.p, t: pos.t }, // Guardamos la posición exacta
        reason: reason.trim()
      });
      alert('Texto reportado con éxito.');
    } catch (err) {
      alert('Error al reportar: ' + err.message);
    }
  };

  const sceneCharacters = useMemo(() => {
    if (!currentText || !novel) return [];
    return (currentText.characters || []).map((c) => {
      const char = novel.characters.find((ch) => ch.id === c.id);
      if (!char) return null;
      let mood = null;
      if (c.moodId) mood = char.moods.find((m) => m.id === c.moodId);
      if (!mood) mood = char.moods.find((m) => ['neutro', 'neutral'].includes((m.name || '').toLowerCase())) || char.moods[0];
      return { id: c.id, name: c.name, imageUrl: mood?.imageUrl || null };
    }).filter(Boolean);
  }, [currentText, novel]);

  const speakerLabel = sceneCharacters.map((c) => c.name).join(' & ');
  const sceneUrl = currentPetal?.image?.url || null;
  const charsClass = sceneCharacters.length > 0 ? `vn-characters vn-characters--${sceneCharacters.length}` : 'vn-characters';

  if (loading) return <div className="vn-loader">Cargando historia…</div>;
  if (error || !novel) return <div className="vn-error"><p>{error || 'Historia no encontrada'}</p><button className="vn-btn-back" onClick={() => navigate('/dashboard/biblioteca')}>Volver</button></div>;
  if (!novel.clovers.length) return <div className="vn-error"><p>Esta historia aún no tiene capítulos.</p><button className="vn-btn-back" onClick={() => navigate('/dashboard/biblioteca')}>Volver</button></div>;

  return (
    <div className="vn-reader" onClick={advance}>
      <div className="vn-scene" style={{ backgroundImage: sceneUrl ? `url(${sceneUrl})` : 'none', backgroundColor: sceneUrl ? 'transparent' : '#1a1a2e' }} />

      <header className="vn-header" onClick={(e) => e.stopPropagation()}>
        <div className="vn-brand">
          <img src={logo} alt="KleeBunko" className="vn-logo" />
          <span className="vn-brand-name">
            <span className="vn-brand-klee">Klee</span><span className="vn-brand-bunko">Bunko</span>
          </span>
        </div>
        <button
          className="vn-play"
          onClick={(e) => { e.stopPropagation(); setSidebarOpen(!sidebarOpen); }}
          aria-label="Menú de guardado"
        >
          <PlayIcon />
        </button>
      </header> 

      {sceneCharacters.length > 0 && (
        <div className={charsClass}>
          {sceneCharacters.map((c, i) => (
            <div key={`${c.id}-${i}`} className="vn-character">
              {c.imageUrl ? <img src={c.imageUrl} alt={c.name} className="vn-character-img" /> : <div className="vn-character-placeholder">{(c.name || '?').charAt(0).toUpperCase()}</div>}
            </div>
          ))}
        </div>
      )}

      <div className={`vn-text-container ${speakerLabel ? 'has-name' : ''}`}>
        {speakerLabel && <div className="vn-name-box">{speakerLabel}</div>}
        <div className="vn-text-box">
          <p className="vn-text">{currentText?.text || '…'}</p>
          {!sidebarOpen && <span className="vn-hint">Click para continuar ▸</span>}
        </div>
      </div>

      {/* ================= BARRA LATERAL ================= */}
      <div className={`vn-sidebar ${sidebarOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
        
        <button className="vn-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <div className="vn-user-profile">
          <div className="vn-user-avatar">
            {(user.nombre || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="vn-user-info">
            <span className="vn-user-name">{user.nombre || 'Usuario'}</span>
            <span className="vn-user-email">{user.email || 'correo@ejemplo.com'}</span>
          </div>
        </div>

        {/* Botones de utilidad en la barra lateral */}
        <div style={{ padding: '0 20px 10px', display: 'flex', flexDirection: 'row', gap: '8px' }}>
          
          <button 
            onClick={handleReportText}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'transparent', border: '1px solid rgba(215, 38, 61, 0.4)', color: '#D7263D', padding: '8px 0', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
          >
            <FlagIcon size={14} /> Reportar
          </button>

          <button 
            onClick={() => navigate(`/dashboard/leer/${novel.id}`, { state: location.state })}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'transparent', border: '1px solid #374151', color: '#9ca3af', padding: '8px 0', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
          >
            <ExitIcon size={14} /> Salir
          </button>

        </div>

        <div className="vn-sidebar-header">
          <h2>{novel.title}</h2>
          <span className="vn-progress-text">Progreso: {progressPercent}%</span>
          <div className="vn-progress-container">
            <div className="vn-progress-bar" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        <div className="vn-saves-tabs">
          {['1', '2', '3', 'A', 'B', 'C', 'D', 'E', 'F'].map(tab => (
            <button key={tab} className={currentPage === tab ? 'active' : ''} onClick={() => setCurrentPage(tab)}>
              {tab}
            </button>
          ))}
        </div>

        <div className="vn-saves-grid">
          {Array.from({ length: 10 }).map((_, i) => {
            const slotNum = (i + 1).toString();
            const save = savesData[currentPage]?.[slotNum];
            return (
              <div key={i} className="vn-save-slot">
                
                {save ? (
                  <>
                    {/* Imagen de fondo y degradado */}
                    <div className="vn-slot-bg" style={{ backgroundImage: save.cover_url ? `url(${save.cover_url})` : 'none' }} />
                    <div className="vn-slot-overlay" />

                    <span className="vn-slot-num">{slotNum}</span>
                    
                    <button className="vn-slot-delete" onClick={() => handleDeleteSlot(slotNum)} title="Eliminar partida">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>

                    <div className="vn-slot-info">
                      <div className="vn-slot-text">
                        <span className="vn-slot-chapter">
                          {save.clover_title || 'Trébol'} <br/>
                          <span className="vn-slot-petal">{save.petal_title || 'Pétalo'}</span>
                        </span>
                        <span className="vn-slot-date">{new Date(save.updated_at).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="vn-slot-actions">
                        <button type="button" onClick={() => handleLoadSlot(save)} title="Cargar Partida">
                          <LoadIcon /> Cargar
                        </button>
                        <button type="button" onClick={() => handleSaveSlot(slotNum, false)} title="Sobrescribir">
                          <SaveIcon /> Guardar
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="vn-slot-num">{slotNum}</span>
                    <button type="button" className="vn-slot-empty" onClick={() => handleSaveSlot(slotNum, true)}>
                      Guardar aquí
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL DE SOBRESCRITURA */}
      {overwritePending && (
        <div className="vn-overwrite-modal" onClick={(e) => { e.stopPropagation(); setOverwritePending(null); }}>
          <div className="vn-overwrite-content" onClick={(e) => e.stopPropagation()}>
            <h3>¿Sobrescribir ranura?</h3>
            <p>Ya hay una partida guardada en este espacio.</p>
            <div className="vn-overwrite-actions">
              <button type="button" onClick={() => setOverwritePending(null)}>Cancelar</button>
              <button type="button" className="primary" onClick={() => handleSaveSlot(overwritePending, true)}>Sobrescribir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualNovelReader;