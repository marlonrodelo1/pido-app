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

      {/* Badge de estado */}
      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: '24px 20px', marginBottom: 20, border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>{info.icon}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: info.color }}>{info.label}</div>
        {pedido.minutos_preparacion && pedido.estado === 'preparando' && (
          <div style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 6 }}>~{pedido.minutos_preparacion} min estimados</div>
        )}
      </div>

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
