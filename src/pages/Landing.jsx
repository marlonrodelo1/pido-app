import { useState } from 'react'
import {
  ArrowRight,
  Play,
  Check,
  CircleCheck as CheckCircle2,
  Percent,
  Globe,
  Bell,
  Upload,
  CreditCard,
  Share2,
  ChevronDown,
  Star,
  X,
  Menu,
} from 'lucide-react'

/* ──────────────────────────────────────────────────────────────────────────
 * Landing comercial Pidoo SaaS — pivote mayo 2026
 * "Tu propio Glovo. Sin comisiones." · 39€/mes
 * Paleta cream/terracotta/sage · Plus Jakarta Sans
 * ────────────────────────────────────────────────────────────────────────── */

const PANEL_URL = 'https://panel.pidoo.es'
const SIGNUP_URL = 'https://panel.pidoo.es/registro'

/* Logo wordmark inline (sin dependencias externas) */
const PidooLogo = ({ size = 32 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.28,
      background: 'linear-gradient(135deg, #C5562C 0%, #A8451F 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#FBF8F2',
      fontWeight: 900,
      fontSize: size * 0.5,
      letterSpacing: -1,
      lineHeight: 1,
      flexShrink: 0,
    }}
  >
    p
  </div>
)

const PidooWordmark = ({ size = 20, color = '#1A1815' }) => (
  <span
    style={{
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontWeight: 800,
      fontSize: size,
      letterSpacing: -1,
      color,
      lineHeight: 1,
    }}
  >
    pidoo
  </span>
)

