const formatToday = () => {
  const s = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const WelcomeBanner = ({ username }) => (
  <section className="home-welcome">
    <div className="welcome-left">
      <p className="welcome-tagline">Tu biblioteca, sin límites</p>
      <h2 className="welcome-title">
        Otra historia te espera, <span className="welcome-username">{username}</span>
      </h2>
      <p className="welcome-sub">Vuelve a tus mundos favoritos o descubre uno nuevo</p>
    </div>
    <div className="welcome-right">
      <span className="welcome-date">{formatToday()}</span>
      <div className="welcome-status">
        <span>Tu universo al día</span>
        <span className="welcome-dot" />
      </div>
    </div>
  </section>
);

export default WelcomeBanner;