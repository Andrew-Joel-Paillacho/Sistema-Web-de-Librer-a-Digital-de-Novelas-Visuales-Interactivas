import { Link } from 'react-router-dom';
import { StarIcon } from './StarRating';
import { genreLabel } from '../utils/genres';

const StoryCard = ({ novel, isNew }) => (
  <Link to={`/dashboard/leer/${novel.id}`} className="story-card-v">
    <div
      className="story-card-cover"
      style={{ backgroundImage: novel.cover_url ? `url(${novel.cover_url})` : 'none' }}
    >
      {!novel.cover_url && <span className="story-card-cover-empty">Sin portada</span>}
      {isNew && <span className="new-badge">Nuevo</span>}
    </div>
    <h4 className="story-card-title">{novel.title}</h4>
    <p className="story-card-genre">
      {novel.genre ? genreLabel(novel.genre) : 'Sin género'}
    </p>
    <div className="story-card-rating">
      <StarIcon filled />
      <span>{(novel.rating || 0).toFixed(1)}</span>
    </div>
  </Link>
);

export default StoryCard;