/* Botón ink glossy negro brillante (primario) */
const GlossyBtn = ({ children, size = 'md', full = false, style = {}, ...rest }) => {
  const padY = size === 'lg' ? 14 : 10
  const padX = size === 'lg' ? 24 : 18
  const fontSize = size === 'lg' ? 15 : 14
  return (
    <button
      {...rest}
      style={{
        background: 'linear-gradient(180deg, #2B2823 0%, #1A1815 100%)',
        color: '#FBF8F2',
        border: '1px solid #1A1815',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.12), 0 6px 14px -4px rgba(26,24,21,0.4)',
        borderRadius: 12,
        padding: `${padY}px ${padX}px`,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize,
        fontWeight: 700,
        letterSpacing: -0.2,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: full ? '100%' : 'auto',
        whiteSpace: 'nowrap',
        transition: 'transform .15s ease, box-shadow .15s ease',
        textDecoration: 'none',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

/* Ghost button (secundario) */
const GhostBtn = ({ children, size = 'md', full = false, style = {}, ...rest }) => {
  const padY = size === 'lg' ? 14 : 10
  const padX = size === 'lg' ? 24 : 18
  const fontSize = size === 'lg' ? 15 : 14
  return (
    <button
      {...rest}
      style={{
        background: 'rgba(251,248,242,0.6)',
        color: '#1A1815',
        border: '1px solid #E8E1D3',
        borderRadius: 12,
        padding: `${padY}px ${padX}px`,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: full ? '100%' : 'auto',
        whiteSpace: 'nowrap',
        backdropFilter: 'blur(6px)',
        textDecoration: 'none',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

/* Card cream */
const Card = ({ children, pad = 24, style = {} }) => (
  <div
    style={{
      background: 'var(--c-paper)',
      border: '1px solid var(--c-border)',
      borderRadius: 16,
      padding: pad,
      boxShadow: '0 1px 3px rgba(26,24,21,0.04)',
      ...style,
    }}
  >
    {children}
  </div>
)

/* Chip — terracotta o sage */
const Chip = ({ children, tone = 'terracotta', style = {} }) => {
  const tones = {
    terracotta: { bg: 'var(--c-terracotta-soft)', color: 'var(--c-terracotta-2)' },
    sage: { bg: 'var(--c-sage-soft)', color: 'var(--c-sage-2)' },
    ink: { bg: '#E8E1D3', color: 'var(--c-ink)' },
  }
  const t = tones[tone] || tones.terracotta
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: t.bg,
        color: t.color,
        borderRadius: 999,
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 700,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

const fmt = (n) =>
  n.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  })

/* ───────────────────────── HEADER ───────────────────────── */
const Header = ({ onCta }) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        background: 'rgba(247,243,236,0.92)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        borderBottom: '1px solid var(--c-border)',
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <a
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
          }}
        >
          <PidooLogo size={32} />
          <PidooWordmark size={20} />
        </a>
        <nav
          className="landing-nav"
          style={{ display: 'flex', gap: 28, flex: 1, justifyContent: 'center' }}
        >
          {[
            { label: 'Cómo funciona', href: '#como-funciona' },
            { label: 'Precios', href: '#precios' },
            { label: 'FAQ', href: '#faq' },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              style={{
                color: 'var(--c-stone)',
                fontWeight: 600,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div
          className="landing-cta-desktop"
          style={{ display: 'flex', alignItems: 'center', gap: 12 }}
        >
          <a
            href={PANEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--c-stone)',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Iniciar sesión
          </a>
          <GlossyBtn onClick={onCta}>Empezar gratis 30 días</GlossyBtn>
        </div>
        <button
          className="landing-burger"
          aria-label="Menú"
          onClick={() => setMobileOpen((v) => !v)}
          style={{
            display: 'none',
            background: 'transparent',
            border: '1px solid var(--c-border)',
            borderRadius: 10,
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--c-ink)',
          }}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {mobileOpen && (
        <div
          style={{
            background: 'var(--c-cream)',
            borderTop: '1px solid var(--c-border)',
            padding: '12px 24px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {[
            { label: 'Cómo funciona', href: '#como-funciona' },
            { label: 'Precios', href: '#precios' },
            { label: 'FAQ', href: '#faq' },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              style={{
                color: 'var(--c-ink)',
                fontWeight: 600,
                fontSize: 15,
                textDecoration: 'none',
                padding: '8px 0',
              }}
            >
              {l.label}
            </a>
          ))}
          <a
            href={PANEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--c-stone)',
              fontWeight: 600,
              fontSize: 15,
              textDecoration: 'none',
              padding: '8px 0',
            }}
          >
            Iniciar sesión
          </a>
          <GlossyBtn full onClick={onCta}>
            Empezar gratis 30 días
          </GlossyBtn>
        </div>
      )}
    </header>
  )
}

/* ───────────────────────── HERO ───────────────────────── */
const Hero = ({ onCta }) => (
  <section
    style={{
      padding: '80px 24px 100px',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 0.45,
        pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle at 20% 30%, var(--c-terracotta-soft) 0%, transparent 50%),
                          radial-gradient(circle at 80% 70%, var(--c-sage-soft) 0%, transparent 50%)`,
      }}
    />
    <div
      className="landing-hero-grid"
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '1.1fr 1fr',
        gap: 60,
        alignItems: 'center',
        maxWidth: 1200,
        margin: '0 auto',
      }}
    >
      <div>
        <Chip tone="terracotta" style={{ marginBottom: 22 }}>
          🎉 Plan gratis 30 días · Sin tarjeta
        </Chip>
        <h1
          className="landing-h1"
          style={{
            fontWeight: 800,
            fontSize: 62,
            letterSpacing: '-0.04em',
            lineHeight: 1.02,
            color: 'var(--c-ink)',
            margin: 0,
          }}
        >
          Tu propio Glovo.
          <br />
          <span style={{ color: 'var(--c-terracotta)' }}>Sin comisiones.</span>
        </h1>
        <p
          style={{
            fontSize: 19,
            color: 'var(--c-stone)',
            marginTop: 22,
            lineHeight: 1.5,
            maxWidth: 480,
          }}
        >
          Recibe pedidos en tu tienda online por{' '}
          <b style={{ color: 'var(--c-ink)' }}>39€/mes</b>. Sin contratos. El 100% de
          cada pedido es tuyo.
        </p>
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 30,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <GlossyBtn size="lg" onClick={onCta}>
            Empezar gratis 30 días <ArrowRight size={16} />
          </GlossyBtn>
          <GhostBtn size="lg" onClick={() => (window.location.hash = '#como-funciona')}>
            <Play size={14} /> Ver cómo funciona
          </GhostBtn>
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--c-stone-2)',
            marginTop: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Check size={13} style={{ color: 'var(--c-sage)' }} /> Sin tarjeta inicial
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Check size={13} style={{ color: 'var(--c-sage)' }} /> Cancelas cuando
            quieras
          </span>
        </div>
      </div>
      {/* Visual mockup panel + móvil */}
      <div className="landing-hero-mockups" style={{ position: 'relative', height: 480 }}>
        {/* Panel card */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '88%',
            maxWidth: 480,
            background: 'var(--c-paper)',
            borderRadius: 16,
            boxShadow:
              '0 30px 60px -20px rgba(26,24,21,0.25), 0 14px 30px -10px rgba(26,24,21,0.1)',
            overflow: 'hidden',
            border: '1px solid var(--c-border)',
          }}
        >
          <div
            style={{
              height: 40,
              background: 'var(--c-cream-2)',
              borderBottom: '1px solid var(--c-border)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 14px',
              gap: 8,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#FF5F57',
              }}
            />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#FFBD2E',
              }}
            />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#28C840',
              }}
            />
            <div
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--c-stone)',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              panel.pidoo.es
            </div>
          </div>
          <div style={{ padding: 18 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--c-ink)',
                marginBottom: 12,
              }}
            >
              Pedidos en vivo · 3 nuevos
            </div>
            {[
              { id: 'PD-A7K3', n: 'María G.', t: 24.5, e: 'nuevo' },
              { id: 'PD-B9X4', n: 'Carlos R.', t: 18.9, e: 'preparando' },
              { id: 'PD-C2N8', n: 'Lucía F.', t: 32.1, e: 'listo' },
            ].map((p, i) => (
              <div
                key={i}
                style={{
                  background: '#fff',
                  border: '1px solid var(--c-border)',
                  borderLeft: `3px solid ${
                    p.e === 'nuevo'
                      ? 'var(--c-danger)'
                      : p.e === 'preparando'
                      ? 'var(--c-warning)'
                      : 'var(--c-sage)'
                  }`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 8,
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: 'ui-monospace, monospace',
                    color: 'var(--c-stone)',
                    fontWeight: 600,
                  }}
                >
                  {p.id}
                </span>
                <span style={{ flex: 1, fontWeight: 600, color: 'var(--c-ink)' }}>
                  {p.n}
                </span>
                <span
                  style={{
                    color: 'var(--c-ink)',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {fmt(p.t)}
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* Mobile mockup */}
        <div
          className="landing-mobile-mockup"
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: 200,
            height: 410,
            background: 'var(--c-ink)',
            borderRadius: 28,
            padding: 6,
            boxShadow:
              '0 30px 60px -20px rgba(26,24,21,0.4), 0 14px 30px -10px rgba(26,24,21,0.2)',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'var(--c-cream)',
              borderRadius: 22,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                height: 80,
                background:
                  'linear-gradient(135deg, var(--c-terracotta), var(--c-terracotta-2))',
              }}
            />
            <div style={{ padding: 12, marginTop: -20 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: '#fff',
                  border: '3px solid var(--c-paper)',
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                🍕
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--c-ink)',
                  marginTop: 8,
                }}
              >
                Trattoria Nonna
              </div>
              <Chip tone="sage" style={{ fontSize: 10, marginTop: 6 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--c-sage-2)',
                  }}
                />
                Abierto
              </Chip>
              <div
                style={{
                  marginTop: 12,
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--c-ink)',
                }}
              >
                Pizzas
              </div>
              {[1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--c-cream-2)',
                    borderRadius: 8,
                    padding: 8,
                    marginTop: 6,
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 6,
                      background: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                    }}
                  >
                    🍕
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-ink)' }}>
                      {i === 1 ? 'Margarita' : 'Diavola'}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--c-terracotta)',
                        fontWeight: 800,
                        marginTop: 2,
                      }}
                    >
                      {fmt(i === 1 ? 9.5 : 11.5)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
)

/* ───────────────────── COMPARATIVA ───────────────────── */
const Compare = () => {
  const filas = [
    { l: 'Comisión por pedido', p: '0 %', g: '25–35 %', je: '14–30 %', pT: 'sage', oT: 'danger' },
    { l: 'Cuota mensual', p: '39 €', g: '0 €', je: '0 €' },
    { l: 'Tu propia URL', p: '✓', g: '✗', je: '✗', pT: 'sage', oT: 'stone' },
    {
      l: 'Dinero directo a tu cuenta',
      p: '✓',
      g: 'Liquidación semanal',
      je: 'Liquidación semanal',
      pT: 'sage',
    },
    { l: 'Contrato mínimo', p: 'Ninguno', g: '1 año', je: '1 año', pT: 'sage' },
    { l: 'Tus clientes son tuyos', p: '✓', g: '✗', je: '✗', pT: 'sage', oT: 'stone' },
  ]
  return (
    <section style={{ padding: '100px 24px', background: 'var(--c-cream-2)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <h2 className="landing-h2" style={{ fontSize: 44, color: 'var(--c-ink)', margin: 0, letterSpacing: '-0.03em', fontWeight: 800 }}>
            ¿Por qué Pidoo?
          </h2>
          <p style={{ fontSize: 17, color: 'var(--c-stone)', marginTop: 10 }}>
            Compara y decide tú mismo
          </p>
        </div>
        <Card pad={0} style={{ overflow: 'hidden', boxShadow: '0 4px 12px rgba(26,24,21,0.06)' }}>
          <div
            className="landing-compare-row landing-compare-head"
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.4fr 1fr 1fr',
              padding: '24px 24px 18px',
              background: 'var(--c-cream-2)',
              borderBottom: '1px solid var(--c-border)',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--c-stone)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Característica
            </span>
            <div style={{ position: 'relative' }}>
              <Chip
                tone="terracotta"
                style={{ position: 'absolute', right: 14, top: -34, fontSize: 10 }}
              >
                Recomendado
              </Chip>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <PidooLogo size={20} />
                <span style={{ fontWeight: 800, color: 'var(--c-ink)', fontSize: 15 }}>
                  Pidoo
                </span>
              </span>
            </div>
            <span style={{ fontWeight: 700, color: 'var(--c-stone)', fontSize: 14 }}>
              Glovo
            </span>
            <span style={{ fontWeight: 700, color: 'var(--c-stone)', fontSize: 14 }}>
              Just Eat
            </span>
          </div>
          {filas.map((f, i) => (
            <div
              key={i}
              className="landing-compare-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.4fr 1fr 1fr',
                padding: '16px 24px',
                borderTop: i > 0 ? '1px solid #EFE9DD' : '1px solid var(--c-border)',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 14, color: 'var(--c-ink)', fontWeight: 600 }}>
                {f.l}
              </span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: f.pT === 'sage' ? 'var(--c-sage-2)' : 'var(--c-ink)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {f.p}
              </span>
              <span
                style={{
                  fontSize: 14,
                  color:
                    f.oT === 'danger'
                      ? 'var(--c-danger)'
                      : f.oT === 'stone'
                      ? 'var(--c-stone-2)'
                      : 'var(--c-stone)',
                  fontWeight: 600,
                }}
              >
                {f.g}
              </span>
              <span
                style={{
                  fontSize: 14,
                  color:
                    f.oT === 'danger'
                      ? 'var(--c-danger)'
                      : f.oT === 'stone'
                      ? 'var(--c-stone-2)'
                      : 'var(--c-stone)',
                  fontWeight: 600,
                }}
              >
                {f.je}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </section>
  )
}

/* ───────────────────────── VALOR ───────────────────────── */
const Valor = () => (
  <section style={{ padding: '100px 24px', background: 'var(--c-cream)' }}>
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 50 }}>
        <h2 className="landing-h2" style={{ fontSize: 44, color: 'var(--c-ink)', margin: 0, letterSpacing: '-0.03em', fontWeight: 800 }}>
          Todo lo que necesitas
        </h2>
        <p style={{ fontSize: 17, color: 'var(--c-stone)', marginTop: 10 }}>
          Sin sorpresas, sin comisiones
        </p>
      </div>
      <div className="landing-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {[
          {
            i: <Percent size={26} />,
            t: '0% comisión',
            d: 'Nunca te quitamos ni un céntimo de cada pedido. Lo que cobras al cliente, llega a tu cuenta.',
            mono: null,
          },
          {
            i: <Globe size={26} />,
            t: 'Tu marca, tu URL',
            d: 'Tu tienda vive bajo tu propio nombre. Compártela en redes y guarda tus clientes.',
            mono: 'pidoo.es/tu-restaurante',
          },
          {
            i: <Bell size={26} />,
            t: 'Pedidos en tiempo real',
            d: 'Tablet en el mostrador, sonido, alarma y comanda impresa. Cero clicks de más.',
            mono: null,
          },
        ].map((v, i) => (
          <Card key={i} pad={28} style={{ height: '100%' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: 'var(--c-terracotta-soft)',
                color: 'var(--c-terracotta-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
              }}
            >
              {v.i}
            </div>
            <div
              style={{
                color: 'var(--c-ink)',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
            >
              {v.t}
            </div>
            <div
              style={{
                fontSize: 14,
                color: 'var(--c-stone)',
                marginTop: 8,
                lineHeight: 1.55,
              }}
            >
              {v.d}
            </div>
            {v.mono && (
              <div
                style={{
                  marginTop: 14,
                  padding: '8px 12px',
                  background: 'var(--c-cream-2)',
                  borderRadius: 8,
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 12,
                  color: 'var(--c-ink)',
                  fontWeight: 600,
                }}
              >
                {v.mono}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  </section>
)

/* ───────────────────── CÓMO FUNCIONA ───────────────────── */
const Como = () => (
  <section id="como-funciona" style={{ padding: '100px 24px', background: 'var(--c-cream-2)' }}>
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 50 }}>
        <h2 className="landing-h2" style={{ fontSize: 44, color: 'var(--c-ink)', margin: 0, letterSpacing: '-0.03em', fontWeight: 800 }}>
          Empiezas en 15 minutos
        </h2>
      </div>
      <div
        className="landing-3col"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
          position: 'relative',
        }}
      >
        <div
          className="landing-como-line"
          style={{
            position: 'absolute',
            top: 50,
            left: '16%',
            right: '16%',
            height: 2,
            borderTop: '2px dashed var(--c-terracotta)',
            opacity: 0.4,
          }}
        />
        {[
          {
            n: '1',
            i: <Upload size={20} />,
            t: 'Te registras y subes tu carta',
            d: 'Productos, extras, precios. En 15 minutos.',
          },
          {
            n: '2',
            i: <CreditCard size={20} />,
            t: 'Conectas tu cuenta bancaria',
            d: 'Stripe Connect Express. 10 min, 100% legal.',
          },
          {
            n: '3',
            i: <Share2 size={20} />,
            t: 'Compartes tu URL y vendes',
            d: 'Sin comisiones, ya. El dinero llega a tu cuenta.',
          },
        ].map((p, i) => (
          <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
            <div
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  background: 'var(--c-paper)',
                  border: '2px solid var(--c-terracotta)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--c-terracotta)',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <span
                  style={{
                    fontSize: 48,
                    color: 'var(--c-terracotta)',
                    opacity: 0.22,
                    position: 'absolute',
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {p.n}
                </span>
                <span style={{ position: 'relative', zIndex: 2 }}>{p.i}</span>
              </div>
              <div style={{ color: 'var(--c-ink)', fontSize: 17, fontWeight: 700 }}>
                {p.t}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: 'var(--c-stone)',
                  maxWidth: 240,
                  lineHeight: 1.5,
                }}
              >
                {p.d}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
)

/* ─────────────────────── PRECIO ─────────────────────── */
const Precio = ({ onCta }) => (
  <section id="precios" style={{ padding: '100px 24px', background: 'var(--c-cream)' }}>
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <h2 className="landing-h2" style={{ fontSize: 44, color: 'var(--c-ink)', margin: 0, letterSpacing: '-0.03em', fontWeight: 800 }}>
          Un solo plan
        </h2>
        <p style={{ fontSize: 17, color: 'var(--c-stone)', marginTop: 10 }}>
          Sin sorpresas
        </p>
      </div>
      <Card
        pad={40}
        style={{
          boxShadow: '0 4px 12px rgba(26,24,21,0.06)',
          border: '2px solid var(--c-terracotta)',
          position: 'relative',
        }}
      >
        <Chip
          tone="terracotta"
          style={{
            position: 'absolute',
            top: -14,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          30 días gratis
        </Chip>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
            <span
              style={{
                fontSize: 72,
                color: 'var(--c-terracotta)',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              39
            </span>
            <span style={{ fontSize: 24, color: 'var(--c-terracotta)', fontWeight: 700 }}>
              €
            </span>
            <span
              style={{
                color: 'var(--c-stone)',
                fontSize: 16,
                fontWeight: 600,
                marginLeft: 4,
              }}
            >
              /mes
            </span>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginTop: 28,
          }}
        >
          {[
            'Pedidos ilimitados',
            '0% comisión, siempre',
            'Reparto Shipday incluido',
            'Tu propia URL en pidoo.es',
            'Stripe Connect Express',
            'Impresora térmica integrada',
            'Soporte 24/7',
            'Cancela cuando quieras',
          ].map((l) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={18} style={{ color: 'var(--c-sage)' }} />
              <span style={{ fontSize: 14, color: 'var(--c-ink)', fontWeight: 500 }}>
                {l}
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 30 }}>
          <GlossyBtn full size="lg" onClick={onCta}>
            Empezar prueba gratis
          </GlossyBtn>
          <div
            style={{
              fontSize: 12,
              color: 'var(--c-stone-2)',
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            30 días gratis · Sin tarjeta inicial
          </div>
        </div>
      </Card>
    </div>
  </section>
)

/* ─────────────────── TESTIMONIOS ─────────────────── */
const Testim = () => {
  const items = [
    {
      n: 'Carmen',
      r: 'Trattoria Nonna · Madrid',
      q: 'Antes pagaba 28% a Glovo. Con Pidoo recupero esos 800€ al mes. Mi propia URL es lo mejor.',
      i: 'C',
      tone: 'var(--c-terracotta)',
    },
    {
      n: 'Pablo',
      r: 'Burger Casa · Valencia',
      q: 'En 15 minutos lo tenía todo montado. La tablet en el mostrador y los pedidos entrando.',
      i: 'P',
      tone: '#5A8C7A',
    },
    {
      n: 'Lucía',
      r: 'Café del Puerto · Tenerife',
      q: 'Tener a mis clientes en mi base de datos no tiene precio. Ahora les mando promos directamente.',
      i: 'L',
      tone: '#8B6126',
    },
  ]
  return (
    <section style={{ padding: '100px 24px', background: 'var(--c-cream-2)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <h2 className="landing-h2" style={{ fontSize: 40, color: 'var(--c-ink)', margin: 0, letterSpacing: '-0.03em', fontWeight: 800 }}>
            Restaurantes que cobran al 100%
          </h2>
        </div>
        <div className="landing-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          {items.map((t, idx) => (
            <Card key={idx} pad={24}>
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: t.tone,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 18,
                  }}
                >
                  {t.i}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-ink)' }}>
                    {t.n}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--c-stone)', marginTop: 2 }}>
                    {t.r}
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 2,
                  marginBottom: 12,
                  color: 'var(--c-warning)',
                }}
              >
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={14}
                    fill="var(--c-warning)"
                    stroke="var(--c-warning)"
                  />
                ))}
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: 'var(--c-ink)',
                  lineHeight: 1.55,
                  fontStyle: 'italic',
                }}
              >
                "{t.q}"
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── FAQ ─────────────────────── */
const FAQ = () => {
  const [open, setOpen] = useState(0)
  const qs = [
    {
      q: '¿Quién paga a los repartidores?',
      a: 'Tú, el restaurante, vía Shipday. Pactas la tarifa con el socio repartidor y le pagas directamente como prefieras (Bizum, transferencia, efectivo). Pidoo no toca ese dinero ni cobra comisión por ello.',
    },
    {
      q: '¿Necesito mi propia cuenta Stripe?',
      a: 'No. Te ayudamos a crear tu Stripe Connect Express en 10 minutos durante el onboarding. El dinero de cada pedido llega directo a tu IBAN, no pasa por nosotros.',
    },
    {
      q: '¿Puedo darme de baja cuando quiera?',
      a: 'Sí, sin permanencia. Cancelas con un click desde el panel y mantienes acceso hasta el final del periodo facturado.',
    },
    {
      q: '¿Funciona en toda España?',
      a: 'Sí, en toda la península, Baleares, Canarias, Ceuta y Melilla. La integración Shipday cubre todo el territorio.',
    },
    {
      q: '¿Qué pasa con el IVA?',
      a: 'Tú facturas a tus clientes finales como siempre. Nosotros te emitimos una factura mensual por la suscripción Pidoo de 39€ + IVA (21% en península, 0% en Canarias, IPSI en Ceuta y Melilla).',
    },
    {
      q: '¿Hay permanencia?',
      a: 'No, ninguna. Pagas mes a mes y cancelas cuando quieras.',
    },
  ]
  return (
    <section id="faq" style={{ padding: '100px 24px', background: 'var(--c-cream)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 className="landing-h2" style={{ fontSize: 40, color: 'var(--c-ink)', margin: 0, letterSpacing: '-0.03em', fontWeight: 800 }}>
            Preguntas frecuentes
          </h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {qs.map((it, i) => (
            <div
              key={i}
              onClick={() => setOpen(i === open ? -1 : i)}
              style={{
                background: i === open ? 'var(--c-cream-2)' : 'var(--c-paper)',
                borderRadius: 12,
                border: '1px solid var(--c-border)',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <span
                  style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--c-ink)' }}
                >
                  {it.q}
                </span>
                <span
                  style={{
                    transform: i === open ? 'rotate(180deg)' : 'none',
                    color: 'var(--c-stone)',
                    transition: 'transform .2s',
                    display: 'inline-flex',
                  }}
                >
                  <ChevronDown size={18} />
                </span>
              </div>
              {i === open && (
                <div
                  style={{
                    padding: '0 22px 18px',
                    fontSize: 14,
                    color: 'var(--c-stone)',
                    lineHeight: 1.6,
                  }}
                >
                  {it.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────── CTA FINAL ───────────────────── */
const CTAFinal = ({ onCta }) => (
  <section
    style={{ padding: '100px 24px', background: 'var(--c-cream-2)', textAlign: 'center' }}
  >
    <h2
      className="landing-h2-big"
      style={{
        fontSize: 56,
        color: 'var(--c-ink)',
        margin: 0,
        letterSpacing: '-0.04em',
        fontWeight: 800,
        lineHeight: 1.05,
      }}
    >
      Empieza hoy.
      <br />
      <span style={{ color: 'var(--c-terracotta)' }}>Gratis 30 días.</span>
    </h2>
    <p style={{ fontSize: 19, color: 'var(--c-stone)', marginTop: 18 }}>
      Sin tarjeta inicial. Sin permanencia. Sin sorpresas.
    </p>
    <div style={{ marginTop: 30 }}>
      <GlossyBtn
        size="lg"
        onClick={onCta}
        style={{ padding: '18px 32px', fontSize: 17 }}
      >
        Crear mi cuenta <ArrowRight size={18} />
      </GlossyBtn>
    </div>
  </section>
)

/* ────────────────────── FOOTER ────────────────────── */
const Footer = () => (
  <footer
    style={{
      padding: '70px 24px 30px',
      background: 'var(--c-ink)',
      color: 'var(--c-cream)',
    }}
  >
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div
        className="landing-footer-cols"
        style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 50 }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <PidooLogo size={36} />
            <PidooWordmark size={22} color="var(--c-cream)" />
          </div>
          <div
            style={{
              fontSize: 14,
              color: '#A8A29E',
              lineHeight: 1.6,
              maxWidth: 280,
            }}
          >
            La forma honesta de tener tu propio delivery. Sin comisiones, 39€/mes.
          </div>
        </div>
        {[
          {
            t: 'Producto',
            l: [
              { label: 'Cómo funciona', href: '#como-funciona' },
              { label: 'Precios', href: '#precios' },
              { label: 'FAQ', href: '#faq' },
            ],
          },
          {
            t: 'Legal',
            l: [
              { label: 'Términos', href: '/terminos' },
              { label: 'Privacidad', href: '/privacidad' },
              { label: 'Cookies', href: '/privacidad' },
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
                <a
                  key={li.label}
                  href={li.href}
                  style={{
                    fontSize: 13,
                    color: '#A8A29E',
                    textDecoration: 'none',
                  }}
                >
                  {li.label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 50,
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
        <span style={{ fontFamily: 'ui-monospace, monospace' }}>v 2.0</span>
      </div>
    </div>
  </footer>
)

/* ─────────────────── LANDING ROOT ─────────────────── */
export default function Landing() {
  const goSignup = () => {
    window.open(SIGNUP_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      style={{
        background: 'var(--c-cream)',
        color: 'var(--c-ink)',
        minHeight: '100vh',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      <style>{landingCss}</style>
      <Header onCta={goSignup} />
      <Hero onCta={goSignup} />
      <Compare />
      <Valor />
      <Como />
      <Precio onCta={goSignup} />
      <Testim />
      <FAQ />
      <CTAFinal onCta={goSignup} />
      <Footer />
    </div>
  )
}

/* ────────────────────── CSS responsive ────────────────────── */
const landingCss = `
html, body { overflow-x: hidden; }
html { overflow-y: auto !important; }
.landing-h2-big { font-size: 56px; }

@media (max-width: 1024px) {
  .landing-hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
  .landing-hero-mockups { height: 420px !important; max-width: 520px; margin: 0 auto; }
  .landing-h1 { font-size: 48px !important; }
}

@media (max-width: 900px) {
  .landing-3col { grid-template-columns: 1fr !important; }
  .landing-footer-cols { grid-template-columns: repeat(2, 1fr) !important; gap: 32px !important; }
  .landing-como-line { display: none !important; }
}

@media (max-width: 768px) {
  .landing-nav { display: none !important; }
  .landing-cta-desktop { display: none !important; }
  .landing-burger { display: inline-flex !important; }
  .landing-h1 { font-size: 40px !important; }
  .landing-h2 { font-size: 32px !important; }
  .landing-h2-big { font-size: 38px !important; }
  .landing-compare-row { grid-template-columns: 1.4fr 1fr 0.8fr 0.8fr !important; padding-left: 16px !important; padding-right: 16px !important; }
  .landing-compare-row span { font-size: 12px !important; }
  .landing-hero-mockups { height: 360px !important; }
  .landing-mobile-mockup { width: 160px !important; height: 340px !important; }
}

@media (max-width: 600px) {
  .landing-footer-cols { grid-template-columns: 1fr !important; }
}
`
