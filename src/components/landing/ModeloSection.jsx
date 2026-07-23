/* ──────────────────────────────────────────────────────────────────────────
 * MODELO — el socio como empresario con su propio marketplace (DESTACADO),
 * con un ejemplo visual de cómo el pedido le llega directo. Debajo, el bloque
 * del restaurante (más compacto).
 * ────────────────────────────────────────────────────────────────────────── */
import { Store, Bike, Globe, Wallet, ArrowRight, Bell } from 'lucide-react'
import { SolidBtn, GhostBtn, Chip, Bullet } from './_ui'

const SOCIO_URL = 'https://socio.pidoo.es'
const PANEL_URL = 'https://panel.pidoo.es'

/* Mockup de móvil del socio recibiendo un pedido directo */
const PhoneIncomingOrder = () => (
  <div
    className="pd-phone"
    style={{
      width: 260,
      background: '#1A1815',
      borderRadius: 34,
      padding: 10,
      boxShadow: '0 30px 60px -20px rgba(26,24,21,0.5)',
      flexShrink: 0,
    }}
  >
    <div
      style={{
        background: 'var(--c-cream)',
        borderRadius: 26,
        overflow: 'hidden',
        height: 480,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Barra de marca del socio */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FF6B2C 0%, #E4671F 100%)',
          color: '#FFFFFF',
          padding: '16px 16px 14px',
        }}
      >
        <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 700, letterSpacing: 0.4 }}>
          TU MARKETPLACE
        </div>
        <div style={{ fontSize: 19, fontWeight: 800, marginTop: 2 }}>Agora Express</div>
        <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>pidoo.es/s/agora-express</div>
      </div>

      {/* Aviso de pedido entrante */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            alignSelf: 'flex-start',
            background: 'var(--c-sage-soft)',
            color: 'var(--c-sage-2)',
            borderRadius: 999,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          <Bell size={13} strokeWidth={2.6} />
          Nuevo pedido · llega directo a ti
        </div>

        <div
          style={{
            background: 'var(--c-paper)',
            border: '1px solid var(--c-border)',
            borderRadius: 16,
            padding: 14,
            boxShadow: '0 1px 3px rgba(26,24,21,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--c-ink)' }}>PD-8F3K2</span>
            <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--c-terracotta-2)' }}>18,40 €</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--c-muted)', marginTop: 6, lineHeight: 1.5 }}>
            2× Burger clásica<br />1× Patatas · 1× Refresco
          </div>
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: '1px solid var(--c-border)',
              fontSize: 12,
              color: 'var(--c-muted)',
            }}
          >
            Tu ganancia: envío + 10% + propina
          </div>
        </div>

        <div
          style={{
            marginTop: 'auto',
            background: 'linear-gradient(180deg, #FF6B2C 0%, #E4671F 100%)',
            color: '#FFFFFF',
            borderRadius: 12,
            padding: '13px',
            textAlign: 'center',
            fontWeight: 800,
            fontSize: 15,
          }}
        >
          Aceptar y repartir
        </div>
      </div>
    </div>
  </div>
)

const FlowStep = ({ n, title, children }) => (
  <div
    style={{
      flex: 1,
      minWidth: 180,
      background: 'var(--c-paper)',
      border: '1px solid var(--c-border)',
      borderRadius: 16,
      padding: 18,
    }}
  >
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: 999,
        background: 'var(--c-terracotta-soft)',
        color: 'var(--c-terracotta-2)',
        fontWeight: 800,
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
      }}
    >
      {n}
    </div>
    <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--c-ink)', marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: 13.5, color: 'var(--c-muted)', lineHeight: 1.5 }}>{children}</div>
  </div>
)

