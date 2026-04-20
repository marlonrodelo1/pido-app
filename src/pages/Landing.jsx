import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={shell}>
      <style>{landingCss}</style>

      {/* Header */}
      <header style={header}>
        <div style={headerInner}>
          <div style={brand}>
            <img src="/favicon.svg" alt="Pidoo" width={28} height={28} />
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>pidoo</span>
          </div>
          <button
            onClick={() => navigate('/app')}
            style={headerCta}
          >
            Abrir app
          </button>
        </div>
      </header>

      {/* Hero */}
      <section style={hero}>
        <div className="landing-hero-inner" style={heroInner}>
          <img
            src="/favicon-192.png"
            alt="Pidoo"
            width={88}
            height={88}
            style={{ borderRadius: 22, marginBottom: 24, boxShadow: '0 14px 40px rgba(255,107,44,0.25)' }}
          />
          <h1 className="landing-h1" style={h1}>
            Tus restaurantes favoritos en Tenerife
          </h1>
          <p className="landing-sub" style={sub}>
            Pide comida a domicilio o recógela tú mismo. Hecho en Canarias.
          </p>
          <div style={ctaRow}>
            <button onClick={() => navigate('/app')} style={ctaPrimary}>
              Pedir ahora
            </button>
            <a href="#descarga" style={ctaSecondary}>
              Descargar app
            </a>
          </div>
        </div>
      </section>

      {/* Sección descarga (placeholder Sprint 2 — botones inactivos) */}
      <section id="descarga" style={downloads}>
        <div className="landing-section-inner" style={sectionInner}>
          <h2 className="landing-h2" style={h2}>Llévatela en el bolsillo</h2>
          <p className="landing-sub" style={{ ...sub, marginBottom: 32 }}>
            Próximamente disponible en App Store y Google Play.
          </p>
          <div style={storeRow}>
            <div style={storeBadge}>App Store</div>
            <div style={storeBadge}>Google Play</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={footer}>
        <div className="landing-section-inner" style={footerInner}>
          <div style={{ fontSize: 13, color: 'var(--c-muted)' }}>
            © 2026 Pidoo · Hecho en Canarias
          </div>
          <div style={footerLinks}>
            <a href="/terminos" style={footerLink}>Términos</a>
            <span style={{ color: 'var(--c-muted)' }}>·</span>
            <a href="/privacidad" style={footerLink}>Privacidad</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

const shell = {
  '--c-primary': '#FF6B2C',
  '--c-bg': '#FAFAF7',
  '--c-surface': '#FFFFFF',
  '--c-surface2': '#F4F2EC',
  '--c-border': '#E8E6E0',
  '--c-text': '#1F1F1E',
  '--c-muted': '#6B6B68',
  fontFamily: "'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif",
  background: 'var(--c-bg)',
  color: 'var(--c-text)',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
}

const header = {
  borderBottom: '1px solid var(--c-border)',
  background: 'rgba(250,250,247,0.85)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  position: 'sticky',
  top: 0,
  zIndex: 50,
}
const headerInner = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '14px 24px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}
const brand = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
}
const headerCta = {
  padding: '10px 18px',
  borderRadius: 12,
  border: '1px solid var(--c-border)',
  background: 'var(--c-surface)',
  color: 'var(--c-text)',
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
}

const hero = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '80px 24px',
}
const heroInner = {
  maxWidth: 760,
  width: '100%',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}
const h1 = {
  fontSize: 56,
  lineHeight: 1.05,
  letterSpacing: -1.4,
  fontWeight: 800,
  margin: '0 0 18px',
  maxWidth: 720,
}
const sub = {
  fontSize: 18,
  lineHeight: 1.55,
  color: 'var(--c-muted)',
  margin: '0 0 36px',
  maxWidth: 540,
}
const ctaRow = {
  display: 'flex',
  gap: 14,
  flexWrap: 'wrap',
  justifyContent: 'center',
}
const ctaPrimary = {
  padding: '16px 34px',
  borderRadius: 14,
  border: 'none',
  background: 'var(--c-primary)',
  color: '#fff',
  fontFamily: 'inherit',
  fontSize: 16,
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 10px 28px rgba(255,107,44,0.32)',
}
const ctaSecondary = {
  padding: '16px 34px',
  borderRadius: 14,
  border: '1.5px solid var(--c-border)',
  background: 'var(--c-surface)',
  color: 'var(--c-text)',
  fontFamily: 'inherit',
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-block',
}

const downloads = {
  background: 'var(--c-surface2)',
  padding: '80px 24px',
  borderTop: '1px solid var(--c-border)',
}
const sectionInner = {
  maxWidth: 1200,
  margin: '0 auto',
  textAlign: 'center',
}
const h2 = {
  fontSize: 36,
  letterSpacing: -0.8,
  fontWeight: 800,
  margin: '0 0 12px',
}
const storeRow = {
  display: 'flex',
  gap: 16,
  justifyContent: 'center',
  flexWrap: 'wrap',
}
const storeBadge = {
  padding: '14px 28px',
  borderRadius: 12,
  background: '#1F1F1E',
  color: '#FAFAF7',
  fontSize: 14,
  fontWeight: 700,
  opacity: 0.55,
}

const footer = {
  borderTop: '1px solid var(--c-border)',
  padding: '28px 24px',
  background: 'var(--c-bg)',
}
const footerInner = {
  maxWidth: 1200,
  margin: '0 auto',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 12,
}
const footerLinks = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontSize: 13,
}
const footerLink = {
  color: 'var(--c-text)',
  textDecoration: 'none',
  fontWeight: 600,
}

const landingCss = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
*{box-sizing:border-box}
body{margin:0;background:#FAFAF7}
@media (max-width: 640px) {
  .landing-h1 { font-size: 36px !important; letter-spacing: -0.8px !important; }
  .landing-h2 { font-size: 26px !important; }
  .landing-sub { font-size: 16px !important; }
}
`
