import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AppShell from '../AppShell'

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
      minHeight: '100vh', background: '#FAFAF7', color: '#6B6B68',
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
    }}>Cargando…</div>
  )
}

function NotFound({ onVolver }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAF7', color: '#1F1F1E',
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔎</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Socio no encontrado</div>
      <p style={{ fontSize: 14, color: '#6B6B68', maxWidth: 320, lineHeight: 1.5, marginBottom: 24 }}>
        El enlace que has abierto no corresponde a ningún socio activo de Pidoo.
      </p>
      <button onClick={onVolver} style={{
        padding: '14px 32px', borderRadius: 14, border: 'none',
        background: '#FF6B2C', color: '#fff', fontSize: 15, fontWeight: 800,
        cursor: 'pointer', fontFamily: 'inherit',
      }}>Volver a Pidoo</button>
    </div>
  )
}

function Paused({ nombre, onVolver }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAF7', color: '#1F1F1E',
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center',
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>⏸️</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Este marketplace está pausado</div>
      <p style={{ fontSize: 14, color: '#6B6B68', maxWidth: 340, lineHeight: 1.5, marginBottom: 24 }}>
        {nombre ? `${nombre} ha puesto` : 'El socio ha puesto'} su marketplace en pausa temporalmente. Vuelve pronto.
      </p>
      <button onClick={onVolver} style={{
        padding: '14px 32px', borderRadius: 14, border: 'none',
        background: '#FF6B2C', color: '#fff', fontSize: 15, fontWeight: 800,
        cursor: 'pointer', fontFamily: 'inherit',
      }}>Ir a Pidoo</button>
    </div>
  )
}

export default function TiendaSocio() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [estado, setEstado] = useState('loading') // loading | ok | notfound | paused
  const [socio, setSocio] = useState(null)
  const [restaurantes, setRestaurantes] = useState([])

  // Fetch socio + restaurantes
  useEffect(() => {
    if (!slug) { setEstado('notfound'); return }
    let cancelled = false
    const url = `${SUPABASE_URL}/functions/v1/get-socio-marketplace?slug=${encodeURIComponent(slug)}`
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
        if (!s) { setEstado('notfound'); return }
        setSocio(s)
        setRestaurantes(rs)
        if (s.marketplace_activo === false) {
          setEstado('paused')
        } else {
          setEstado('ok')
          try { sessionStorage.setItem('pidoo_socio_id', s.id) } catch (_) {}
        }
      })
      .catch((err) => {
        console.error('[TiendaSocio] fetch error', err)
        if (!cancelled) setEstado('notfound')
      })
    return () => { cancelled = true }
  }, [slug])

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
  }, [socio, slug])

  const restaurantesFilter = useMemo(
    () => restaurantes.map(r => r.id),
    [restaurantes]
  )

  if (estado === 'loading') return <Skeleton />
  if (estado === 'notfound') return <NotFound onVolver={() => navigate('/')} />
  if (estado === 'paused') return <Paused nombre={socio?.nombre_comercial} onVolver={() => navigate('/')} />

  return <AppShell socioData={socio} restaurantesFilter={restaurantesFilter} />
}
