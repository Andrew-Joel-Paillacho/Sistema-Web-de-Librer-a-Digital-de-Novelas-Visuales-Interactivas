import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMyNovels, deleteNovel } from '../api/novels';
import CreateStoryModal from '../Creator/CreateStoryModal';
import { useCreatorNav } from '../../context/CreatorNavContext';
import '../../styles/MyStories.css';

const MyStories = () => {
  const [novels, setNovels] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Contexto
  const { registerOpenCreateModal } = useCreatorNav();

  // Registramos la función en el contexto al montar
  useEffect(() => {
    registerOpenCreateModal(() => setModalOpen(true));
  }, [registerOpenCreateModal]);

  const load = async () => {
    setLoading(true);
    try {
      setNovels(await listMyNovels());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const drafts = novels.filter((n) => n.status === 'draft');
  const published = novels.filter((n) => n.status === 'published');

  const handleCreate = (type) => {
    if (type === 'linear') navigate('/dashboard/crear/editor');
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta historia?')) return;
    await deleteNovel(id);
    load();
  };

  const goToDetails = (id) =>
    navigate(`/dashboard/leer/${id}`, { state: { from: 'creator' } });


  const Card = ({ n }) => (
    <div className="story-card">
      <div
        className="story-cover"
        style={{ backgroundImage: n.cover_url ? `url(${n.cover_url})` : 'none' }}
      >
        {!n.cover_url && <span>Sin portada</span>}
      </div>
      <div className="story-info">
        <h3>{n.title || 'Sin título'}</h3>
        <p className="story-genre">{n.genre || 'Sin género'}</p>
        <div className="story-actions">
          <button onClick={() => goToDetails(n.id)}>
            Ver detalles
          </button>
          <button onClick={() => navigate(`/dashboard/crear/editor/${n.id}`)}>
            Editar
          </button>
          <button className="danger" onClick={() => handleDelete(n.id)}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="my-stories">
      <div className="my-stories-header">
        <h2>Mis Historias</h2>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          + Nueva historia
        </button>
      </div>

      {loading && <p>Cargando...</p>}

      <section>
        <h3>Borradores ({drafts.length})</h3>
        <div className="stories-grid">
          {drafts.map((n) => <Card key={n.id} n={n} />)}
        </div>
      </section>

      <section>
        <h3>Publicadas ({published.length})</h3>
        <div className="stories-grid">
          {published.map((n) => <Card key={n.id} n={n} />)}
        </div>
      </section>

      <CreateStoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
};

export default MyStories;