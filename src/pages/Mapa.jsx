import { useState, useEffect, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF, CircleF, OverlayViewF, OVERLAY_MOUSE_TARGET } from '@react-google-maps/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getCurrentPosition } from '../lib/geolocation'

const mapContainerStyle = { width: '100%', height: 'calc(100vh - 160px)', borderRadius: 16 }

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

  async function fetchData() {
    // Obtener centro actual para filtro geográfico (~0.5° ≈ 55km)
    const c = perfil?.latitud ? { lat: perfil.latitud, lng: perfil.longitud } : center
    const delta = 0.5
    const { data: estData } = await supabase
      .from('establecimientos')
      .select('id, nombre, latitud, longitud, tipo, logo_url, rating, radio_cobertura_km')
      .eq('activo', true)
      .gte('latitud', c.lat - delta).lte('latitud', c.lat + delta)
      .gte('longitud', c.lng - delta).lte('longitud', c.lng + delta)
    setEstablecimientos(estData || [])
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
          styles: darkMapStyles,
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
