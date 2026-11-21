import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FilterPanel from '../../components/FilterPanel';
import { getLibrary } from '../api/readers';
import { GENRES, SORT_OPTIONS, genreLabel } from '../../utils/genres';
import AdminNovelDetail from './AdminNovelDetail';
import '../../styles/Library.css';

const AdminCatalog = () => {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ novels: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  const [selectedNovelId, setSelectedNovelId] = useState(null);

  const genre = params.get('genre') || '';
  const sort = params.get('sort') || 'name';
  const q = params.get('q') || '';
  const date = params.get('date') || '';
  const page = parseInt(params.get('page') || '1', 10);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await getLibrary({ genre, sort, q, date, page });
        if (!cancelled) setData(res);
      } catch (e) {
        console.error(e);
        if (!cancelled) setData({ novels: [], total: 0, page: 1, totalPages: 1 });
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

  if (selectedNovelId) {
    return (
      <AdminNovelDetail 
        novelId={selectedNovelId} 
        onBack={() => setSelectedNovelId(null)} 
      />
    );
  }

  return (
    <div className="admin-tab-content">
      <div className="library-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 className="admin-tab-title">Catálogo de Historias</h2>
        </div>
        
        <div className="library-controls" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Buscador adaptado al tema del admin */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Buscar historia..."
              value={q}
              onChange={(e) => updateParam('q', e.target.value)}
              style={{ 
                width: '250px', padding: '10px 16px 10px 40px', 
                background: 'var(--color_principal_cinco)', 
                border: '1px solid #1f2937', 
                borderRadius: '8px', 
                color: 'var(--color_principal_uno)',
                outline: 'none'
              }}
            />
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9aa3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <button 
            className={`filter-btn ${activeFilterCount > 0 ? 'active' : ''}`}
            onClick={() => setFilterOpen(true)}
            style={{ padding: '10px', borderRadius: '8px', background: 'var(--color_principal_cinco)', border: '1px solid #1f2937', color: 'var(--color_principal_uno)', cursor: 'pointer' }}
          >
            Filtros {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>

          <select
            className="library-sort"
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            style={{ background: 'var(--color_principal_cinco)', color: 'var(--color_principal_uno)', border: '1px solid #1f2937', padding: '10px', borderRadius: '8px' }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="library-genres">
        <button className={`library-genre-btn ${!genre ? 'active' : ''}`} onClick={() => updateParam('genre', '')}>Todos</button>
        {GENRES.map((g) => (
          <button key={g.slug} className={`library-genre-btn ${genre === g.slug ? 'active' : ''}`} onClick={() => updateParam('genre', g.slug)}>
            {g.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="empty-msg">Cargando catálogo…</p>
      ) : data.novels.length === 0 ? (
        <p className="empty-msg">No se encontraron historias con esos filtros.</p>
      ) : (
        <>
          <div className="library-cards-grid">
            {data.novels.map((n) => (
              /* TARJETA PERSONALIZADA: Hacemos clic para cambiar el estado */
              <div 
                key={n.id} 
                className="story-card-v" 
                style={{ cursor: 'pointer', transition: 'transform 0.2s' }} 
                onClick={() => setSelectedNovelId(n.id)} 
              >
                <div className="story-card-cover" style={{ backgroundImage: n.cover_url ? `url(${n.cover_url})` : 'none' }}>
                  {!n.cover_url && <span className="story-card-cover-empty">Sin portada</span>}
                </div>
                <h4 className="story-card-title">{n.title}</h4>
                <p className="story-card-genre">{genreLabel(n.genre)}</p>
                <div className="story-card-rating">
                  ★ {(n.rating || 0).toFixed(1)}
                </div>
              </div>
            ))}
          </div>

          <div className="library-pagination" style={{ marginTop: '30px' }}>
            <button className="lib-page-btn" disabled={page <= 1} onClick={() => goToPage(page - 1)}>← Anterior</button>
            {pageNumbers.map((p) => (
              <button key={p} className={`lib-page-btn ${p === page ? 'active' : ''}`} onClick={() => goToPage(p)}>{p}</button>
            ))}
            <button className="lib-page-btn" disabled={page >= data.totalPages} onClick={() => goToPage(page + 1)}>Siguiente →</button>
          </div>

          <p className="library-total" style={{ marginTop: '16px' }}>{data.total} {data.total === 1 ? 'historia' : 'historias'} encontradas</p>
        </>
      )}

      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        current={{ genre, date }}
        onApply={handleFilterApply}
      />
    </div>
  );
};

export default AdminCatalog;