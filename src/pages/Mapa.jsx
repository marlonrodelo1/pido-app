import { useState, useEffect, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, CircleF, OverlayViewF, OVERLAY_MOUSE_TARGET } from '@react-google-maps/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getCurrentPosition } from '../lib/geolocation'

const mapContainerStyle = { width: '100%', height: 'calc(100vh - 160px)', borderRadius: 16 }

// Modo claro tipo Pidoo (#FAFAF7). Suaviza colores Google por defecto y
// quita POIs ruidosos para que el mapa pegue con el resto de la app.
const lightMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#F5F2EC' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5C5C5C' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FAFAF7' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#E8E5DF' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#E5EBDA' }, { visibility: 'on' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#FFD89E' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#5C5C5C' }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: '#7A7A7A' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#C9DDEB' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#5C7A8C' }] },
]

export default function Mapa({ onOpenRest }) {
  const { perfil } = useAuth()
  const [establecimientos, setEstablecimientos] = useState([])
  const [center, setCenter] = useState({ lat: 28.1235, lng: -15.4363 }) // Canarias por defecto
  const [selectedEst, setSelectedEst] = useState(null)
  const [geoError, setGeoError] = useState(false)
  const [map, setMap] = useState(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  })

  useEffect(() => {
    fetchData()
    // Ubicación del usuario
    if (perfil?.latitud && perfil?.longitud) {
      setCenter({ lat: perfil.latitud, lng: perfil.longitud })
    } else {
      getCurrentPosition()
        .then(pos => { setCenter({ lat: pos.lat, lng: pos.lng }); setGeoError(false) })
        .catch(() => { setGeoError(true) })
    }
  }, [])

  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371
    const toRad = d => d * Math.PI / 180
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  }

  async function fetchData() {
    // Radio global de descubrimiento (configurable por superadmin).
    let radioKm = 15
    const { data: cfg } = await supabase.from('configuracion_plataforma')
      .select('valor').eq('clave', 'radio_descubrimiento_km').maybeSingle()
    const v = parseFloat(cfg?.valor)
    if (Number.isFinite(v) && v > 0) radioKm = v

    const c = perfil?.latitud ? { lat: perfil.latitud, lng: perfil.longitud } : center
    // Bounding box generoso (~1° ≈ 111km) para no perder bordes; el filtro
    // fino con Haversine lo aplicamos despues.
    const delta = Math.max(1, radioKm / 80)
    const { data: estData } = await supabase
      .from('establecimientos')
      .select('id, nombre, latitud, longitud, tipo, logo_url, rating, radio_cobertura_km')
      .eq('activo', true)
      .gte('latitud', c.lat - delta).lte('latitud', c.lat + delta)
      .gte('longitud', c.lng - delta).lte('longitud', c.lng + delta)

    // Si tenemos ubicacion del cliente, filtrar por radio global. Si no,
    // mostrar todo el bounding box.
    const filtered = (perfil?.latitud && perfil?.longitud)
      ? (estData || []).filter(e =>
          e.latitud != null && e.longitud != null &&
          haversineKm(perfil.latitud, perfil.longitud, e.latitud, e.longitud) <= radioKm
        )
      : (estData || [])
    setEstablecimientos(filtered)
  }

  const onLoad = useCallback(m => setMap(m), [])

  if (!isLoaded) {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-text)', margin: '0 0 16px' }}>Mapa</h2>
        <div style={{ height: 300, borderRadius: 16, background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--c-muted)', fontSize: 13 }}>Cargando mapa...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {geoError && (
        <div style={{ marginBottom: 10, padding: '8px 14px', borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', fontSize: 11, color: '#D97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          📍 Activa tu ubicación para centrar el mapa
        </div>
      )}

      {/* Contadores flotantes */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ background: 'rgba(0,0,0,0.06)', border: '1px solid var(--c-border)', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: 'var(--c-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>🍽️</span> {establecimientos.length} establecimientos
        </div>
      </div>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={14}
        onLoad={onLoad}
        options={{
          styles: lightMapStyles,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
        onClick={() => { setSelectedEst(null) }}
      >
        {/* Círculo de radio del restaurante seleccionado */}
        {selectedEst?.radio_cobertura_km && selectedEst.latitud && selectedEst.longitud && (
          <CircleF
            center={{ lat: selectedEst.latitud, lng: selectedEst.longitud }}
            radius={selectedEst.radio_cobertura_km * 1000}
            options={{
              fillColor: '#FF6B2C',
              fillOpacity: 0.08,
              strokeColor: '#FF6B2C',
              strokeOpacity: 0.5,
              strokeWeight: 1.5,
            }}
          />
        )}
        {/* Ubicación del usuario */}
        <MarkerF
          position={center}
          icon={{
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#4285F4',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 3,
          }}
        />
        <CircleF
          center={center}
          radius={150}
          options={{ fillColor: '#4285F4', fillOpacity: 0.1, strokeColor: '#4285F4', strokeOpacity: 0.3, strokeWeight: 1 }}
        />

        {/* Establecimientos — marcador con logo */}
        {establecimientos.map(est => (
          est.latitud && est.longitud && (
            <OverlayViewF
              key={`est-${est.id}`}
              position={{ lat: est.latitud, lng: est.longitud }}
              mapPaneName={OVERLAY_MOUSE_TARGET}
            >
              <div
                onClick={(e) => { e.stopPropagation(); setSelectedEst(est) }}
                onTouchEnd={(e) => { e.stopPropagation(); setSelectedEst(est) }}
                style={{
                  width: 44, height: 44, borderRadius: '50%',
                  border: `2.5px solid ${selectedEst?.id === est.id ? '#fff' : '#FF6B2C'}`,
                  overflow: 'hidden', background: '#FFFFFF',
                  transform: 'translate(-50%, -50%)',
                  cursor: 'pointer',
                  boxShadow: selectedEst?.id === est.id
                    ? '0 0 0 3px #FF6B2C, 0 4px 12px rgba(0,0,0,0.5)'
                    : '0 2px 8px rgba(0,0,0,0.45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                  flexShrink: 0,
                }}
              >
                {est.logo_url
                  ? <img src={est.logo_url} alt={est.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 20 }}>{est.tipo === 'restaurante' ? '🍽️' : '🏪'}</span>
                }
              </div>
            </OverlayViewF>
          )
        ))}

        {/* InfoWindow establecimiento */}
        {selectedEst && (
          <InfoWindowF
            position={{ lat: selectedEst.latitud, lng: selectedEst.longitud }}
            onCloseClick={() => setSelectedEst(null)}
            options={{ pixelOffset: new window.google.maps.Size(0, -20) }}
          >
            <div style={{ fontFamily: "'DM Sans', sans-serif", padding: 4, minWidth: 160 }}
              onClick={() => onOpenRest && onOpenRest(selectedEst)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {selectedEst.logo_url ? (
                  <img src={selectedEst.logo_url} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 20 }}>{selectedEst.tipo === 'restaurante' ? '🍽️' : '🏪'}</span>
                )}
                <div style={{ fontWeight: 800, fontSize: 13, color: '#1A1A1A' }}>{selectedEst.nombre}</div>
              </div>
              <div style={{ fontSize: 11, color: '#666', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <span style={{ color: '#D97706' }}>★</span> {selectedEst.rating?.toFixed(1) || '—'}
                <span style={{ margin: '0 4px' }}>·</span>
                <span style={{ textTransform: 'capitalize' }}>{selectedEst.tipo}</span>
              </div>
              {selectedEst.radio_cobertura_km && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#FF6B2C', fontWeight: 700, marginBottom: 4 }}>
                  <span>📍</span> Reparte hasta {selectedEst.radio_cobertura_km} km
                </div>
              )}
              {onOpenRest && (
                <div style={{ marginTop: 4, fontSize: 11, color: '#FF6B2C', fontWeight: 700, cursor: 'pointer', borderTop: '1px solid #f0f0f0', paddingTop: 6 }}>
                  Ver carta →
                </div>
              )}
            </div>
          </InfoWindowF>
        )}

      </GoogleMap>
    </div>
  )
}
