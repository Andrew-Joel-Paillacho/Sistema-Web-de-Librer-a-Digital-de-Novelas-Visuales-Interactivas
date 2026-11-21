import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardHeader from '../components/DashboardHeader';
import WelcomeBanner from '../components/WelcomeBanner';
import StoryCard from '../components/StoryCard';
import FilterPanel from '../components/FilterPanel'; 
import DashboardFooter from '../components/DashboardFooter';
import { getLibrary } from './api/readers';
import { GENRES, SORT_OPTIONS } from '../utils/genres';
import '../styles/Dashboard.css';
import '../styles/DashboardHome.css';
import '../styles/Library.css';

const Library = () => {
  const [params, setParams] = useSearchParams();
  const [user, setUser] = useState({ username: '', nombre: '' });
  const [data, setData] = useState({
    novels: [], total: 0, page: 1, totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  
  // Estado para el panel de filtros
  const [filterOpen, setFilterOpen] = useState(false);

  const genre = params.get('genre') || '';
  const sort = params.get('sort') || 'name';
  const q = params.get('q') || '';
  const date = params.get('date') || ''; // <-- Añadimos la fecha
  const page = parseInt(params.get('page') || '1', 10);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await getLibrary({ genre, sort, q, date, page });
        if (!cancelled) setData(res);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setData({ novels: [], total: 0, page: 1, totalPages: 1 });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [genre, sort, q, date, page]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const handleSearch = (term) => updateParam('q', term);
  
  // Función al aplicar el filtro desde el panel
  const handleFilterApply = ({ genre: g, date: d }) => {
    const next = new URLSearchParams(params);
    if (g) next.set('genre', g); else next.delete('genre');
    if (d) next.set('date', d); else next.delete('date');
    next.delete('page');
    setParams(next);
  };

  const activeFilterCount = (genre ? 1 : 0) + (date ? 1 : 0);

  const goToPage = (p) => updateParam('page', String(p));

  const pageNumbers = [];
  const maxBtns = 5;
  let start = Math.max(1, page - 2);
  let end = Math.min(data.totalPages, start + maxBtns - 1);
  start = Math.max(1, end - maxBtns + 1);
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  return (
    <div className="dashboard-container">
      <DashboardHeader
        onSearch={handleSearch}
        onFilter={() => setFilterOpen(true)} // <-- Aquí abrimos el panel
        searchValue={q}
        hasActiveFilters={activeFilterCount > 0}
        activeFilterCount={activeFilterCount}
      />

      <main className="dashboard-home">
        <WelcomeBanner username={user.username || user.nombre || 'lector'} />

        <section className="library-section">
          <div className="library-header">
            <div>
              <h2 className="library-title">Biblioteca</h2>
              <p className="library-sub">
                Miles de universos esperan por ti. Encuentra tu próxima gran historia.
              </p>
            </div>
            <div className="library-controls">
              <label className="library-sort-label">Ordenar</label>
              <select
                className="library-sort"
                value={sort}
                onChange={(e) => updateParam('sort', e.target.value)}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="library-genres">
            <button
              className={`library-genre-btn ${!genre ? 'active' : ''}`}
              onClick={() => updateParam('genre', '')}
            >
              Todos
            </button>
            {GENRES.map((g) => (
              <button
                key={g.slug}
                className={`library-genre-btn ${genre === g.slug ? 'active' : ''}`}
                onClick={() => updateParam('genre', g.slug)}
              >
                {g.label}
              </button>
            ))}
          </div>

          {(q || date) && (
            <p className="library-result-hint">
              {q && <>Resultados para <strong>"{q}"</strong> </>}
              {date && <span> | Fecha: <strong>{date === 'today' ? 'Hoy' : date === 'week' ? 'Esta semana' : 'Este mes'}</strong></span>}
              <button className="library-clear" onClick={() => { updateParam('q', ''); updateParam('date', ''); }}>
                Limpiar
              </button>
            </p>
          )}

          {loading ? (
            <p className="empty-msg">Cargando historias…</p>
          ) : data.novels.length === 0 ? (
            <p className="empty-msg">No encontramos historias con esos filtros.</p>
          ) : (
            <>
              <div className="library-cards-grid">
                {data.novels.map((n) => (
                  <StoryCard key={n.id} novel={n} />
                ))}
              </div>

              <div className="library-pagination">
                <button
                  className="lib-page-btn"
                  disabled={page <= 1}
                  onClick={() => goToPage(page - 1)}
                >
                  ← Anterior
                </button>
                {pageNumbers.map((p) => (
                  <button
                    key={p}
                    className={`lib-page-btn ${p === page ? 'active' : ''}`}
                    onClick={() => goToPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="lib-page-btn"
                  disabled={page >= data.totalPages}
                  onClick={() => goToPage(page + 1)}
                >
                  Siguiente →
                </button>
              </div>

              <p className="library-total">
                {data.total} {data.total === 1 ? 'historia' : 'historias'} encontradas
              </p>
            </>
          )}
        </section>
        <DashboardFooter />
      </main>

      {/* Panel de filtros montado al final */}
      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        current={{ genre, date }}
        onApply={handleFilterApply}
      />
    </div>
  );
};

export default Library;