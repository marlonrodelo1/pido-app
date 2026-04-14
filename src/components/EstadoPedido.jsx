import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ESTADOS = [
  { key: 'nuevo',          label: 'Recibido',   icon: '📋', color: '#FF5733' },
  { key: 'aceptado',       label: 'Confirmado', icon: '✅', color: '#22C55E' },
  { key: 'en_preparacion', label: 'Preparando', icon: '👨‍🍳', color: '#F59E0B' },
  { key: 'listo',          label: '¡Listo!',    icon: '🎉', color: '#10B981' },
  { key: 'entregado',      label: 'Entregado',  icon: '📦', color: '#6366F1' },
]

const ESTADOS_RECOGIDA = ['nuevo', 'aceptado', 'en_preparacion', 'listo', 'entregado']

function getProgreso(estado) {
  const idx = ESTADOS_RECOGIDA.indexOf(estado)
  return idx === -1 ? 0 : Math.round((idx / (ESTADOS_RECOGIDA.length - 1)) * 100)
}

function getEstadoActual(estado) {
  return ESTADOS.find(e => e.key === estado) || ESTADOS[0]
}

function getTextoEstado(estado) {
  const textos = {
    nuevo: 'Tu pedido ha llegado al restaurante',
    aceptado: 'El restaurante ha confirmado tu pedido',
    en_preparacion: 'Están preparando tu pedido ahora mismo',
    listo: 'Tu pedido está listo para recoger',
    entregado: 'Pedido recogido — ¡buen provecho!',
    cancelado: 'El pedido ha sido cancelado',
    rechazado: 'El pedido fue rechazado por el restaurante',
  }
  return textos[estado] || 'Actualizando estado...'
}

const SHIPDAY_ESTADOS_NO_VALIDOS = [null, undefined, 'NOT_ASSIGNED', 'NOT_ACCEPTED']

