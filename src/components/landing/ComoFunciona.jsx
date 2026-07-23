/* ──────────────────────────────────────────────────────────────────────────
 * CÓMO FUNCIONA — 3 tiles blancas estilo Glovo que explican el flujo del
 * cliente (elegir · pagar · recibir y seguir en vivo). Fondo crema.
 * ────────────────────────────────────────────────────────────────────────── */
import { UtensilsCrossed, CreditCard, MapPin } from 'lucide-react'

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

const STEPS = [
  {
    icon: UtensilsCrossed,
    title: 'Elige tu restaurante',
    desc: 'Explora los restaurantes de tu zona en Tenerife, mira la carta y arma tu pedido con extras y tamaños.',
  },
  {
    icon: CreditCard,
    title: 'Paga como quieras',
    desc: 'Con tarjeta, Apple Pay, Google Pay o en efectivo al recibir. Rápido y seguro, sin líos.',
  },
  {
    icon: MapPin,
    title: 'Recíbelo y síguelo en vivo',
    desc: 'Un repartidor local lo lleva a tu puerta y ves en el mapa dónde está en tiempo real.',
  },
]

const Tile = ({ icon: Icon, title, desc, n }) => (
  <div
    style={{
      background: 'var(--c-paper)',
      border: '1px solid var(--c-border)',
      borderRadius: 24,
      padding: 30,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      position: 'relative',
      boxShadow: '0 1px 3px rgba(26,24,21,0.04)',
    }}
  >
    <span
      style={{
        position: 'absolute',
        top: 22,
        right: 24,
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: 40,
        color: 'var(--c-border-strong)',
        lineHeight: 1,
      }}
    >
      {n}
    </span>
    <div
      style={{
        width: 60,
        height: 60,
        borderRadius: 18,
        background: 'rgba(255,107,44,0.12)',
        color: '#E4671F',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={28} strokeWidth={2.2} />
    </div>
    <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 21, letterSpacing: -0.5, color: 'var(--c-ink)' }}>
      {title}
    </div>
    <div style={{ fontFamily: FONT, fontSize: 15, color: 'var(--c-muted)', lineHeight: 1.55 }}>{desc}</div>
  </div>
)

export default function ComoFunciona() {
  return (
    <section id="como-funciona" style={{ background: 'var(--c-cream)', padding: '76px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 44px' }}>
          <h2
            className="landing-h2"
            style={{
              fontFamily: FONT,
              fontSize: 44,
              fontWeight: 800,
              letterSpacing: -1.4,
              color: 'var(--c-ink)',
              margin: '0 0 12px',
              lineHeight: 1.05,
            }}
          >
            Pedir en Pidoo es así de fácil
          </h2>
          <p style={{ fontFamily: FONT, fontSize: 17, color: 'var(--c-muted)', lineHeight: 1.6 }}>
            Tres pasos y tu comida está de camino. Sin complicaciones.
          </p>
        </div>

        <div
          className="landing-3col"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }}
        >
          {STEPS.map((s, i) => (
            <Tile key={s.title} {...s} n={i + 1} />
          ))}
        </div>
      </div>
    </section>
  )
}
