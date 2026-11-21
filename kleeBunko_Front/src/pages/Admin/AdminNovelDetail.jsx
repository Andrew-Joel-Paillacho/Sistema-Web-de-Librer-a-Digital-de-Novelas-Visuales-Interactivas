import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StarRating from '../../components/StarRating';
import { getNovelDetails, getReviewsByNovel } from '../api/readers';
import { genreLabel } from '../../utils/genres';
import '../../styles/NovelDetails.css';

const ArrowLeft = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);
const EyeIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const PlayIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
const ChevronDown = ({ size = 16, open }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const AdminNovelDetail = ({ novelId, onBack }) => {
  const navigate = useNavigate();
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openClovers, setOpenClovers] = useState({});
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const [data, reviewsData] = await Promise.all([
          getNovelDetails(novelId),
          getReviewsByNovel(novelId)
        ]);
        if (cancelled) return;
        
        setNovel(data);
        setReviews(reviewsData);

        const first = data.clovers?.[0]?.id;
        setOpenClovers(first ? { [first]: true } : {});
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [novelId]);

  const toggleClover = (cloverId) =>
    setOpenClovers((prev) => ({ ...prev, [cloverId]: !prev[cloverId] }));

  const handleReadPetal = (clover, petal) => {
    navigate(`/dashboard/leer/${novel.id}/read?c=${clover.id}&p=${petal.id}`);
  };

  const handleStartReading = () => {
    navigate(`/dashboard/leer/${novel.id}/read`);
  };

  return (
    <div className="admin-novel-detail-container">
      {loading ? (
        <p className="empty-msg" style={{ padding: 40 }}>Cargando historia…</p>
      ) : error || !novel ? (
        <div className="novel-detail-error" style={{ padding: 40 }}>
          <p>{error || 'Historia no encontrada'}</p>
          <button onClick={onBack} className="admin-btn-secondary" style={{ marginTop: 20 }}>Volver al catálogo</button>
        </div>
      ) : (
        <>
          {/* HEADER CON BOTÓN DE VOLVER INTEGRADO */}
          <section className="novel-detail-header" style={{ backgroundImage: novel.cover_url ? `url(${novel.cover_url})` : 'none' }}>
            <div className="novel-detail-header-overlay">
              
              <button 
                onClick={onBack} 
                className="novel-detail-back"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <ArrowLeft /> Volver al Catálogo
              </button>

              <div className="novel-detail-header-inner">
                <div className="novel-detail-cover">
                  {novel.cover_url ? <img src={novel.cover_url} alt={novel.title} /> : <span>Sin portada</span>}
                </div>
                <div className="novel-detail-info">
                  <span className="novel-detail-genre">{genreLabel(novel.genre)}</span>
                  <h1 className="novel-detail-title">{novel.title}</h1>
                  <div className="novel-detail-stats">
                    <div className="novel-detail-rating">
                      <StarRating rating={novel.rating} />
                      <span className="novel-detail-rating-num">{(novel.rating || 0).toFixed(1)}</span>
                    </div>
                    <span className="novel-detail-views"><EyeIcon /> {novel.views || 0} vistas</span>
                  </div>
                  <div className="novel-detail-actions">
                    <button className="novel-detail-btn primary" onClick={handleStartReading}>
                      ▶ Ver novela
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SINOPSIS */}
          <section className="novel-detail-section">
            <h2 className="novel-detail-section-title">Sinopsis</h2>
            <p className="novel-detail-synopsis">{novel.synopsis || 'Sin sinopsis disponible.'}</p>
          </section>

          {/* PERSONAJES */}
          <section className="novel-detail-section">
            <h2 className="novel-detail-section-title">Personajes</h2>
            {novel.characters.length === 0 ? (
              <p className="empty-msg">Esta historia aún no tiene personajes.</p>
            ) : (
              <div className="novel-detail-characters">
                {novel.characters.map((c) => (
                  <div key={c.id} className="novel-detail-character">
                    <div className="novel-detail-character-img">
                      {c.image_url ? <img src={c.image_url} alt={c.name} /> : <span>{(c.name || '?').charAt(0).toUpperCase()}</span>}
                    </div>
                    <span className="novel-detail-character-name">{c.name}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* TRÉBOLES Y PÉTALOS */}
          <section className="novel-detail-section">
            <h2 className="novel-detail-section-title">Tréboles</h2>
            {novel.clovers.length === 0 ? (
              <p className="empty-msg">Esta historia aún no tiene capítulos.</p>
            ) : (
              <div className="novel-detail-clovers">
                {novel.clovers.map((clover, idx) => {
                  const isOpen = !!openClovers[clover.id];
                  return (
                    <div key={clover.id} className="novel-detail-clover">
                      <button className="novel-detail-clover-header" onClick={() => toggleClover(clover.id)} type="button">
                        <span className="novel-detail-clover-num">{idx + 1}</span>
                        <span className="novel-detail-clover-title">{clover.title}</span>
                        <ChevronDown open={isOpen} />
                      </button>
                      {isOpen && (
                        <div className="novel-detail-petals">
                          {clover.petals.map((petal, pIdx) => (
                            <button key={petal.id} className="novel-detail-petal" onClick={() => handleReadPetal(clover, petal)} type="button">
                              <span className="novel-detail-petal-num">{pIdx + 1}</span>
                              <div className="novel-detail-petal-thumb">
                                {petal.thumbnail ? <img src={petal.thumbnail} alt={petal.title} loading="lazy" /> : <span>{(petal.title || '?').charAt(0).toUpperCase()}</span>}
                              </div>
                              <span className="novel-detail-petal-title">{petal.title}</span>
                              {petal.textCount > 0 && <span className="novel-detail-petal-count">{petal.textCount} texto{petal.textCount === 1 ? '' : 's'}</span>}
                              <PlayIcon />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* RESEÑAS */}
          <section className="novel-detail-section novel-reviews-section">
            <h2 className="novel-detail-section-title">Reseñas de la comunidad</h2>
            <div className="reviews-list">
              {reviews.length === 0 ? (
                <p className="empty-msg" style={{ marginTop: 20 }}>Aún no hay reseñas en esta historia.</p>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="review-card">
                    <div className="review-card-header">
                      <div className="review-avatar">{(r.profile?.nombre || 'U').charAt(0).toUpperCase()}</div>
                      <div className="review-meta">
                        <strong className="review-author">{r.profile?.nombre || 'Usuario'}</strong>
                        <span className="review-date">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="review-card-stars">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg key={star} width="14" height="14" viewBox="0 0 24 24" fill={star <= r.rating ? "var(--color_principal_tres)" : "none"} stroke="var(--color_principal_tres)" strokeWidth="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    {r.review && <p className="review-body">{r.review}</p>}
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default AdminNovelDetail;