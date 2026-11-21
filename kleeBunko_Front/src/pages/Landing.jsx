import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Landing.css";
import "../styles/DashboardHome.css";
import logo from "../assets/logo_kleeBunko.png";
import StoryCard from "../components/StoryCard";
import { genreLabel } from "../utils/genres";
import { getTopByRating, getTopByViews } from "../pages/api/public";

const Landing = () => {
  const [heroStories, setHeroStories] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(true);

  useEffect(() => {
    getTopByRating(3)
      .then(setHeroStories)
      .catch((e) => console.error('hero stories', e));

    getTopByViews(8)
      .then(setRecommendations)
      .catch((e) => console.error('recommendations', e))
      .finally(() => setLoadingRecs(false));
  }, []);

  useEffect(() => {
    if (heroStories.length < 2) return;
    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroStories.length);
    }, 6000);
    return () => clearInterval(t);
  }, [heroStories.length]);

  const currentHero = heroStories[heroIndex] || heroStories[0];

  return (
    <div className="landing-container">
      {/* ===== HEADER ===== */}
      <header className="landing-header">
        <div className="landing-header-left">
          <img src={logo} alt="Logo KleeBunko" className="landing-logo" />
          <h1 className="landing-title">
            <span className="title-word-one">Klee</span>{" "}
            <span className="title-word-two">Bunko</span>
          </h1>
        </div>

        <nav className="landing-nav">
          <a href="#inicio" className="nav-link active">Inicio</a>
          <a href="#servicios" className="nav-link">Servicios</a>
          <a href="#planes" className="nav-link">Planes</a>
          <a href="#ayuda" className="nav-link">Ayuda</a>
        </nav>

        <div className="landing-header-right">
          <Link to="/login" className="btn-nav btn-nav-turquesa">
            Iniciar sesión
          </Link>
          <Link to="/register" className="btn-nav btn-nav-rojo">
            Registrarse
          </Link>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="landing-hero">
        <div className="hero-left">
          <div className="hero-tagline">
            <span className="tagline-line"></span>
            <span className="tagline-text">Historias que dejan huella</span>
          </div>

          <h2 className="hero-title">
            Descubre novelas gráficas inmersivas
          </h2>

          <p className="hero-description">
            Sube tus historias visuales con imágenes estáticas o animadas.
            Incluye narración para accesibilidad.
          </p>

          <div className="hero-buttons">
            <button className="btn-hero btn-hero-rojo">
              Explorar historias
            </button>
            <Link to="/register" className="btn-hero btn-hero-outline">
              Crear cuenta
            </Link>
          </div>
        </div>


        <div className="hero-right">
          {currentHero && (
            <div className="hero-showcase">
              
              {/* 1. Capa de fondo dinámica */}
              <div 
                className="hero-showcase-bg"
                style={{ 
                  backgroundImage: currentHero.cover_url ? `url(${currentHero.cover_url})` : 'none' 
                }}
              />

              {/* 2. Contenido por encima del fondo */}
              <div className="hero-showcase-content">
                <span className="hero-showcase-genre">
                  {genreLabel(currentHero.genre)}
                </span>
                <h2 className="hero-showcase-title">{currentHero.title}</h2>
                <p className="hero-showcase-synopsis">
                  {currentHero.synopsis || 'Una nueva historia te espera…'}
                </p>

                <div className="hero-showcase-covers">
                  {heroStories.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`hero-cover-thumb ${i === heroIndex ? 'active' : ''}`}
                      onClick={() => setHeroIndex(i)}
                      aria-label={`Ver ${s.title}`}
                    >
                      <div
                        className="hero-cover-img"
                        style={{
                          backgroundImage: s.cover_url ? `url(${s.cover_url})` : 'none',
                        }}
                      >
                        {!s.cover_url && (
                          <span className="hero-cover-empty">Sin portada</span>
                        )}
                      </div>
                      <span className="hero-cover-title">{s.title}</span>
                      <span className="hero-cover-genre">{genreLabel(s.genre)}</span>
                    </button>
                  ))}
                </div>
              </div>
              
            </div>
          )}
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="landing-features">
        <div className="feature-card">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
          <div className="feature-text">
            <p className="feature-line-one">Multimedia completa</p>
            <p className="feature-line-two">Sube gifs, imágenes o ilustraciones.</p>
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="3"></circle>
              <path d="M12 8v6"></path>
              <path d="M8 22l2-6h4l2 6"></path>
              <circle cx="12" cy="17" r="4"></circle>
            </svg>
          </div>
          <div className="feature-text">
            <p className="feature-line-one">Narración inclusiva</p>
            <p className="feature-line-two">Para usuarios con discapacidad visual.</p>
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className="feature-text">
            <p className="feature-line-one">Comunidad global</p>
            <p className="feature-line-two">Conecta con creadores y lectores.</p>
          </div>
        </div>
      </section>

      {/* ===== RECOMENDACIONES ===== */}
      <section className="landing-recommendations">
        <p className="recommendations-tagline">El siguiente mundo te espera</p>
        <h3 className="recommendations-title">Recomendaciones del mes</h3>

        {loadingRecs ? (
          <p className="landing-empty">Cargando historias…</p>
        ) : recommendations.length === 0 ? (
          <p className="landing-empty">Aún no hay historias publicadas.</p>
        ) : (
          <div className="landing-recommendations-grid">
            {recommendations.map((n) => (
              <StoryCard key={n.id} novel={n} />
            ))}
          </div>
        )}
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="landing-footer">
        <div className="footer-columns">
          <a href="#acerca" className="footer-link">Acerca de</a>
          <a href="#contacto" className="footer-link">Contacto</a>
          <a href="#terminos" className="footer-link">Términos</a>
          <a href="#recursos" className="footer-link">Recursos</a>
        </div>

        <div className="footer-divider"></div>

        <div className="footer-bottom">
          <p className="footer-copyright">© 2026 KleeBunko</p>

          <div className="footer-socials">
            <a href="#" className="social-icon" aria-label="Twitter">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23 4.9c-.8.4-1.7.6-2.6.8a4.5 4.5 0 0 0 2-2.5c-.9.5-1.9.9-2.9 1.1a4.5 4.5 0 0 0-7.7 4.1A12.8 12.8 0 0 1 2.5 3.7a4.5 4.5 0 0 0 1.4 6 4.4 4.4 0 0 1-2-.6v.1a4.5 4.5 0 0 0 3.6 4.4 4.5 4.5 0 0 1-2 .1 4.5 4.5 0 0 0 4.2 3.1A9 9 0 0 1 1 18.6a12.7 12.7 0 0 0 6.9 2c8.3 0 12.8-6.9 12.8-12.8v-.6A9.2 9.2 0 0 0 23 4.9z"/>
              </svg>
            </a>
            <a href="#" className="social-icon" aria-label="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a href="#" className="social-icon" aria-label="Facebook">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;