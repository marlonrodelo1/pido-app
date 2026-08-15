import { useState, useEffect } from 'react'
import { Menu, X, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SolidBtn, GhostBtn } from '../components/landing/_ui'
import HeroGlovo from '../components/landing/HeroGlovo'
import LogoMarquee from '../components/landing/LogoMarquee'
import ComoFunciona from '../components/landing/ComoFunciona'
import CreadoresLanding from '../components/landing/CreadoresLanding'
import ModeloSection from '../components/landing/ModeloSection'
import DownloadApps from '../components/landing/DownloadApps'
import UneteCTA from '../components/landing/UneteCTA'

/* ──────────────────────────────────────────────────────────────────────────
 * Landing pública de pidoo.es — rediseño estilo Glovo (jul 2026).
 * Hero de bloque naranja → marquee de logos → cómo funciona → modelo →
 * descargas → captación de socios → footer. Crema/naranja · Plus Jakarta Sans.
 * ────────────────────────────────────────────────────────────────────────── */

const SOCIO_URL = 'https://socio.pidoo.es'

/* ─────────────── HEADER — pill flotante glass (estilo 21st) ─────────────── */
const NAV = [
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Creadores', href: '#creadores' },
  { label: 'El modelo', href: '#modelo' },
  { label: 'Descargar', href: '#descargas' },
  { label: 'Para socios', href: '#socios' },
]

const Header = () => {
  const [open, setOpen] = useState(false)
  return (
    <>
      {/* Isla flotante fija que sobrevuela el hero */}
      <div
        style={{
          position: 'fixed',
          top: 16,
          left: 0,
          right: 0,
          zIndex: 60,
          padding: '0 16px',
          pointerEvents: 'none',
        }}
      >
        <header
          style={{
            pointerEvents: 'auto',
            maxWidth: 960,
            margin: '0 auto',
            background: 'rgba(251,248,242,0.82)',
            backdropFilter: 'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid var(--c-border-strong)',
            borderRadius: 16,
            boxShadow: '0 10px 34px -14px rgba(26,24,21,0.28)',
          }}
        >
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              gap: 12,
            }}
          >
            <a href="#top" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', padding: '2px 6px' }}>
              <img src="/logo-cliente-t.png" alt="Pidoo" style={{ height: 30, display: 'block' }} />
            </a>

            <div className="landing-nav" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {NAV.map((l) => (
                <a key={l.href} href={l.href} style={navLink}>
                  {l.label}
                </a>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SolidBtn href={SOCIO_URL} style={{ padding: '9px 16px', fontSize: 14 }}>
                Hazte socio <ArrowRight size={15} strokeWidth={2.6} />
              </SolidBtn>
              <button
                className="landing-burger"
                onClick={() => setOpen(true)}
                aria-label="Abrir menú"
                style={{
                  display: 'none',
                  background: 'transparent',
                  border: '1px solid var(--c-border-strong)',
                  borderRadius: 10,
                  width: 38,
                  height: 38,
                  color: 'var(--c-ink)',
                  cursor: 'pointer',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Menu size={20} />
              </button>
            </div>
          </nav>
        </header>
      </div>

      {/* Drawer móvil (slide desde la izquierda) */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden={!open}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 70,
          background: 'rgba(26,24,21,0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .25s ease',
        }}
      >
        <aside
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '82%',
            maxWidth: 340,
            background: 'var(--c-paper)',
            borderRight: '1px solid var(--c-border)',
            boxShadow: '0 20px 60px -10px rgba(26,24,21,0.4)',
            transform: open ? 'translateX(0)' : 'translateX(-102%)',
            transition: 'transform .3s cubic-bezier(.22,.61,.36,1)',
            display: 'flex',
            flexDirection: 'column',
            padding: '18px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <img src="/logo-cliente-t.png" alt="Pidoo" style={{ height: 30 }} />
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              style={{ background: 'transparent', border: 'none', color: 'var(--c-ink)', cursor: 'pointer', padding: 4 }}
            >
              <X size={24} />
            </button>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            {NAV.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                style={{ ...navLink, fontSize: 16, padding: '12px 10px', borderRadius: 10 }}
              >
                {l.label}
              </a>
            ))}
          </div>
          <div style={{ marginTop: 'auto', display: 'grid', gap: 10 }}>
            <GhostBtn href="/app" full onClick={() => setOpen(false)}>
              Ver restaurantes
            </GhostBtn>
            <SolidBtn href={SOCIO_URL} full onClick={() => setOpen(false)}>
              Hazte socio
            </SolidBtn>
          </div>
        </aside>
      </div>
    </>
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
            <img src="/logo-cliente-t.png" alt="Pidoo" style={{ height: 34, display: 'block' }} />
          </div>
          <div style={{ fontSize: 14, color: '#A8A29E', lineHeight: 1.6, maxWidth: 280 }}>
            Tu propio marketplace de comida en Tenerife. Los pedidos, directos a ti.
          </div>
        </div>
        {[
          {
            t: 'Producto',
            l: [
              { label: 'Pidoo Creadores', href: '#creadores' },
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
  // Vitrina: cuántos restaurantes hay y cuáles enseñar, ordenados por pedidos
  // de los últimos 30 días. Se pide UNA vez aquí y se reparte por props: el
  // hero y el marquee necesitan lo mismo y dos llamadas en la portada serían
  // dos viajes para el mismo dato.
  //
  // Mientras no llega, cada componente pinta su versión sin cifra. Nunca hay un
  // hueco ni un salto de maquetación: el sitio de la píldora ya está reservado.
  const [vitrina, setVitrina] = useState(null)

  useEffect(() => {
    let vivo = true
    supabase
      .rpc('landing_vitrina')
      .then(({ data }) => {
        if (vivo && data) setVitrina(data)
      })
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [])

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
      <HeroGlovo total={vitrina?.total} />
      <LogoMarquee restaurantes={vitrina?.restaurantes} />
      <ComoFunciona />
      {/* El diferencial va ALTO y en color: es lo único que no tienen los
          portales. Después de "cómo funciona" (ya sabes qué es Pidoo) y antes
          del modelo (que habla de dinero al restaurante y al socio). */}
      <CreadoresLanding />
      <ModeloSection />
      <DownloadApps />
      <UneteCTA />
      <Footer />
    </div>
  )
}

/* ────────────────────── CSS responsive ────────────────────── */
const landingCss = `
html, body { overflow-x: hidden; }
html { overflow-y: auto !important; scroll-behavior: smooth; }
#como-funciona, #creadores, #modelo, #descargas, #socios { scroll-margin-top: 92px; }

@media (max-width: 900px) {
  .pd-socio-card { grid-template-columns: 1fr !important; gap: 28px !important; padding: 26px !important; }
  .pd-rest-card  { grid-template-columns: 1fr !important; gap: 24px !important; }
  .pd-unete-socio { grid-template-columns: 1fr !important; gap: 30px !important; padding: 30px !important; }
  .pd-unete-mock { order: -1; }
  .landing-3col  { grid-template-columns: 1fr !important; }
  .landing-footer-cols { grid-template-columns: repeat(2, 1fr) !important; gap: 32px !important; }
}

@media (max-width: 680px) {
  .pd-unete-mini { grid-template-columns: 1fr !important; }
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
