import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import logo from "../assets/logo_kleeBunko.png";
import "../styles/Login.css"; // Reutilizamos los estilos del login

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Enviamos el correo de recuperación.
      // La URL a la que irá el usuario al hacer clic en el correo será /reset-password
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess("Te hemos enviado un correo con las instrucciones para recuperar tu contraseña.");
      setEmail("");
    } catch (err) {
      setError(err.message || "Error al enviar el correo de recuperación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-right" style={{ width: '100%', margin: '0 auto' }}>
        <div className="login-form-wrapper">
          <div className="login-header">
            <img src={logo} alt="Logo KleeBunko" className="login-logo" />
            <h1 className="login-title">
              <span className="title-word-one">Klee</span>{" "}
              <span className="title-word-two">Bunko</span>
            </h1>
          </div>
          
          <h2 className="login-subtitle">Recuperar contraseña</h2>
          <p className="login-text">
            Ingresa tu correo electrónico y te enviaremos un enlace para que puedas crear una nueva contraseña.
          </p>

          {error && <p className="form-error" style={{ color: "red" }}>{error}</p>}
          {success && <p className="form-success" style={{ color: "green", marginBottom: "10px" }}>{success}</p>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ingresa tu correo"
                required
              />
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>
          </form>

          <p className="register-text" style={{ marginTop: '20px' }}>
            <Link to="/login">Volver al inicio de sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;