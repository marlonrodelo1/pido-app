import { useNavigate } from 'react-router-dom'
import {
  Heart,
  Utensils,
  ShoppingBag,
  Bike,
  Check,
  Apple,
  Smartphone,
} from 'lucide-react'
import ShaderBackground from '../components/ShaderBackground'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={shell}>
      <style>{landingCss}</style>

      {/* ================= HEADER STICKY ================= */}
      <header style={header}>
        <div style={headerInner}>
          <a href="/" style={brandLink}>
            <span style={brandText}>pidoo</span>
          </a>
          <nav style={headerRight} className="landing-header-right">
            <a href="https://panel.pidoo.es" target="_blank" rel="noopener noreferrer" style={headerLink}>
              Soy restaurante
            </a>
            <button onClick={() => navigate('/app')} style={headerCta}>
              Pedir ahora
            </button>
          </nav>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section style={hero}>
        <ShaderBackground />
        <div style={heroOverlay} />
        <div style={heroInner} className="landing-hero-inner">
          <div className="anim-fade-in" style={{ animationDelay: '0ms' }}>
            <span style={badge}>
              <Heart size={14} strokeWidth={2.5} />
              Hecho en Canarias 🇮🇨
            </span>
          </div>
          <h1 style={h1}>
            <span className="anim-fade-up" style={{ animationDelay: '120ms', display: 'block' }}>
              Tu comida favorita,
            </span>
            <span
              className="anim-fade-up"
              style={{ animationDelay: '320ms', display: 'block', color: 'var(--c-primary)' }}
            >
              a un clic.
            </span>
          </h1>
          <p className="anim-fade-up landing-sub" style={{ ...sub, animationDelay: '520ms' }}>
            Pide a los mejores restaurantes de Tenerife. Recogida o entrega a domicilio en menos de 30 minutos.
          </p>
          <div className="anim-fade-up" style={{ ...ctaRow, animationDelay: '700ms' }}>
            <button onClick={() => navigate('/app')} style={ctaPrimary}>
              Pedir ahora
            </button>
            <button onClick={() => navigate('/app')} style={ctaSecondary}>
              Ver restaurantes
            </button>
          </div>
        </div>
      </section>

      {/* ================= CÓMO FUNCIONA ================= */}
      <section style={section}>
        <div style={sectionInner}>
          <h2 style={h2}>Cómo funciona</h2>
          <p style={sectionSub}>Tres pasos para tener tu pedido en casa.</p>
          <div style={stepsGrid} className="landing-steps-grid">
            {STEPS.map((s) => (
              <div key={s.title} style={stepCard}>
                <div style={stepIconWrap}>
                  <s.icon size={32} strokeWidth={2} color="var(--c-primary)" />
                </div>
                <h3 style={stepTitle}>{s.title}</h3>
                <p style={stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PARA RESTAURANTES ================= */}
      <section style={{ ...section, background: 'var(--c-surface2)' }}>
        <div style={sectionInner}>
          <div style={twoColGrid} className="landing-two-col">
            <div>
              <span style={smallTag}>Para restaurantes</span>
              <h2 style={{ ...h2, textAlign: 'left', marginTop: 12 }}>
                ¿Eres restaurante? Vende más con Pidoo.
              </h2>
              <ul style={checkList}>
                {[
                  'Recibe pedidos en tiempo real',
                  'Imprime tickets automáticamente',
                  'Asigna tus propios riders',
                  'Cobra por Stripe seguro',
                ].map((t) => (
                  <li key={t} style={checkItem}>
                    <Check size={20} strokeWidth={2.6} color="var(--c-primary)" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <a
                href="https://panel.pidoo.es"
                target="_blank"
                rel="noopener noreferrer"
                style={ctaPrimaryLink}
              >
                Únete a Pidoo
              </a>
            </div>
            <div style={mockup}>📱 Mockup panel</div>
          </div>
        </div>
      </section>

      {/* ================= PLAN TIENDA PÚBLICA 39€ ================= */}
      <section style={section}>
        <div style={sectionInner}>
          <div style={planCard}>
            <span style={planBadge}>PLAN PRO</span>
            <div style={planPrice}>
              39€<span style={planPriceMo}>/mes</span>
            </div>
            <p style={planSub}>Tu propia tienda online sin comisiones por pedido.</p>
            <ul style={{ ...checkList, alignItems: 'flex-start' }}>
              {[
                'URL propia: pidoo.es/tu-restaurante',
                '0% comisión sobre pedidos',
                'Doble precio: Pidoo y tu tienda',
                'Cancela cuando quieras',
              ].map((t) => (
                <li key={t} style={checkItem}>
                  <Check size={20} strokeWidth={2.6} color="var(--c-primary)" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <a
              href="https://panel.pidoo.es"
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...ctaPrimaryLink, width: '100%', textAlign: 'center', marginTop: 24 }}
            >
              Empezar prueba gratis
            </a>
          </div>
        </div>
      </section>

      {/* ================= PARA REPARTIDORES ================= */}
      <section style={section} id="repartidores">
        <div style={sectionInner}>
          <div style={ridersBanner} className="landing-riders-banner">
            <div>
              <h2 style={{ ...h2, textAlign: 'left', color: '#fff', margin: 0 }}>
                Únete como rider y gana repartiendo
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.92)', fontSize: 18, marginTop: 12, maxWidth: 540, lineHeight: 1.5 }}>
                Eres tu propio jefe. Tarifas competitivas. Cobras semanal.
              </p>
            </div>
            <a href="#repartidores" style={ridersCta}>
              Quiero ser rider
            </a>
          </div>
        </div>
      </section>

      {/* ================= DESCARGA APP ================= */}
      <section style={section} id="descarga">
        <div style={sectionInner}>
          <h2 style={h2}>Descarga la app</h2>
          <p style={sectionSub}>Próximamente en App Store y Google Play.</p>
          <div style={storeRow}>
            <a href="#" style={storeBtn}>
              <Apple size={28} strokeWidth={2} />
              <div style={storeBtnText}>
                <span style={storeBtnSmall}>Descargar en</span>
                <span style={storeBtnBig}>App Store</span>
              </div>
            </a>
            <a href="#" style={storeBtn}>
              <Smartphone size={28} strokeWidth={2} />
              <div style={storeBtnText}>
                <span style={storeBtnSmall}>Disponible en</span>
                <span style={storeBtnBig}>Google Play</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer style={footer}>
        <div style={footerInner}>
          <div style={footerCols} className="landing-footer-cols">
            <div>
              <div style={{ ...brandText, fontSize: 24 }}>pidoo</div>
              <p style={{ color: 'var(--c-muted)', fontSize: 14, marginTop: 8, lineHeight: 1.5, maxWidth: 240 }}>
                Tu marketplace de restaurantes en Tenerife.
              </p>
            </div>
            <div>
              <h4 style={footerTitle}>Navegación</h4>
              <ul style={footerList}>
                <li><a href="/" style={footerLink}>Inicio</a></li>
                <li><a onClick={() => navigate('/app')} style={{ ...footerLink, cursor: 'pointer' }}>Pedir ahora</a></li>
                <li><a onClick={() => navigate('/app')} style={{ ...footerLink, cursor: 'pointer' }}>Restaurantes</a></li>
              </ul>
            </div>
            <div>
              <h4 style={footerTitle}>Empresa</h4>
              <ul style={footerList}>
                <li><a href="https://panel.pidoo.es" target="_blank" rel="noopener noreferrer" style={footerLink}>Para restaurantes</a></li>
                <li><a href="#repartidores" style={footerLink}>Repartidores</a></li>
                <li><a href="mailto:hola@pidoo.es" style={footerLink}>Soporte</a></li>
              </ul>
            </div>
            <div>
              <h4 style={footerTitle}>Legal</h4>
              <ul style={footerList}>
                <li><a href="/terminos" style={footerLink}>Términos</a></li>
                <li><a href="/privacidad" style={footerLink}>Privacidad</a></li>
              </ul>
            </div>
          </div>
          <div style={footerBottom}>© 2026 Pidoo · Hecho en Canarias 🇮🇨</div>
        </div>
      </footer>
    </div>
  )
}

/* ============== DATA ============== */

const STEPS = [
  {
    icon: Utensils,
    title: 'Elige restaurante',
    desc: 'Más de 100 restaurantes de Tenerife en tu pantalla.',
  },
  {
    icon: ShoppingBag,
    title: 'Personaliza tu pedido',
    desc: 'Configura extras, paga con tarjeta o efectivo.',
  },
  {
    icon: Bike,
    title: 'Recíbelo en casa',
    desc: 'Sigue tu rider en tiempo real hasta tu puerta.',
  },
]

/* ============== STYLES ============== */

const shell = {
  '--c-primary': '#FF6B2C',
  '--c-primary-dark': '#E85A1F',
  '--c-primary-soft': '#FFE9DC',
  '--c-bg': '#FAFAF7',
  '--c-surface': '#FFFFFF',
  '--c-surface2': '#F4F2EC',
  '--c-border': '#E8E6E0',
  '--c-text': '#1F1F1E',
  '--c-text-soft': '#3D3D3B',
  '--c-muted': '#6B6B68',
  '--c-shadow-md': '0 12px 40px rgba(20,20,18,0.08)',
  fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  background: 'var(--c-bg)',
  color: 'var(--c-text)',
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
}

/* HEADER */
const header = {
  borderBottom: '1px solid var(--c-border)',
  background: 'rgba(250,250,247,0.85)',
  backdropFilter: 'blur(10px) saturate(180%)',
  WebkitBackdropFilter: 'blur(10px) saturate(180%)',
  position: 'sticky',
  top: 0,
  zIndex: 50,
}
const headerInner = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '16px 24px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}
const brandLink = { textDecoration: 'none' }
const brandText = {
  color: 'var(--c-primary)',
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: -1,
  lineHeight: 1,
}
const headerRight = { display: 'flex', alignItems: 'center', gap: 24 }
const headerLink = {
  color: 'var(--c-text)',
  textDecoration: 'none',
  fontSize: 15,
  fontWeight: 600,
}
const headerCta = {
  padding: '10px 22px',
  borderRadius: 12,
  border: 'none',
  background: 'var(--c-primary)',
  color: '#fff',
  fontFamily: 'inherit',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 6px 20px rgba(255,107,44,0.28)',
}

/* HERO */
const hero = {
  position: 'relative',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '80px 24px',
  overflow: 'hidden',
}
const heroOverlay = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(180deg, rgba(250,250,247,0) 50%, rgba(250,250,247,0.6) 100%)',
  pointerEvents: 'none',
}
const heroInner = {
  position: 'relative',
  zIndex: 1,
  maxWidth: 900,
  width: '100%',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}
const badge = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 16px',
  borderRadius: 999,
  background: 'var(--c-primary-soft)',
  color: 'var(--c-primary-dark)',
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 28,
  border: '1px solid rgba(255,107,44,0.18)',
}
const h1 = {
  fontSize: 'clamp(40px, 7vw, 84px)',
  lineHeight: 1.05,
  letterSpacing: -2,
  fontWeight: 800,
  margin: '0 0 24px',
  maxWidth: 900,
}
const sub = {
  fontSize: 'clamp(16px, 2vw, 20px)',
  lineHeight: 1.55,
  color: 'var(--c-text-soft)',
  margin: '0 0 36px',
  maxWidth: 600,
}
const ctaRow = {
  display: 'flex',
  gap: 14,
  flexWrap: 'wrap',
  justifyContent: 'center',
}
const ctaPrimary = {
  padding: '16px 36px',
  borderRadius: 14,
  border: 'none',
  background: 'var(--c-primary)',
  color: '#fff',
  fontFamily: 'inherit',
  fontSize: 16,
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 12px 32px rgba(255,107,44,0.34)',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
}
const ctaSecondary = {
  padding: '16px 36px',
  borderRadius: 14,
  border: '1.5px solid var(--c-border)',
  background: 'rgba(255,255,255,0.7)',
  color: 'var(--c-text)',
  fontFamily: 'inherit',
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
  backdropFilter: 'blur(6px)',
}
const ctaPrimaryLink = {
  display: 'inline-block',
  padding: '14px 32px',
  borderRadius: 14,
  background: 'var(--c-primary)',
  color: '#fff',
  fontSize: 15,
  fontWeight: 800,
  textDecoration: 'none',
  marginTop: 28,
  boxShadow: '0 10px 28px rgba(255,107,44,0.30)',
}

/* SECCIONES GENÉRICAS */
const section = {
  padding: '80px 24px',
}
const sectionInner = {
  maxWidth: 1200,
  margin: '0 auto',
}
const h2 = {
  fontSize: 'clamp(28px, 4vw, 44px)',
  letterSpacing: -1,
  fontWeight: 800,
  margin: '0 0 12px',
  textAlign: 'center',
  lineHeight: 1.1,
}
const sectionSub = {
  fontSize: 17,
  color: 'var(--c-muted)',
  textAlign: 'center',
  margin: '0 0 48px',
}
const smallTag = {
  display: 'inline-block',
  padding: '6px 14px',
  borderRadius: 999,
  background: 'var(--c-primary-soft)',
  color: 'var(--c-primary-dark)',
  fontSize: 12,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
}

/* CÓMO FUNCIONA */
const stepsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 32,
}
const stepCard = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-border)',
  borderRadius: 20,
  padding: '36px 28px',
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}
const stepIconWrap = {
  width: 96,
  height: 96,
  borderRadius: '50%',
  background: 'var(--c-primary-soft)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 20,
}
const stepTitle = {
  fontSize: 20,
  fontWeight: 800,
  margin: '0 0 8px',
  letterSpacing: -0.4,
}
const stepDesc = {
  fontSize: 15,
  color: 'var(--c-muted)',
  lineHeight: 1.55,
  margin: 0,
}

