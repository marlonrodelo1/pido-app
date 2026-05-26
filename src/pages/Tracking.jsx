import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Star, Phone, MapPin, CheckCircle2, X as XIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Paleta directa
const C = {
  cream: '#F7F3EC', cream2: '#EFE9DD', paper: '#FBF8F2',
  ink: '#1A1815', ink2: '#2B2823', stone: '#6B6356', stone2: '#8A8174',
  terracotta: '#C5562C', terracotta2: '#A8451F', terracottaSoft: '#F1D9CC',
  sage: '#8B9D7A', sage2: '#6F8460', sageSoft: '#DDE3D3',
  warning: '#C99551', warningSoft: '#F0E1C8',
  danger: '#B5564A', dangerSoft: '#F1D0CB',
  border: '#E8E1D3',
}
const SH = {
  sm: '0 1px 2px rgba(26,24,21,0.06)',
  md: '0 4px 14px rgba(26,24,21,0.08)',
  glossy: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 10px rgba(0,0,0,0.18)',
}

const AUTO_CLOSE_SECONDS = 8

function estadoToStep(estado) {
  if (estado === 'nuevo' || estado === 'aceptado') return 0
  if (estado === 'preparando' || estado === 'listo') return 1
  if (estado === 'recogido' || estado === 'en_camino') return 2
  if (estado === 'entregado') return 3
  return 0
}

function riderAsignado(pedido) {
  const st = (pedido.shipday_status || '').toUpperCase()
  return !!pedido.shipday_tracking_url && !['', 'NOT_ASSIGNED', 'NOT_ACCEPTED', 'CREATED'].includes(st)
}

