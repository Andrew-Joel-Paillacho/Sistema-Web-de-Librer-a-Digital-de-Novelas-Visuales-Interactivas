import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/DashboardHeader';
import WelcomeBanner from '../components/WelcomeBanner';
import StoryCard from '../components/StoryCard';
import StarRating from '../components/StarRating';
import FilterPanel from '../components/FilterPanel'; 
import DashboardFooter from '../components/DashboardFooter';
import { getDashboardHome } from './api/readers';
import { GENRES } from '../utils/genres';
import '../styles/Dashboard.css';
import '../styles/DashboardHome.css';

const ArrowRight = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

/* -------- subsecciones internas del home -------- */

const Top5List = ({ items }) => (
  <section className="section-box">
    <h3 className="section-title">Top 5 Más Leídas</h3>
    <p className="section-sub">
      ESTA SEMANA <span className="dot-sep">·</span> EN LA COMUNIDAD
    </p>
    {items.length === 0 ? (
      <p className="empty-msg">Aún no hay historias publicadas.</p>
    ) : (
      <div className="top5-list">
        {items.map((n, i) => (
          <Link key={n.id} to={`/dashboard/leer/${n.id}`} state={{ from: 'reader' }} className="top5-item">
            <span className="top5-number">{i + 1}</span>
            <div className="top5-info">
              <h4 className="top5-title">{n.title}</h4>
              <div className="top5-rating">
                <StarRating rating={n.rating} />
                <span className="top5-rating-num">{(n.rating || 0).toFixed(1)}</span>
              </div>
              <span className="top5-views">{n.views || 0} visitas</span>
            </div>
            <div className="top5-cover" style={{
              backgroundImage: n.cover_url ? `url(${n.cover_url})` : 'none',
            }}>
              {!n.cover_url && <span>Sin portada</span>}
            </div>
          </Link>
        ))}
      </div>
    )}
  </section>
);

const StoriesCorner = ({ stats }) => (
  <section className="stories-corner">
    <h3 className="section-title">Tu rincón de historias</h3>
    <div className="corner-stats">
      <div className="corner-stat">
        <span className="corner-stat-num">{stats.guardadas}</span>
        <span className="corner-stat-label">Guardadas</span>
      </div>
      <div className="corner-stat">
        <span className="corner-stat-num">{stats.terminadas}</span>
        <span className="corner-stat-label">Terminadas</span>
      </div>
    </div>

    <Link to="/dashboard/biblioteca" className="corner-link">
      Ir a la Biblioteca <ArrowRight />
    </Link>

    <div className="corner-block">
      <h4 className="corner-section-title">Géneros</h4>
      <p className="corner-sub">Encuentra tu próximo universo</p>
      <div className="corner-genres">
        {GENRES.map((g) => (
          <Link
            key={g.slug}
            to={`/dashboard/biblioteca?genre=${g.slug}`}
            className="genre-tag"
          >
            {g.label}
          </Link>
        ))}
      </div>
    </div>

    <div className="corner-block corner-block-create">
      <p className="corner-tagline">Tu voz, tu universo</p>
      <h4 className="corner-create-title">La próxima historia puede ser tuya</h4>
      <p className="corner-sub">Dale vida a tus mundos y compártelas con todos</p>
      <Link to="/dashboard/crear" className="corner-create-btn">
        Crear historia
      </Link>
    </div>
  </section>
);

