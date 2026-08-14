import { useState, useEffect, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, OverlayViewF, OVERLAY_MOUSE_TARGET } from '@react-google-maps/api'
import { supabase } from '../lib/supabase'
import { Phone } from 'lucide-react'

// useJsApiLoader exige referencia estable entre renders y misma config que el resto
// de la app (Mapa.jsx usa ['places']) para compartir el mismo script cargado.
const MAPS_LIBRARIES = ['places']
const mapContainerStyle = { width: '100%', height: 320 }

// Se resuelve una vez, en módulo: las opciones del mapa se recrean en cada
// render y no conviene medir la ventana en cada uno. En el WebView de
// Capacitor y en cualquier móvil da false, así que el comportamiento nativo
// que hay hoy en las tiendas queda intacto.
const esEscritorio = typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(min-width:768px)').matches

// Mismo estilo claro tipo Pidoo que el Mapa, para que pegue con la app.
const lightMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#F5F2EC' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5C5C5C' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F7F3EC' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#E8E5DF' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#E5EBDA' }, { visibility: 'on' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#FFD89E' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#C9DDEB' }] },
]

const num = v => (v == null ? null : Number(v))

// Normaliza el teléfono para wa.me: solo dígitos; si es un móvil español de 9
// dígitos le antepone 34.
function waNumber(tel) {
  const d = String(tel || '').replace(/\D/g, '')
  return d.length === 9 ? '34' + d : d
}

function WhatsAppIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.13c-.24.68-1.4 1.3-1.94 1.38-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.17-4.93-4.36-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.26-.29.57-.36.76-.36l.55.01c.18.01.42-.07.65.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.69-.8.87-1.08.18-.28.36-.23.61-.14.25.09 1.6.76 1.87.9.28.14.46.21.53.33.07.11.07.65-.17 1.33z" />
    </svg>
  )
}

