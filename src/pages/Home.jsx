import { useState, useEffect, useMemo } from 'react'
import { MapPin, Search, X, ChevronRight, SlidersHorizontal, Bike } from 'lucide-react'
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

export default function Home({ onOpenRest, categoriaPadre, onOpenRepartidores }) {
  const ctx = CTX[categoriaPadre] || CTX.comida
  const { perfil, updatePerfil, user } = useAuth()
  const [establecimientos, setEstablecimientos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [catActiva, setCatActiva] = useState(null)
  const [favoritos, setFavoritos] = useState(perfil?.favoritos || [])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState(null)
  const [geoError, setGeoError] = useState(false)
  const [categoriasGenerales, setCategoriasGenerales] = useState([])
  const [promociones, setPromociones] = useState([])
  const [driversMap, setDriversMap] = useState({})
  const [landingRiders, setLandingRiders] = useState({ activa: true, config: { titulo: 'Gana dinero repartiendo', subtitulo: 'Crea tu propio negocio', boton: 'APLICAR' } })

  useEffect(() => {
    // Config landing repartidores (para CTA del Home)
    supabase.from('landing_repartidores_config')
      .select('activa, config').eq('id', 'default').maybeSingle()
      .then(({ data }) => {
        if (!data) return
        const homeCfg = data.config?.home_cta || {}
        setLandingRiders({
          activa: data.activa !== false,
          config: {
            visible: homeCfg.visible !== false,
            titulo: homeCfg.titulo || 'Gana dinero repartiendo',
            subtitulo: homeCfg.subtitulo || 'Crea tu propio negocio',
            boton: homeCfg.boton || 'APLICAR',
          },
        })
      })
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

      const { data: estCats } = await supabase
        .from('establecimiento_categorias')
        .select('establecimiento_id, categoria_id')
        .in('establecimiento_id', estIds)

      const catMap = {}
      for (const ec of (estCats || [])) {
        if (!catMap[ec.establecimiento_id]) catMap[ec.establecimiento_id] = []
        catMap[ec.establecimiento_id].push(ec.categoria_id)
      }
      setEstablecimientos(data.map(e => ({ ...e, _catIds: catMap[e.id] || [] })))

      const { data: ds } = await supabase
        .from('drivers_status')
        .select('establecimiento_id, online_count')
        .in('establecimiento_id', estIds)
      const dsMap = {}
      for (const d of (ds || [])) dsMap[d.establecimiento_id] = d.online_count ?? 0
      setDriversMap(dsMap)
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
  // Gradient variants for offer cards
  const promoGradients = [
    'linear-gradient(to right, #9f0519, #ff9066)',
    'linear-gradient(to right, #f5a61c, #ff8d44)',
    'linear-gradient(to right, #ff9066, #ff8d44)',
  ]

  /* ── Glass style ── */
  const G = {
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)',
  }

  return (
    <div>
      <style>{`
        @keyframes homeFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        .home-fade { animation: homeFadeIn 0.4s ease-out both; }
        .skeleton { background: rgba(255,255,255,0.06); border-radius: 12px; animation: skeletonPulse 1.2s ease-in-out infinite; }
      `}</style>
      {/* ── Dirección ── */}
      <div className="home-fade" style={{ animationDelay: '0s', display: 'flex', alignItems: 'center', gap: 8, paddingTop: 16, paddingBottom: 16 }}>
        <MapPin size={24} strokeWidth={2} color="#ff9066" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#adaaaa', fontWeight: 700, lineHeight: '14px' }}>Enviar a</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {perfil?.direccion || 'Configura tu dirección'}
          </div>
        </div>
        <ChevronRight size={12} strokeWidth={2} color="#adaaaa" style={{ flexShrink: 0 }} />
      </div>

      {/* Aviso geolocalización */}
      {geoError && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 22, ...G, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>📍</span>
          <span style={{ fontSize: 11, color: '#FBBF24', fontWeight: 600 }}>Activa tu ubicación para ver restaurantes cerca de ti</span>
        </div>
      )}

      {/* ── Buscador (glass card, rounded-2xl, filtro integrado) ── */}
      <div className="home-fade" style={{
        animationDelay: '0.05s',
        position: 'relative', marginTop: 8, marginBottom: 32,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '16px 20px',
          borderRadius: 16,
          ...G,
        }}>
          <Search size={20} strokeWidth={1.8} color="#adaaaa" style={{ marginRight: 12, flexShrink: 0 }} />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder={ctx.placeholder}
            style={{ border: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit', background: 'transparent', flex: 1, color: '#ffffff', fontWeight: 500 }}
          />
          {busqueda ? (
            <button onClick={() => setBusqueda('')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 50, width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <X size={10} color="#adaaaa" />
            </button>
          ) : (
            <SlidersHorizontal size={20} strokeWidth={1.8} color="#ff9066" style={{ flexShrink: 0 }} />
          )}
        </div>
      </div>

      {/* ── Categorías (64×64, gradient active, glass inactive) ── */}
      <div className="home-fade" style={{ animationDelay: '0.1s', display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, marginBottom: 40 }}>
        {categoriasGenerales.map(c => {
          const isActive = catActiva === c.nombre
          return (
            <button
              key={c.nombre}
              onClick={() => setCatActiva(isActive ? null : c.nombre)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                padding: 0, opacity: catActiva && !isActive ? 0.6 : 1, transition: 'opacity 0.2s',
              }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, transition: 'all 0.2s',
                ...(isActive
                  ? { background: 'linear-gradient(135deg, #FF6B2C 0%, #F76526 100%)', boxShadow: '0 10px 15px -3px rgba(255,144,102,0.1)' }
                  : { ...G }
                ),
              }}>
                {c.emoji}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: isActive ? '#ff9066' : '#adaaaa',
              }}>
                {c.nombre}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Destacados (280px cards, 176px image, 22px radius, glass) ── */}
      {!busqueda && !catActiva && destacados.length > 0 && (
        <div className="home-fade" style={{ animationDelay: '0.15s', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '0 4px' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.025em', color: '#ffffff', margin: 0 }}>Destacados</h2>
            <span style={{ color: '#ff9066', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>Ver todo</span>
          </div>
          <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 24 }}>
            {destacados.map(r => {
              const estDest = estaAbierto(r)
              const sinRidersDest = estDest.abierto && r.tiene_delivery && (driversMap[r.id] ?? 0) === 0
              return (
                <div key={r.id} onClick={() => onOpenRest(r)} style={{ minWidth: 280, cursor: 'pointer', flexShrink: 0 }}>
                  {/* Image container — glass card */}
                  <div style={{
                    position: 'relative', height: 176, borderRadius: 22, overflow: 'hidden',
                    ...G, marginBottom: 16,
                  }}>
                    <div style={{
                      width: '100%', height: '100%',
                      background: r.banner_url ? `url(${r.banner_url}) center/cover` : 'linear-gradient(135deg, #FF6B2C 0%, #F76526 100%)',
                    }} />
                    {/* Status badge */}
                    <div style={{
                      position: 'absolute', top: 16, left: 16,
                      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
                      padding: '4px 12px', borderRadius: 9999,
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                      color: '#fff', display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: estDest.abierto ? '#22c55e' : '#ef4444' }} />
                      {estDest.abierto ? 'Abierto' : 'Cerrado'}
                    </div>
                    {sinRidersDest && (
                      <div style={{
                        position: 'absolute', top: 16, right: 16,
                        background: 'rgba(251,191,36,0.95)',
                        padding: '4px 9px', borderRadius: 999,
                        fontSize: 9, fontWeight: 800,
                        color: '#1a1a1a',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        backdropFilter: 'blur(8px)',
                      }}>
                        🛵 Solo recogida
                      </div>
                    )}
                    {/* Rating badge */}
                    <div style={{
                      position: 'absolute', bottom: 16, right: 16,
                      background: 'rgba(255,144,102,0.9)', backdropFilter: 'blur(12px)',
                      padding: '4px 8px', borderRadius: 8,
                      fontSize: 12, fontWeight: 700, color: '#571a00',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <span style={{ fontSize: 14 }}>★</span> {r.rating?.toFixed(1)}
                    </div>
                  </div>
                  {/* Text below */}
                  <div style={{ padding: '0 4px' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', lineHeight: 1.25 }}>{r.nombre}</div>
                    <div style={{ fontSize: 10, color: '#adaaaa', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                      {r.tipo || 'Restaurante'} {r._distancia ? `• ${r._distancia.toFixed(0)}-${Math.round(r._distancia * 5 + 15)} min` : ''}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Ofertas Irresistibles (gradient cards, 128px, 22px radius) ── */}
      {!busqueda && !catActiva && promociones.length > 0 && (
        <div className="home-fade" style={{ animationDelay: '0.2s', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.025em', color: '#ffffff', marginBottom: 24, padding: '0 4px' }}>Ofertas Irresistibles</h2>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, scrollSnapType: 'x mandatory' }}>
            {promociones.map((promo, idx) => {
              const est = promo.establecimientos
              if (!est) return null
              return (
                <div key={promo.id} onClick={() => onOpenRest(est)} style={{ minWidth: 280, scrollSnapAlign: 'center', flexShrink: 0, cursor: 'pointer' }}>
                  <div style={{
                    position: 'relative', overflow: 'hidden',
                    borderRadius: 22, height: 128,
                    display: 'flex', alignItems: 'center', padding: 24,
                    background: promoGradients[idx % promoGradients.length],
                  }}>
                    <div style={{ position: 'relative', zIndex: 10, width: '66%' }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.25, textTransform: 'uppercase', fontStyle: 'italic' }}>
                        {promoBadge(promo)}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 500 }}>
                        {promo.titulo || est.nombre}
                      </div>
                    </div>
                    <span style={{ position: 'absolute', right: -16, bottom: -16, opacity: 0.3, fontSize: 120 }}>
                      {promoEmoji(promo)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── CTA Repartidores ── */}
      {!busqueda && !catActiva && landingRiders.activa && landingRiders.config.visible && (
        <div
          className="home-fade"
          onClick={() => onOpenRepartidores?.()}
          style={{
            animationDelay: '0.25s',
            position: 'relative', overflow: 'hidden',
            borderRadius: 22, padding: 20, marginBottom: 24,
            background: 'linear-gradient(135deg, #FF6B2C 0%, #FF4500 100%)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}
        >
          <div style={{ position: 'relative', zIndex: 2, flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              {landingRiders.config.titulo}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
              {landingRiders.config.subtitulo}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenRepartidores?.() }}
            style={{
              position: 'relative', zIndex: 2, flexShrink: 0,
              padding: '8px 16px', borderRadius: 999, border: 'none',
              background: '#fff', color: 'var(--c-primary)',
              fontSize: 11, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'inherit', letterSpacing: '0.05em',
            }}
          >
            {landingRiders.config.boton}
          </button>
          <Bike
            size={48}
            strokeWidth={2}
            color="rgba(255,255,255,0.3)"
            style={{ position: 'absolute', right: 110, bottom: -4, zIndex: 1 }}
          />
        </div>
      )}

      {/* ── Cerca de ti (vertical stack, glass cards, 192px image, text overlay) ── */}
      <div className="home-fade" style={{ animationDelay: '0.3s', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '0 4px' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.025em', color: '#ffffff', margin: 0 }}>
          {busqueda ? 'Resultados' : catActiva ? ctx.titulo : 'Cerca de ti'}
        </h2>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 120 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              borderRadius: 22, overflow: 'hidden', ...G,
            }}>
              <div className="skeleton" style={{ height: 192, borderRadius: 0 }} />
            </div>
          ))}
        </div>
      )}

      {!loading && filtrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#adaaaa' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No hay resultados</div>
        </div>
      )}

      {/* Vertical list — glass cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 120 }}>
        {filtrados.flatMap((r, i) => {
          const isFav = favoritos.includes(r.id)
          const estado = estaAbierto(r)
          const items = []
          if (r._fueraDeRadio && (i === 0 || !filtrados[i - 1]._fueraDeRadio)) {
            items.push(
              <div key="fuera-sep" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#adaaaa', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Más restaurantes</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              </div>
            )
          }
          const sinRiders = estado.abierto && r.tiene_delivery && (driversMap[r.id] ?? 0) === 0
          items.push(
            <div
              key={r.id}
              className="home-fade"
              onClick={() => onOpenRest(r)}
              style={{
                animationDelay: `${0.35 + Math.min(i, 6) * 0.05}s`,
                borderRadius: 22, overflow: 'hidden', cursor: 'pointer',
                ...G,
                opacity: estado.abierto ? 1 : 0.6,
              }}
            >
              {/* Image with gradient overlay and text */}
              <div style={{ height: 192, position: 'relative' }}>
                <div style={{
                  width: '100%', height: '100%',
                  background: r.banner_url
                    ? `url(${r.banner_url}) center/cover`
                    : 'linear-gradient(135deg, #FF6B2C 0%, #F76526 100%)',
                }} />
                {/* Gradient overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }} />
                {/* Fav button */}
                <button
                  onClick={e => { e.stopPropagation(); toggleFav(r.id) }}
                  style={{
                    position: 'absolute', top: 12, right: 12,
                    width: 32, height: 32, borderRadius: 10,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                    border: 'none', cursor: 'pointer', fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {isFav ? '❤️' : '🤍'}
                </button>
                {/* Badge estado abierto/cerrado */}
                <div style={{
                  position: 'absolute', top: 12, left: 12,
                  background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)',
                  padding: '4px 12px', borderRadius: 999,
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: '#fff', display: 'flex', alignItems: 'center', gap: 5,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: estado.abierto ? '#22c55e' : '#ef4444' }} />
                  {estado.abierto ? 'Abierto' : 'Cerrado'}
                </div>
                {/* Badge sin repartidores (solo si está abierto) */}
                {sinRiders && (
                  <div style={{
                    position: 'absolute', top: 52, left: 12,
                    background: 'rgba(251,191,36,0.95)',
                    padding: '5px 10px', borderRadius: 999,
                    fontSize: 10, fontWeight: 800,
                    color: '#1a1a1a',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    display: 'flex', alignItems: 'center', gap: 4,
                    backdropFilter: 'blur(8px)',
                  }}>
                    🛵 Sin repartidores · Solo recogida
                  </div>
                )}
                {/* Text on bottom of image */}
                <div style={{ position: 'absolute', bottom: 16, left: 24 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{r.nombre}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ff9066', fontSize: 14, fontWeight: 700 }}>
                      <span style={{ fontSize: 12 }}>★</span> {r.rating?.toFixed(1)}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      {r._distancia != null ? `${r._distancia.toFixed(1)} km · ${Math.round(r._distancia * 5 + 10)} min` : r.tipo || ''}
                    </div>
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
