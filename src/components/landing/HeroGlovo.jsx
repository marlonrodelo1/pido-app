/* ──────────────────────────────────────────────────────────────────────────
 * HERO estilo Glovo — bloque de color sólido (naranja Pidoo) con titular
 * gigante en tinta oscura, "barra de dirección" que lleva a /app, badges de
 * stores y foto de comida a la derecha. Sustituye al hero de vídeo.
 * ────────────────────────────────────────────────────────────────────────── */
import { MapPin, ArrowRight, Star, Wallet } from 'lucide-react'

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"
const ORANGE = '#FF6B2C'
const INK = '#1A1815'
const HERO_IMG = '/hero/hero-comida.jpg'

const APPSTORE = 'https://apps.apple.com/es/app/pidoo/id6759052572'
const GPLAY = 'https://play.google.com/store/apps/details?id=com.pidoo.app'

/* Pill "barra de dirección" — visual tipo buscador de Glovo, lleva a /app */
const AddressPill = () => (
  <a
    href="/app"
    className="pd-hero-pill"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: '#FFFFFF',
      borderRadius: 999,
      padding: '8px 8px 8px 20px',
      boxShadow: '0 14px 34px -12px rgba(26,24,21,0.45)',
      textDecoration: 'none',
      maxWidth: 440,
    }}
  >
    <MapPin size={20} strokeWidth={2.4} color={ORANGE} style={{ flexShrink: 0 }} />
    <span
      style={{
        flex: 1,
        fontFamily: FONT,
        fontSize: 15.5,
        fontWeight: 600,
        color: INK,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      Ver restaurantes cerca de ti
    </span>
    <span
      style={{
        flexShrink: 0,
        width: 44,
        height: 44,
        borderRadius: 999,
        background: INK,
        color: '#FFF',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ArrowRight size={20} strokeWidth={2.6} />
    </span>
  </a>
)

/* Tarjeta flotante de "prueba social" sobre la foto */
const FloatCard = ({ style, icon: Icon, top, bottom }) => (
  <div
    style={{
      position: 'absolute',
      background: '#FFFFFF',
      borderRadius: 16,
      padding: '12px 16px',
      boxShadow: '0 18px 40px -16px rgba(26,24,21,0.45)',
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      ...style,
    }}
  >
    <span
      style={{
        width: 38,
        height: 38,
        borderRadius: 11,
        background: 'rgba(255,107,44,0.12)',
        color: ORANGE,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={20} strokeWidth={2.4} />
    </span>
    <div>
      <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 14, color: INK, lineHeight: 1.1 }}>{top}</div>
      <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: '#6B6356', marginTop: 2 }}>{bottom}</div>
    </div>
  </div>
)

export default function HeroGlovo({ total }) {
  return (
    <section style={{ background: ORANGE, position: 'relative', overflow: 'hidden' }}>
      <style>{heroCss}</style>
      <div
        className="pd-hero-grid"
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '104px 20px 72px',
          display: 'grid',
          gridTemplateColumns: '1.08fr 0.92fr',
          gap: 48,
          alignItems: 'center',
        }}
      >
        {/* Columna texto */}
        <div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: 'rgba(26,24,21,0.10)',
              color: INK,
              borderRadius: 999,
              padding: '7px 14px',
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 0.2,
              marginBottom: 22,
            }}
          >
            <MapPin size={14} strokeWidth={2.8} /> Ahora en Tenerife
          </span>

          <h1
            className="pd-hero-h1"
            style={{
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 'clamp(42px, 6.4vw, 78px)',
              lineHeight: 0.98,
              letterSpacing: -2.4,
              color: INK,
              margin: '0 0 18px',
            }}
          >
            Pide comida y<br />mucho más
          </h1>

          <p
            style={{
              fontFamily: FONT,
              fontSize: 'clamp(16px, 2vw, 20px)',
              fontWeight: 600,
              color: INK,
              opacity: 0.86,
              lineHeight: 1.5,
              margin: '0 0 30px',
              maxWidth: 480,
            }}
          >
            Tus restaurantes favoritos de Tenerife, a domicilio en minutos.
            Y si tienes un negocio, monta tu propio marketplace con Pidoo.
          </p>

          <AddressPill />

          {/* Badges de stores */}
          <div style={{ marginTop: 26 }}>
            <div
              style={{
                fontFamily: FONT,
                fontSize: 13,
                fontWeight: 800,
                color: INK,
                opacity: 0.7,
                marginBottom: 10,
                letterSpacing: 0.2,
              }}
            >
              Descárgala gratis
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href={APPSTORE} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex' }}>
                <img src="/badges/appstore_official.png" alt="Descargar en la App Store" style={{ height: 48, display: 'block' }} />
              </a>
              <a href={GPLAY} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex' }}>
                <img src="/badges/gplay_official_v2.png" alt="Disponible en Google Play" style={{ height: 48, display: 'block' }} />
              </a>
            </div>
          </div>
        </div>

        {/* Columna imagen */}
        <div className="pd-hero-media" style={{ position: 'relative' }}>
          <div
            style={{
              borderRadius: 28,
              overflow: 'hidden',
              boxShadow: '0 40px 80px -30px rgba(26,24,21,0.55)',
              aspectRatio: '4 / 5',
              background: 'rgba(0,0,0,0.15)',
            }}
          >
            <img
              src={HERO_IMG}
              alt="Comida a domicilio con Pidoo"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>

          {/* Aquí ponía "En 22 min · Entrega media en Tenerife" y era un número
              inventado: `entregado_at` se marca a mano, y 20 de los 50 repartos
              entregados figuran hechos en menos de 3 minutos. Publicar un
              minuto concreto es una promesa de servicio que la propia base de
              datos no puede defender, así que va fuera. En su sitio, algo que
              sí es cierto y además es diferencial: 50 de los últimos 59 pedidos
              se pagaron en efectivo, y en un portal grande eso no se puede. */}
          <FloatCard
            icon={Wallet}
            top="Efectivo o tarjeta"
            bottom="Tú eliges cómo pagar"
            style={{ top: 22, left: -14 }}
          />
          {/* La cifra viene de `landing_vitrina()`, no del código: la anterior
              decía 5 y llevaba meses sin tocarse. Mientras carga, la píldora
              habla sin número en vez de parpadear con uno falso. */}
          <FloatCard
            icon={Star}
            top={total > 0 ? `${total} restaurantes` : 'Restaurantes locales'}
            bottom="ya están en Pidoo"
            style={{ bottom: 22, right: -14 }}
          />
        </div>
      </div>
    </section>
  )
}

const heroCss = `
@media (max-width: 900px) {
  .pd-hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; padding: 96px 20px 56px !important; }
  .pd-hero-media { order: -1; max-width: 380px; margin: 0 auto; }
  .pd-hero-h1 { letter-spacing: -1.4px !important; }
}
@media (max-width: 520px) {
  .pd-hero-pill { max-width: 100% !important; }
}
`
