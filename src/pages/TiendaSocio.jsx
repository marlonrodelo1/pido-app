import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppShell from '../AppShell'
import { useAuth } from '../context/AuthContext'
import { getCurrentPosition } from '../lib/geolocation'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = 'https://rmrbxrabngdmpgpfmjbo.supabase.co'

function setMeta(attr, key, value) {
  if (!value) return
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}

function Skeleton() {
  return (
    <div style={{
      minHeight: '100vh', background: '#F7F3EC', color: '#6B6356',
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
    }}>Cargando…</div>
  )
}

function NotFound({ onVolver }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#F7F3EC', color: '#1A1815',
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔎</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Socio no encontrado</div>
      <p style={{ fontSize: 14, color: '#6B6356', maxWidth: 320, lineHeight: 1.5, marginBottom: 24 }}>
        El enlace que has abierto no corresponde a ningún socio activo de Pidoo.
      </p>
      <button onClick={onVolver} style={{
        padding: '14px 32px', borderRadius: 14, border: 'none',
        background: '#C5562C', color: '#fff', fontSize: 15, fontWeight: 800,
        cursor: 'pointer', fontFamily: 'inherit',
      }}>Volver a Pidoo</button>
    </div>
  )
}

function Paused({ nombre, onVolver }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#F7F3EC', color: '#1A1815',
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>⏸️</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Este marketplace está pausado</div>
      <p style={{ fontSize: 14, color: '#6B6356', maxWidth: 340, lineHeight: 1.5, marginBottom: 24 }}>
        {nombre ? `${nombre} ha puesto` : 'El socio ha puesto'} su marketplace en pausa temporalmente. Vuelve pronto.
      </p>
      <button onClick={onVolver} style={{
        padding: '14px 32px', borderRadius: 14, border: 'none',
        background: '#C5562C', color: '#fff', fontSize: 15, fontWeight: 800,
        cursor: 'pointer', fontFamily: 'inherit',
      }}>Ir a Pidoo</button>
    </div>
  )
}

function Desactivado({ onVolver }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#F7F3EC', color: '#1A1815',
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Este marketplace no está disponible</div>
      <p style={{ fontSize: 14, color: '#6B6356', maxWidth: 340, lineHeight: 1.5, marginBottom: 24 }}>
        Este marketplace está cerrado. Puedes seguir pidiendo en Pidoo con normalidad.
      </p>
      <button onClick={onVolver} style={{
        padding: '14px 32px', borderRadius: 14, border: 'none',
        background: '#C5562C', color: '#fff', fontSize: 15, fontWeight: 800,
        cursor: 'pointer', fontFamily: 'inherit',
      }}>Ir a Pidoo</button>
    </div>
  )
}

function RiderOffline({ onVolver }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#F7F3EC', color: '#1A1815',
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🛵</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Este marketplace está cerrado</div>
      <p style={{ fontSize: 14, color: '#6B6356', maxWidth: 340, lineHeight: 1.5, marginBottom: 24 }}>
        Nuestro repartidor no está disponible en este momento. Vuelve pronto o pide directamente desde Pidoo.
      </p>
      <button onClick={onVolver} style={{
        padding: '14px 32px', borderRadius: 14, border: 'none',
        background: '#C5562C', color: '#fff', fontSize: 15, fontWeight: 800,
        cursor: 'pointer', fontFamily: 'inherit',
      }}>Ir a Pidoo</button>
    </div>
  )
}

