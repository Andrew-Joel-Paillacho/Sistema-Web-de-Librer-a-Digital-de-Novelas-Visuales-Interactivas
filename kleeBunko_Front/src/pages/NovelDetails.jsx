import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/DashboardHeader';
import DashboardFooter from '../components/DashboardFooter';
import StarRating, { StarIcon } from '../components/StarRating'; 
import FilterPanel from '../components/FilterPanel';
import { 
  getNovelDetails, 
  saveContinueReading, 
  getReviewsByNovel, 
  createReview, 
  deleteReview,
  reportNovel
} from './api/readers';
import { genreLabel } from '../utils/genres';
import '../styles/Dashboard.css';
import '../styles/DashboardHome.css';
import '../styles/NovelDetails.css';

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

const NovelDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [openClovers, setOpenClovers] = useState({});

  // Estados para las reseñas
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null); // Guarda la reseña del usuario actual si existe
  const [isEditing, setIsEditing] = useState(false); // Para saber si está editando
  
  const [myRating, setMyRating] = useState(0);
  const [myReviewText, setMyReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const [data, reviewsData] = await Promise.all([
          getNovelDetails(id),
          getReviewsByNovel(id)
        ]);
        if (cancelled) return;
        
        setNovel(data);
        setReviews(reviewsData);
        
        // Buscar si el usuario ya tiene una reseña
        const userId = JSON.parse(localStorage.getItem('user'))?.id;
        const existing = reviewsData.find(r => r.user_id === userId);
        if (existing) {
          setMyReview(existing);
          setMyRating(existing.rating);
          setMyReviewText(existing.review || '');
        }

        const first = data.clovers?.[0]?.id;
        setOpenClovers(first ? { [first]: true } : {});
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const handleFilterApply = ({ genre, date }) => {
    const params = new URLSearchParams();
    if (genre) params.set('genre', genre);
    if (date) params.set('date', date);
    navigate(`/dashboard/biblioteca${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handleSearch = (term) =>
    navigate(`/dashboard/biblioteca${term ? `?q=${encodeURIComponent(term)}` : ''}`);

  const toggleClover = (cloverId) =>
    setOpenClovers((prev) => ({ ...prev, [cloverId]: !prev[cloverId] }));

  const handleReadPetal = (clover, petal) => {
    navigate(`/dashboard/leer/${novel.id}/read?c=${clover.id}&p=${petal.id}`);
  };

  const handleStartReading = () => {
    const sp = novel.savedProgress;
    if (sp?.clover_id) {
      const params = new URLSearchParams();
      params.set('c', sp.clover_id);
      if (sp.petal_id) params.set('p', sp.petal_id);
      if (sp.text_id) params.set('t', sp.text_id);
      navigate(`/dashboard/leer/${novel.id}/read?${params.toString()}`);
    } else {
      navigate(`/dashboard/leer/${novel.id}/read`);
    }
  };

  // ---- Lógica de Reseñas ----
  const recalcRating = (newReviewsList) => {
    if (newReviewsList.length === 0) return 0;
    const sum = newReviewsList.reduce((acc, r) => acc + r.rating, 0);
    return Number((sum / newReviewsList.length).toFixed(1));
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (myRating === 0) return alert('Por favor, selecciona una puntuación de estrellas.');
    
    setSubmittingReview(true);
    try {
      const savedReview = await createReview({
        novel_id: novel.id,
        rating: myRating,
        review: myReviewText.trim()
      });
      
      let updatedReviews;
      if (myReview) {
        // Estábamos editando
        updatedReviews = reviews.map(r => r.id === savedReview.id ? savedReview : r);
        setIsEditing(false);
      } else {
        // Era nueva
        updatedReviews = [savedReview, ...reviews];
      }
      
      setReviews(updatedReviews);
      setMyReview(savedReview);
      setNovel(prev => ({ ...prev, rating: recalcRating(updatedReviews) }));
      
      // Eliminamos el alert de "Reseña guardada con éxito" como pediste
    } catch (err) {
      alert('Error al guardar la reseña: ' + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar tu reseña?')) return;
    
    try {
      await deleteReview(myReview.id);
      
      const updatedReviews = reviews.filter(r => r.id !== myReview.id);
      setReviews(updatedReviews);
      setMyReview(null);
      setMyRating(0);
      setMyReviewText('');
      setNovel(prev => ({ ...prev, rating: recalcRating(updatedReviews) }));
    } catch (err) {
      alert('Error al eliminar la reseña: ' + err.message);
    }
  };

  const handleReportNovel = async () => {
    const reason = window.prompt('¿Por qué quieres reportar esta historia? (Obligatorio)');
    if (reason === null) return; // Canceló
    if (reason.trim() === '') return alert('Debes escribir un motivo para reportar.');
    
    try {
      await reportNovel({ novel_id: novel.id, reason: reason.trim() });
      alert('Gracias. Tu reporte ha sido enviado.');
    } catch (err) {
      alert('Error al reportar: ' + err.message);
    }
  };

  const handleReportReview = async (reviewId) => {
    const reason = window.prompt('¿Por qué quieres reportar esta reseña? (Obligatorio)');
    if (reason === null) return;
    if (reason.trim() === '') return alert('Debes escribir un motivo para reportar.');
    
    try {
      await reportNovel({ novel_id: novel.id, review_id: reviewId, reason: reason.trim() });
      alert('Gracias. La reseña ha sido reportada.');
    } catch (err) {
      alert('Error al reportar: ' + err.message);
    }
  };

  return (
    <div className="dashboard-container">
      <DashboardHeader onSearch={handleSearch} onFilter={() => setFilterOpen(true)} />

      <main className="dashboard-home novel-detail-main">
        {loading ? (
          <p className="empty-msg" style={{ padding: 40 }}>Cargando historia…</p>
        ) : error || !novel ? (
          <div className="novel-detail-error">
            <p>{error || 'Historia no encontrada'}</p>
            <Link to="/dashboard/biblioteca" className="novel-detail-btn">Volver a la biblioteca</Link>
          </div>
        ) : (
          <>
            {/* HEADER */}
            <section className="novel-detail-header" style={{ backgroundImage: novel.cover_url ? `url(${novel.cover_url})` : 'none' }}>
              <div className="novel-detail-header-overlay">
                <Link to="/dashboard/biblioteca" className="novel-detail-back"><ArrowLeft /> Volver a la biblioteca</Link>
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
                        {novel.savedProgress?.clover_id ? '▶ Continuar leyendo' : '▶ Ver novela'}
                      </button>

                      <button className="novel-detail-btn" onClick={handleReportNovel} style={{ marginLeft: '12px', background: 'transparent', border: '1px solid var(--color_principal_dos)', color: 'var(--color_principal_dos)' }}>
                        🚩 Reportar
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

            {/* TRÉBOLES */}
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
              <h2 className="novel-detail-section-title">Reseñas y Comentarios</h2>
              
              {/* FORMULARIO O TARJETA DE MI RESEÑA */}
              {(!myReview || isEditing) ? (
                <form className="review-form" onSubmit={handleSubmitReview}>
                  <h3>{isEditing ? 'Editar mi reseña' : 'Deja tu reseña'}</h3>
                  <div className="review-form-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`star-btn ${star <= myRating ? 'active' : ''}`}
                        onClick={() => setMyRating(star)}
                      >
                        <StarIcon filled={star <= myRating} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="review-textarea"
                    placeholder="¿Qué te pareció esta historia? (Opcional)"
                    value={myReviewText}
                    onChange={(e) => setMyReviewText(e.target.value)}
                    maxLength={500}
                    rows={3}
                  />
                  <div className="review-form-footer">
                    <span>{myReviewText.length}/500</span>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {isEditing && (
                        <button 
                          type="button" 
                          className="novel-detail-btn" 
                          onClick={() => {
                            setIsEditing(false);
                            setMyRating(myReview.rating);
                            setMyReviewText(myReview.review || '');
                          }}
                        >
                          Cancelar
                        </button>
                      )}
                      <button type="submit" className="novel-detail-btn primary" disabled={submittingReview || myRating === 0}>
                        {submittingReview ? 'Enviando…' : isEditing ? 'Guardar cambios' : 'Publicar Reseña'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="my-review-card">
                  <p className="my-review-title">Tu reseña</p>
                  <div className="review-card" style={{ border: '1px solid var(--color_principal_tres)' }}>
                    <div className="review-card-header">
                      <div className="review-avatar">{(JSON.parse(localStorage.getItem('user'))?.nombre || 'U').charAt(0).toUpperCase()}</div>
                      <div className="review-meta">
                        <strong className="review-author">{JSON.parse(localStorage.getItem('user'))?.nombre || 'Tú'}</strong>
                        <span className="review-date">{new Date(myReview.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="review-card-stars">
                        {[1, 2, 3, 4, 5].map((star) => <StarIcon key={star} filled={star <= myReview.rating} />)}
                      </div>
                    </div>
                    {myReview.review && <p className="review-body">{myReview.review}</p>}
                    
                    <div className="my-review-actions">
                      <button className="btn-edit-review" onClick={() => setIsEditing(true)}>Editar</button>
                      <button className="btn-delete-review" onClick={handleDeleteReview}>Eliminar</button>
                    </div>
                  </div>
                </div>
              )}

              {/* LISTA DE OTRAS RESEÑAS */}
              <div className="reviews-list">
                {reviews.filter(item => item.id !== myReview?.id).length === 0 && !myReview ? (
                  <p className="empty-msg" style={{ marginTop: 20 }}>Aún no hay reseñas. ¡Sé el primero en opinar!</p>
                ) : (
                  reviews
                    .filter(item => item.id !== myReview?.id) // Ocultamos la nuestra de la lista general
                    .map((r) => (
                    <div key={r.id} className="review-card">
                      <div className="review-card-header">
                        <div className="review-avatar">{(r.profile?.nombre || 'U').charAt(0).toUpperCase()}</div>
                        <div className="review-meta">
                          <strong className="review-author">{r.profile?.nombre || 'Usuario'}</strong>
                          <span className="review-date">
                            {new Date(r.created_at).toLocaleDateString()}
                            
                            {/* BOTÓN DE REPORTAR RESEÑA (AQUI ES DONDE VA) */}
                            <button 
                              onClick={() => handleReportReview(r.id)} 
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.7rem', cursor: 'pointer', marginLeft: '10px', textDecoration: 'underline' }}
                            >
                              Reportar
                            </button>
                          </span>
                        </div>
                        <div className="review-card-stars">
                          {[1, 2, 3, 4, 5].map((star) => <StarIcon key={star} filled={star <= r.rating} />)}
                        </div>
                      </div>
                      {r.review && <p className="review-body">{r.review}</p>}
                    </div>
                  ))
                )}
              </div>
            </section>

            <DashboardFooter />
          </>
        )}
      </main>

      <FilterPanel open={filterOpen} onClose={() => setFilterOpen(false)} current={{}} onApply={handleFilterApply} />
    </div>
  );
};

export default NovelDetail;