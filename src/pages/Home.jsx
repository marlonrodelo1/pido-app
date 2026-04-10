import { useState, useEffect, useMemo } from 'react'
import { MapPin, Search, X, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getCurrentPosition } from '../lib/geolocation'
import Stars from '../components/Stars'
import EntregaBadge from '../components/EntregaBadge'
import { estaAbierto, horarioHoyTexto } from '../lib/horario'

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const CTX = {
  comida:      { placeholder: 'Buscar restaurante o plato...', titulo: 'Restaurantes', emoji: '🍽️' },
  farmacia:    { placeholder: 'Buscar farmacia o producto...', titulo: 'Farmacias',    emoji: '💊' },
  marketplace: { placeholder: 'Buscar tienda o producto...',  titulo: 'Tiendas',       emoji: '🛒' },
}

export default function Home({ onOpenRest, categoriaPadre, onSerSocio }) {
  const ctx = CTX[categoriaPadre] || CTX.comida
  const { perfil, updatePerfil, user } = useAuth()
  const [establecimientos, setEstablecimientos] = useState([])
  const [ridersActivos, setRidersActivos] = useState({})
  const [busqueda, setBusqueda] = useState('')
  const [catActiva, setCatActiva] = useState(null)
  const [favoritos, setFavoritos] = useState(perfil?.favoritos || [])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState(null)
  const [geoError, setGeoError] = useState(false)
  const [categoriasGenerales, setCategoriasGenerales] = useState([])
  const [promociones, setPromociones] = useState([])

  useEffect(() => {
    // Cargar categorías generales filtradas por categoria_padre
    supabase.from('categorias_generales').select('*')
      .eq('activa', true)
      .eq('categoria_padre', categoriaPadre || 'comida')
      .order('orden')
      .then(({ data }) => { setCategoriasGenerales(data || []); setCatActiva(null) })
    // Cargar promociones activas
    supabase.from('promociones').select('*, establecimientos(id, nombre, logo_url, banner_url, rating, total_resenas, radio_cobertura_km, activo, horario, categoria_padre)')
      .eq('activa', true)
      .or('fecha_fin.is.null,fecha_fin.gt.' + new Date().toISOString())
      .then(({ data }) => setPromociones(
        (data || []).filter(p => p.establecimientos?.categoria_padre === (categoriaPadre || 'comida'))
      ))
  }, [categoriaPadre])

  // Sincronizar favoritos cuando perfil cambia
  useEffect(() => {
    if (perfil?.favoritos) setFavoritos(perfil.favoritos)
  }, [perfil?.favoritos])

  useEffect(() => {
    // Pedir geolocalización y guardar dirección principal si no tiene ninguna
    getCurrentPosition()
      .then(async pos => {
        setUserLocation(pos)
        setGeoError(false)
        if (!perfil?.id) return
        // Solo actuar si no tiene dirección de texto guardada
        if (perfil.latitud && perfil.longitud && perfil.direccion) return
        // Reverse geocoding con Nominatim para obtener el texto de la dirección
        let dirTexto = null
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'es' } }
          )
          const data = await res.json()
          const a = data.address || {}
          const partes = [
            a.road || a.pedestrian || a.footway,
            a.house_number,
            a.city || a.town || a.village || a.municipality,
          ].filter(Boolean)
          dirTexto = partes.length > 0 ? partes.join(', ') : data.display_name?.split(',').slice(0, 2).join(',').trim()
        } catch (_) {}
        // Guardar en perfil (usuarios)
        await updatePerfil({
          latitud: pos.lat,
          longitud: pos.lng,
          ...(dirTexto ? { direccion: dirTexto } : {}),
        })
        // Guardar en direcciones_usuario solo si no tiene ninguna
        if (dirTexto) {
          const { data: existentes } = await supabase
            .from('direcciones_usuario')
            .select('id')
            .eq('usuario_id', perfil.id)
          if (!existentes || existentes.length === 0) {
            await supabase.from('direcciones_usuario').insert({
              usuario_id: perfil.id,
              etiqueta: 'Mi ubicacion',
              direccion: dirTexto,
              latitud: pos.lat,
              longitud: pos.lng,
              principal: true,
            })
          }
        }
      })
      .catch(() => { setGeoError(true) })
    fetchEstablecimientos()
  }, [categoriaPadre])

  async function fetchEstablecimientos() {
    setLoading(true)
    let query = supabase
      .from('establecimientos')
      .select('*')
      .eq('activo', true)

    if (categoriaPadre) {
      query = query.eq('categoria_padre', categoriaPadre)
    }

    let { data } = await query.order('rating', { ascending: false })

    // Ordenar: abiertos primero, cerrados por horario al final
    if (data) {
      data = data.sort((a, b) => {
        const aOpen = estaAbierto(a).abierto ? 0 : 1
        const bOpen = estaAbierto(b).abierto ? 0 : 1
        if (aOpen !== bOpen) return aOpen - bOpen
        return (b.rating || 0) - (a.rating || 0)
      })
    }

    if (data && data.length > 0) {
      const estIds = data.map(e => e.id)

      // Cargar categorías + riders en paralelo
      const [estCatsRes, relacionesRes] = await Promise.all([
        supabase.from('establecimiento_categorias').select('establecimiento_id, categoria_id').in('establecimiento_id', estIds),
        supabase.from('socio_establecimiento').select('establecimiento_id, socio_id').in('establecimiento_id', estIds).eq('estado', 'aceptado'),
      ])

      const catMap = {}
      for (const ec of (estCatsRes.data || [])) {
        if (!catMap[ec.establecimiento_id]) catMap[ec.establecimiento_id] = []
        catMap[ec.establecimiento_id].push(ec.categoria_id)
      }
      setEstablecimientos(data.map(e => ({ ...e, _catIds: catMap[e.id] || [] })))

      const relaciones = relacionesRes.data
      if (relaciones && relaciones.length > 0) {
        const socioIds = [...new Set(relaciones.map(r => r.socio_id))]
        const { data: sociosActivos } = await supabase
          .from('socios')
          .select('id')
          .in('id', socioIds)
          .eq('activo', true)
          .eq('en_servicio', true)

        const sociosActivosSet = new Set((sociosActivos || []).map(s => s.id))
        const mapa = {}
        relaciones.forEach(r => {
          if (sociosActivosSet.has(r.socio_id)) mapa[r.establecimiento_id] = true
        })
        setRidersActivos(mapa)
      }
    } else {
      setEstablecimientos(data || [])
    }

    setLoading(false)
  }

  async function toggleFav(id) {
    // Optimistic update local
    const newFavs = favoritos.includes(id)
      ? favoritos.filter(x => x !== id)
      : [...favoritos, id]
    setFavoritos(newFavs)

    // RPC atómica: toggle en BD y devuelve el array actualizado
    const { data, error } = await supabase.rpc('toggle_favorito', { p_establecimiento_id: id })
    if (error) {
      // Revertir si falla
      setFavoritos(favoritos)
      console.error('Error al guardar favorito:', error)
    } else if (data) {
      // Sincronizar con lo que realmente devolvió la BD
      setFavoritos(data)
    }
  }

  const filtrados = useMemo(() => {
    const lista = establecimientos.filter(r => {
      if (busqueda && !r.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
      if (catActiva) {
        const cat = categoriasGenerales.find(c => c.nombre === catActiva)
        if (cat && !(r._catIds || []).includes(cat.id)) return false
      }
      return true
    }).map(r => {
      if (userLocation && r.radio_cobertura_km && r.latitud && r.longitud) {
        const dist = haversineKm(userLocation.lat, userLocation.lng, r.latitud, r.longitud)
        return { ...r, _fueraDeRadio: dist > r.radio_cobertura_km, _distancia: dist }
      }
      return { ...r, _fueraDeRadio: false, _distancia: null }
    })
    // Dentro del radio primero, fuera del radio después
    lista.sort((a, b) => (a._fueraDeRadio ? 1 : 0) - (b._fueraDeRadio ? 1 : 0))
    return lista
  }, [establecimientos, busqueda, catActiva, categoriasGenerales, userLocation])

  const destacados = establecimientos.filter(r => r.rating >= 4.5).slice(0, 5)

  return (
    <div>
      {/* Dirección */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
        paddingBottom: 16, borderBottom: '1px solid #1A1919',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--c-primary-glow)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <MapPin size={16} strokeWidth={2.5} color="var(--c-primary)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--c-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>Enviar a</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {perfil?.direccion || 'Configura tu dirección'}
          </div>
        </div>
        <ChevronRight size={14} strokeWidth={2} color="var(--c-muted)" style={{ flexShrink: 0 }} />
      </div>

      {/* Aviso geolocalización */}
      {geoError && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>📍</span>
          <span style={{ fontSize: 11, color: '#FBBF24', fontWeight: 600 }}>Activa tu ubicación para ver restaurantes cerca de ti</span>
        </div>
      )}

      {/* Buscador */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#262626', borderRadius: 10,
        padding: '12px 14px', marginBottom: 20,
      }}>
        <Search size={18} strokeWidth={1.8} color="var(--c-muted)" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder={ctx.placeholder}
          style={{
            border: 'none', outline: 'none', fontSize: 14,
            fontFamily: 'inherit', background: 'transparent',
            flex: 1, color: 'var(--c-text)',
          }}
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda('')}
            style={{
              background: '#1A1919', border: 'none', borderRadius: 50,
              width: 22, height: 22, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={12} color="var(--c-muted)" />
          </button>
        )}
      </div>

      {/* Categorías */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 24, paddingBottom: 4 }}>
        {categoriasGenerales.map(c => {
          const isActive = catActiva === c.nombre
          return (
            <button
              key={c.nombre}
              onClick={() => setCatActiva(isActive ? null : c.nombre)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                minWidth: 60, padding: '8px 4px',
                opacity: catActiva && !isActive ? 0.45 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: isActive ? 'var(--c-primary-glow)' : '#262626',
                border: isActive ? '1.5px solid var(--c-primary)' : '1.5px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, transition: 'all 0.2s',
              }}>
                {c.emoji}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: isActive ? 'var(--c-primary-light)' : 'var(--c-muted)',
                letterSpacing: '0.01em',
              }}>
                {c.nombre}
              </span>
            </button>
          )
        })}
      </div>

      {/* Destacados slider */}
      {!busqueda && !catActiva && destacados.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.01em' }}>Destacados</h2>
            <span style={{ fontSize: 12, color: 'var(--c-primary-light)', fontWeight: 600, cursor: 'pointer' }}>Ver todo</span>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {destacados.map(r => {
              const estDest = estaAbierto(r)
              return (
                <div
                  key={r.id}
                  className="tablet-slider-card"
                  onClick={() => onOpenRest(r)}
                  style={{
                    minWidth: 240, flexShrink: 0,
                    background: '#1A1919', borderRadius: 14,
                    overflow: 'hidden', cursor: 'pointer',
                    border: '1px solid #262626',
                    opacity: estDest.abierto ? 1 : 0.6,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <div style={{
                    height: 110,
                    background: r.banner_url
                      ? `url(${r.banner_url}) center/cover`
                      : 'linear-gradient(135deg, #FF6B2C 0%, #F76526 100%)',
                    position: 'relative',
                  }}>
                    <span style={{
                      position: 'absolute', top: 8, left: 8,
                      background: estDest.abierto ? 'rgba(22,163,74,0.9)' : 'rgba(239,68,68,0.9)',
                      color: '#fff', fontSize: 9, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 6,
                    }}>
                      {estDest.abierto ? 'Abierto' : 'Cerrado'}
                    </span>
                  </div>
                  <div style={{ position: 'relative', padding: '0 12px' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 11,
                      border: '2.5px solid #1A1919',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#262626', fontSize: 18,
                      position: 'absolute', top: -22, left: 12,
                    }}>
                      {r.logo_url ? <img src={r.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : ctx.emoji}
                    </div>
                  </div>
                  <div style={{ padding: '26px 14px 12px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--c-text)', marginBottom: 4 }}>{r.nombre}</div>
                    <div style={{ display: 'flex', gap: 4, fontSize: 11, color: 'var(--c-muted)', alignItems: 'center' }}>
                      <Stars rating={r.rating} size={10} />
                      <span style={{ fontWeight: 600 }}>{r.rating?.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Promociones slider */}
      {!busqueda && !catActiva && promociones.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.01em' }}>Ofertas y promociones</h2>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {promociones.map(promo => {
              const est = promo.establecimientos
              if (!est) return null
              const estadoPromo = estaAbierto(est)
              return (
                <div
                  key={promo.id}
                  className="tablet-slider-card"
                  onClick={() => onOpenRest(est)}
                  style={{
                    minWidth: 260, flexShrink: 0,
                    background: '#1A1919', borderRadius: 14,
                    overflow: 'hidden', cursor: 'pointer',
                    border: '1px solid #262626',
                    opacity: estadoPromo.abierto ? 1 : 0.6,
                  }}
                >
                  <div style={{
                    height: 120,
                    background: est.banner_url
                      ? `url(${est.banner_url}) center/cover`
                      : 'linear-gradient(135deg, #FF6B2C 0%, #F76526 100%)',
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute', top: 8, left: 8, zIndex: 3,
                      width: 38, height: 38, borderRadius: 9,
                      border: '2px solid rgba(255,255,255,0.3)',
                      overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#262626', fontSize: 16,
                    }}>
                      {est.logo_url ? <img src={est.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : ctx.emoji}
                    </div>
                    <span style={{
                      position: 'absolute', top: 8, right: 8,
                      background: estadoPromo.abierto ? 'rgba(22,163,74,0.9)' : 'rgba(239,68,68,0.9)',
                      color: '#fff', fontSize: 9, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 6, zIndex: 3,
                    }}>
                      {estadoPromo.abierto ? 'Abierto' : 'Cerrado'}
                    </span>
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2,
                      background: 'linear-gradient(0deg, rgba(0,0,0,0.75) 0%, transparent 100%)',
                      padding: '20px 12px 8px', textAlign: 'right',
                    }}>
                      <div style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>{promo.titulo}</div>
                      {promo.minimo_compra > 0 && (
                        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: 500 }}>
                          Compra min. {promo.minimo_compra}€
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--c-text)', marginBottom: 3 }}>{est.nombre}</div>
                    <div style={{ display: 'flex', gap: 4, fontSize: 11, color: 'var(--c-muted)', alignItems: 'center' }}>
                      <Stars rating={est.rating} size={10} />
                      <span style={{ fontWeight: 600 }}>{est.rating?.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Banner ser socio */}
      {!busqueda && !catActiva && onSerSocio && (
        <button
          onClick={onSerSocio}
          style={{
            width: '100%', background: '#1A1919',
            borderRadius: 14, padding: '16px 18px',
            border: '1px solid #262626', cursor: 'pointer',
            marginBottom: 24, textAlign: 'center',
            fontFamily: 'inherit',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>🛵</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', marginBottom: 4 }}>Gana dinero repartiendo con pidoo</div>
          <div style={{ fontSize: 11, color: 'var(--c-muted)', marginBottom: 14 }}>Hasta 1.500€/mes · Regístrate gratis</div>
          <div style={{
            display: 'inline-block',
            background: 'var(--c-btn-gradient)', color: '#fff',
            fontSize: 13, fontWeight: 700, padding: '10px 24px',
            borderRadius: 8, letterSpacing: '0.01em',
          }}>
            Aplicar ahora
          </div>
        </button>
      )}

      {/* Lista */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.01em' }}>
          {busqueda ? 'Resultados' : catActiva ? ctx.titulo : 'Cerca de ti'}
        </h2>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--c-muted)' }}>
          Cargando...
        </div>
      )}

      {!loading && filtrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--c-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No hay resultados</div>
        </div>
      )}

      <div className="tablet-grid">
        {filtrados.flatMap((r, i) => {
          const isFav = favoritos.includes(r.id)
          const estado = estaAbierto(r)
          const horarioTxt = horarioHoyTexto(r.horario)
          const items = []
          if (r._fueraDeRadio && (i === 0 || !filtrados[i - 1]._fueraDeRadio)) {
            items.push(
              <div key="fuera-sep" style={{ gridColumn: '1 / -1', padding: '8px 0 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: '#262626' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-muted)', whiteSpace: 'nowrap' }}>Más restaurantes</span>
                <div style={{ flex: 1, height: 1, background: '#262626' }} />
              </div>
            )
          }
          items.push(
            <div
              key={r.id}
              onClick={() => onOpenRest(r)}
              style={{
                background: '#1A1919', borderRadius: 14,
                overflow: 'hidden', marginBottom: 12,
                cursor: 'pointer', border: '1px solid #262626',
                opacity: estado.abierto ? 1 : 0.6,
                transition: 'opacity 0.2s',
              }}
            >
              {/* Banner */}
              <div style={{
                height: 130,
                background: r.banner_url
                  ? `url(${r.banner_url}) center/cover`
                  : 'linear-gradient(135deg, #FF6B2C 0%, #F76526 100%)',
                position: 'relative',
              }}>
                <span style={{
                  position: 'absolute', top: 8, left: 8,
                  background: estado.abierto ? 'rgba(22,163,74,0.9)' : 'rgba(239,68,68,0.9)',
                  color: '#fff', fontSize: 9, fontWeight: 700,
                  padding: '4px 10px', borderRadius: 6,
                }}>
                  {estado.abierto ? 'Abierto' : 'Cerrado'}
                </span>
                <div style={{ position: 'absolute', bottom: 8, right: 10, display: 'flex', gap: 6 }}>
                  {r._fueraDeRadio && (
                    <span style={{ background: 'rgba(239,68,68,0.9)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '4px 8px', borderRadius: 6 }}>
                      Fuera de zona
                    </span>
                  )}
                  {r._distancia != null ? (
                    <span style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 6 }}>
                      {r._distancia.toFixed(1)} km
                    </span>
                  ) : r.radio_cobertura_km ? (
                    <span style={{ background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 6 }}>
                      {r.radio_cobertura_km} km
                    </span>
                  ) : null}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); toggleFav(r.id) }}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 30, height: 30, borderRadius: 8,
                    background: 'rgba(0,0,0,0.55)',
                    border: 'none', cursor: 'pointer', fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {isFav ? '❤️' : '🤍'}
                </button>
              </div>
              {/* Logo */}
              <div style={{ position: 'relative', padding: '0 16px' }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 12,
                  border: '2.5px solid #1A1919',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                  overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#262626', fontSize: 22,
                  position: 'absolute', top: -25, left: 16,
                }}>
                  {r.logo_url ? <img src={r.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : ctx.emoji}
                </div>
              </div>
              {/* Info */}
              <div style={{ padding: '30px 16px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nombre}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <Stars rating={r.rating} size={11} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)' }}>{r.rating?.toFixed(1)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--c-muted)' }}>
                  <span>
                    {!estado.abierto && estado.proximaApertura
                      ? estado.proximaApertura
                      : horarioTxt || `${r.total_resenas} reseñas`
                    }
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {ridersActivos[r.id] && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 50, background: 'rgba(255,144,102,0.15)', color: 'var(--c-primary-light)' }}>Delivery</span>
                    )}
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 50, background: '#262626', color: 'var(--c-muted)' }}>Recogida</span>
                  </div>
                </div>
              </div>
            </div>
          )
          return items
        })}
      </div>
    </div>
  )
}