export default function ModeloSection() {
  return (
    <section id="modelo" style={{ background: 'var(--c-cream)', padding: '72px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Encabezado */}
        <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 44px' }}>
          <Chip>El modelo Pidoo</Chip>
          <h2
            className="landing-h2"
            style={{
              fontSize: 42,
              fontWeight: 800,
              letterSpacing: -1,
              color: 'var(--c-ink)',
              margin: '16px 0 10px',
              lineHeight: 1.1,
            }}
          >
            Dos formas de crecer con Pidoo
          </h2>
          <p style={{ fontSize: 17, color: 'var(--c-muted)', lineHeight: 1.6 }}>
            Reparte con tu propia marca o pon tu restaurante online. Sin portales que se
            queden con tus clientes.
          </p>
        </div>

        {/* BLOQUE SOCIO — destacado */}
        <div
          className="pd-socio-card"
          style={{
            background:
              'linear-gradient(135deg, rgba(197,86,44,0.10) 0%, rgba(251,248,242,0.6) 55%), var(--c-paper)',
            border: '1.5px solid var(--c-terracotta-soft)',
            borderRadius: 28,
            padding: 36,
            display: 'grid',
            gridTemplateColumns: '1.15fr 0.85fr',
            gap: 40,
            alignItems: 'center',
            boxShadow: '0 20px 50px -24px rgba(197,86,44,0.28)',
          }}
        >
          <div>
            <Chip tone="terracotta" style={{ marginBottom: 14 }}>
              <Store size={13} strokeWidth={2.6} /> Para socios · nuestro modelo base
            </Chip>
            <h3
              style={{
                fontSize: 34,
                fontWeight: 800,
                letterSpacing: -1,
                color: 'var(--c-ink)',
                lineHeight: 1.1,
                margin: '0 0 12px',
              }}
            >
              Los pedidos, directos a tu marca
            </h3>
            <p style={{ fontSize: 16, color: 'var(--c-text-soft)', lineHeight: 1.6, marginBottom: 20 }}>
              Agrupa restaurantes bajo <strong>tu marca</strong>, con tu logo, tus colores y tu
              propia web <strong>pidoo.es/s/tu-marca</strong>. Tú eres el dueño: los pedidos
              te llegan <strong>directos a ti</strong>, tú repartes y tú cobras.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'grid', gap: 12 }}>
              <Bullet>Tu marca, tu logo y tu color propio</Bullet>
              <Bullet>Tu URL pública: pidoo.es/s/tu-marca</Bullet>
              <Bullet>Los pedidos entran directos a tu móvil</Bullet>
              <Bullet>Tú repartes y cobras: envío + 10% del subtotal + propina</Bullet>
            </ul>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <SolidBtn href={SOCIO_URL} size="lg">
                Hazte socio <ArrowRight size={17} strokeWidth={2.5} />
              </SolidBtn>
              <GhostBtn href="#descargas" size="lg">
                Ver la app
              </GhostBtn>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PhoneIncomingOrder />
          </div>
        </div>

        {/* MINI-FLUJO: cómo le llega el pedido */}
        <div
          className="pd-flow"
          style={{
            display: 'flex',
            gap: 14,
            alignItems: 'stretch',
            marginTop: 22,
            flexWrap: 'wrap',
          }}
        >
          <FlowStep n="1" title="El cliente pide en tu marca">
            Entra en tu web pidoo.es/s/tu-marca y hace su pedido.
          </FlowStep>
          <FlowStep n="2" title="Entra directo a tu panel">
            Recibes el aviso al instante en tu móvil. Sin intermediarios.
          </FlowStep>
          <FlowStep n="3" title="Tú repartes y cobras">
            Aceptas, llevas el pedido y te quedas envío + 10% + propina.
          </FlowStep>
        </div>

        {/* BLOQUE RESTAURANTE — secundario */}
        <div
          className="pd-rest-card"
          style={{
            marginTop: 40,
            background: 'var(--c-paper)',
            border: '1px solid var(--c-border)',
            borderRadius: 24,
            padding: 32,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 32,
            alignItems: 'center',
          }}
        >
          <div>
            <Chip tone="ink" style={{ marginBottom: 14 }}>
              <Bike size={13} strokeWidth={2.6} /> Para restaurantes
            </Chip>
            <h3
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: -0.8,
                color: 'var(--c-ink)',
                lineHeight: 1.15,
                margin: '0 0 10px',
              }}
            >
              Tu delivery, solo 10% por pedido
            </h3>
            <p style={{ fontSize: 15.5, color: 'var(--c-muted)', lineHeight: 1.6, marginBottom: 18 }}>
              Tu carta online con tu propia URL, sin cuotas mensuales y con la red de socios
              repartiendo por ti.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <SolidBtn href={PANEL_URL}>
                Da de alta tu restaurante <ArrowRight size={16} strokeWidth={2.5} />
              </SolidBtn>
            </div>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
            <Bullet>Solo 10% por pedido · sin cuota mensual</Bullet>
            <Bullet>Alta única de 150 € · sin permanencia</Bullet>
            <Bullet>Pedidos en tiempo real en tu panel</Bullet>
            <Bullet>Red de socios que reparten por ti</Bullet>
          </ul>
        </div>
      </div>
    </section>
  )
}