const ContinueReadingBox = ({ data }) => (
  <section className="continue-box">
    <div className="continue-head">
      <h3 className="continue-title">Continúa tu viaje</h3>
      <p className="continue-sub">Retoma justo donde lo dejaste</p>
    </div>

    {!data ? (
      <div className="continue-empty">
        <p className="continue-empty-title">Aún no has empezado tu viaje</p>
        <p className="continue-empty-sub">Explora historias y empieza una nueva aventura</p>
        <Link to="/dashboard/biblioteca" className="continue-btn">
          Explorar historias <ArrowRight />
        </Link>
      </div>
    ) : (
      <div className="continue-card">
        <div className="continue-cover" style={{
          backgroundImage: data.cover_url ? `url(${data.cover_url})` : 'none',
        }}>
          {!data.cover_url && <span>Sin portada</span>}
        </div>
        <div className="continue-info">
          <h4 className="continue-story-title">{data.title}</h4>
          <p className="continue-chapter">
            {[data.clover_title, data.petal_title].filter(Boolean).join(' · ') || 'Inicio'}
          </p>
          <div className="continue-progress-wrap">
            <div className="continue-progress-bar">
              <div className="continue-progress-fill" style={{ width: `${data.progress_percent}%` }} />
            </div>
            <span className="continue-progress-label">{data.progress_percent}%</span>
          </div>
        </div>
        <Link to={`/dashboard/leer/${data.novel_id}`} className="continue-btn">
          Seguir leyendo <ArrowRight />
        </Link>
      </div>
    )}
  </section>
);

const RecommendedSection = ({ items }) => (
  <section className="reco-box">
    <h3 className="section-title">Recomendados para ti</h3>
    <p className="section-sub">Historias que podrían atraparte</p>
    {items.length === 0 ? (
      <p className="empty-msg">Aún no hay historias recomendadas.</p>
    ) : (
      <div className="story-cards-grid">
        {items.map((n) => <StoryCard key={n.id} novel={n} />)}
      </div>
    )}
  </section>
);

const NewWeeklySection = ({ items }) => (
  <section className="reco-box">
    <h3 className="section-title">Nuevos descubrimientos</h3>
    <p className="section-sub">Nuevas voces, otros mundos por descubrir</p>
    {items.length === 0 ? (
      <p className="empty-msg">Aún no hay novedades esta semana.</p>
    ) : (
      <div className="story-cards-grid">
        {items.map((n) => <StoryCard key={n.id} novel={n} isNew />)}
      </div>
    )}
  </section>
);


/* -------- página principal -------- */

const Dashboard = () => {
  const [user, setUser] = useState({ nombre: '', email: '', username: '' });
  const [home, setHome] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false); // Estado para el modal
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getDashboardHome();
        if (!cancelled) setHome(data);
      } catch (e) {
        console.error('Dashboard home:', e);
        if (!cancelled) {
          setHome({
            top5: [], libraryStats: { guardadas: 0, terminadas: 0 },
            continueReading: null, recommended: [], newWeekly: [],
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleFilterApply = ({ genre, date }) => {
    const params = new URLSearchParams();
    if (genre) params.set('genre', genre);
    if (date) params.set('date', date);
    const qs = params.toString();
    navigate(`/dashboard/biblioteca${qs ? `?${qs}` : ''}`);
  };

  const handleSearch = (term) =>
    navigate(`/dashboard/biblioteca${term ? `?q=${encodeURIComponent(term)}` : ''}`);

  const stats = home?.libraryStats || { guardadas: 0, terminadas: 0 };

  return (
    <div className="dashboard-container">
      <DashboardHeader 
        onSearch={handleSearch} 
        onFilter={() => setFilterOpen(true)} 
      />

      <main className="dashboard-home">
        <WelcomeBanner username={user.username || user.nombre || 'lector'} />

        <div className="home-body">
          <aside className="home-left">
            <Top5List items={home?.top5 || []} />
            <StoriesCorner stats={stats} />
          </aside>

          <div className="home-right">
            <ContinueReadingBox data={loading ? null : home?.continueReading} />
            <RecommendedSection items={home?.recommended || []} />
            <NewWeeklySection items={home?.newWeekly || []} />
          </div>
        </div>

        <DashboardFooter />
      </main>

      {/* Corregido: open en minúscula y current vacío */}
      <FilterPanel 
        open={filterOpen} 
        onClose={() => setFilterOpen(false)} 
        current={{}} 
        onApply={handleFilterApply} 
      />
    </div>
  );
};

export default Dashboard;