/* ──────────────────────────────────────────────────────────────────────────
 * ÚNETE A PIDOO — captación estilo Glovo "Let's do it together".
 * Tarjeta SOCIO destacada (monta tu marketplace: te damos restaurantes,
 * tecnología y marketing) + restaurante + repartidor.
 * ────────────────────────────────────────────────────────────────────────── */
import { Store, Bike, Utensils, ArrowRight, Cpu, Megaphone } from 'lucide-react'

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"
const INK = '#1A1815'

const SOCIO_URL = 'https://socio.pidoo.es'
const PANEL_URL = 'https://panel.pidoo.es'

const SupplyItem = ({ icon: Icon, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <span
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        background: 'rgba(255,255,255,0.16)',
        color: '#FFF',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={17} strokeWidth={2.3} />
    </span>
    <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: '#FFF' }}>{children}</span>
  </div>
)

/* Tarjeta secundaria (restaurante / repartidor) */
const MiniCard = ({ icon: Icon, title, desc, cta, href }) => (
  <div
    style={{
      background: 'var(--c-paper)',
      border: '1px solid var(--c-border)',
      borderRadius: 24,
      padding: 28,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      boxShadow: '0 1px 3px rgba(26,24,21,0.04)',
    }}
  >
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 15,
        background: 'rgba(255,107,44,0.12)',
        color: '#E4671F',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={26} strokeWidth={2.2} />
    </div>
    <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 20, letterSpacing: -0.4, color: 'var(--c-ink)' }}>
      {title}
    </div>
    <div style={{ fontFamily: FONT, fontSize: 14.5, color: 'var(--c-muted)', lineHeight: 1.55, flex: 1 }}>{desc}</div>
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        fontFamily: FONT,
        fontSize: 15,
        fontWeight: 800,
        color: '#E4671F',
        textDecoration: 'none',
        marginTop: 4,
      }}
    >
      {cta} <ArrowRight size={16} strokeWidth={2.6} />
    </a>
  </div>
)