// Mapa NATIVO de seguimiento del reparto (estilo Uber/Glovo): todo dentro de la app,
// sin iframe ni URL externa. Pinta restaurante + repartidor (moto Pidoo, en vivo) +
// dirección de entrega, y debajo una tarjeta del repartidor con Llamar / WhatsApp.
// Refresca la posición del rider cada 8 s.
export default function MapaReparto({ pedido }) {
  const [trk, setTrk] = useState(null)
  const [map, setMap] = useState(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: MAPS_LIBRARIES,
  })

  // Cargar + refrescar los datos de seguimiento (posición del rider incluida).
  useEffect(() => {
    if (!pedido?.codigo) return
    let alive = true
    const fetchTrk = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-tracking-publico', {
          body: { codigo: pedido.codigo, token: pedido.tracking_token || '' },
        })
        if (alive && data && !error && !data.error) setTrk(data)
      } catch (_) { /* silencioso: el mapa aguanta un fallo puntual */ }
    }
    fetchTrk()
    const iv = setInterval(fetchTrk, 8000)
    return () => { alive = false; clearInterval(iv) }
  }, [pedido?.codigo, pedido?.tracking_token])

  const est = trk?.establecimiento
  const rider = trk?.rider
  const entrega = trk?.entrega
  const estPos = (est && num(est.latitud) != null && num(est.longitud) != null) ? { lat: num(est.latitud), lng: num(est.longitud) } : null
  const riderPos = (rider && num(rider.lat) != null && num(rider.lng) != null) ? { lat: num(rider.lat), lng: num(rider.lng) } : null
  const entregaPos = (entrega && num(entrega.lat) != null && num(entrega.lng) != null) ? { lat: num(entrega.lat), lng: num(entrega.lng) } : null

  // Ajustar el encuadre a todos los marcadores cuando cambian.
  useEffect(() => {
    if (!map || !window.google) return
    const pts = [estPos, riderPos, entregaPos].filter(Boolean)
    if (pts.length === 0) return
    if (pts.length === 1) { map.setCenter(pts[0]); map.setZoom(15); return }
    const b = new window.google.maps.LatLngBounds()
    pts.forEach(p => b.extend(p))
    map.fitBounds(b, 70)
  }, [map, estPos?.lat, estPos?.lng, riderPos?.lat, riderPos?.lng, entregaPos?.lat, entregaPos?.lng])

  const onLoad = useCallback(m => setMap(m), [])

  if (!isLoaded) {
    return (
      <div style={{ height: 320, borderRadius: 14, background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-muted)', fontSize: 13, border: '1px solid #E8E1D3' }}>
        Cargando mapa…
      </div>
    )
  }

  const center = riderPos || estPos || entregaPos || { lat: 28.41, lng: -16.54 }
  const nombreRider = rider?.nombre || 'Tu repartidor'

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #E8E1D3', background: '#fff' }}>
      <div style={{ position: 'relative' }}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={14}
          onLoad={onLoad}
          options={{
            styles: lightMapStyles,
            disableDefaultUI: true,
            // 'greedy' es lo correcto con un dedo, pero en escritorio secuestra
            // la RUEDA del ratón: al bajar por el seguimiento del pedido, en
            // cuanto el cursor entraba en el mapa la página dejaba de moverse y
            // el mapa se alejaba solo — y sin botones +/- no había forma de
            // recuperar el encuadre. 'cooperative' devuelve la rueda a la
            // página y exige Ctrl+rueda para el zoom. En el móvil y en el
            // WebView nativo matchMedia da false y todo queda como estaba.
            zoomControl: esEscritorio,
            gestureHandling: esEscritorio ? 'cooperative' : 'greedy',
          }}
        >
          {/* Restaurante */}
          {estPos && (
            <OverlayViewF position={estPos} mapPaneName={OVERLAY_MOUSE_TARGET}>
              <div style={{ transform: 'translate(-50%,-50%)', width: 40, height: 40, borderRadius: '50%', border: '2.5px solid #C5562C', background: '#fff', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {est?.logo_url ? <img src={est.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 20 }}>🍽️</span>}
              </div>
            </OverlayViewF>
          )}

          {/* Tu dirección de entrega */}
          {entregaPos && (
            <OverlayViewF position={entregaPos} mapPaneName={OVERLAY_MOUSE_TARGET}>
              <div style={{ transform: 'translate(-50%,-50%)', width: 34, height: 34, borderRadius: '50%', border: '2.5px solid #1A1815', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.35)', flexShrink: 0 }}>
                <span style={{ fontSize: 16 }}>🏠</span>
              </div>
            </OverlayViewF>
          )}

          {/* Repartidor en vivo — logo del socio si lo tiene, si no la moto Pidoo */}
          {riderPos && (
            <OverlayViewF position={riderPos} mapPaneName={OVERLAY_MOUSE_TARGET}>
              <div style={{ transform: 'translate(-50%,-50%)', width: 48, height: 48, borderRadius: '50%', border: '2.5px solid #FF6B2C', background: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 12px rgba(255,107,44,0.5)', flexShrink: 0 }}>
                {rider?.logo_url
                  ? <img src={rider.logo_url} alt="Repartidor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <img src="/moto-pidoo.png" alt="Repartidor" style={{ width: 30, height: 'auto' }} />}
              </div>
            </OverlayViewF>
          )}
        </GoogleMap>

        {/* Aviso mientras aún no hay posición del repartidor */}
        {!riderPos && (
          <div style={{ position: 'absolute', left: 12, bottom: 12, background: 'rgba(255,255,255,0.94)', border: '1px solid #E8E1D3', borderRadius: 10, padding: '7px 12px', fontSize: 11, fontWeight: 700, color: '#6B6356', backdropFilter: 'blur(6px)' }}>
            Buscando la posición del repartidor…
          </div>
        )}
      </div>

      {/* Tarjeta del repartidor: nombre + valoración + Llamar / WhatsApp */}
      {rider && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderTop: '1px solid #E8E1D3' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: '#EFE9DD', border: '1px solid #E8E1D3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {rider.logo_url ? <img src={rider.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src="/moto-pidoo.png" alt="" style={{ width: 26, height: 'auto' }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: '#6B6356', fontWeight: 700 }}>Tu repartidor</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#1A1815', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombreRider}</div>
            {rider.rating != null && (
              <div style={{ fontSize: 12, color: '#6B6356' }}><span style={{ color: '#C99551' }}>★</span> {Number(rider.rating).toFixed(1)}</div>
            )}
          </div>
          {rider.telefono ? (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <a href={`tel:${rider.telefono}`} aria-label="Llamar al repartidor" style={{ width: 44, height: 44, borderRadius: 12, background: '#C5562C', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                <Phone size={18} strokeWidth={2.2} />
              </a>
              <a href={`https://wa.me/${waNumber(rider.telefono)}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp al repartidor" style={{ width: 44, height: 44, borderRadius: 12, background: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                <WhatsAppIcon size={20} />
              </a>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
