import { useState, useEffect, useCallback } from 'react'
import { Phone } from 'lucide-react'
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#1d1d1d' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d1d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#252525' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
]

const ETAPAS = [
  { label: 'Pendiente', desc: 'Esperando que el restaurante acepte', icon: '⏳', estado: 'nuevo' },
  { label: 'Aceptado', desc: 'El restaurante esta preparando tu pedido', icon: '👨‍🍳', estado: 'preparando' },
  { label: 'Recogido', desc: 'El repartidor ha recogido tu pedido', icon: '📦', estado: 'recogido' },
  { label: 'En camino', desc: 'Tu pedido esta en camino', icon: '🛵', estado: 'en_camino' },
  { label: 'Entregado', desc: 'Tu pedido ha llegado', icon: '✅', estado: 'entregado' },
]

// listo queda en etapa 1 (igual que preparando) — solo el socio avanza el tracking del cliente
function getEtapa(estado) {
  const map = { nuevo: 0, aceptado: 1, preparando: 1, listo: 1, recogido: 2, en_camino: 3, entregado: 4 }
  return map[estado] ?? 0
}

export default function Tracking({ pedido: pedidoInicial, onClose }) {
  const { user } = useAuth()
  const [pedido, setPedido] = useState(pedidoInicial)
  const [etapa, setEtapa] = useState(getEtapa(pedidoInicial.estado))
  const [riderPos, setRiderPos] = useState(0)
  const [socio, setSocio] = useState(null)
  const [riderLat, setRiderLat] = useState(null)
  const [riderLng, setRiderLng] = useState(null)
  const [estCoords, setEstCoords] = useState(null) // {lat, lng} del establecimiento
  const [valoracion, setValoracion] = useState(0)
  const [textoResena, setTextoResena] = useState('')
  const [resenaEnviada, setResenaEnviada] = useState(false)
  const [yaValorado, setYaValorado] = useState(false)
  const [errorResena, setErrorResena] = useState(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  })

  // Fetch estado actual al montar
  useEffect(() => {
    supabase.from('pedidos').select('*').eq('id', pedidoInicial.id).single()
      .then(({ data }) => {
        if (data) {
          setPedido(data)
          setEtapa(getEtapa(data.estado))
        }
      })
  }, [pedidoInicial.id])

  // Fetch socio
  useEffect(() => {
    if (pedido.socio_id) {
      supabase.from('socios').select('nombre, rating, telefono').eq('id', pedido.socio_id).single()
        .then(({ data }) => { if (data) setSocio(data) })
    }
  }, [pedido.socio_id])

  // Fetch coordenadas del establecimiento para el mapa
  useEffect(() => {
    if (pedido.establecimiento_id) {
      supabase.from('establecimientos').select('latitud, longitud').eq('id', pedido.establecimiento_id).single()
        .then(({ data }) => { if (data?.latitud && data?.longitud) setEstCoords({ lat: data.latitud, lng: data.longitud }) })
    }
  }, [pedido.establecimiento_id])

  // fitBounds cuando el mapa carga con todos los markers
  const onMapLoad = useCallback((map) => {
    if (!map) return
    const bounds = new window.google.maps.LatLngBounds()
    if (estCoords) bounds.extend(estCoords)
    if (pedido.lat_entrega && pedido.lng_entrega) bounds.extend({ lat: pedido.lat_entrega, lng: pedido.lng_entrega })
    if (riderLat && riderLng) bounds.extend({ lat: riderLat, lng: riderLng })
    if (!bounds.isEmpty()) map.fitBounds(bounds, 50)
  }, [estCoords, pedido.lat_entrega, pedido.lng_entrega, riderLat, riderLng])

  // Comprobar si ya valoro
  useEffect(() => {
    const uid = user?.id || pedido.usuario_id
    if (pedido.id && uid) {
      supabase.from('resenas').select('id').eq('pedido_id', pedido.id).eq('usuario_id', uid).single()
        .then(({ data }) => { if (data) setYaValorado(true) })
    }
  }, [pedido.id, user?.id])

  // Realtime + polling
  useEffect(() => {
    const channel = supabase.channel(`tracking-${pedido.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'pedidos',
        filter: `id=eq.${pedido.id}`,
      }, payload => {
        const nuevo = payload.new
        setPedido(prev => ({ ...prev, ...nuevo }))
        if (nuevo.estado !== 'cancelado' && nuevo.estado !== 'fallido') {
          setEtapa(getEtapa(nuevo.estado))
        }
      })
      .subscribe()

    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('pedidos')
        .select('estado, socio_id, motivo_cancelacion, metodo_pago')
        .eq('id', pedido.id)
        .single()
      if (data) {
        setPedido(prev => ({ ...prev, ...data }))
        if (data.estado !== 'cancelado' && data.estado !== 'fallido') {
          const nuevaEtapa = getEtapa(data.estado)
          if (nuevaEtapa !== etapa) setEtapa(nuevaEtapa)
        }
        if (data.socio_id && !socio) {
          supabase.from('socios').select('nombre, rating, telefono').eq('id', data.socio_id).single()
            .then(({ data: s }) => { if (s) setSocio(s) })
        }
      }
    }, 4000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [pedido.id])

  // Real rider GPS tracking when en_camino or recogido
  useEffect(() => {
    if (!pedido.socio_id || (etapa !== 2 && etapa !== 3)) return
    // Fetch initial position
    supabase.from('socios').select('latitud_actual, longitud_actual').eq('id', pedido.socio_id).single()
      .then(({ data }) => { if (data) { setRiderLat(data.latitud_actual); setRiderLng(data.longitud_actual) } })
    // Subscribe to rider location updates
    const ch = supabase.channel(`rider-gps-${pedido.socio_id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'socios', filter: `id=eq.${pedido.socio_id}` },
        payload => {
          if (payload.new.latitud_actual) setRiderLat(payload.new.latitud_actual)
          if (payload.new.longitud_actual) setRiderLng(payload.new.longitud_actual)
        })
      .subscribe()
    // Also poll every 10s as backup
    const gpsInterval = setInterval(async () => {
      const { data } = await supabase.from('socios').select('latitud_actual, longitud_actual').eq('id', pedido.socio_id).single()
      if (data) { setRiderLat(data.latitud_actual); setRiderLng(data.longitud_actual) }
    }, 10000)
    return () => { supabase.removeChannel(ch); clearInterval(gpsInterval) }
  }, [pedido.socio_id, etapa])

  // Animacion del rider (fallback visual)
  useEffect(() => {
    if (etapa === 3) {
      const i = setInterval(() => setRiderPos(p => Math.min(p + 2, 100)), 200)
      return () => clearInterval(i)
    }
  }, [etapa])

  async function enviarValoracion() {
    if (!valoracion || yaValorado || resenaEnviada) return
    const uid = user?.id || pedido.usuario_id
    if (!uid) {
      setErrorResena('No se pudo identificar al usuario. Inicia sesion de nuevo.')
      return
    }
    setErrorResena(null)
    const { error } = await supabase.from('resenas').insert({
      usuario_id: uid,
      establecimiento_id: pedido.establecimiento_id,
      socio_id: pedido.socio_id,
      pedido_id: pedido.id,
      rating: valoracion,
      texto: textoResena.trim() || null,
    })
    if (!error) {
      setResenaEnviada(true)
      setYaValorado(true)
      setTimeout(() => onClose(), 1500)
    } else {
      setErrorResena('No se pudo enviar la valoracion. Intentalo de nuevo.')
    }
  }

  // ==================== CANCELADO ====================
  if (pedido.estado === 'cancelado' || pedido.estado === 'fallido') {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-text)', margin: 0 }}>Tu pedido</h2>
          <span style={{ fontSize: 11, color: 'var(--c-muted)', fontWeight: 600 }}>{pedido.codigo}</span>
        </div>
        <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: 16, padding: 28, textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>😔</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#EF4444', marginBottom: 8 }}>Pedido cancelado</div>
          {pedido.motivo_cancelacion && (
            <div style={{
              fontSize: 14, color: 'var(--c-text)', marginBottom: 12, fontWeight: 600,
              background: 'rgba(239,68,68,0.08)', borderRadius: 10, padding: '10px 14px',
            }}>{pedido.motivo_cancelacion}</div>
          )}
          <div style={{ fontSize: 12, color: 'var(--c-muted)', marginBottom: 20 }}>
            {pedido.metodo_pago === 'tarjeta' ? 'Si se realizo el cobro, el reembolso se procesara automaticamente.' : 'No se ha realizado ningun cobro.'}
          </div>
          <button onClick={onClose} style={{
            padding: '12px 28px', borderRadius: 12, border: 'none',
            background: 'var(--c-primary)', color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Entendido</button>
        </div>
      </div>
    )
  }

  // ==================== TRACKING ACTIVO ====================
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-text)', margin: 0 }}>Tu pedido</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--c-muted)', fontWeight: 600 }}>{pedido.codigo}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--c-primary)', cursor: 'pointer', fontFamily: 'inherit' }}>Cerrar</button>
        </div>
      </div>

      {/* Animación visual por bloques */}
      <div style={{ borderRadius: 16, marginBottom: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>

        {/* ===== BLOQUE 1: COCINA - Preparando ===== */}
        {(etapa <= 1) && (
          <div style={{ height: 200, position: 'relative', background: 'linear-gradient(135deg, #1a1207 0%, #2d1f0e 50%, #1a1207 100%)', animation: 'fadeIn 0.5s ease' }}>
            {/* Pared de cocina con azulejos */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 49%, transparent 49%, transparent 50%), repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 49%, transparent 49%, transparent 50%)', backgroundSize: '20px 20px' }} />
            {/* Campana extractora */}
            <div style={{ position: 'absolute', top: 0, left: '25%', width: '50%', height: 24, background: 'linear-gradient(180deg, #555, #444)', borderRadius: '0 0 8px 8px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
              <div style={{ position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50)', width: 6, height: 6, borderRadius: '50%', background: etapa === 1 ? '#4ADE80' : '#555', boxShadow: etapa === 1 ? '0 0 8px #4ADE80' : 'none' }} />
            </div>
            {/* Vapor / humo de cocina */}
            {etapa === 1 && <>
              <div style={{ position: 'absolute', top: 30, left: '35%', fontSize: 14, opacity: 0.4, animation: 'steamRise 2s ease-out infinite' }}>💨</div>
              <div style={{ position: 'absolute', top: 35, left: '50%', fontSize: 12, opacity: 0.3, animation: 'steamRise 2.5s ease-out infinite 0.5s' }}>💨</div>
              <div style={{ position: 'absolute', top: 32, left: '60%', fontSize: 10, opacity: 0.3, animation: 'steamRise 2s ease-out infinite 1s' }}>💨</div>
            </>}
            {/* Encimera / mesa de cocina */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(180deg, #5C4033, #4A3428)', borderTop: '3px solid #6B4F3A' }}>
              {/* Textura madera */}
              <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'repeating-linear-gradient(90deg, transparent 0, transparent 30px, rgba(0,0,0,0.15) 30px, rgba(0,0,0,0.15) 31px)' }} />
            </div>
            {/* Elementos de cocina */}
            <div style={{ position: 'absolute', bottom: '40%', left: '12%', display: 'flex', alignItems: 'flex-end', gap: 6 }}>
              {/* Sartén */}
              <div style={{ position: 'relative' }}>
                <span style={{ fontSize: 32 }}>🍳</span>
                {etapa === 1 && <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', animation: 'sizzle 0.3s ease-in-out infinite alternate' }}>
                  <span style={{ fontSize: 8, color: '#FFD700' }}>✦</span>
                </div>}
              </div>
            </div>
            {/* Cuchillo animado */}
            <div style={{ position: 'absolute', bottom: '40%', left: '45%' }}>
              <span style={{ fontSize: 28, display: 'inline-block', animation: etapa === 1 ? 'chopChop 0.4s ease-in-out infinite' : 'none', transformOrigin: 'bottom right' }}>🔪</span>
            </div>
            {/* Ingredientes */}
            <div style={{ position: 'absolute', bottom: '40%', left: '60%', display: 'flex', gap: 4 }}>
              <span style={{ fontSize: 20 }}>🍅</span>
              <span style={{ fontSize: 20 }}>🧅</span>
              <span style={{ fontSize: 18 }}>🫑</span>
            </div>
            {/* Plato siendo preparado */}
            <div style={{ position: 'absolute', bottom: '40%', right: '10%' }}>
              <span style={{ fontSize: 30, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>🍽️</span>
            </div>
            {/* Overlay de estado */}
            <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, animation: etapa === 0 ? 'pulse 2s infinite' : 'none' }}>{etapa === 0 ? '⏳' : '👨‍🍳'}</span>
                <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>{etapa === 0 ? 'Esperando al restaurante...' : 'Preparando tu pedido...'}</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#FFD700' }}>
                {etapa === 0 ? 'Pendiente' : `~${pedido.minutos_preparacion || 20} min`}
              </div>
            </div>
          </div>
        )}

        {/* ===== BLOQUE 2: RIDER RECOGE - Buscando/Recogiendo ===== */}
        {etapa === 2 && (
          <div style={{ height: 200, position: 'relative', background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', animation: 'fadeIn 0.5s ease' }}>
            {/* Estrellas nocturnas */}
            {[...Array(12)].map((_, i) => (
              <div key={i} style={{ position: 'absolute', top: 8 + (i * 7) % 60, left: `${5 + (i * 17) % 90}%`, width: 2, height: 2, borderRadius: '50%', background: '#fff', opacity: 0.3 + (i % 3) * 0.2, animation: `twinkle ${1.5 + i * 0.3}s ease-in-out infinite ${i * 0.2}s` }} />
            ))}
            {/* Farola */}
            <div style={{ position: 'absolute', bottom: 50, left: '20%', width: 3, height: 50, background: '#555' }}>
              <div style={{ position: 'absolute', top: -4, left: -6, width: 15, height: 8, borderRadius: '4px 4px 0 0', background: '#666' }}>
                <div style={{ position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)', width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,200,50,0.3)', filter: 'blur(6px)' }} />
              </div>
            </div>
            {/* Restaurante */}
            <div style={{ position: 'absolute', bottom: 50, left: '35%', textAlign: 'center' }}>
              <span style={{ fontSize: 36 }}>🏪</span>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginTop: 2 }}>Restaurante</div>
            </div>
            {/* Suelo/acera */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, background: 'linear-gradient(180deg, #374151, #1f2937)', borderTop: '2px solid #4B5563' }} />
            {/* Rider llegando */}
            <div style={{ position: 'absolute', bottom: 52, right: '20%', animation: 'riderArrive 1.5s ease-out forwards' }}>
              <div style={{ animation: 'riderBounce 0.5s ease-in-out infinite' }}>
                <span style={{ fontSize: 36, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>🏍️</span>
              </div>
            </div>
            {/* Paquete flotando */}
            <div style={{ position: 'absolute', bottom: 85, left: '42%', animation: 'floatPkg 1.5s ease-in-out infinite' }}>
              <span style={{ fontSize: 24 }}>📦</span>
            </div>
            {/* Overlay */}
            <div style={{ position: 'absolute', bottom: 8, left: 12, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>📦</span>
              <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>Repartidor recogiendo tu pedido...</span>
            </div>
          </div>
        )}

        {/* ===== BLOQUE 3: EN CAMINO - Mapa Google Maps real ===== */}
        {etapa === 3 && (
          <div style={{ height: 220, position: 'relative', borderRadius: 16, overflow: 'hidden', animation: 'fadeIn 0.5s ease' }}>
            {isLoaded && (estCoords || (pedido.lat_entrega && pedido.lng_entrega)) ? (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                options={{ styles: darkMapStyles, disableDefaultUI: true, zoomControl: false, gestureHandling: 'greedy' }}
                onLoad={onMapLoad}
              >
                {/* Marker restaurante */}
                {estCoords && (
                  <MarkerF position={estCoords} label={{ text: '🏪', fontSize: '20px' }}
                    icon={{ url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'), anchor: { x: 0, y: 0 } }} />
                )}
                {/* Marker cliente (destino) */}
                {pedido.lat_entrega && pedido.lng_entrega && (
                  <MarkerF position={{ lat: pedido.lat_entrega, lng: pedido.lng_entrega }} label={{ text: '🏠', fontSize: '20px' }}
                    icon={{ url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'), anchor: { x: 0, y: 0 } }} />
                )}
                {/* Marker rider en tiempo real */}
                {riderLat && riderLng && (
                  <MarkerF position={{ lat: riderLat, lng: riderLng }} label={{ text: '🛵', fontSize: '22px' }}
                    icon={{ url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'), anchor: { x: 0, y: 0 } }} />
                )}
              </GoogleMap>
            ) : (
              // Fallback mientras carga
              <div style={{ width: '100%', height: '100%', background: '#1d1d1d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 14, color: 'var(--c-muted)' }}>Cargando mapa...</span>
              </div>
            )}
            {/* Tiempo badge */}
            <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: '#FF6B2C', color: '#fff', borderRadius: 20, padding: '6px 16px', fontSize: 12, fontWeight: 800, boxShadow: '0 4px 12px rgba(255,107,44,0.4)', display: 'flex', alignItems: 'center', gap: 6, zIndex: 5 }}>
              <span style={{ fontSize: 14 }}>🛵</span> En camino · ~{Math.max(3, Math.round((100 - riderPos) / 100 * 15))} min
            </div>
          </div>
        )}

        {/* ===== BLOQUE 4: ENTREGADO ===== */}
        {etapa === 4 && (
          <div style={{ height: 200, position: 'relative', background: 'linear-gradient(135deg, #064e3b, #065f46)', animation: 'fadeIn 0.5s ease' }}>
            {/* Confetti */}
            {[...Array(20)].map((_, i) => (
              <div key={i} style={{
                position: 'absolute', top: -10,
                left: `${5 + (i * 5) % 90}%`,
                width: 6 + (i % 3) * 2, height: 6 + (i % 3) * 2,
                borderRadius: i % 2 ? '50%' : '2px',
                background: ['#FF6B2C', '#FFD700', '#FF4444', '#4ADE80', '#60A5FA', '#F472B6'][i % 6],
                animation: `confettiFall ${1.5 + (i % 5) * 0.3}s ease-in infinite ${i * 0.15}s`,
                opacity: 0.8,
              }} />
            ))}
            {/* Puerta de casa */}
            <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
              <div style={{ width: 70, height: 90, background: '#8B6F47', borderRadius: '8px 8px 0 0', position: 'relative', margin: '0 auto' }}>
                <div style={{ position: 'absolute', top: '50%', right: 8, width: 6, height: 6, borderRadius: '50%', background: '#FFD700' }} />
              </div>
            </div>
            {/* Paquete entregado */}
            <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', animation: 'deliveredBounce 0.6s ease forwards' }}>
              <span style={{ fontSize: 32 }}>📦</span>
            </div>
            {/* Mensaje central */}
            <div style={{ position: 'absolute', top: 20, left: 0, right: 0, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 6, animation: 'celebrateEmoji 0.8s ease forwards' }}>🎉</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>Pedido entregado!</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: 600 }}>Disfruta tu comida</div>
            </div>
          </div>
        )}
      </div>

      {/* Tracking CSS animations */}
      <style>{`
        @keyframes riderBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes steamRise { 0%{opacity:0.5;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-30px) scale(1.5)} }
        @keyframes chopChop { 0%{transform:rotate(0deg)} 100%{transform:rotate(-20deg)} }
        @keyframes sizzle { 0%{opacity:0.3;transform:scale(0.8)} 100%{opacity:1;transform:scale(1.2)} }
        @keyframes riderArrive { 0%{transform:translateX(80px);opacity:0} 100%{transform:translateX(0);opacity:1} }
        @keyframes floatPkg { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes twinkle { 0%,100%{opacity:0.2} 50%{opacity:0.8} }
        @keyframes confettiFall { 0%{transform:translateY(-10px) rotate(0deg);opacity:0.9} 100%{transform:translateY(220px) rotate(720deg);opacity:0} }
        @keyframes celebrateEmoji { 0%{transform:scale(0) rotate(-180deg)} 60%{transform:scale(1.3) rotate(10deg)} 100%{transform:scale(1) rotate(0)} }
        @keyframes deliveredBounce { 0%{transform:translateX(-50%) translateY(-40px);opacity:0} 60%{transform:translateX(-50%) translateY(5px)} 100%{transform:translateX(-50%) translateY(0);opacity:1} }
      `}</style>

      {/* Info repartidor */}
      {socio && etapa >= 1 && etapa < 5 && (
        <div style={{ background: 'var(--c-surface)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--c-border)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--c-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🛵</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--c-text)' }}>{socio.nombre}</div>
            <div style={{ fontSize: 11, color: 'var(--c-muted)' }}>★ {socio.rating} · Tu repartidor</div>
          </div>
          {socio.telefono && (
            <button onClick={() => window.open(`tel:${socio.telefono}`, '_self')} style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--c-primary-light)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={16} strokeWidth={2} color="var(--c-primary)" />
            </button>
          )}
        </div>
      )}

      {/* Pasos */}
      <div style={{ marginBottom: 20 }}>
        {ETAPAS.map((e, i) => (
          <div key={i} style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: i <= etapa ? 'var(--c-primary)' : 'var(--c-surface2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, transition: 'all 0.3s',
                animation: i === 0 && etapa === 0 ? 'pulse 2s ease-in-out infinite' : 'none',
              }}>
                {i <= etapa ? e.icon : ''}
              </div>
              {i < 4 && <div style={{ width: 2, height: 24, background: i < etapa ? 'var(--c-primary)' : 'var(--c-border)' }} />}
            </div>
            <div style={{ paddingTop: 4, paddingBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: i <= etapa ? 'var(--c-text)' : 'var(--c-muted)' }}>{e.label}</div>
              <div style={{ fontSize: 11, color: 'var(--c-muted)' }}>{e.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Valoracion al entregar */}
      {etapa === 4 && (
        <div style={{ background: 'var(--c-surface)', borderRadius: 14, padding: 20, border: '1px solid var(--c-border)' }}>
          {yaValorado || resenaEnviada ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-primary)' }}>Gracias por tu valoracion</div>
              <div style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 4 }}>Tu opinion nos ayuda a mejorar</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', marginBottom: 10, textAlign: 'center' }}>¿Como fue tu experiencia?</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <button key={i} onClick={() => setValoracion(i)} style={{
                    width: 40, height: 40, borderRadius: 10,
                    border: i <= valoracion ? '2px solid var(--c-primary)' : '1px solid var(--c-border)',
                    background: i <= valoracion ? 'var(--c-primary)' : 'var(--c-surface)',
                    cursor: 'pointer', fontSize: 18,
                    color: i <= valoracion ? '#fff' : 'var(--c-text)',
                    transition: 'all 0.15s',
                  }}>★</button>
                ))}
              </div>
              {valoracion > 0 && (
                <>
                  <textarea value={textoResena} onChange={e => setTextoResena(e.target.value)} placeholder="Cuentanos mas sobre tu experiencia (opcional)..." rows={3} style={{
                    width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--c-border)',
                    fontSize: 13, fontFamily: 'inherit', background: 'rgba(255,255,255,0.06)',
                    color: 'var(--c-text)', outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 12,
                  }} />
                  {errorResena && (
                    <div style={{ fontSize: 12, color: '#EF4444', textAlign: 'center', marginBottom: 10, fontWeight: 600 }}>
                      {errorResena}
                    </div>
                  )}
                  <button onClick={enviarValoracion} style={{
                    width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
                    background: 'var(--c-primary)', color: '#fff', fontSize: 14, fontWeight: 800,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Enviar valoracion
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Badge metodo pago */}
      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--c-muted)' }}>
        {pedido.metodo_pago === 'tarjeta' ? '💳 Pagado con tarjeta' : '💵 Pago en efectivo'}
      </div>
    </div>
  )
}