export default function Tracking({ pedido: pedidoInicial, onClose }) {
  const { user } = useAuth()
  const [pedido, setPedido] = useState(pedidoInicial)
  const [socio, setSocio] = useState(null)
  const [valoracion, setValoracion] = useState(0)
  const [textoResena, setTextoResena] = useState('')
  const [resenaEnviada, setResenaEnviada] = useState(false)
  const [yaValorado, setYaValorado] = useState(false)
  const [errorResena, setErrorResena] = useState(null)
  // Reseña del socio (2º paso, solo si pedido.socio_id)
  const [pasoResena, setPasoResena] = useState(1) // 1 = restaurante, 2 = socio
  const [valoracionSocio, setValoracionSocio] = useState(0)
  const [textoResenaSocio, setTextoResenaSocio] = useState('')
  const [resenaSocioEnviada, setResenaSocioEnviada] = useState(false)
  const [yaValoradoSocio, setYaValoradoSocio] = useState(false)
  const [iframeError, setIframeError] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_SECONDS)
  const [autoCloseCancelled, setAutoCloseCancelled] = useState(false)

  const esTerminado = pedido.estado === 'entregado' || pedido.estado === 'cancelado' || pedido.estado === 'fallido'
  const esDelivery = pedido.modo_entrega === 'delivery'
  const esPickup = pedido.modo_entrega === 'pickup' || pedido.modo_entrega === 'recogida'

  useEffect(() => {
    supabase.from('pedidos').select('*').eq('id', pedidoInicial.id).single()
      .then(({ data }) => {
        if (data) {
          setPedido(data)
          if (data.socio_id) {
            supabase.from('socios')
              .select('nombre_comercial, slug, logo_url, color_primario')
              .eq('id', data.socio_id).maybeSingle()
              .then(({ data: socioData }) => { if (socioData) setSocio(socioData) })
          }
        }
      })
  }, [pedidoInicial.id])

  function abrirSocio() {
    if (!socio?.slug) return
    window.location.hash = `#/s/${socio.slug}`
  }

  function hexToRgba(hex, alpha = 0.1) {
    if (!hex) return `rgba(255,107,44,${alpha})`
    const h = hex.replace('#', '')
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
    const r = parseInt(full.slice(0, 2), 16)
    const g = parseInt(full.slice(2, 4), 16)
    const b = parseInt(full.slice(4, 6), 16)
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return `rgba(255,107,44,${alpha})`
    return `rgba(${r},${g},${b},${alpha})`
  }

  function SocioBanner() {
    if (!socio) return null
    const color = socio.color_primario || C.terracotta
    const initials = (socio.nombre_comercial || '?').charAt(0).toUpperCase()
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: C.terracottaSoft,
        border: `1px solid ${C.terracotta}`,
        borderRadius: 14, padding: '12px 14px', marginBottom: 14,
      }}>
        {socio.logo_url ? (
          <img src={socio.logo_url} alt={socio.nombre_comercial} style={{
            width: 40, height: 40, borderRadius: '50%', objectFit: 'cover',
            background: '#fff', flexShrink: 0,
          }} />
        ) : (
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: color, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 14, flexShrink: 0,
          }}>{initials}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11, color: C.terracotta2, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>Entregado por</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, lineHeight: 1.25 }}>
            {socio.nombre_comercial} · Pidoo
          </div>
          {socio.slug && (
            <button onClick={abrirSocio} style={{
              background: 'none', border: 'none', padding: 0, marginTop: 2,
              fontSize: 11, fontWeight: 700, color: C.terracotta2, cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left',
            }}>
              Volver a pedir en {socio.nombre_comercial} →
            </button>
          )}
        </div>
      </div>
    )
  }

  useEffect(() => {
    const uid = user?.id || pedido.usuario_id
    if (pedido.id && uid) {
      supabase.from('resenas').select('id').eq('pedido_id', pedido.id).eq('usuario_id', uid).maybeSingle()
        .then(({ data }) => { if (data) setYaValorado(true) })
      if (pedido.socio_id) {
        supabase.from('resenas_socio').select('id').eq('pedido_id', pedido.id).eq('usuario_id', uid).maybeSingle()
          .then(({ data }) => { if (data) setYaValoradoSocio(true) })
      }
    }
  }, [pedido.id, pedido.socio_id, user?.id])

  useEffect(() => {
    const channel = supabase.channel(`tracking-${pedido.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'pedidos',
        filter: `id=eq.${pedido.id}`,
      }, payload => {
        setPedido(prev => ({ ...prev, ...payload.new }))
      })
      .subscribe()

    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('pedidos')
        .select('estado, motivo_cancelacion, metodo_pago, shipday_status, shipday_tracking_url, minutos_preparacion, modo_entrega')
        .eq('id', pedido.id)
        .single()
      if (data) setPedido(prev => ({ ...prev, ...data }))
    }, 4000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [pedido.id, esTerminado])

  // Auto-cierre cuando pasa a entregado
  useEffect(() => {
    if (pedido.estado !== 'entregado') return
    if (autoCloseCancelled) return
    if (yaValorado || resenaEnviada) return

    if (secondsLeft <= 0) {
      onClose()
      return
    }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [pedido.estado, secondsLeft, autoCloseCancelled, yaValorado, resenaEnviada, onClose])

  async function abrirTrackingExterno() {
    const url = pedido.shipday_tracking_url
    if (!url) return
    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url, presentationStyle: 'popover', windowName: '_self' })
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  // Botón prominente cuando hay shipday_tracking_url y el rider ya aceptó / recogió / está en camino
  const mostrarBotonTrackingMapa = !!pedido.shipday_tracking_url && riderAsignado(pedido)

  async function enviarValoracion() {
    if (!valoracion || yaValorado || resenaEnviada) return
    const uid = user?.id || pedido.usuario_id
    if (!uid) {
      setErrorResena('No se pudo identificar al usuario. Inicia sesión de nuevo.')
      return
    }
    setErrorResena(null)
    const { error } = await supabase.from('resenas').insert({
      usuario_id: uid,
      establecimiento_id: pedido.establecimiento_id,
      pedido_id: pedido.id,
      rating: valoracion,
      texto: textoResena.trim() || null,
    })
    if (!error) {
      setResenaEnviada(true)
      setYaValorado(true)
      setTimeout(() => onClose(), 1200)
    } else {
      setErrorResena('No se pudo enviar la valoración. Inténtalo de nuevo.')
    }
  }

  // ==================== CANCELADO / FALLIDO ====================
  if (pedido.estado === 'cancelado' || pedido.estado === 'fallido') {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: 0, letterSpacing: '-0.02em' }}>Tu pedido</h2>
          <span style={{ fontSize: 12, color: C.stone, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>{pedido.codigo}</span>
        </div>
        <SocioBanner />
        <div style={{
          background: C.dangerSoft, borderRadius: 14, padding: 28,
          textAlign: 'center', border: 'none',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: C.danger, marginBottom: 14,
          }}>
            <XIcon size={36} strokeWidth={2} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 20, color: C.danger, marginBottom: 8 }}>
            {pedido.estado === 'cancelado' ? 'Pedido cancelado' : 'Entrega fallida'}
          </div>
          {pedido.motivo_cancelacion && (
            <div style={{
              fontSize: 13, color: C.ink, marginBottom: 14, fontWeight: 600,
              background: C.paper, borderRadius: 10, padding: '10px 14px',
            }}>
              {pedido.motivo_cancelacion}
            </div>
          )}
          <div style={{ fontSize: 12, color: C.danger, opacity: 0.85, marginBottom: 20 }}>
            {pedido.metodo_pago === 'tarjeta'
              ? 'Si se realizó el cobro, el reembolso se procesará automáticamente.'
              : 'No se ha realizado ningún cobro.'}
          </div>
          <button onClick={onClose} style={{
            padding: '12px 28px', borderRadius: 12, border: 'none',
            background: `linear-gradient(180deg, ${C.ink2}, ${C.ink})`,
            color: C.cream, fontSize: 14, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', boxShadow: SH.glossy,
          }}>
            Entendido
          </button>
        </div>
      </div>
    )
  }

  // ==================== ENTREGADO ====================
  if (pedido.estado === 'entregado') {
    const mostrarContador = !autoCloseCancelled && !yaValorado && !resenaEnviada
    // Paleta de confetti — colores cálidos del design system
    const confettiColors = ['#C5562C', '#8B9D7A', '#C99551', '#7B8FA8', '#F7F3EC', '#6B6356']

    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <style>{`
          @keyframes popCheck { 0%{transform:scale(0.3);opacity:0} 60%{transform:scale(1.15);opacity:1} 100%{transform:scale(1);opacity:1} }
          @keyframes confettiFall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(280px) rotate(720deg);opacity:0} }
        `}</style>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: 0, letterSpacing: '-0.02em' }}>Tu pedido</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: C.stone, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>{pedido.codigo}</span>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', fontSize: 12, fontWeight: 700,
              color: C.terracotta, cursor: 'pointer', fontFamily: 'inherit',
            }}>Cerrar</button>
          </div>
        </div>

        <SocioBanner />

        {/* Celebración */}
        <div style={{
          position: 'relative', textAlign: 'center', padding: '36px 0 26px',
          marginBottom: 18, overflow: 'hidden',
        }}>
          {/* Confetti */}
          {confettiColors.map((c, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: -10,
              left: `${10 + i * 15}%`,
              width: 6, height: 10,
              background: c,
              animation: `confettiFall ${2 + i * 0.3}s linear ${i * 0.15}s infinite`,
              borderRadius: 1,
            }} />
          ))}
          <div style={{
            width: 96, height: 96, margin: '0 auto', borderRadius: '50%',
            background: C.sageSoft,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: C.sage2, animation: 'popCheck 0.6s ease-out',
          }}>
            <CheckCircle2 size={56} strokeWidth={1.5} />
          </div>
          <div style={{
            fontSize: 26, fontWeight: 800, color: C.ink, marginTop: 18,
            letterSpacing: '-0.02em',
          }}>¡Pedido entregado!</div>
          <div style={{ fontSize: 14, color: C.stone, marginTop: 6 }}>
            Esperamos que lo disfrutes 🍕
          </div>
        </div>

        {/* Contador auto-cierre */}
        {mostrarContador && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            padding: '10px 14px', borderRadius: 10,
            background: C.cream2, marginBottom: 16,
          }}>
            <span style={{ fontSize: 11, color: C.stone }}>Cerrando en {secondsLeft}s...</span>
            <button onClick={() => setAutoCloseCancelled(true)} style={{
              background: 'none', border: 'none', fontSize: 11, fontWeight: 700,
              color: C.terracotta, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Dejar valoración
            </button>
          </div>
        )}

        {/* Formulario valoración */}
        {(autoCloseCancelled || yaValorado || resenaEnviada) && (
          <div style={{
            background: C.paper, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: 20,
          }}>
            {yaValorado || resenaEnviada ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: C.sageSoft,
                  color: C.sage2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 10,
                }}>
                  <Star size={26} fill={C.sage2} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Gracias por tu valoración</div>
                <div style={{ fontSize: 12, color: C.stone, marginTop: 4 }}>Tu opinión nos ayuda a mejorar</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, marginBottom: 14, textAlign: 'center', letterSpacing: '-0.01em' }}>
                  ¿Cómo fue?
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <button key={i} onClick={() => setValoracion(i)} style={{
                      width: 44, height: 44, borderRadius: '50%',
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      color: C.warning,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Star size={36} strokeWidth={1.3} fill={i <= valoracion ? C.warning : 'none'} />
                    </button>
                  ))}
                </div>
                {valoracion > 0 && (
                  <>
                    <textarea
                      value={textoResena} onChange={e => setTextoResena(e.target.value)}
                      placeholder="Cuéntanos cómo fue tu experiencia…" rows={3}
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: 10,
                        border: `1px solid ${C.border}`, background: C.cream,
                        fontSize: 13, fontFamily: 'inherit', color: C.ink,
                        outline: 'none', boxSizing: 'border-box', resize: 'vertical',
                        marginBottom: 12,
                      }}
                    />
                    {errorResena && (
                      <div style={{ fontSize: 12, color: C.danger, textAlign: 'center', marginBottom: 10, fontWeight: 600 }}>
                        {errorResena}
                      </div>
                    )}
                    <button onClick={enviarValoracion} style={{
                      width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
                      background: `linear-gradient(180deg, ${C.ink2}, ${C.ink})`,
                      color: C.cream, fontSize: 14, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit', boxShadow: SH.glossy,
                    }}>
                      Enviar valoración
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: C.stone }}>
          {pedido.metodo_pago === 'tarjeta' ? '💳 Pagado con tarjeta' : '💵 Pago en efectivo'}
        </div>
      </div>
    )
  }

  // ==================== EN CURSO ====================
  const currentStep = estadoToStep(pedido.estado)
  const riderOk = riderAsignado(pedido)

  const stepLabels = esPickup
    ? ['Aceptado', 'Preparando', 'Listo', 'Recogido']
    : ['Aceptado', 'Preparando', 'En camino', 'Entregado']

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: 0, letterSpacing: '-0.02em' }}>Tu pedido</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: C.stone, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>{pedido.codigo}</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 12, fontWeight: 700,
            color: C.terracotta, cursor: 'pointer', fontFamily: 'inherit',
          }}>Cerrar</button>
        </div>
      </div>

      <SocioBanner />

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse2 { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.12);opacity:0.7} }
        @keyframes tckPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:0.5} }
        @keyframes chopChop { 0%{transform:rotate(0deg)} 100%{transform:rotate(-22deg)} }
        @keyframes chopChop2 { 0%{transform:rotate(0deg) scaleX(-1)} 100%{transform:rotate(22deg) scaleX(-1)} }
        @keyframes steamRise { 0%{opacity:0.6;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-22px) scale(1.4)} }
        @keyframes sizzle { 0%{opacity:0.3;transform:scale(0.8)} 100%{opacity:1;transform:scale(1.3)} }
        @keyframes floatPan { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes moto { 0%{transform:translateX(-10px)} 100%{transform:translateX(10px)} }
      `}</style>

      {/* Subtítulo + ETA */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, letterSpacing: '-0.01em' }}>
          {pedido.estado === 'nuevo' || pedido.estado === 'aceptado'
            ? 'Esperando confirmación'
            : pedido.estado === 'preparando' || pedido.estado === 'listo'
              ? esPickup ? 'Tu pedido se está preparando' : 'Preparando tu pedido'
              : esDelivery ? 'Va de camino' : 'Recogiendo tu pedido'}
        </div>
        {pedido.minutos_preparacion && (pedido.estado === 'preparando' || pedido.estado === 'aceptado' || pedido.estado === 'nuevo') && (
          <div style={{ fontSize: 13, color: C.stone, marginTop: 4 }}>
            Estimación: <b style={{ color: C.ink }}>{pedido.minutos_preparacion} min</b>
          </div>
        )}
      </div>

      {/* STEPPER — card paper con 4 segmentos sage */}
      <div style={{
        background: C.paper, border: `1px solid ${C.border}`,
        borderRadius: 14, padding: 16, marginBottom: 14,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stepLabels.length}, 1fr)`, gap: 8 }}>
          {stepLabels.map((label, idx) => {
            const done = idx < currentStep
            const current = idx === currentStep
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: '100%', height: 6, borderRadius: 999,
                  background: done || current ? C.sage : C.cream2,
                }} />
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: current ? C.terracotta : done ? C.sage : C.stone2,
                  animation: current ? 'tckPulse 1.8s infinite' : 'none',
                }} />
                <div style={{
                  fontSize: 11, fontWeight: 600, textAlign: 'center',
                  color: current ? C.terracotta : done ? C.sage2 : C.stone,
                }}>{label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Estado 0: Esperando al restaurante */}
      {(pedido.estado === 'nuevo' || pedido.estado === 'aceptado') && (
        <div style={{
          borderRadius: 14, marginBottom: 14, padding: '28px 18px',
          background: C.paper, border: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: C.terracottaSoft,
            color: C.terracotta2,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, animation: 'pulse2 2s ease-in-out infinite',
          }}>⏳</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Esperando al restaurante</div>
          <div style={{ fontSize: 12, color: C.stone, textAlign: 'center' }}>
            Te avisaremos cuando acepten tu pedido
          </div>
        </div>
      )}

      {/* Estado 1: Preparando / Listo */}
      {(pedido.estado === 'preparando' || pedido.estado === 'listo') && (
        <>
          <div style={{
            borderRadius: 14, marginBottom: 12, padding: '24px 18px',
            background: C.paper, border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: C.warningSoft,
              color: '#8B6126',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: 30, animation: 'floatPan 2s ease-in-out infinite',
            }}>👨‍🍳</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, lineHeight: 1.25 }}>
                {pedido.estado === 'listo' ? 'Pedido listo' : 'Preparando tu pedido'}
              </div>
              <div style={{ fontSize: 12, color: C.stone, marginTop: 4, lineHeight: 1.4 }}>
                {pedido.estado === 'listo'
                  ? esPickup ? 'Puedes pasar a recogerlo cuando quieras' : 'El rider lo recogerá enseguida'
                  : pedido.minutos_preparacion ? `~ ${pedido.minutos_preparacion} min` : 'En la cocina'}
              </div>
            </div>
          </div>

          {esDelivery && !riderOk && (
            <div style={{
              borderRadius: 12, padding: '12px 14px',
              background: C.warningSoft,
              marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>🛵</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#8B6126' }}>Buscando repartidor…</div>
                <div style={{ fontSize: 11, color: '#8B6126', opacity: 0.85 }}>
                  Te avisaremos en cuanto uno acepte tu pedido
                </div>
              </div>
              <span style={{ fontSize: 14, animation: 'pulse2 1.5s ease-in-out infinite' }}>🔍</span>
            </div>
          )}

          {esDelivery && mostrarBotonTrackingMapa && (
            <button onClick={abrirTrackingExterno} style={{
              width: '100%', padding: '14px 18px', borderRadius: 14, border: `1px solid ${C.border}`,
              background: C.paper, color: C.ink,
              fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginBottom: 16,
            }}>
              <MapPin size={14} strokeWidth={2.4} /> Ver mapa en vivo
            </button>
          )}
        </>
      )}

      {/* Estado 2: Recogido / En camino */}
      {(pedido.estado === 'recogido' || pedido.estado === 'en_camino') && esDelivery && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            borderRadius: 14, padding: '14px 16px',
            background: C.terracottaSoft, border: `1px solid ${C.terracotta}`,
            marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{ fontSize: 30, animation: 'moto 0.9s ease-in-out infinite alternate' }}>🛵</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>¡Tu pedido está en camino!</div>
              <div style={{ fontSize: 11, color: C.terracotta2, marginTop: 2 }}>Sigue al repartidor en tiempo real</div>
            </div>
          </div>

          {pedido.shipday_tracking_url ? (
            <>
              {Capacitor.isNativePlatform() ? (
                <button onClick={abrirTrackingExterno} style={{
                  width: '100%', padding: '16px 20px', borderRadius: 14, border: 'none',
                  background: `linear-gradient(180deg, ${C.ink2}, ${C.ink})`,
                  color: C.cream, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: SH.glossy,
                }}>
                  <MapPin size={16} strokeWidth={2.4} />
                  Ver ubicación en tiempo real
                </button>
              ) : iframeError ? (
                <div style={{
                  borderRadius: 14, padding: 20,
                  background: C.paper, border: `1px solid ${C.border}`,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 13, color: C.stone, marginBottom: 14 }}>
                    Abre el seguimiento en una nueva pestaña
                  </div>
                  <button onClick={abrirTrackingExterno} style={{
                    padding: '14px 26px', borderRadius: 12, border: 'none',
                    background: `linear-gradient(180deg, ${C.ink2}, ${C.ink})`,
                    color: C.cream, fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    boxShadow: SH.glossy,
                  }}>
                    <MapPin size={14} strokeWidth={2.4} /> Ver tracking
                  </button>
                </div>
              ) : (
                <div style={{
                  borderRadius: 14, overflow: 'hidden',
                  border: `1px solid ${C.border}`,
                  position: 'relative', background: '#fff',
                }}>
                  <iframe
                    src={pedido.shipday_tracking_url}
                    title="Seguimiento del repartidor"
                    style={{ width: '100%', height: 460, border: 0, display: 'block' }}
                    onError={() => setIframeError(true)}
                    allow="geolocation"
                  />
                  <button onClick={abrirTrackingExterno} style={{
                    position: 'absolute', top: 10, right: 10,
                    padding: '7px 12px', borderRadius: 8, border: 'none',
                    background: 'rgba(26,24,21,0.78)', color: '#fff',
                    fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <span>⤢</span> Abrir
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{
              borderRadius: 14, padding: 20,
              background: C.paper, border: `1px solid ${C.border}`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, color: C.stone }}>Preparando el seguimiento en tiempo real…</div>
            </div>
          )}
        </div>
      )}

      {pedido.estado === 'listo' && esPickup && (
        <div style={{
          borderRadius: 14, padding: '18px 18px',
          background: C.sageSoft, marginBottom: 16, textAlign: 'center',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', background: '#fff',
            color: C.sage2,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 10, fontSize: 26,
          }}>📦</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.sage2 }}>¡Tu pedido está listo!</div>
          <div style={{ fontSize: 12, color: C.sage2, opacity: 0.85, marginTop: 4 }}>
            Puedes pasar a recogerlo cuando quieras
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 12, color: C.stone }}>
        {pedido.metodo_pago === 'tarjeta' ? '💳 Pagado con tarjeta' : '💵 Pago en efectivo'}
      </div>
    </div>
  )
}