/* DOS COLUMNAS PARA RESTAURANTES */
const twoColGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 64,
  alignItems: 'center',
}
const checkList = {
  listStyle: 'none',
  padding: 0,
  margin: '24px 0 0',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
}
const checkItem = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  fontSize: 16,
  color: 'var(--c-text-soft)',
  fontWeight: 500,
}
const mockup = {
  background: 'var(--c-surface2)',
  border: '1px solid var(--c-border)',
  borderRadius: 24,
  aspectRatio: '4 / 3',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 22,
  color: 'var(--c-muted)',
  fontWeight: 600,
}

/* PLAN PRO CARD */
const planCard = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-border)',
  borderRadius: 24,
  padding: 48,
  boxShadow: 'var(--c-shadow-md)',
  maxWidth: 720,
  margin: '0 auto',
  textAlign: 'center',
}
const planBadge = {
  display: 'inline-block',
  padding: '6px 16px',
  borderRadius: 999,
  background: 'var(--c-primary)',
  color: '#fff',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 1,
  marginBottom: 20,
}
const planPrice = {
  fontSize: 56,
  fontWeight: 800,
  letterSpacing: -2,
  color: 'var(--c-text)',
  lineHeight: 1,
}
const planPriceMo = {
  fontSize: 22,
  color: 'var(--c-muted)',
  fontWeight: 600,
  marginLeft: 4,
}
const planSub = {
  fontSize: 17,
  color: 'var(--c-text-soft)',
  margin: '12px 0 0',
}

