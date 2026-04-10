import { useState, useEffect, useMemo } from 'react'
import { MapPin, Search, X, ChevronRight, SlidersHorizontal } from 'lucide-react'
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

  // Helpers para promo badge
  const promoBadge = (promo) => {
    if (promo.tipo === 'descuento_porcentaje') return `-${promo.valor}%`
    if (promo.tipo === 'descuento_fijo') return `-${promo.valor}€`
    if (promo.tipo === '2x1') return '2×1'
    return 'GRATIS'
  }
  const promoEmoji = (promo) => {
    if (promo.tipo === 'descuento_porcentaje') return '🏷️'
    if (promo.tipo === 'descuento_fijo') return '💰'
    if (promo.tipo === '2x1') return '🍔'
    return '🎁'
  }

  /* ── Glass card base style ── */
  const glass = {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)',
  }

  return (
    <div>
      {/* ── Dirección ── */}
      <div style={{ marginBottom: 16, padding: '0 0 14px', background: '#0E0E0E' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={18} strokeWidth={2} color="#FF9066" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500, marginBottom: 2 }}>Enviar a</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F5F5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {perfil?.direccion || 'Configura tu dirección'}
            </div>
          </div>
          <ChevronRight size={16} strokeWidth={1.8} color="rgba(255,255,255,0.45)" style={{ flexShrink: 0 }} />
        </div>
      </div>

      {/* Aviso geolocalización */}
      {geoError && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 12, background: 'rgba(251,191,36,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>📍</span>
          <span style={{ fontSize: 11, color: '#FBBF24', fontWeight: 600 }}>Activa tu ubicación para ver restaurantes cerca de ti</span>
        </div>
      )}

      {/* ── Buscador + Filtro ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8,
          background: '#262626', borderRadius: 8, padding: '10px 12px',
        }}>
          <Search size={18} strokeWidth={1.8} color="rgba(255,255,255,0.45)" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder={ctx.placeholder}
            style={{ border: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit', background: 'transparent', flex: 1, color: '#F5F5F5' }}
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 50, width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={10} color="rgba(255,255,255,0.45)" />
            </button>
          )}
        </div>
        <button style={{
          background: '#262626', border: 'none', borderRadius: 8,
          padding: '10px 12px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <SlidersHorizontal size={18} strokeWidth={1.8} color="rgba(255,255,255,0.45)" />
        </button>
      </div>

      {/* ── Categorías (scroll horizontal) ── */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 24, paddingBottom: 4 }}>
        {categoriasGenerales.map(c => {
          const isActive = catActiva === c.nombre
          return (
            <button
              key={c.nombre}
              onClick={() => setCatActiva(isActive ? null : c.nombre)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                minWidth: 60, padding: '4px',
                opacity: catActiva && !isActive ? 0.4 : 1, transition: 'opacity 0.2s',
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: isActive ? 'rgba(255,107,44,0.15)' : 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, transition: 'all 0.2s',
              }}>
                {c.emoji}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 500,
                color: isActive ? '#FF9066' : 'rgba(255,255,255,0.45)',
              }}>
                {c.nombre}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Destacados slider (estilo Stitch) ── */}
      {!busqueda && !catActiva && destacados.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#F5F5F5' }}>Destacados</h2>
            <span style={{ fontSize: 12, color: '#FF9066', fontWeight: 500, cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Ver todo</span>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {destacados.map(r => {
              const estDest = estaAbierto(r)
              return (
                <div
                  key={r.id}
                  onClick={() => onOpenRest(r)}
                  style={{
                    minWidth: 260, flexShrink: 0,
                    background: '#262626', borderRadius: 12,
                    overflow: 'hidden', cursor: 'pointer',
                    opacity: estDest.abierto ? 1 : 0.6,
                    transition: 'transform 0.3s ease',
                  }}
                >
                  {/* Imagen grande */}
                  <div style={{
                    height: 160,
                    background: r.banner_url
                      ? `url(${r.banner_url}) center/cover`
                      : 'linear-gradient(135deg, #FF6B2C 0%, #F76526 100%)',
                  }} />
                  {/* Info debajo */}
                  <div style={{ padding: 12 }}>
                    <div style={{
                      display: 'inline-block', fontSize: 10, fontWeight: 600,
                      color: estDest.abierto ? '#76ff00' : '#ff716c',
                      background: 'rgba(0,0,0,0.4)', padding: '3px 8px',
                      borderRadius: 4, marginBottom: 8,
                    }}>
                      {estDest.abierto ? 'Abierto' : 'Cerrado'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                      <span style={{ color: '#FFB546', fontSize: 12 }}>★</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#F5F5F5' }}>{r.rating?.toFixed(1)}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#F5F5F5', marginBottom: 2 }}>{r.nombre}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                      {r.tipo || 'Restaurante'} {r._distancia ? `· ${r._distancia.toFixed(0)}-${Math.round(r._distancia * 5 + 15)} min` : ''}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Ofertas Irresistibles (cards gradiente naranja estilo Stitch) ── */}
      {!busqueda && !catActiva && promociones.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#F5F5F5' }}>Ofertas Irresistibles</h2>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {promociones.map(promo => {
              const est = promo.establecimientos
              if (!est) return null
              return (
                <div
                  key={promo.id}
                  onClick={() => onOpenRest(est)}
                  style={{
                    minWidth: 240, flexShrink: 0,
                    background: 'linear-gradient(135deg, #FF6B2C 0%, #F76526 100%)',
                    borderRadius: 12, padding: 20,
                    cursor: 'pointer', minHeight: 140,
                    display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'transform 0.3s ease',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                      {promoBadge(promo)}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>
                      {promo.titulo || `${est.nombre}`}
                    </div>
                    {promo.minimo_compra > 0 && (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>
                        Compra min. {promo.minimo_compra}€
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 32, alignSelf: 'flex-end', marginTop: 8 }}>
                    {promoEmoji(promo)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Gana dinero repartiendo (estilo Stitch) ── */}
      {!busqueda && !catActiva && onSerSocio && (
        <div
          onClick={onSerSocio}
          style={{
            background: '#262626', borderRadius: 12,
            padding: 20, marginBottom: 24, cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: '#F5F5F5', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            Gana dinero repartiendo
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 16 }}>
            Únete al equipo Pidoo hoy mismo
          </div>
          <div style={{
            display: 'inline-block',
            background: '#FF9066', color: '#000',
            fontSize: 13, fontWeight: 600, padding: '10px 24px',
            borderRadius: 8,
          }}>
            Aplicar
          </div>
        </div>
      )}

      {/* ── Cerca de ti (grid 2 columnas estilo Stitch) ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#F5F5F5' }}>
          {busqueda ? 'Resultados' : catActiva ? ctx.titulo : 'Cerca de ti'}
        </h2>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.45)' }}>Cargando...</div>
      )}

      {!loading && filtrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.45)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No hay resultados</div>
        </div>
      )}

      {/* Grid 2 columnas */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12, marginBottom: 80,
      }}>
        {filtrados.flatMap((r, i) => {
          const isFav = favoritos.includes(r.id)
          const estado = estaAbierto(r)
          const items = []
          if (r._fueraDeRadio && (i === 0 || !filtrados[i - 1]._fueraDeRadio)) {
            items.push(
              <div key="fuera-sep" style={{ gridColumn: '1 / -1', padding: '8px 0 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>Más restaurantes</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              </div>
            )
          }
          items.push(
            <div
              key={r.id}
              onClick={() => onOpenRest(r)}
              style={{
                background: '#262626', borderRadius: 12,
                overflow: 'hidden', cursor: 'pointer',
                opacity: estado.abierto ? 1 : 0.6,
                transition: 'transform 0.3s ease',
              }}
            >
              {/* Imagen */}
              <div style={{
                height: 120,
                background: r.banner_url
                  ? `url(${r.banner_url}) center/cover`
                  : 'linear-gradient(135deg, #FF6B2C 0%, #F76526 100%)',
                position: 'relative',
              }}>
                <button
                  onClick={e => { e.stopPropagation(); toggleFav(r.id) }}
                  style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 26, height: 26, borderRadius: 6,
                    background: 'rgba(0,0,0,0.5)',
                    border: 'none', cursor: 'pointer', fontSize: 11,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {isFav ? '❤️' : '🤍'}
                </button>
              </div>
              {/* Info compacta */}
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#F5F5F5', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.nombre}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <span style={{ color: '#FFB546', fontSize: 11 }}>★</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#F5F5F5' }}>{r.rating?.toFixed(1)}</span>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                  {r._distancia != null ? `${r._distancia.toFixed(1)} km` : ''} {r._distancia != null ? `· ${Math.round(r._distancia * 5 + 10)} min` : ''}
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
