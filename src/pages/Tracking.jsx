import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

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
    const color = socio.color_primario || '#FF6B2C'
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: hexToRgba(color, 0.1),
        border: `1px solid ${hexToRgba(color, 0.22)}`,
        borderRadius: 12, padding: '10px 12px', marginBottom: 14,
      }}>
        {socio.logo_url ? (
          <img src={socio.logo_url} alt={socio.nombre_comercial} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', background: '#fff', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
            {(socio.nombre_comercial || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)', lineHeight: 1.25 }}>
            Entregado por <span style={{ color }}>{socio.nombre_comercial}</span> · Pidoo
          </div>
          {socio.slug && (
            <button onClick={abrirSocio} style={{
              background: 'none', border: 'none', padding: 0, marginTop: 2,
              fontSize: 11, fontWeight: 700, color, cursor: 'pointer',
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

    const shipdaySyncInterval = setInterval(async () => {
      if (esTerminado) return
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token || SUPABASE_ANON_KEY
        await fetch(`${SUPABASE_URL}/functions/v1/sync-shipday-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ pedido_id: pedido.id }),
        })
      } catch (_) { /* non-blocking */ }
    }, 8000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
      clearInterval(shipdaySyncInterval)
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
      await Browser.open({ url, presentationStyle: 'popover' })
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-text)', margin: 0 }}>Tu pedido</h2>
          <span style={{ fontSize: 11, color: 'var(--c-muted)', fontWeight: 600 }}>{pedido.codigo}</span>
        </div>
        <SocioBanner />
        <div style={{ background: 'rgba(239,68,68,0.06)', borderRadius: 14, padding: 28, textAlign: 'center', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{pedido.estado === 'cancelado' ? '❌' : '⚠️'}</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#EF4444', marginBottom: 8 }}>
            {pedido.estado === 'cancelado' ? 'Pedido cancelado' : 'Entrega fallida'}
          </div>
          {pedido.motivo_cancelacion && (
            <div style={{ fontSize: 14, color: 'var(--c-text)', marginBottom: 12, fontWeight: 600, background: 'rgba(0,0,0,0.06)', borderRadius: 10, padding: '10px 14px' }}>
              {pedido.motivo_cancelacion}
            </div>
          )}
          <div style={{ fontSize: 12, color: 'var(--c-muted)', marginBottom: 20 }}>
            {pedido.metodo_pago === 'tarjeta' ? 'Si se realizó el cobro, el reembolso se procesará automáticamente.' : 'No se ha realizado ningún cobro.'}
          </div>
          <button onClick={onClose} style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: 'var(--c-btn-gradient)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Entendido
          </button>
        </div>
      </div>
    )
  }

  // ==================== ENTREGADO ====================
  if (pedido.estado === 'entregado') {
    const mostrarContador = !autoCloseCancelled && !yaValorado && !resenaEnviada

    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <style>{`
          @keyframes popCheck { 0%{transform:scale(0.3);opacity:0} 60%{transform:scale(1.15);opacity:1} 100%{transform:scale(1);opacity:1} }
          @keyframes confettiFall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(280px) rotate(720deg);opacity:0} }
        `}</style>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-text)', margin: 0 }}>Tu pedido</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#767575', fontWeight: 600 }}>{pedido.codigo}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--c-primary-light)', cursor: 'pointer', fontFamily: 'inherit' }}>Cerrar</button>
          </div>
        </div>

        <SocioBanner />

        {/* Celebración */}
        <div style={{ position: 'relative', textAlign: 'center', padding: '32px 0 22px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 18, overflow: 'hidden' }}>
          {/* Confetti */}
          {['#10B981','#FBBF24','#FF6B2C','#60A5FA','#A78BFA','#F472B6'].map((c, i) => (
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
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(16,185,129,0.15)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 10, animation: 'popCheck 0.6s ease-out',
          }}>
            <span style={{ fontSize: 40 }}>✓</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#10B981', marginBottom: 4 }}>¡Pedido entregado!</div>
          <div style={{ fontSize: 13, color: 'var(--c-muted)' }}>Esperamos que lo disfrutes 🎉</div>
        </div>

        {/* Contador auto-cierre */}
        {mostrarContador && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)', marginBottom: 16 }}>
            <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>Cerrando en {secondsLeft}s...</span>
            <button onClick={() => setAutoCloseCancelled(true)} style={{ background: 'none', border: 'none', fontSize: 11, fontWeight: 700, color: 'var(--c-primary-light)', cursor: 'pointer', fontFamily: 'inherit' }}>
              Dejar valoración
            </button>
          </div>
        )}

        {/* Formulario valoración (solo si el usuario cancela el cierre o ya interactuó) */}
        {(autoCloseCancelled || yaValorado || resenaEnviada) && (
          <div style={{ background: 'rgba(0,0,0,0.06)', borderRadius: 14, padding: 20, border: '1px solid rgba(0,0,0,0.08)' }}>
            {yaValorado || resenaEnviada ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⭐</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-primary-light)' }}>Gracias por tu valoración</div>
                <div style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 4 }}>Tu opinión nos ayuda a mejorar</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', marginBottom: 10, textAlign: 'center' }}>¿Cómo fue tu experiencia?</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <button key={i} onClick={() => setValoracion(i)} style={{
                      width: 40, height: 40, borderRadius: 10,
                      border: i <= valoracion ? '1.5px solid var(--c-primary)' : '1px solid rgba(0,0,0,0.08)',
                      background: i <= valoracion ? 'var(--c-primary)' : 'rgba(0,0,0,0.06)',
                      cursor: 'pointer', fontSize: 18, color: i <= valoracion ? '#fff' : '#767575', transition: 'all 0.15s',
                    }}>★</button>
                  ))}
                </div>
                {valoracion > 0 && (
                  <>
                    <textarea value={textoResena} onChange={e => setTextoResena(e.target.value)} placeholder="Cuéntanos más sobre tu experiencia (opcional)..." rows={3} style={{
                      width: '100%', padding: '12px 14px', borderRadius: 10, border: 'none',
                      fontSize: 13, fontFamily: 'inherit', background: '#F4F2EC',
                      color: 'var(--c-text)', outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 12,
                    }} />
                    {errorResena && <div style={{ fontSize: 12, color: '#EF4444', textAlign: 'center', marginBottom: 10, fontWeight: 600 }}>{errorResena}</div>}
                    <button onClick={enviarValoracion} style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: 'var(--c-btn-gradient)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Enviar valoración
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#767575' }}>
          {pedido.metodo_pago === 'tarjeta' ? '💳 Pagado con tarjeta' : '💵 Pago en efectivo'}
        </div>
      </div>
    )
  }

  // ==================== EN CURSO ====================
  const currentStep = estadoToStep(pedido.estado)
  const riderOk = riderAsignado(pedido)

  const stepLabels = esPickup
    ? ['Confirmado', 'Preparando', 'Listo', 'Recogido']
    : ['Confirmado', 'Preparando', 'En camino', 'Entregado']

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-text)', margin: 0 }}>Tu pedido</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#767575', fontWeight: 600 }}>{pedido.codigo}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--c-primary-light)', cursor: 'pointer', fontFamily: 'inherit' }}>Cerrar</button>
        </div>
      </div>

      <SocioBanner />

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse2 { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.12);opacity:0.7} }
        @keyframes chopChop { 0%{transform:rotate(0deg)} 100%{transform:rotate(-22deg)} }
        @keyframes chopChop2 { 0%{transform:rotate(0deg) scaleX(-1)} 100%{transform:rotate(22deg) scaleX(-1)} }
        @keyframes steamRise { 0%{opacity:0.6;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-22px) scale(1.4)} }
        @keyframes sizzle { 0%{opacity:0.3;transform:scale(0.8)} 100%{opacity:1;transform:scale(1.3)} }
        @keyframes floatPan { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes moto { 0%{transform:translateX(-10px)} 100%{transform:translateX(10px)} }
      `}</style>

      {/* STEPPER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 22, padding: '0 4px' }}>
        {stepLabels.map((label, idx) => {
          const done = idx < currentStep
          const active = idx === currentStep
          const future = idx > currentStep
          const bg = done ? '#10B981' : active ? 'var(--c-primary)' : 'rgba(0,0,0,0.06)'
          const textColor = future ? '#767575' : '#fff'
          return (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {idx < stepLabels.length - 1 && (
                <div style={{
                  position: 'absolute', top: 12, left: '55%', right: '-45%', height: 2,
                  background: done ? '#10B981' : 'rgba(0,0,0,0.06)',
                  zIndex: 0,
                }} />
              )}
              <div style={{
                width: 26, height: 26, borderRadius: '50%', background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: textColor, fontWeight: 700, fontSize: 12, zIndex: 1,
                boxShadow: active ? '0 0 0 4px rgba(255,107,44,0.2)' : 'none',
                transition: 'all 0.2s ease',
              }}>
                {done ? '✓' : idx + 1}
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700, color: textColor,
                marginTop: 6, textAlign: 'center', lineHeight: 1.2,
              }}>{label}</div>
            </div>
          )
        })}
      </div>

      {/* Estado 0: Esperando al restaurante */}
      {(pedido.estado === 'nuevo' || pedido.estado === 'aceptado') && (
        <div style={{ borderRadius: 16, marginBottom: 16, overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #1e2a3a 100%)', border: '1px solid rgba(0,0,0,0.06)', height: 180, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ position: 'absolute', top: 8 + (i * 11) % 60, left: `${8 + (i * 19) % 84}%`, width: 2, height: 2, borderRadius: '50%', background: '#fff', opacity: 0.25 + (i % 3) * 0.15, animation: `pulse2 ${1.8 + i * 0.4}s ease-in-out infinite ${i * 0.3}s` }} />
          ))}
          <div style={{ fontSize: 44, animation: 'pulse2 2s ease-in-out infinite' }}>⏳</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1F1F1E' }}>Esperando al restaurante...</div>
          <div style={{ fontSize: 11, color: '#6B6B68' }}>Te avisaremos cuando acepten tu pedido</div>
        </div>
      )}

      {/* Estado 1: Preparando / Listo */}
      {(pedido.estado === 'preparando' || pedido.estado === 'listo') && (
        <>
          <div style={{ borderRadius: 16, marginBottom: 12, overflow: 'hidden', background: 'linear-gradient(135deg, #1a1207 0%, #2d1f0e 50%, #1a1207 100%)', border: '1px solid rgba(0,0,0,0.06)', height: 180, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', background: 'repeating-linear-gradient(90deg,rgba(255,255,255,0.025) 0,rgba(255,255,255,0.025) 49%,transparent 49%,transparent 50%),repeating-linear-gradient(0deg,rgba(255,255,255,0.025) 0,rgba(255,255,255,0.025) 49%,transparent 49%,transparent 50%)', backgroundSize: '22px 22px' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(180deg,#5C4033,#4A3428)', borderTop: '3px solid #6B4F3A' }} />
            <div style={{ position: 'absolute', bottom: '40%', left: '10%', animation: 'floatPan 2s ease-in-out infinite' }}>
              <span style={{ fontSize: 36 }}>🍳</span>
              <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', animation: 'sizzle 0.35s ease-in-out infinite alternate', fontSize: 9, color: '#FFD700' }}>✦</div>
            </div>
            <div style={{ position: 'absolute', bottom: '70%', left: '18%', fontSize: 13, opacity: 0.5, animation: 'steamRise 2s ease-out infinite' }}>💨</div>
            <div style={{ position: 'absolute', bottom: '72%', left: '25%', fontSize: 10, opacity: 0.35, animation: 'steamRise 2.4s ease-out infinite 0.6s' }}>💨</div>
            <div style={{ position: 'absolute', bottom: '40%', left: '42%', animation: 'chopChop 0.38s ease-in-out infinite', transformOrigin: 'bottom right' }}>
              <span style={{ fontSize: 28 }}>🔪</span>
            </div>
            <div style={{ position: 'absolute', bottom: '40%', left: '56%', animation: 'chopChop2 0.38s ease-in-out infinite 0.19s', transformOrigin: 'bottom left', display: 'inline-block' }}>
              <span style={{ fontSize: 28 }}>🔪</span>
            </div>
            <div style={{ position: 'absolute', bottom: '40%', right: '8%', display: 'flex', gap: 4 }}>
              <span style={{ fontSize: 20 }}>🍅</span>
              <span style={{ fontSize: 18 }}>🧅</span>
            </div>
            <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', borderRadius: 10, padding: '7px 13px', display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 15 }}>👨‍🍳</span>
                <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>
                  {pedido.estado === 'listo' ? 'Pedido listo' : 'Preparando tu pedido...'}
                </span>
              </div>
              {pedido.minutos_preparacion && pedido.estado === 'preparando' && (
                <div style={{ background: 'rgba(0,0,0,0.65)', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#FFD700' }}>~{pedido.minutos_preparacion} min</div>
              )}
            </div>
          </div>

          {esDelivery && !riderOk && (
            <div style={{ borderRadius: 12, padding: '12px 14px', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>🛵</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)' }}>Buscando repartidor...</div>
                <div style={{ fontSize: 11, color: 'var(--c-muted)' }}>Te avisaremos en cuanto uno acepte tu pedido</div>
              </div>
              <span style={{ fontSize: 14, animation: 'pulse2 1.5s ease-in-out infinite' }}>🔍</span>
            </div>
          )}
        </>
      )}

      {/* Estado 2: Recogido / En camino */}
      {(pedido.estado === 'recogido' || pedido.estado === 'en_camino') && esDelivery && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ borderRadius: 14, padding: '14px 16px', background: 'linear-gradient(135deg, rgba(255,107,44,0.15), rgba(255,107,44,0.05))', border: '1px solid rgba(255,107,44,0.2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 32, animation: 'moto 0.9s ease-in-out infinite alternate' }}>🛵</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--c-text)' }}>¡Tu pedido está en camino!</div>
              <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 2 }}>Sigue al repartidor en tiempo real</div>
            </div>
          </div>

          {pedido.shipday_tracking_url ? (
            <>
              {Capacitor.isNativePlatform() ? (
                <button onClick={abrirTrackingExterno} style={{
                  width: '100%', padding: '18px 20px', borderRadius: 14, border: 'none',
                  background: 'var(--c-btn-gradient)', color: '#fff',
                  fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  boxShadow: '0 4px 16px rgba(255,107,44,0.3)',
                }}>
                  <span style={{ fontSize: 20 }}>📍</span>
                  Ver ubicación en tiempo real
                </button>
              ) : iframeError ? (
                <div style={{ borderRadius: 14, padding: 20, background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--c-muted)', marginBottom: 14 }}>Abre el seguimiento en una nueva pestaña</div>
                  <button onClick={abrirTrackingExterno} style={{
                    padding: '14px 26px', borderRadius: 12, border: 'none',
                    background: 'var(--c-btn-gradient)', color: '#fff',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                  }}>
                    <span>📍</span> Ver tracking
                  </button>
                </div>
              ) : (
                <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)', position: 'relative', background: '#FFFFFF' }}>
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
                    background: 'rgba(0,0,0,0.72)', color: '#fff',
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
            <div style={{ borderRadius: 14, padding: 20, background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--c-muted)' }}>Preparando el seguimiento en tiempo real...</div>
            </div>
          )}
        </div>
      )}

      {pedido.estado === 'listo' && esPickup && (
        <div style={{ borderRadius: 14, padding: '16px 18px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>📦</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#10B981' }}>¡Tu pedido está listo!</div>
          <div style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 4 }}>Puedes pasar a recogerlo cuando quieras</div>
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 12, color: '#767575' }}>
        {pedido.metodo_pago === 'tarjeta' ? '💳 Pagado con tarjeta' : '💵 Pago en efectivo'}
      </div>
    </div>
  )
}
