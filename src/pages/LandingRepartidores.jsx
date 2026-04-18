import { Capacitor } from '@capacitor/core'
import { ChevronLeft, Bell, Bike, Wallet, Clock, Zap, Shield } from 'lucide-react'

const SHIPDAY_SIGNUP_URL = 'https://dispatch.shipday.com/signUp/mcFdlOIL19'

export default function LandingRepartidores({ onBack }) {
  async function handleCta() {
    try {
      if (Capacitor.isNativePlatform()) {
        const { Browser } = await import('@capacitor/browser')
        await Browser.open({ url: SHIPDAY_SIGNUP_URL })
      } else {
        window.open(SHIPDAY_SIGNUP_URL, '_blank')
      }
    } catch (err) {
      console.error('Error abriendo signup Shipday:', err)
      window.open(SHIPDAY_SIGNUP_URL, '_blank')
    }
  }

  const beneficios = [
    { icon: Wallet, label: 'Pagos Diarios' },
    { icon: Clock, label: 'Tu Horario' },
    { icon: Zap, label: 'Libertad' },
    { icon: Shield, label: 'Seguro Incluido' },
  ]

  const pasos = [
    { n: 1, titulo: 'Regístrate', desc: 'Completa el formulario online con tus datos básicos.' },
    { n: 2, titulo: 'Sube documentos', desc: 'DNI, carnet de conducir y papeles de tu vehículo.' },
    { n: 3, titulo: 'Breve Inducción', desc: 'Aprende a usar nuestra app y protocolos de entrega.' },
    { n: 4, titulo: '¡A la calle!', desc: 'Recibe tu kit de bienvenida y empieza a facturar.' },
  ]

  return (
    <div style={{ margin: '-20px', paddingBottom: 120, minHeight: '100vh' }}>
      {/* Header sticky */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--c-bg)',
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--c-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'var(--c-surface2)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ChevronLeft size={20} strokeWidth={2} color="var(--c-text)" />
          </button>
          <span style={{
            display: 'inline-block', padding: '6px 14px', borderRadius: 999,
            background: 'var(--c-primary)', color: '#fff',
            fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
          }}>PIDOO</span>
        </div>
        <button style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'var(--c-surface2)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Bell size={18} strokeWidth={1.8} color="var(--c-text)" />
        </button>
      </div>

      <div style={{ padding: '24px 20px' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 88, height: 88, borderRadius: 22, margin: '0 auto 20px',
            background: 'rgba(255,107,44,0.12)',
            border: '1px solid rgba(255,107,44,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bike size={56} strokeWidth={1.8} color="var(--c-primary)" />
          </div>
          <h1 style={{
            fontSize: 30, fontWeight: 800, lineHeight: 1.15,
            color: 'var(--c-text)', letterSpacing: '-0.02em',
          }}>
            Gana dinero<br />
            repartiendo con <span style={{ color: 'var(--c-primary)' }}>Pidoo</span>
          </h1>
        </div>

        {/* Card ganancia */}
        <div style={{
          background: 'var(--c-glass)',
          border: '1px solid var(--c-glass-border)',
          borderRadius: 22, padding: 22, marginBottom: 28,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.15em',
            color: '#4ADE80', textTransform: 'uppercase', marginBottom: 10,
          }}>
            Ganancia promedio mensual
          </div>
          <div style={{
            fontSize: 40, fontWeight: 900, color: 'var(--c-text)',
            letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 10,
          }}>
            2.000€
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-muted)', lineHeight: 1.5 }}>
            Basado en riders activos de alto rendimiento en zonas premium
          </div>
        </div>

        {/* Grid beneficios */}
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.15em',
          color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: 14,
        }}>
          Tus beneficios
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 32,
        }}>
          {beneficios.map(({ icon: Icon, label }) => (
            <div key={label} style={{
              background: 'var(--c-glass)',
              border: '1px solid var(--c-glass-border)',
              borderRadius: 16, padding: 16,
            }}>
              <Icon size={22} strokeWidth={2} color="var(--c-primary)" style={{ marginBottom: 10 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Cómo funciona */}
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.15em',
          color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: 14,
        }}>
          Cómo funciona
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
          {pasos.map(p => (
            <div key={p.n} style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              background: 'var(--c-glass)',
              border: '1px solid var(--c-glass-border)',
              borderRadius: 16, padding: 16,
            }}>
              <div style={{
                flexShrink: 0,
                width: 32, height: 32, borderRadius: 999,
                background: 'var(--c-primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 800,
              }}>{p.n}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-text)', marginBottom: 4 }}>
                  {p.titulo}
                </div>
                <div style={{ fontSize: 13, color: 'var(--c-muted)', lineHeight: 1.5 }}>
                  {p.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button onClick={handleCta} style={{
          width: '100%', padding: '18px 24px', borderRadius: 16,
          border: 'none', background: 'var(--c-primary)', color: '#fff',
          fontSize: 16, fontWeight: 800, cursor: 'pointer',
          fontFamily: 'inherit', letterSpacing: '0.01em',
          boxShadow: '0 10px 24px rgba(255,107,44,0.35)',
        }}>
          Empezar ahora
        </button>
      </div>
    </div>
  )
}
