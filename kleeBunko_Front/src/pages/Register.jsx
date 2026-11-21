import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Register.css";
import logo from "../assets/logo_kleeBunko.png";
import { registerUser } from "./api/auth";
import { getTopByRating } from "./api/public";

const Register = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    usuario: "",
    email: "",
    password: "",
    confirmPassword: "",
    terminos: false,
  });

  // --- Estados para la imagen de fondo rotativa ---
  const [heroStories, setHeroStories] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);

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
  // ------------------------------------------------

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

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    try {
      setLoading(true);
      const data = await registerUser({
        nombre: form.nombre,
        username: form.usuario,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });

      setSuccess(data.message || "Registro exitoso. Revisa tu correo.");
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      {/* Lado izquierdo - Imagen de fondo y textos personalizados */}
      <div className="register-left">
        <div className="hero-showcase">
          {/* Capa de fondo dinámica */}
          <div
            className="hero-showcase-bg"
            style={{
              backgroundImage: currentHero?.cover_url
                ? `url(${currentHero.cover_url})`
                : "none",
            }}
          />

          {/* Contenido por encima del fondo */}
          <div className="hero-showcase-content register-showcase-content">
            <span className="hero-showcase-genre">
              Historias que se leen, mundos que se comparten
            </span>
            
            <h2 className="hero-showcase-title register-hero-title">
              Tu próxima historia comienza contigo.
            </h2>
            
            <p className="hero-showcase-synopsis register-synopsis">
              Haz de Klee Bunko tu lugar. Descubre nuevas voces, guarda tus favoritas y vive cada historia a tu manera.
            </p>

            {/* Lista de ventajas con iconos */}
            <div className="register-features-list">
              <div className="register-feature-item">
                <div className="register-check-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div className="register-feature-text">
                  <h4>Biblioteca personal</h4>
                  <p>Tus historias favoritas, siempre a mano. ontinua donde lo dejaste.</p>
                </div>
              </div>

              <div className="register-feature-item">
                <div className="register-check-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div className="register-feature-text">
                  <h4>Contenido exclusivo</h4>
                  <p>Descubre relatos, estrenos y universos reservados para la comunidad.</p>
                </div>
              </div>

              <div className="register-feature-item">
                <div className="register-check-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div className="register-feature-text">
                  <h4>Soporte</h4>
                  <p>Estamos contigo para que solo te preocupes de tu próximo Klee.</p>
                </div>
              </div>
            </div>

            {/* Separador y texto final */}
            <div className="register-divider"></div>
            <p className="register-bottom-text">Un universo de historias, un lugar para ti.</p>
          </div>
        </div>
      </div>

      {/* Lado derecho - Formulario de registro */}
      <div className="register-right">
        <div className="register-form-wrapper">
          <div className="register-header">
            <img src={logo} alt="Logo KleeBunko" className="register-logo" />
            <h1 className="register-title">
              <span className="title-word-one">Klee</span>{" "}
              <span className="title-word-two">Bunko</span>
            </h1>
          </div>

          <h2 className="register-subtitle">Crea tu cuenta</h2>
          <p className="register-text">
            Únete y empieza a gestionar tu contenido.
          </p>

          {error && <p className="form-error" style={{ color: "red" }}>{error}</p>}
          {success && <p className="form-success" style={{ color: "green" }}>{success}</p>}

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-group">
              <label htmlFor="nombre">Nombre</label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Ingresa tu nombre"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="usuario">Nombre de usuario</label>
              <input
                type="text"
                id="usuario"
                name="usuario"
                value={form.usuario}
                onChange={handleChange}
                placeholder="Elige un nombre de usuario"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                type="email"
                id="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Ingresa tu correo"
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

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar contraseña</label>
              <div className="password-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repite tu contraseña"
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showConfirmPassword ? (
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
                  name="terminos"
                  checked={form.terminos}
                  onChange={handleChange}
                  required
                />
                <span>
                  Acepto los{" "}
                  <a href="#" className="terms-link">
                    términos y condiciones
                  </a>
                </span>
              </label>
            </div>

            <button type="submit" className="btn-register">
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <p className="login-text-bottom">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </p>

          <footer className="register-footer">© 2026 Klee Bunko</footer>
        </div>
      </div>
    </div>
  );
};

export default Register;