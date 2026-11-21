export const GENRES = [
  { slug: 'fantasia',         label: 'Fantasía' },
  { slug: 'romance',          label: 'Romance' },
  { slug: 'misterio',         label: 'Misterio' },
  { slug: 'accion',           label: 'Acción' },
  { slug: 'terror',           label: 'Terror' },
  { slug: 'ciencia-ficcion',  label: 'Ciencia ficción' },
  { slug: 'slice-of-life',    label: 'Slice of life' },
];

export const genreLabel = (slug) =>
  GENRES.find((g) => g.slug === slug)?.label || slug || 'Sin género';

export const SORT_OPTIONS = [
  { value: 'name',    label: 'Por nombre' },
  { value: 'created', label: 'Por fecha de creación' },
  { value: 'updated', label: 'Por fecha de actualización' },
  { value: 'rating',  label: 'Por calificación' },
];