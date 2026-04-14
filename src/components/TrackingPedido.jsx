import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import Stars from './Stars'

// Carga Leaflet desde CDN (sin npm install)
function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) { resolve(window.L); return }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => resolve(window.L)
    document.head.appendChild(script)
  })
}

// Haversine para ETA estimado
function distanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const ETAPAS = [
  { key: 'esperando',  label: 'Esperando',  icon: '🕐', estados: ['nuevo'] },
  { key: 'confirmado', label: 'Confirmado', icon: '✅', estados: ['aceptado'] },
  { key: 'preparando', label: 'Preparando', icon: '👨‍🍳', estados: ['en_preparacion'] },
  { key: 'en_camino',  label: 'En camino',  icon: '🛵', estados: ['listo', 'en_camino'] },
  { key: 'entregado',  label: 'Entregado',  icon: '🎉', estados: ['entregado'] },
]

function getEtapaIndex(estado) {
  for (let i = ETAPAS.length - 1; i >= 0; i--) {
    if (ETAPAS[i].estados.includes(estado)) return i
  }
  return 0
}

// Modal valoración
function ModalValoracion({ pedidoId, socioId, establecimientoId, onClose }) {
  const [rating, setRating] = useState(0)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function enviar() {
    if (rating === 0) return
    setEnviando(true)
    await supabase.from('resenas').insert({
      socio_id: socioId,
      establecimiento_id: establecimientoId,
      pedido_id: pedidoId,
      rating,
      texto: texto.trim() || null,
    })
    setEnviado(true)
    setEnviando(false)
    setTimeout(onClose, 1500)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 300,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        background: '#1E1E1E', borderRadius: '20px 20px 0 0', padding: '24px 20px 36px',
        width: '100%', maxWidth: 420, border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none',
        animation: 'slideUp 0.35s ease',
      }}>
        {enviado ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#F5F5F5' }}>¡Gracias por tu reseña!</div>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#F5F5F5' }}>¡Pedido entregado!</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>¿Cómo ha sido la experiencia?</div>
            </div>

            {/* Estrellas */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRating(s)} style={{
                  background: 'none', border: 'none', fontSize: 36, cursor: 'pointer',
                  opacity: s <= rating ? 1 : 0.3, transition: 'opacity 0.15s, transform 0.15s',
                  transform: s <= rating ? 'scale(1.15)' : 'scale(1)',
                }}>⭐</button>
              ))}
            </div>

            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder="Cuéntanos tu experiencia (opcional)..."
              rows={3}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '12px 14px', color: '#F5F5F5', fontSize: 14,
                fontFamily: "'DM Sans', sans-serif", resize: 'none', outline: 'none', marginBottom: 16,
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{
                flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent', color: 'rgba(255,255,255,0.55)',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>Omitir</button>
              <button onClick={enviar} disabled={rating === 0 || enviando} style={{
                flex: 2, padding: '13px 0', borderRadius: 12, border: 'none',
                background: rating === 0 ? 'rgba(255,255,255,0.1)' : '#FF5733', color: '#fff',
                fontSize: 14, fontWeight: 800, cursor: rating === 0 ? 'default' : 'pointer', fontFamily: 'inherit',
                transition: 'background 0.2s',
              }}>{enviando ? 'Enviando...' : 'Enviar reseña'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const SHIPDAY_ESTADOS_NO_VALIDOS = [null, undefined, 'NOT_ASSIGNED', 'NOT_ACCEPTED']

export default function TrackingPedido({ pedidoId, socioId, establecimientoId, codigo, onVolver }) {
  const [estado, setEstado] = useState('nuevo')
  const [rider, setRider] = useState(null) // { nombre_comercial, foto_url, telefono, rating, latitud_actual, longitud_actual }
  const [establecimiento, setEstablecimiento] = useState(null)
  const [clienteCoords, setClienteCoords] = useState(null)
  const [etaMin, setEtaMin] = useState(null)
  const [showValoracion, setShowValoracion] = useState(false)
  const [leafletListo, setLeafletListo] = useState(false)
  const [shipdayUrl, setShipdayUrl] = useState(null)
  const [shipdayStatus, setShipdayStatus] = useState(null)

  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const riderMarker = useRef(null)
  const restauranteMarker = useRef(null)
  const clienteMarker = useRef(null)

  // Carga inicial
  useEffect(() => {
    cargarDatos()
    obtenerUbicacionCliente()
    loadLeaflet().then(() => setLeafletListo(true))
  }, [])

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

  // Subscripciones Realtime
  useEffect(() => {
    const subPedido = supabase
      .channel(`pedido-${pedidoId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${pedidoId}`,
      }, payload => {
        setEstado(payload.new.estado)
        if (payload.new.estado === 'entregado') setShowValoracion(true)
        setShipdayUrl(payload.new.shipday_tracking_url || null)
        setShipdayStatus(payload.new.shipday_status || null)
      })
      .subscribe()

    const subRider = supabase
      .channel(`rider-${socioId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'socios', filter: `id=eq.${socioId}`,
      }, payload => {
        const { latitud_actual, longitud_actual, nombre_comercial, foto_url, telefono, rating } = payload.new
        setRider(prev => ({ ...prev, latitud_actual, longitud_actual, nombre_comercial, foto_url, telefono, rating }))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subPedido)
      supabase.removeChannel(subRider)
    }
  }, [pedidoId, socioId])

  // Inicializar mapa cuando Leaflet y datos listos
  useEffect(() => {
    if (!leafletListo || !mapRef.current || mapInstance.current) return
    const L = window.L
    const mapa = L.map(mapRef.current, { zoomControl: false, attributionControl: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa)
    mapInstance.current = mapa
  }, [leafletListo])

  // Actualizar marcadores en el mapa
  useEffect(() => {
    if (!mapInstance.current || !leafletListo) return
    const L = window.L
    const mapa = mapInstance.current
    const bounds = []

    function iconHtml(emoji, color = '#FF5733') {
      return L.divIcon({
        html: `<div style="background:${color};border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${emoji}</div>`,
        iconSize: [36, 36], iconAnchor: [18, 18], className: '',
      })
    }

    // Marcador restaurante
    if (establecimiento?.latitud && establecimiento?.longitud) {
      const pos = [establecimiento.latitud, establecimiento.longitud]
      if (restauranteMarker.current) {
        restauranteMarker.current.setLatLng(pos)
      } else {
        restauranteMarker.current = L.marker(pos, { icon: iconHtml('🏪', '#1A1A1A') })
          .bindPopup(establecimiento.nombre || 'Restaurante')
          .addTo(mapa)
      }
      bounds.push(pos)
    }

    // Marcador cliente
    if (clienteCoords) {
      const pos = [clienteCoords.lat, clienteCoords.lng]
      if (clienteMarker.current) {
        clienteMarker.current.setLatLng(pos)
      } else {
        clienteMarker.current = L.marker(pos, { icon: iconHtml('📍', '#3B82F6') })
          .bindPopup('Tu ubicación')
          .addTo(mapa)
      }
      bounds.push(pos)
    }

    // Marcador rider
    if (rider?.latitud_actual && rider?.longitud_actual) {
      const pos = [rider.latitud_actual, rider.longitud_actual]
      if (riderMarker.current) {
        riderMarker.current.setLatLng(pos)
      } else {
        riderMarker.current = L.marker(pos, { icon: iconHtml('🛵', '#FF5733') })
          .bindPopup(rider.nombre_comercial || 'Repartidor')
          .addTo(mapa)
      }
      bounds.push(pos)

      // Calcular ETA (velocidad promedio 20 km/h en ciudad)
      if (clienteCoords) {
        const dist = distanciaKm(rider.latitud_actual, rider.longitud_actual, clienteCoords.lat, clienteCoords.lng)
        setEtaMin(Math.max(1, Math.round((dist / 20) * 60)))
      }
    }

    if (bounds.length > 0) {
      mapa.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [leafletListo, establecimiento, rider, clienteCoords])

  async function cargarDatos() {
    const [pedidoRes, riderRes, estRes] = await Promise.all([
      supabase.from('pedidos').select('estado, shipday_tracking_url, shipday_status').eq('id', pedidoId).single(),
      supabase.from('socios').select('nombre_comercial, foto_url, telefono, rating, latitud_actual, longitud_actual').eq('id', socioId).single(),
      supabase.from('establecimientos').select('nombre, latitud, longitud, telefono').eq('id', establecimientoId).single(),
    ])
    if (pedidoRes.data) {
      setEstado(pedidoRes.data.estado)
      setShipdayUrl(pedidoRes.data.shipday_tracking_url || null)
      setShipdayStatus(pedidoRes.data.shipday_status || null)
    }
    if (riderRes.data) setRider(riderRes.data)
    if (estRes.data) setEstablecimiento(estRes.data)
  }

  function obtenerUbicacionCliente() {
    navigator.geolocation?.getCurrentPosition(
      p => setClienteCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { timeout: 8000 }
    )
  }

  const etapaActual = getEtapaIndex(estado)
  const shipdayListo = shipdayUrl && !SHIPDAY_ESTADOS_NO_VALIDOS.includes(shipdayStatus)

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes pulseRider { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
      `}</style>

      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, background: '#111' }}>
        <button onClick={onVolver} style={{
          background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10,
          width: 36, height: 36, cursor: 'pointer', fontSize: 16, color: '#F5F5F5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#F5F5F5' }}>Seguimiento del pedido</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{codigo}</div>
        </div>
      </div>

      {/* Mapa */}
      <div style={{ height: 220, position: 'relative', background: '#1A1A1A' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {!leafletListo && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#1A1A1A', color: 'rgba(255,255,255,0.3)', fontSize: 13,
          }}>Cargando mapa...</div>
        )}
      </div>

      <div style={{ padding: '20px 20px 80px' }}>
        {/* Barra de progreso */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            {/* Línea de fondo */}
            <div style={{ position: 'absolute', top: 16, left: '10%', right: '10%', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, zIndex: 0 }} />
            {/* Línea progreso */}
            <div style={{
              position: 'absolute', top: 16, left: '10%', height: 3,
              width: `${(etapaActual / (ETAPAS.length - 1)) * 80}%`,
              background: '#FF5733', borderRadius: 2, zIndex: 0,
              transition: 'width 0.5s ease',
            }} />
            {ETAPAS.map((etapa, i) => {
              const activa = i <= etapaActual
              const esActual = i === etapaActual
              return (
                <div key={etapa.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1, flex: 1 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: activa ? '#FF5733' : 'rgba(255,255,255,0.08)',
                    border: esActual ? '3px solid rgba(255,87,51,0.4)' : '2px solid transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, transition: 'all 0.3s',
                    animation: esActual && estado !== 'entregado' ? 'pulseRider 1.5s infinite' : 'none',
                  }}>{activa ? etapa.icon : <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: activa ? '#F5F5F5' : 'rgba(255,255,255,0.25)', textAlign: 'center', lineHeight: 1.2, letterSpacing: 0.3 }}>
                    {etapa.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ETA */}
        {etaMin && estado === 'en_camino' && (
          <div style={{
            background: 'rgba(255,87,51,0.12)', borderRadius: 14, padding: '14px 16px',
            marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
            border: '1px solid rgba(255,87,51,0.2)',
          }}>
            <span style={{ fontSize: 24 }}>⏱️</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#FF5733' }}>~{etaMin} min</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Tiempo estimado de llegada</div>
            </div>
          </div>
        )}

        {/* Card del rider */}
        {rider && (
          <div style={{
            background: '#1A1A1A', borderRadius: 16, padding: '16px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, overflow: 'hidden',
                background: '#2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0, border: '2px solid rgba(255,87,51,0.3)',
              }}>
                {rider.foto_url
                  ? <img src={rider.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '🛵'
                }
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#F5F5F5' }}>{rider.nombre_comercial || 'Tu repartidor'}</div>
                {rider.rating > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <Stars rating={rider.rating} size={11} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{rider.rating?.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {rider.telefono && (
                  <a href={`tel:${rider.telefono}`} style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textDecoration: 'none', fontSize: 16,
                  }}>📞</a>
                )}
                {rider.telefono && (
                  <a href={`https://wa.me/${rider.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textDecoration: 'none', fontSize: 16,
                  }}>💬</a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Estado actual texto */}
        {estado === 'nuevo' ? (
          <div style={{
            background: 'rgba(255,87,51,0.08)', borderRadius: 16, padding: '20px 16px',
            border: '1px solid rgba(255,87,51,0.2)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: 8, animation: 'pulseRider 1.5s infinite' }}>🕐</div>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#F5F5F5', marginBottom: 6 }}>Esperando confirmación</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              El restaurante está revisando tu pedido.<br />Te avisaremos cuando lo acepten.
            </div>
          </div>
        ) : estado === 'aceptado' ? (
          <div style={{
            background: 'rgba(34,197,94,0.08)', borderRadius: 16, padding: '20px 16px',
            border: '1px solid rgba(34,197,94,0.25)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#F5F5F5', marginBottom: 6 }}>¡El restaurante confirmó tu pedido!</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              El repartidor irá a recogerlo en cuanto esté listo.
            </div>
          </div>
        ) : (
          <div style={{
            background: '#1A1A1A', borderRadius: 16, padding: '16px', border: '1px solid rgba(255,255,255,0.08)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{ETAPAS[etapaActual]?.icon}</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#F5F5F5' }}>{ETAPAS[etapaActual]?.label}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              {estado === 'en_preparacion' && 'El restaurante está preparando tu pedido'}
              {estado === 'listo' && 'Tu pedido está listo, el repartidor va a recogerlo'}
              {estado === 'en_camino' && 'Tu repartidor va de camino'}
              {estado === 'entregado' && '¡Tu pedido ha sido entregado!'}
            </div>
          </div>
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

      {showValoracion && (
        <ModalValoracion
          pedidoId={pedidoId}
          socioId={socioId}
          establecimientoId={establecimientoId}
          onClose={() => { setShowValoracion(false); onVolver() }}
        />
      )}
    </div>
  )
}