export default function UneteCTA() {
  return (
    <section id="socios" style={{ background: 'var(--c-surface2)', padding: '80px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Encabezado */}
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto 44px' }}>
          <span
            style={{
              display: 'inline-flex',
              background: 'rgba(255,107,44,0.12)',
              color: '#E4671F',
              borderRadius: 999,
              padding: '7px 14px',
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 800,
              marginBottom: 16,
            }}
          >
            Haz crecer tu negocio
          </span>
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
            Emprende con Pidoo
          </h2>
          <p style={{ fontFamily: FONT, fontSize: 17, color: 'var(--c-muted)', lineHeight: 1.6 }}>
            Ponemos la tecnología, los restaurantes y el marketing. Tú te quedas los pedidos.
          </p>
        </div>

        {/* TARJETA SOCIO DESTACADA — bloque naranja */}
        <div
          className="pd-unete-socio"
          style={{
            background: 'linear-gradient(135deg, #FF6B2C 0%, #E4671F 100%)',
            borderRadius: 30,
            padding: 44,
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.9fr',
            gap: 40,
            alignItems: 'center',
            boxShadow: '0 30px 70px -30px rgba(228,103,31,0.55)',
            marginBottom: 22,
          }}
        >
          <div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                background: 'rgba(26,24,21,0.18)',
                color: '#FFF',
                borderRadius: 999,
                padding: '7px 14px',
                fontFamily: FONT,
                fontSize: 13,
                fontWeight: 800,
                marginBottom: 18,
              }}
            >
              <Store size={14} strokeWidth={2.8} /> Pidoo Socio
            </span>
            <h3
              style={{
                fontFamily: FONT,
                fontSize: 'clamp(28px, 3.6vw, 40px)',
                fontWeight: 800,
                letterSpacing: -1.2,
                color: '#FFF',
                lineHeight: 1.05,
                margin: '0 0 14px',
              }}
            >
              Monta tu propio marketplace de comida
            </h3>
            <p
              style={{
                fontFamily: FONT,
                fontSize: 16.5,
                fontWeight: 500,
                color: '#FFF',
                opacity: 0.94,
                lineHeight: 1.55,
                margin: '0 0 24px',
                maxWidth: 460,
              }}
            >
              Crea tu marca de delivery en <strong>pidoo.es/s/tu-marca</strong>, como tu propio
              Glovo local. Nosotros te lo damos todo montado; tú repartes y cobras.
            </p>

            <div style={{ display: 'grid', gap: 12, marginBottom: 28 }}>
              <SupplyItem icon={Utensils}>Restaurantes listos para vender</SupplyItem>
              <SupplyItem icon={Cpu}>La tecnología y la app, hechas</SupplyItem>
              <SupplyItem icon={Megaphone}>Material de marketing para captar clientes</SupplyItem>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <a
                href={SOCIO_URL}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: INK,
                  color: '#FFF',
                  borderRadius: 999,
                  padding: '15px 28px',
                  fontFamily: FONT,
                  fontSize: 16,
                  fontWeight: 800,
                  textDecoration: 'none',
                  boxShadow: '0 12px 26px -10px rgba(26,24,21,0.5)',
                }}
              >
                Empieza gratis <ArrowRight size={18} strokeWidth={2.6} />
              </a>
              {/* El precio, en la portada. Decía solo "Sin permanencia" y el
                  plan cuesta 30 €/mes: no aparecía ni aquí, ni en
                  socio.pidoo.es, ni en los 4 pasos del alta — el socio se lo
                  encontraba ya dentro del panel. La cifra es la que cobra
                  Stripe (`pido-panel-socio/src/pages/MiSuscripcion.jsx:191`);
                  si cambia allí, hay que cambiarla aquí. */}
              <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: '#FFF', opacity: 0.9 }}>
                7 días gratis, luego 30 €/mes · sin permanencia
              </span>
            </div>
          </div>

          {/* Mockup: marca del socio */}
          <div className="pd-unete-mock" style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                width: '100%',
                maxWidth: 300,
                background: '#FFFFFF',
                borderRadius: 22,
                padding: 22,
                boxShadow: '0 30px 60px -24px rgba(26,24,21,0.5)',
              }}
            >
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: '#9A8F7E', letterSpacing: 0.5 }}>
                TU MARKETPLACE
              </div>
              <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 800, color: INK, marginTop: 3, letterSpacing: -0.6 }}>
                Ágora Express
              </div>
              <div style={{ fontFamily: FONT, fontSize: 13, color: '#E4671F', fontWeight: 700, marginTop: 2 }}>
                pidoo.es/s/agora-express
              </div>
              <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
                {['Come y Calla', "Max's Pizza", 'Rincón de Fran'].map((r) => (
                  <div
                    key={r}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#FBF8F2',
                      border: '1px solid #E8E1D3',
                      borderRadius: 13,
                      padding: '11px 14px',
                    }}
                  >
                    <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: INK }}>{r}</span>
                    <span
                      style={{
                        fontFamily: FONT,
                        fontSize: 11,
                        fontWeight: 800,
                        color: '#6F8460',
                        background: '#DDE3D3',
                        borderRadius: 999,
                        padding: '3px 9px',
                      }}
                    >
                      Abierto
                    </span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 16,
                  background: 'linear-gradient(180deg, #FF6B2C 0%, #E4671F 100%)',
                  color: '#FFF',
                  borderRadius: 12,
                  padding: 12,
                  textAlign: 'center',
                  fontFamily: FONT,
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                Tu marca · tus clientes
              </div>
            </div>
          </div>
        </div>

        {/* DOS TARJETAS SECUNDARIAS */}
        <div className="pd-unete-mini" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
          <MiniCard
            icon={Utensils}
            title="Pon tu restaurante online"
            desc="Tu carta con tu propia URL y sin cuota mensual. 10 % de comisión Pidoo; si reparte un socio de la red, él cobra aparte envío + 10 %."
            cta="Da de alta tu restaurante"
            href={PANEL_URL}
          />
          <MiniCard
            icon={Bike}
            title="Reparte con Pidoo"
            desc="Únete como repartidor a la red de socios y gana con cada entrega: envío + comisión + propina."
            cta="Quiero repartir"
            href={SOCIO_URL}
          />
        </div>
      </div>
    </section>
  )
}
