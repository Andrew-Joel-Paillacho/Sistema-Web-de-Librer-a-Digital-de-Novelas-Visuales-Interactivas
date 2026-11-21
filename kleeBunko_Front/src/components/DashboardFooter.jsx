const DashboardFooter = () => (
  <footer className="dashboard-footer">
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
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23 4.9c-.8.4-1.7.6-2.6.8a4.5 4.5 0 0 0 2-2.5c-.9.5-1.9.9-2.9 1.1a4.5 4.5 0 0 0-7.7 4.1A12.8 12.8 0 0 1 2.5 3.7a4.5 4.5 0 0 0 1.4 6 4.4 4.4 0 0 1-2-.6v.1a4.5 4.5 0 0 0 3.6 4.4 4.5 4.5 0 0 1-2 .1 4.5 4.5 0 0 0 4.2 3.1A9 9 0 0 1 1 18.6a12.7 12.7 0 0 0 6.9 2c8.3 0 12.8-6.9 12.8-12.8v-.6A9.2 9.2 0 0 0 23 4.9z" />
          </svg>
        </a>
        <a href="#" className="social-icon" aria-label="Instagram">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
        </a>
        <a href="#" className="social-icon" aria-label="Facebook">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
        </a>
      </div>
    </div>
  </footer>
);

export default DashboardFooter;