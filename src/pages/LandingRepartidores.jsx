import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'
import {
  ChevronLeft, Bike, Clock, Zap, Wallet, Shield, Star, Trophy,
  Heart, Home, MapPin, Gift, CircleDollarSign, Rocket, Calendar,
  Smartphone, UserCheck, TrendingUp,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const ICONOS = {
  Clock, Zap, Bike, Wallet, Shield, Star, Trophy, Heart, Home,
  MapPin, Gift, CircleDollarSign: CircleDollarSign, Rocket, Calendar,
  Smartphone, UserCheck, TrendingUp,
}

const DEFAULT_CONFIG = {
  hero: {
    titulo_linea1: 'Gana dinero',
    titulo_linea2: 'repartiendo con',
    titulo_highlight: 'Pidoo',
    cta_texto: 'Empezar ahora',
    cta_url: 'https://dispatch.shipday.com/signUp/mcFdlOIL19',
  },
  ganancia: {
    visible: true,
    etiqueta: 'Ganancia promedio mensual',
    monto: '2.000€',
    descripcion: 'Basado en riders activos de alto rendimiento en zonas premium',
  },
  beneficios: {
    visible: true,
    titulo: 'Tus beneficios',
    cards: [
      { icono: 'Clock', label: 'Tu Horario' },
      { icono: 'Zap', label: 'Libertad' },
    ],
  },
  pasos: {
    visible: true,
    titulo: 'Cómo funciona',
    items: [
      { titulo: 'Registra tu cuenta', desc: 'Crea tu perfil en nuestra plataforma de reparto con tus datos básicos.' },
      { titulo: 'Elige tus restaurantes aliados', desc: 'Selecciona con qué restaurantes quieres repartir. Ellos serán tus clientes.' },
      { titulo: 'Recibe pedidos y cobra', desc: 'Los pedidos te llegan cuando los restaurantes aceptan. Cobras cada semana el envío + 10% del pedido + propinas.' },
    ],
  },
}

function getIcon(name) {
  return ICONOS[name] || Clock
}

export default function LandingRepartidores({ onBack }) {
  const [config, setConfig] = useState(null)
  const [activa, setActiva] = useState(true)

  useEffect(() => {
    supabase
      .from('landing_repartidores_config')
      .select('activa, config')
      .eq('id', 'default')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.config) setConfig({ ...DEFAULT_CONFIG, ...data.config })
        else setConfig(DEFAULT_CONFIG)
        if (typeof data?.activa === 'boolean') setActiva(data.activa)
      })
      .catch(() => setConfig(DEFAULT_CONFIG))
  }, [])

  async function handleCta() {
    const url = config?.hero?.cta_url || DEFAULT_CONFIG.hero.cta_url
    try {
      if (Capacitor.isNativePlatform()) {
        const { Browser } = await import('@capacitor/browser')
        await Browser.open({ url })
      } else {
        window.open(url, '_blank')
      }
    } catch (err) {
      console.error('Error abriendo CTA:', err)
      window.open(url, '_blank')
    }
  }

  if (!config) {
    return (
      <div style={{ margin: '-20px', paddingBottom: 120, minHeight: '100vh' }}>
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-muted)' }}>Cargando…</div>
      </div>
    )
  }

  if (!activa) {
    return (
      <div style={{ margin: '-20px', paddingBottom: 120, minHeight: '100vh' }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'var(--c-bg)',
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '1px solid var(--c-border)',
        }}>
          <button onClick={onBack} style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'var(--c-surface2)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ChevronLeft size={20} strokeWidth={2} color="var(--c-text)" />
          </button>
        </div>
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Bike size={56} color="var(--c-muted)" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-text)', marginBottom: 8 }}>
            Próximamente
          </h2>
          <p style={{ fontSize: 14, color: 'var(--c-muted)' }}>
            Estamos preparando el programa de repartidores. Vuelve pronto.
          </p>
        </div>
      </div>
    )
  }

  const { hero, ganancia, beneficios, pasos } = config

  const fadeIn = (delay) => ({
    animation: `fadeInUp 0.5s ease-out ${delay}s both`,
  })

  return (
    <div style={{ margin: '-20px', paddingBottom: 120, minHeight: '100vh' }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--c-bg)',
        padding: '12px 20px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid var(--c-border)',
      }}>
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

      <div style={{ padding: '24px 20px' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 28, ...fadeIn(0) }}>
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
            {hero.titulo_linea1}<br />
            {hero.titulo_linea2} <span style={{ color: 'var(--c-primary)' }}>{hero.titulo_highlight}</span>
          </h1>
        </div>

        {/* Ganancia */}
        {ganancia?.visible && (
          <div style={{
            background: 'var(--c-glass)',
            border: '1px solid var(--c-glass-border)',
            borderRadius: 22, padding: 22, marginBottom: 28,
            textAlign: 'center',
            ...fadeIn(0.1),
          }}>
            <div style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.15em',
              color: '#4ADE80', textTransform: 'uppercase', marginBottom: 10,
            }}>
              {ganancia.etiqueta}
            </div>
            <div style={{
              fontSize: 40, fontWeight: 900, color: 'var(--c-text)',
              letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 10,
            }}>
              {ganancia.monto}
            </div>
            <div style={{ fontSize: 12, color: 'var(--c-muted)', lineHeight: 1.5 }}>
              {ganancia.descripcion}
            </div>
          </div>
        )}

        {/* Beneficios */}
        {beneficios?.visible && beneficios.cards?.length > 0 && (
          <div style={fadeIn(0.2)}>
            <div style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '0.15em',
              color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: 14,
            }}>
              {beneficios.titulo}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: beneficios.cards.length === 1 ? '1fr' : 'repeat(2, 1fr)',
              gap: 12, marginBottom: 32,
            }}>
              {beneficios.cards.map((b, i) => {
                const Icon = getIcon(b.icono)
                return (
                  <div key={i} style={{
                    background: 'var(--c-glass)',
                    border: '1px solid var(--c-glass-border)',
                    borderRadius: 16, padding: 16,
                  }}>
                    <Icon size={22} strokeWidth={2} color="var(--c-primary)" style={{ marginBottom: 10 }} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)' }}>{b.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Pasos */}
        {pasos?.visible && pasos.items?.length > 0 && (
          <div style={fadeIn(0.3)}>
            <div style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '0.15em',
              color: 'var(--c-muted)', textTransform: 'uppercase', marginBottom: 14,
            }}>
              {pasos.titulo}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
              {pasos.items.map((p, i) => (
                <div key={i} style={{
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
                  }}>{i + 1}</div>
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
          </div>
        )}

        <button onClick={handleCta} style={{
          width: '100%', padding: '18px 24px', borderRadius: 16,
          border: 'none', background: 'var(--c-primary)', color: '#fff',
          fontSize: 16, fontWeight: 800, cursor: 'pointer',
          fontFamily: 'inherit', letterSpacing: '0.01em',
          boxShadow: '0 10px 24px rgba(255,107,44,0.35)',
          ...fadeIn(0.4),
        }}>
          {hero.cta_texto}
        </button>
      </div>
    </div>
  )
}