/* RIDERS BANNER */
const ridersBanner = {
  background: 'linear-gradient(135deg, #FF6B2C 0%, #E85A1F 100%)',
  borderRadius: 24,
  padding: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 32,
  flexWrap: 'wrap',
  boxShadow: '0 16px 48px rgba(232,90,31,0.28)',
}
const ridersCta = {
  background: '#fff',
  color: 'var(--c-primary-dark)',
  padding: '16px 32px',
  borderRadius: 14,
  fontWeight: 800,
  fontSize: 16,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
  boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
}

/* DESCARGA APP */
const storeRow = {
  display: 'flex',
  gap: 16,
  justifyContent: 'center',
  flexWrap: 'wrap',
}
const storeBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 12,
  background: '#1F1F1E',
  color: '#fff',
  padding: '14px 24px',
  borderRadius: 12,
  textDecoration: 'none',
  minWidth: 200,
}
const storeBtnText = {
  display: 'flex',
  flexDirection: 'column',
  lineHeight: 1.1,
}
const storeBtnSmall = { fontSize: 11, opacity: 0.75, fontWeight: 500 }
const storeBtnBig = { fontSize: 18, fontWeight: 800 }

/* FOOTER */
const footer = {
  background: 'var(--c-surface2)',
  padding: '48px 24px',
  color: 'var(--c-muted)',
  marginTop: 'auto',
}
const footerInner = { maxWidth: 1200, margin: '0 auto' }
const footerCols = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 32,
  marginBottom: 36,
}
const footerTitle = {
  fontSize: 14,
  fontWeight: 800,
  color: 'var(--c-text)',
  margin: '0 0 14px',
  textTransform: 'uppercase',
  letterSpacing: 0.6,
}
const footerList = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}
const footerLink = {
  color: 'var(--c-muted)',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 500,
}
const footerBottom = {
  borderTop: '1px solid var(--c-border)',
  paddingTop: 20,
  fontSize: 13,
  textAlign: 'center',
  color: 'var(--c-muted)',
}

/* CSS responsive + animaciones */
const landingCss = `
* { box-sizing: border-box; }
body { margin: 0; background: #FAFAF7; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.anim-fade-up {
  opacity: 0;
  animation: fadeInUp 0.8s ease forwards;
}
.anim-fade-in {
  opacity: 0;
  animation: fadeIn 0.8s ease forwards;
}

a:hover { opacity: 0.85; }
button:hover { opacity: 0.92; }

@media (max-width: 900px) {
  .landing-steps-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
  .landing-two-col { grid-template-columns: 1fr !important; gap: 32px !important; }
  .landing-footer-cols { grid-template-columns: repeat(2, 1fr) !important; }
}
@media (max-width: 768px) {
  .landing-header-right a { display: none; }
}
@media (max-width: 600px) {
  .landing-footer-cols { grid-template-columns: 1fr !important; }
  .landing-riders-banner { padding: 32px !important; }
}
`
