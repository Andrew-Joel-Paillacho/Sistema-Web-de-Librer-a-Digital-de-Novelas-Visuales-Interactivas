import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Login.css";
import logo from "../assets/logo_kleeBunko.png";
import { loginUser } from "./api/auth";
import { getTopByRating } from "./api/public";
import { genreLabel } from "../utils/genres";
import { supabase } from "../utils/supabaseClient"; // <-- CORREGIDO AQUÍ

const Login = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    usuario: "",
    password: "",
    recordar: false,
  });

  // --- Estados para el carrusel ---
  const [heroStories, setHeroStories] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);

  // Efecto para detectar si viene de confirmar el correo
  useEffect(() => {
    // 1. Revisar si Supabase devolvió un error en el hash (ej. enlace expirado)
    const hash = window.location.hash;
    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.substring(1));
      const errorDesc = params.get('error_description');
      setError(errorDesc ? decodeURIComponent(errorDesc) : "El enlace de confirmación es inválido o ha expirado.");
      window.history.replaceState(null, '', '/login');
      return; 
    }

    // 2. Procesar la sesión de Supabase (si el enlace fue exitoso)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setError("Error al confirmar: " + error.message);
      } else if (session) {
        setSuccess("¡Correo confirmado con éxito! Ya puedes iniciar sesión.");
        window.history.replaceState(null, '', '/login');
        // Cerramos la sesión de Supabase, usaremos nuestro JWT del backend
        supabase.auth.signOut();
      }
    });
  }, []);

  useEffect(() => {
    getTopByRating(3)
      .then(setHeroStories)
      .catch((e) => console.error('hero stories', e));
  }, []);

  useEffect(() => {
    if (heroStories.length < 2) return;
    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroStories.length);
    }, 6000);
    return () => clearInterval(t);
  }, [heroStories.length]);

  const currentHero = heroStories[heroIndex] || heroStories[0];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      setLoading(true);
      const data = await loginUser({
        identifier: form.usuario,
        password: form.password,
      });

      console.log("RESPUESTA DEL BACKEND: ", data)

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (form.recordar) {
        localStorage.setItem("persistSession", true);
      } else {
        localStorage.setItem("persistSession", false);
      }

      // redireccion segu su rol
      if (data.user?.isAdmin) {
        navigate("/admin", {replace: true});
      } else {
        navigate("/dashboard", {replace: true})
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Lado izquierdo - Ahora tiene el carrusel */}
      <div className="login-left">
        {currentHero && (
          <div className="hero-showcase">
            {/* Capa de fondo dinámica */}
            <div 
              className="hero-showcase-bg"
              style={{ 
                backgroundImage: currentHero.cover_url ? `url(${currentHero.cover_url})` : 'none' 
              }}
            />

            {/* Contenido por encima del fondo */}
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

      {/* Lado derecho - Formulario de login */}
      <div className="login-right">
        <div className="login-form-wrapper">
          <div className="login-header">
            <img src={logo} alt="Logo KleeBunko" className="login-logo" />
            <h1 className="login-title">
                <span className="title-word-one">Klee</span>{" "}
                <span className="title-word-two">Bunko</span>
            </h1>
          </div>
          <h2 className="login-subtitle">Bienvenido de nuevo</h2>
          <p className="login-text">
            Inicia sesión para continuar gestionando tu contenido.
          </p>

          {error && <p className="form-error" style={{ color: "red" }}>{error}</p>}
          {success && <p className="form-success" style={{ color: "green", marginBottom: "10px" }}>{success}</p>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="usuario">Usuario o correo</label>
              <input
                type="text"
                id="usuario"
                name="usuario"
                value={form.usuario}
                onChange={handleChange}
                placeholder="Ingresa tu usuario o correo"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Ingresa tu contraseña"
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="recordar"
                  checked={form.recordar}
                  onChange={handleChange}
                />
                <span>Recordar mi contraseña</span>
              </label>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>

            <a href="/forgot-password" className="forgot-password">
              ¿Olvidaste tu contraseña?
            </a>
          </form>

          <p className="register-text">
            ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
          </p>

          <footer className="login-footer">© 2026 Klee Bunko</footer>
        </div>
      </div>
    </div>
  );
};

export default Login;