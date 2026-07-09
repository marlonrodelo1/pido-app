import { useState } from 'react'
import { Menu, X, ArrowRight } from 'lucide-react'
import { SolidBtn } from '../components/landing/_ui'
import HeroVideo from '../components/landing/HeroVideo'
import LogoMarquee from '../components/landing/LogoMarquee'
import ModeloSection from '../components/landing/ModeloSection'
import DownloadApps from '../components/landing/DownloadApps'

/* ──────────────────────────────────────────────────────────────────────────
 * Landing pública de pidoo.es — rediseño jul 2026.
 * Hero de video (sin texto) → marquee de logos → modelo (socio destacado) →
 * descargas de las 3 apps → footer. Paleta crema/terracotta · Plus Jakarta Sans.
 * ────────────────────────────────────────────────────────────────────────── */

const SOCIO_URL = 'https://socio.pidoo.es'

/* ───────────────────────── HEADER (glassy sticky) ───────────────────────── */
const Header = () => {
  const [open, setOpen] = useState(false)
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--c-glass)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        borderBottom: '1px solid var(--c-border)',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <a href="#top" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo-cliente.png" alt="Pidoo" style={{ height: 36, display: 'block' }} />
        </a>

        <nav className="landing-nav" style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <a href="#modelo" style={navLink}>El modelo</a>
          <a href="#descargas" style={navLink}>Descargar</a>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SolidBtn href={SOCIO_URL}>
            Hazte socio <ArrowRight size={16} strokeWidth={2.5} />
          </SolidBtn>
          <button
            className="landing-burger"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menú"
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              color: 'var(--c-ink)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {open && (
        <div
          className="landing-mobile-menu"
          style={{
            borderTop: '1px solid var(--c-border)',
            padding: '10px 20px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <a href="#modelo" onClick={() => setOpen(false)} style={{ ...navLink, padding: '10px 0' }}>El modelo</a>
          <a href="#descargas" onClick={() => setOpen(false)} style={{ ...navLink, padding: '10px 0' }}>Descargar</a>
        </div>
      )}
    </header>
  )
}

const navLink = {
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  fontSize: 14.5,
  fontWeight: 600,
  color: 'var(--c-text-soft)',
  textDecoration: 'none',
}

/* ───────────────────────── FOOTER (slim) ───────────────────────── */
const Footer = () => (
  <footer style={{ padding: '64px 20px 30px', background: 'var(--c-ink)', color: 'var(--c-cream)' }}>
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div
        className="landing-footer-cols"
        style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 50 }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
            <img src="/logo-cliente.png" alt="Pidoo" style={{ height: 34, display: 'block' }} />
          </div>
          <div style={{ fontSize: 14, color: '#A8A29E', lineHeight: 1.6, maxWidth: 280 }}>
            Tu propio marketplace de comida en Tenerife. Los pedidos, directos a ti.
          </div>
        </div>
        {[
          {
            t: 'Producto',
            l: [
              { label: 'El modelo', href: '#modelo' },
              { label: 'Descargar', href: '#descargas' },
              { label: 'Hazte socio', href: SOCIO_URL },
            ],
          },
          {
            t: 'Legal',
            l: [
              { label: 'Términos', href: '/terminos' },
              { label: 'Privacidad', href: '/privacidad' },
              { label: 'Eliminar cuenta', href: '/eliminar-cuenta' },
            ],
          },
          {
            t: 'Contacto',
            l: [
              { label: 'hola@pidoo.es', href: 'mailto:hola@pidoo.es' },
              { label: 'Soporte', href: '/contacto' },
            ],
          },
        ].map((c) => (
          <div key={c.t}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 14,
              }}
            >
              {c.t}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {c.l.map((li) => (
                <a key={li.label} href={li.href} style={{ fontSize: 13, color: '#A8A29E', textDecoration: 'none' }}>
                  {li.label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 46,
          paddingTop: 24,
          borderTop: '1px solid #3A3530',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          color: '#A8A29E',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <span>© 2026 Pidoo · Hecho con calma en Tenerife 🌋</span>
        <span style={{ fontFamily: 'ui-monospace, monospace' }}>v 3.0</span>
      </div>
    </div>
  </footer>
)

/* ─────────────────── LANDING ROOT ─────────────────── */
export default function Landing() {
  return (
    <div
      id="top"
      style={{
        background: 'var(--c-cream)',
        color: 'var(--c-ink)',
        minHeight: '100vh',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <style>{landingCss}</style>
      <Header />
      <HeroVideo />
      <LogoMarquee />
      <ModeloSection />
      <DownloadApps />
      <Footer />
    </div>
  )
}

/* ────────────────────── CSS responsive ────────────────────── */
const landingCss = `
html, body { overflow-x: hidden; }
html { overflow-y: auto !important; scroll-behavior: smooth; }
#modelo, #descargas { scroll-margin-top: 76px; }

@media (max-width: 900px) {
  .pd-socio-card { grid-template-columns: 1fr !important; gap: 28px !important; padding: 26px !important; }
  .pd-rest-card  { grid-template-columns: 1fr !important; gap: 24px !important; }
  .landing-3col  { grid-template-columns: 1fr !important; }
  .landing-footer-cols { grid-template-columns: repeat(2, 1fr) !important; gap: 32px !important; }
}

@media (max-width: 768px) {
  .landing-nav { display: none !important; }
  .landing-burger { display: inline-flex !important; }
  .landing-h2 { font-size: 30px !important; }
}

@media (max-width: 600px) {
  .landing-footer-cols { grid-template-columns: 1fr !important; }
}
`
