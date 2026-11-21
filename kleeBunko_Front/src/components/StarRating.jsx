export const StarIcon = ({ filled, size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const StarRating = ({ rating = 0, size = 12 }) => {
  const r = Math.round(rating);
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} filled={i <= r} size={size} />
      ))}
    </span>
  );
};

export default StarRating;