export default function TiendaSocio() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const [estado, setEstado] = useState('loading') // loading | ok | notfound | paused | rider_offline | desactivado
  const [socio, setSocio] = useState(null)
  const [restaurantes, setRestaurantes] = useState([])
  const [liveCoords, setLiveCoords] = useState(null)
  const pollRef = useRef(null)

  // Fetch socio + restaurantes. Pasamos lat/lng del cliente si los tenemos
  // para que el backend filtre por socios.radio_marketplace_km.
  useEffect(() => {
    if (!slug) { setEstado('notfound'); return }
    let cancelled = false

    const fetchData = (isRefetch = false) => {
      const params = new URLSearchParams({ slug, live: '1' })
      // Geolocalizar: usa la dirección del perfil; si no hay, el GPS en vivo.
      // Así el marketplace filtra por radio aunque el cliente no tenga dirección
      // guardada (igual que la app principal).
      const lat = perfil?.latitud ?? liveCoords?.lat
      const lng = perfil?.longitud ?? liveCoords?.lng
      if (lat != null && lng != null) {
        params.set('lat', String(lat))
        params.set('lng', String(lng))
      }
      const url = `${SUPABASE_URL}/functions/v1/get-socio-marketplace?${params.toString()}`
      fetch(url)
        .then(async (res) => {
          if (res.status === 404) { if (!cancelled) setEstado('notfound'); return null }
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
        .then((data) => {
          if (!data || cancelled) return
          const s = data.socio || null
          const rs = Array.isArray(data.restaurantes) ? data.restaurantes : []
          if (!s) { if (!isRefetch) setEstado('notfound'); return }
          setSocio(s)
          setRestaurantes(rs)
          if (s.activo === false) {
            setEstado('desactivado')
          } else if (s.marketplace_activo === false) {
            setEstado('paused')
          } else {
            // Socio offline (rider_online=false) NO cierra la tienda: queda abierta
            // en modo SOLO RECOGIDA (cada restaurante muestra recogida porque su
            // tiene_delivery pasa a false). Solo cierra si está desactivado o pausado.
            setEstado('ok')
            try {
              sessionStorage.setItem('pidoo_socio_id', s.id)
              sessionStorage.setItem('pidoo_socio_slug', slug)
            } catch (_) {}
          }
        })
        .catch((err) => {
          console.error('[TiendaSocio] fetch error', err)
          if (!cancelled && !isRefetch) setEstado('notfound')
        })
    }

    fetchData(false)

    // Refetch cada 20s para detectar cambios de disponibilidad del rider en
    // Shipday casi al instante (combinado con el cron 30s en backend).
    pollRef.current = setInterval(() => fetchData(true), 20000)

    return () => {
      cancelled = true
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [slug, perfil?.latitud, perfil?.longitud, liveCoords])

  // Realtime: reflejar al instante online/offline (en_servicio) y pausa/baja del
  // socio. El polling de 20s es el respaldo; esto hace que el cambio se vea ya.
  // `rider_online` gobierna el delivery del marketplace (socio = rider), y se
  // propaga vía socioData a Home/RestDetalle/Carrito.
  useEffect(() => {
    if (!socio?.id) return
    const ch = supabase
      .channel(`socio-tienda-${socio.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'socios', filter: `id=eq.${socio.id}`,
      }, (payload) => {
        const n = payload.new
        if (!n) return
        setSocio((prev) => (prev ? { ...prev, ...n, rider_online: !!n.en_servicio } : prev))
        if (n.activo === false) setEstado('desactivado')
        else if (n.marketplace_activo === false) setEstado('paused')
        else setEstado('ok')
      })
      .subscribe()
    return () => { try { supabase.removeChannel(ch) } catch (_) {} }
  }, [socio?.id])

  // Si el perfil no tiene ubicación guardada, pedir GPS en vivo para poder
  // filtrar el marketplace por radio (mismo respaldo que la app principal).
  useEffect(() => {
    if (perfil?.latitud != null && perfil?.longitud != null) return
    let cancel = false
    getCurrentPosition()
      .then(p => { if (!cancel && p) setLiveCoords({ lat: p.lat, lng: p.lng }) })
      .catch(() => {})
    return () => { cancel = true }
  }, [perfil?.latitud, perfil?.longitud])

  // Meta tags
  useEffect(() => {
    if (!socio) return
    const nombre = socio.nombre_comercial || 'Socio'
    document.title = `${nombre} · Pidoo`
    const desc = socio.descripcion || `Descubre los restaurantes de ${nombre} en Pidoo`
    setMeta('name', 'description', desc)
    setMeta('property', 'og:title', `${nombre} · Pidoo`)
    setMeta('property', 'og:description', desc)
    if (socio.banner_url) setMeta('property', 'og:image', socio.banner_url)
    setMeta('property', 'og:url', `https://pidoo.es/s/${slug}`)
    setMeta('property', 'og:type', 'website')

    // Favicon dinamico = logo del socio
    const logo = socio.logo_url
    if (logo) {
      let link = document.querySelector("link[rel='icon']")
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = logo
      return () => { if (link) link.href = '/favicon.svg' }
    }
  }, [socio, slug])

  const restaurantesFilter = useMemo(
    () => restaurantes.map(r => r.id),
    [restaurantes]
  )

  // Mapa id -> { destacado, orden_destacado } para el listado destacados del socio
  const restaurantesFlags = useMemo(() => {
    const m = {}
    for (const r of restaurantes) m[r.id] = { destacado: !!r.destacado, orden_destacado: r.orden_destacado ?? 999 }
    return m
  }, [restaurantes])

  if (estado === 'loading') return <Skeleton />
  if (estado === 'notfound') return <NotFound onVolver={() => navigate('/')} />
  if (estado === 'paused') return <Paused nombre={socio?.nombre_comercial} onVolver={() => navigate('/')} />
  if (estado === 'desactivado') return <Desactivado onVolver={() => navigate('/')} />
  if (estado === 'rider_offline') return <Desactivado onVolver={() => navigate('/')} />

  return <AppShell socioData={socio} restaurantesFilter={restaurantesFilter} restaurantesFlags={restaurantesFlags} />
}
