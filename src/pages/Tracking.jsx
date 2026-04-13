import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const ESTADO_INFO = {
  nuevo:      { icon: '⏳', label: 'Esperando confirmación', color: '#F59E0B' },
  aceptado:   { icon: '✅', label: 'Repartidor asignado',    color: '#10B981' },
  preparando: { icon: '👨‍🍳', label: 'Preparando tu pedido',  color: '#FF6B2C' },
  listo:      { icon: '📦', label: 'Listo para recoger',     color: '#FF6B2C' },
  recogido:   { icon: '🏍️', label: 'Pedido recogido',        color: '#FF6B2C' },
  en_camino:  { icon: '🛵', label: 'En camino',              color: '#FF6B2C' },
  entregado:  { icon: '🎉', label: 'Pedido entregado',       color: '#10B981' },
  cancelado:  { icon: '❌', label: 'Pedido cancelado',       color: '#EF4444' },
  fallido:    { icon: '⚠️', label: 'Entrega fallida',        color: '#EF4444' },
}

export default function Tracking({ pedido: pedidoInicial, onClose }) {
  const { user } = useAuth()
  const [pedido, setPedido] = useState(pedidoInicial)
  const [valoracion, setValoracion] = useState(0)
  const [textoResena, setTextoResena] = useState('')
  const [resenaEnviada, setResenaEnviada] = useState(false)
  const [yaValorado, setYaValorado] = useState(false)
  const [errorResena, setErrorResena] = useState(null)

  const esTerminado = pedido.estado === 'entregado' || pedido.estado === 'cancelado' || pedido.estado === 'fallido'

  // Fetch estado actual al montar
  useEffect(() => {
    supabase.from('pedidos').select('*').eq('id', pedidoInicial.id).single()
      .then(({ data }) => { if (data) setPedido(data) })
  }, [pedidoInicial.id])

  // Comprobar si ya valoró
  useEffect(() => {
    const uid = user?.id || pedido.usuario_id
    if (pedido.id && uid) {
      supabase.from('resenas').select('id').eq('pedido_id', pedido.id).eq('usuario_id', uid).maybeSingle()
        .then(({ data }) => { if (data) setYaValorado(true) })
    }
  }, [pedido.id, user?.id])

  // Realtime + polling BD + polling Shipday
  useEffect(() => {
    const channel = supabase.channel(`tracking-${pedido.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'pedidos',
        filter: `id=eq.${pedido.id}`,
      }, payload => {
        setPedido(prev => ({ ...prev, ...payload.new }))
      })
      .subscribe()

    // Polling BD cada 4s
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('pedidos')
        .select('estado, motivo_cancelacion, metodo_pago, shipday_status, shipday_tracking_url')
        .eq('id', pedido.id)
        .single()
      if (data) setPedido(prev => ({ ...prev, ...data }))
    }, 4000)

    // Polling Shipday API cada 8s (sincroniza estado + guarda trackingUrl)
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

  async function abrirTracking() {
    const url = pedido.shipday_tracking_url
    if (!url) return
    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url })
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
      setTimeout(() => onClose(), 1500)
    } else {
      setErrorResena('No se pudo enviar la valoración. Inténtalo de nuevo.')
    }
  }

  const info = ESTADO_INFO[pedido.estado] || ESTADO_INFO.nuevo

  // ==================== CANCELADO / FALLIDO ====================
  if (pedido.estado === 'cancelado' || pedido.estado === 'fallido') {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-text)', margin: 0 }}>Tu pedido</h2>
          <span style={{ fontSize: 11, color: 'var(--c-muted)', fontWeight: 600 }}>{pedido.codigo}</span>
        </div>
        <div style={{ background: 'rgba(239,68,68,0.06)', borderRadius: 14, padding: 28, textAlign: 'center', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{info.icon}</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#EF4444', marginBottom: 8 }}>
            {pedido.estado === 'cancelado' ? 'Pedido cancelado' : 'Entrega fallida'}
          </div>
          {pedido.motivo_cancelacion && (
            <div style={{ fontSize: 14, color: 'var(--c-text)', marginBottom: 12, fontWeight: 600, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
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
    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-text)', margin: 0 }}>Tu pedido</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#767575', fontWeight: 600 }}>{pedido.codigo}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--c-primary-light)', cursor: 'pointer', fontFamily: 'inherit' }}>Cerrar</button>
          </div>
        </div>

        {/* Badge entregado */}
        <div style={{ textAlign: 'center', padding: '28px 0 20px', borderRadius: 14, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', marginBottom: 20 }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#10B981' }}>¡Pedido entregado!</div>
          <div style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 4 }}>Disfruta tu comida</div>
        </div>

        {/* Valoración */}
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 20, border: '1px solid rgba(255,255,255,0.1)' }}>
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
                    border: i <= valoracion ? '1.5px solid var(--c-primary)' : '1px solid rgba(255,255,255,0.1)',
                    background: i <= valoracion ? 'var(--c-primary)' : 'rgba(255,255,255,0.08)',
                    cursor: 'pointer', fontSize: 18, color: i <= valoracion ? '#fff' : '#767575', transition: 'all 0.15s',
                  }}>★</button>
                ))}
              </div>
              {valoracion > 0 && (
                <>
                  <textarea value={textoResena} onChange={e => setTextoResena(e.target.value)} placeholder="Cuéntanos más sobre tu experiencia (opcional)..." rows={3} style={{
                    width: '100%', padding: '12px 14px', borderRadius: 10, border: 'none',
                    fontSize: 13, fontFamily: 'inherit', background: '#262626',
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

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#767575' }}>
          {pedido.metodo_pago === 'tarjeta' ? '💳 Pagado con tarjeta' : '💵 Pago en efectivo'}
        </div>
      </div>
    )
  }

  // ==================== EN CURSO ====================
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-text)', margin: 0 }}>Tu pedido</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#767575', fontWeight: 600 }}>{pedido.codigo}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--c-primary-light)', cursor: 'pointer', fontFamily: 'inherit' }}>Cerrar</button>
        </div>
      </div>

      {/* Animaciones CSS */}
      <style>{`
        @keyframes pulse2 { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.12);opacity:0.7} }
        @keyframes chopChop { 0%{transform:rotate(0deg)} 100%{transform:rotate(-22deg)} }
        @keyframes chopChop2 { 0%{transform:rotate(0deg) scaleX(-1)} 100%{transform:rotate(22deg) scaleX(-1)} }
        @keyframes steamRise { 0%{opacity:0.6;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-22px) scale(1.4)} }
        @keyframes sizzle { 0%{opacity:0.3;transform:scale(0.8)} 100%{opacity:1;transform:scale(1.3)} }
        @keyframes floatPan { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      `}</style>

      {/* Bloque animado según estado */}
      {(pedido.estado === 'nuevo' || pedido.estado === 'aceptado') && (
        <div style={{ borderRadius: 16, marginBottom: 20, overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #1e2a3a 100%)', border: '1px solid rgba(255,255,255,0.07)', height: 180, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          {/* Estrellas parpadeantes */}
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ position: 'absolute', top: 8 + (i * 11) % 60, left: `${8 + (i * 19) % 84}%`, width: 2, height: 2, borderRadius: '50%', background: '#fff', opacity: 0.25 + (i % 3) * 0.15, animation: `pulse2 ${1.8 + i * 0.4}s ease-in-out infinite ${i * 0.3}s` }} />
          ))}
          <div style={{ fontSize: 44, animation: 'pulse2 2s ease-in-out infinite' }}>⏳</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Esperando al restaurante...</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Te avisaremos cuando acepten tu pedido</div>
        </div>
      )}

      {(pedido.estado === 'preparando' || pedido.estado === 'listo') && (
        <div style={{ borderRadius: 16, marginBottom: 20, overflow: 'hidden', background: 'linear-gradient(135deg, #1a1207 0%, #2d1f0e 50%, #1a1207 100%)', border: '1px solid rgba(255,255,255,0.07)', height: 180, position: 'relative' }}>
          {/* Pared azulejos cocina */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', background: 'repeating-linear-gradient(90deg,rgba(255,255,255,0.025) 0,rgba(255,255,255,0.025) 49%,transparent 49%,transparent 50%),repeating-linear-gradient(0deg,rgba(255,255,255,0.025) 0,rgba(255,255,255,0.025) 49%,transparent 49%,transparent 50%)', backgroundSize: '22px 22px' }} />
          {/* Encimera */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(180deg,#5C4033,#4A3428)', borderTop: '3px solid #6B4F3A' }} />
          {/* Sartén flotando */}
          <div style={{ position: 'absolute', bottom: '40%', left: '10%', animation: 'floatPan 2s ease-in-out infinite' }}>
            <span style={{ fontSize: 36 }}>🍳</span>
            {/* Chispas sartén */}
            <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', animation: 'sizzle 0.35s ease-in-out infinite alternate', fontSize: 9, color: '#FFD700' }}>✦</div>
          </div>
          {/* Vapor */}
          <div style={{ position: 'absolute', bottom: '70%', left: '18%', fontSize: 13, opacity: 0.5, animation: 'steamRise 2s ease-out infinite' }}>💨</div>
          <div style={{ position: 'absolute', bottom: '72%', left: '25%', fontSize: 10, opacity: 0.35, animation: 'steamRise 2.4s ease-out infinite 0.6s' }}>💨</div>
          {/* Cuchillo izquierda */}
          <div style={{ position: 'absolute', bottom: '40%', left: '42%', animation: 'chopChop 0.38s ease-in-out infinite', transformOrigin: 'bottom right' }}>
            <span style={{ fontSize: 28 }}>🔪</span>
          </div>
          {/* Cuchillo derecha (espejado) */}
          <div style={{ position: 'absolute', bottom: '40%', left: '56%', animation: 'chopChop2 0.38s ease-in-out infinite 0.19s', transformOrigin: 'bottom left', display: 'inline-block' }}>
            <span style={{ fontSize: 28 }}>🔪</span>
          </div>
          {/* Ingredientes */}
          <div style={{ position: 'absolute', bottom: '40%', right: '8%', display: 'flex', gap: 4 }}>
            <span style={{ fontSize: 20 }}>🍅</span>
            <span style={{ fontSize: 18 }}>🧅</span>
          </div>
          {/* Label */}
          <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', borderRadius: 10, padding: '7px 13px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 15 }}>👨‍🍳</span>
              <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>Preparando tu pedido...</span>
            </div>
            {pedido.minutos_preparacion && (
              <div style={{ background: 'rgba(0,0,0,0.65)', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#FFD700' }}>~{pedido.minutos_preparacion} min</div>
            )}
          </div>
        </div>
      )}

      {/* Botón rastrear */}
      {pedido.shipday_tracking_url ? (
        <button onClick={abrirTracking} style={{
          width: '100%', padding: '16px 0', borderRadius: 14, border: 'none',
          background: 'var(--c-btn-gradient)', color: '#fff', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 10, marginBottom: 16,
          boxShadow: '0 4px 20px rgba(255,107,44,0.35)',
        }}>
          <span style={{ fontSize: 20 }}>📍</span> Rastrear mi pedido
        </button>
      ) : (
        <div style={{ borderRadius: 14, padding: '14px 20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--c-muted)' }}>El seguimiento estará disponible cuando se asigne un repartidor</div>
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 12, color: '#767575' }}>
        {pedido.metodo_pago === 'tarjeta' ? '💳 Pagado con tarjeta' : '💵 Pago en efectivo'}
      </div>
    </div>
  )
}
