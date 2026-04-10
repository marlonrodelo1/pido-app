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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <MapPin size={16} strokeWidth={2.5} color="var(--c-primary)" />
        <div>
          <div style={{ fontSize: 10, color: 'var(--c-muted)', fontWeight: 600 }}>Entregar en</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)' }}>{perfil?.direccion || 'Configura tu dirección'}</div>
        </div>
      </div>

      {/* Aviso geolocalización */}
      {geoError && (
        <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>📍</span>
          <span style={{ fontSize: 11, color: '#FBBF24', fontWeight: 600 }}>Activa tu ubicación para ver restaurantes cerca de ti</span>
        </div>
      )}

      {/* Buscador */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 20, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <Search size={18} strokeWidth={1.8} color="var(--c-muted)" />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder={ctx.placeholder}
          style={{ border: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit', background: 'transparent', flex: 1, color: 'var(--c-text)' }} />
        {busqueda && <button onClick={() => setBusqueda('')} style={{ background: 'var(--c-surface2)', border: 'none', borderRadius: 50, width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={12} color="var(--c-muted)" /></button>}
      </div>

      {/* Categorías */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 24, paddingBottom: 4 }}>
        {categoriasGenerales.map(c => (
          <button key={c.nombre} onClick={() => setCatActiva(catActiva === c.nombre ? null : c.nombre)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', minWidth: 56,
            opacity: catActiva && catActiva !== c.nombre ? 0.4 : 1, transition: 'opacity 0.2s',
          }}>
            <div style={{
              width: 50, height: 50, borderRadius: 14,
              background: catActiva === c.nombre ? 'var(--c-primary)' : 'rgba(255,255,255,0.08)',
              border: catActiva === c.nombre ? 'none' : '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, transition: 'all 0.2s',
            }}>{c.emoji}</div>
            <span style={{ fontSize: 10, fontWeight: 600, color: catActiva === c.nombre ? 'var(--c-primary)' : 'var(--c-muted)' }}>{c.nombre}</span>
          </button>
        ))}
      </div>

      {/* Destacados slider */}
      {!busqueda && !catActiva && destacados.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--c-text)', marginBottom: 12 }}>Destacados</h2>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}>
            {destacados.map(r => {
              const estDest = estaAbierto(r)
              return (
              <div key={r.id} className="tablet-slider-card" onClick={() => onOpenRest(r)} style={{
                minWidth: 240, flexShrink: 0, background: 'rgba(255,255,255,0.08)', borderRadius: 16,
                overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                opacity: estDest.abierto ? 1 : 0.65,
              }}>
                <div style={{
                  height: 100, background: r.banner_url ? `url(${r.banner_url}) center/cover` : 'linear-gradient(135deg, var(--c-primary-light), var(--c-primary-soft))',
                  position: 'relative',
                }}>
                  <span style={{ position: 'absolute', top: 8, left: 8, background: estDest.abierto ? 'rgba(22,163,74,0.85)' : 'rgba(239,68,68,0.85)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 6, backdropFilter: 'blur(6px)' }}>
                    {estDest.abierto ? 'Abierto' : 'Cerrado'}
                  </span>
                </div>
                <div style={{ position: 'relative', padding: '0 12px' }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 11, border: '3px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(255,255,255,0.1)', fontSize: 18,
                    position: 'absolute', top: -21, left: 12,
                  }}>
                    {r.logo_url ? <img src={r.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : ctx.emoji}
                  </div>
                </div>
                <div style={{ padding: '26px 14px 10px' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--c-text)', marginBottom: 2 }}>{r.nombre}</div>
                  <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--c-muted)', alignItems: 'center' }}>
                    <Stars rating={r.rating} size={10} />
                    <span>{r.rating?.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {/* Promociones slider */}
      {!busqueda && !catActiva && promociones.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--c-text)', marginBottom: 12 }}>Ofertas y promociones</h2>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}>
            {promociones.map(promo => {
              const est = promo.establecimientos
              if (!est) return null
              const estadoPromo = estaAbierto(est)
              return (
                <div key={promo.id} className="tablet-slider-card" onClick={() => onOpenRest(est)} style={{
                  minWidth: 260, flexShrink: 0, background: 'rgba(255,255,255,0.08)', borderRadius: 16,
                  overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  opacity: estadoPromo.abierto ? 1 : 0.65,
                }}>
                  <div style={{
                    height: 110, background: est.banner_url ? `url(${est.banner_url}) center/cover` : 'linear-gradient(135deg, var(--c-primary-light), var(--c-primary-soft))',
                    position: 'relative',
                  }}>
                    {/* Logo del restaurante - arriba izquierda */}
                    <div style={{
                      position: 'absolute', top: 8, left: 8, zIndex: 3,
                      width: 40, height: 40, borderRadius: 10, border: '2px solid #fff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.25)', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#fff', fontSize: 18,
                    }}>
                      {est.logo_url ? <img src={est.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : ctx.emoji}
                    </div>
                    {/* Badge abierto/cerrado */}
                    <span style={{
                      position: 'absolute', top: 8, right: 8, fontSize: 9, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 6, backdropFilter: 'blur(6px)', zIndex: 3,
                      background: estadoPromo.abierto ? 'rgba(22,163,74,0.85)' : 'rgba(239,68,68,0.85)',
                      color: '#fff',
                    }}>
                      {estadoPromo.abierto ? 'Abierto' : 'Cerrado'}
                    </span>
                    {/* Texto de la promo - abajo derecha */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2,
                      background: 'linear-gradient(0deg, rgba(220,38,38,0.95) 0%, rgba(220,38,38,0.6) 60%, transparent 100%)',
                      padding: '18px 12px 8px',
                      textAlign: 'right',
                    }}>
                      <div style={{ color: '#fff', fontSize: 14, fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                        {promo.titulo}
                      </div>
                      {promo.minimo_compra > 0 && (
                        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: 600 }}>
                          Compra min. {promo.minimo_compra}€
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--c-text)', marginBottom: 2 }}>{est.nombre}</div>
                    <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--c-muted)', alignItems: 'center' }}>
                      <Stars rating={est.rating} size={10} />
                      <span>{est.rating?.toFixed(1)}</span>
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
        <button onClick={onSerSocio} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(135deg, #FF6B2C 0%, #FF8F5E 100%)',
          borderRadius: 16, padding: '14px 18px', border: 'none', cursor: 'pointer',
          marginBottom: 24, textAlign: 'left', fontFamily: 'inherit',
        }}>
          <span style={{ fontSize: 28 }}>🛵</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Gana dinero repartiendo con pidoo</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>Hasta 1.500EUR/mes · Registrate gratis</div>
          </div>
          <ChevronRight size={16} strokeWidth={2.5} color="#fff" />
        </button>
      )}

      {/* Lista */}
      <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--c-text)', marginBottom: 12 }}>
        {busqueda ? 'Resultados' : catActiva ? ctx.titulo : 'Cerca de ti'}
      </h2>

      {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--c-muted)' }}>Cargando...</div>}

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
        // Separador antes de la primera tarjeta fuera de zona
        if (r._fueraDeRadio && (i === 0 || !filtrados[i - 1]._fueraDeRadio)) {
          items.push(
            <div key="fuera-sep" style={{ gridColumn: '1 / -1', padding: '8px 0 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-muted)', whiteSpace: 'nowrap' }}>Mas restaurantes</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>
          )
        }
        items.push(
          <div key={r.id} onClick={() => onOpenRest(r)} style={{
            background: 'rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden',
            marginBottom: 14, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            opacity: estado.abierto ? 1 : 0.65,
          }}>
            {/* Banner */}
            <div style={{
              height: 130,
              background: r.banner_url ? `url(${r.banner_url}) center/cover` : 'linear-gradient(135deg, var(--c-primary-light), var(--c-primary-soft))',
              position: 'relative',
            }}>
              {/* Badge abierto/cerrado */}
              <span style={{
                position: 'absolute', top: 8, left: 8, fontSize: 9, fontWeight: 700,
                padding: '4px 10px', borderRadius: 8, backdropFilter: 'blur(6px)',
                background: estado.abierto ? 'rgba(22,163,74,0.85)' : 'rgba(239,68,68,0.85)',
                color: '#fff',
              }}>
                {estado.abierto ? 'Abierto' : 'Cerrado'}
              </span>
              <div style={{ position: 'absolute', bottom: 8, right: 10, display: 'flex', gap: 6 }}>
                {r._fueraDeRadio && (
                  <span style={{ background: 'rgba(239,68,68,0.85)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '4px 8px', borderRadius: 8, backdropFilter: 'blur(4px)' }}>
                    Fuera de zona
                  </span>
                )}
                {r._distancia != null ? (
                  <span style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 8, backdropFilter: 'blur(4px)' }}>
                    {r._distancia.toFixed(1)} km
                  </span>
                ) : r.radio_cobertura_km ? (
                  <span style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 8, backdropFilter: 'blur(4px)' }}>
                    {r.radio_cobertura_km} km
                  </span>
                ) : null}
              </div>
              <button onClick={e => { e.stopPropagation(); toggleFav(r.id) }} style={{
                position: 'absolute', top: 8, right: 8,
                width: 32, height: 32, borderRadius: 10, background: 'rgba(0,0,0,0.5)',
                border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)',
              }}>
                {isFav ? '❤️' : '🤍'}
              </button>
            </div>
            {/* Logo */}
            <div style={{ position: 'relative', padding: '0 16px' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, border: '3px solid #fff',
                boxShadow: '0 2px 10px rgba(0,0,0,0.12)', overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.12)', fontSize: 24,
                position: 'absolute', top: -26, left: 16,
              }}>
                {r.logo_url ? <img src={r.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : ctx.emoji}
              </div>
            </div>
            {/* Info */}
            <div style={{ padding: '32px 16px 12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nombre}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <Stars rating={r.rating} size={12} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)' }}>{r.rating?.toFixed(1)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--c-muted)' }}>
                <span>
                  {!estado.abierto && estado.proximaApertura
                    ? estado.proximaApertura
                    : horarioTxt || `${r.total_resenas} resenas`
                  }
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {ridersActivos[r.id] && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 50, background: 'var(--c-primary-light)', color: 'var(--c-primary)', backdropFilter: 'blur(4px)' }}>Delivery</span>
                  )}
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 50, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>Recogida</span>
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