export default function EstadoPedido({ pedidoId, codigo, establecimientoId, minutosPrepacion = 20, onVolver }) {
  const [estado, setEstado] = useState('nuevo')
  const [establecimiento, setEstablecimiento] = useState(null)
  const [tiempoRestante, setTiempoRestante] = useState(minutosPrepacion)
  const [shipdayUrl, setShipdayUrl] = useState(null)
  const [shipdayStatus, setShipdayStatus] = useState(null)

  // Carga inicial
  useEffect(() => {
    async function cargar() {
      const [pedidoRes, estRes] = await Promise.all([
        supabase.from('pedidos').select('estado, shipday_tracking_url, shipday_status').eq('id', pedidoId).single(),
        supabase.from('establecimientos').select('nombre, telefono, minutos_preparacion').eq('id', establecimientoId).single(),
      ])
      if (pedidoRes.data) {
        setEstado(pedidoRes.data.estado)
        setShipdayUrl(pedidoRes.data.shipday_tracking_url || null)
        setShipdayStatus(pedidoRes.data.shipday_status || null)
      }
      if (estRes.data) {
        setEstablecimiento(estRes.data)
        setTiempoRestante(estRes.data.minutos_preparacion || minutosPrepacion)
      }
    }
    cargar()
  }, [pedidoId, establecimientoId])

  // Realtime subscription
  useEffect(() => {
    const sub = supabase
      .channel(`estado-pedido-${pedidoId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${pedidoId}`,
      }, payload => {
        setEstado(payload.new.estado)
        setShipdayUrl(payload.new.shipday_tracking_url || null)
        setShipdayStatus(payload.new.shipday_status || null)
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [pedidoId])

  // Polling Shipday cada 8 s
  useEffect(() => {
    if (estado === 'entregado' || estado === 'cancelado' || estado === 'rechazado') return
    const interval = setInterval(() => {
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-shipday-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedido_id: pedidoId }),
      }).catch(() => {})
    }, 8000)
    return () => clearInterval(interval)
  }, [pedidoId, estado])

  // Countdown del tiempo estimado
  useEffect(() => {
    if (estado !== 'nuevo' && estado !== 'en_preparacion') return
    if (tiempoRestante <= 0) return
    const t = setInterval(() => setTiempoRestante(prev => Math.max(0, prev - 1)), 60000)
    return () => clearInterval(t)
  }, [estado, tiempoRestante])

  const estadoActual = getEstadoActual(estado)
  const progreso = getProgreso(estado)
  const terminado = estado === 'listo' || estado === 'entregado'
  const cancelado = estado === 'cancelado' || estado === 'rechazado'
  const shipdayListo = shipdayUrl && !SHIPDAY_ESTADOS_NO_VALIDOS.includes(shipdayStatus)

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: "'DM Sans', sans-serif", padding: '0 0 40px' }}>
      <style>{`
        @keyframes iconPulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.1); } }
        @keyframes barFill { from { width:0%; } to { width:var(--w); } }
      `}</style>

      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, background: '#111', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={onVolver} style={{
          background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10,
          width: 36, height: 36, cursor: 'pointer', fontSize: 16, color: '#F5F5F5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#F5F5F5' }}>Estado del pedido</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Recogida en tienda</div>
        </div>
      </div>

      <div style={{ padding: '24px 20px' }}>
        {/* Código del pedido */}
        <div style={{
          background: '#1A1A1A', borderRadius: 20, padding: '24px',
          border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20, textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            Código del pedido
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#FF5733', letterSpacing: 2, fontVariantNumeric: 'tabular-nums' }}>
            {codigo}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>
            Muestra este código en el restaurante
          </div>
        </div>

        {/* Estado con icono animado */}
        <div style={{
          background: cancelado ? 'rgba(239,68,68,0.1)' : `rgba(${estadoActual.color === '#FF5733' ? '255,87,51' : estadoActual.color === '#22C55E' ? '34,197,94' : estadoActual.color === '#F59E0B' ? '245,158,11' : estadoActual.color === '#10B981' ? '16,185,129' : '99,102,241'},0.1)`,
          borderRadius: 20, padding: '24px', border: `1px solid ${cancelado ? 'rgba(239,68,68,0.2)' : `${estadoActual.color}33`}`,
          marginBottom: 20, textAlign: 'center',
        }}>
          <div style={{
            fontSize: 52, marginBottom: 12,
            animation: !terminado && !cancelado ? 'iconPulse 2s ease infinite' : 'none',
          }}>
            {cancelado ? '❌' : estadoActual.icon}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: cancelado ? '#EF4444' : estadoActual.color, marginBottom: 6 }}>
            {cancelado ? 'Cancelado' : estadoActual.label}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            {getTextoEstado(estado)}
          </div>
        </div>

        {/* Barra de progreso */}
        {!cancelado && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: terminado ? '#10B981' : '#FF5733',
                borderRadius: 3, width: `${progreso}%`, transition: 'width 0.8s ease',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {ESTADOS_RECOGIDA.slice(0, -1).map((key, i) => {
                const e = ESTADOS.find(s => s.key === key)
                const done = ESTADOS_RECOGIDA.indexOf(estado) > i
                return (
                  <span key={key} style={{ fontSize: 9, color: done ? '#F5F5F5' : 'rgba(255,255,255,0.25)', fontWeight: done ? 700 : 400 }}>
                    {e?.label}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Tiempo estimado */}
        {(estado === 'nuevo' || estado === 'en_preparacion') && tiempoRestante > 0 && (
          <div style={{
            background: 'rgba(245,158,11,0.1)', borderRadius: 14, padding: '14px 16px',
            marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12,
            border: '1px solid rgba(245,158,11,0.2)',
          }}>
            <span style={{ fontSize: 24 }}>⏱️</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#F59E0B' }}>~{tiempoRestante} min</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Tiempo estimado de preparación</div>
            </div>
          </div>
        )}

        {/* Botón llamar al restaurante */}
        {establecimiento?.telefono && (
          <a href={`tel:${establecimiento.telefono}`} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', padding: '14px 0', borderRadius: 14, textDecoration: 'none',
            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
            color: '#22C55E', fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
          }}>
            📞 Llamar a {establecimiento.nombre || 'restaurante'}
          </a>
        )}

        {/* Shipday tracking */}
        {shipdayListo ? (
          <button
            onClick={() => window.open(shipdayUrl, '_blank')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '16px 0', borderRadius: 14, border: 'none',
              background: '#FF5733', color: '#fff',
              fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
              marginTop: 16,
              boxShadow: '0 4px 24px rgba(255,87,51,0.45)',
              transition: 'opacity 0.15s',
            }}
          >
            📍 Seguir mi pedido en tiempo real
          </button>
        ) : (
          <div style={{
            marginTop: 16, padding: '13px 16px', borderRadius: 14,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
            textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13,
          }}>
            El seguimiento estará disponible cuando el repartidor acepte el pedido
          </div>
        )}
      </div>
    </div>
  )
}
