import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Globe, ArrowLeft } from 'lucide-react'

function InstagramIcon({ size = 18, color = '#1F1F1E' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function FacebookIcon({ size = 18, color = '#1F1F1E' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
    </svg>
  )
}

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

function TikTokIcon({ size = 18, color = '#1F1F1E' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1 0-5.17c.14 0 .28.02.41.04v-3.13a5.7 5.7 0 0 0-.41-.01 5.66 5.66 0 0 0 0 11.32 5.66 5.66 0 0 0 5.66-5.66V9.14a7.3 7.3 0 0 0 4.26 1.36V7.38a4.28 4.28 0 0 1-3.18-1.56z" />
    </svg>
  )
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

  if (estado === 'loading') return <Skeleton />
  if (estado === 'notfound') return <NotFound onVolver={() => navigate('/')} />
  if (estado === 'paused') return <Paused nombre={socio?.nombre_comercial} onVolver={() => navigate('/')} />

  const primary = (socio?.color_primario && /^#[0-9A-Fa-f]{6}$/.test(socio.color_primario))
    ? socio.color_primario
    : '#FF6B2C'

  const redes = socio?.redes || {}
  const tieneRedes = !!(redes.instagram || redes.facebook || redes.tiktok || redes.web)

  function abrirRestaurante(r) {
    // Guardar socio_id ya se hizo en la carga. Nos aseguramos una vez más por si acaso.
    try { sessionStorage.setItem('pidoo_socio_id', socio.id) } catch (_) {}
    if (r.slug) navigate(`/${r.slug}`)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF7',
      color: '#1F1F1E',
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
      paddingBottom: 40,
    }}>
      {/* Header banner */}
      <div style={{ position: 'relative', height: 200, width: '100%', overflow: 'hidden' }}>
        {socio.banner_url ? (
          <img
            src={socio.banner_url}
            alt={socio.nombre_comercial}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: `linear-gradient(135deg, ${primary} 0%, #F76526 100%)`,
          }} />
        )}
        {/* Badge Pidoo */}
        <button
          onClick={() => navigate('/')}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
            border: 'none', borderRadius: 999, padding: '6px 12px',
            fontSize: 11, fontWeight: 700, color: '#1F1F1E',
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
          aria-label="Por Pidoo"
        >
          Por <span style={{ color: primary, fontWeight: 900 }}>Pidoo</span>
        </button>
        <button
          onClick={() => navigate('/')}
          style={{
            position: 'absolute', top: 16, left: 16,
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
            border: 'none', borderRadius: 999, width: 36, height: 36,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Volver"
        >
          <ArrowLeft size={18} color="#1F1F1E" />
        </button>
      </div>

      {/* Logo + info */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px', position: 'relative' }}>
        <div style={{
          marginTop: -48, display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            border: '4px solid #fff',
            overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {socio.logo_url ? (
              <img src={socio.logo_url} alt={socio.nombre_comercial}
                   style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: `linear-gradient(135deg, ${primary} 0%, #F76526 100%)`,
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, fontWeight: 900,
              }}>
                {(socio.nombre_comercial || '?').slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 240, paddingBottom: 8 }}>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: '#1F1F1E', lineHeight: 1.15 }}>
              {socio.nombre_comercial}
            </div>
            {socio.descripcion && (
              <p style={{ fontSize: 14, color: '#6B6B68', lineHeight: 1.5, margin: '6px 0 0', maxWidth: 620 }}>
                {socio.descripcion}
              </p>
            )}
          </div>
        </div>

        {/* Redes */}
        {tieneRedes && (
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            {redes.instagram && (
              <a href={redes.instagram} target="_blank" rel="noopener noreferrer"
                 style={iconBtn}><InstagramIcon size={18} color="#1F1F1E" /></a>
            )}
            {redes.facebook && (
              <a href={redes.facebook} target="_blank" rel="noopener noreferrer"
                 style={iconBtn}><FacebookIcon size={18} color="#1F1F1E" /></a>
            )}
            {redes.tiktok && (
              <a href={redes.tiktok} target="_blank" rel="noopener noreferrer"
                 style={iconBtn}><TikTokIcon size={18} color="#1F1F1E" /></a>
            )}
            {redes.web && (
              <a href={redes.web} target="_blank" rel="noopener noreferrer"
                 style={iconBtn}><Globe size={18} color="#1F1F1E" /></a>
            )}
          </div>
        )}

        {/* Restaurantes */}
        <div style={{ marginTop: 32 }}>
          <h2 style={{
            fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: '#1F1F1E',
            margin: '0 0 16px',
          }}>
            Restaurantes
          </h2>

          {restaurantes.length === 0 ? (
            <div style={{
              padding: 32, borderRadius: 18,
              background: '#fff', border: '1px solid rgba(0,0,0,0.06)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🍽️</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1F1F1E', marginBottom: 6 }}>
                Este socio aún no tiene restaurantes
              </div>
              <p style={{ fontSize: 13, color: '#6B6B68', margin: '0 0 20px' }}>
                Vuelve pronto o explora el resto de Pidoo.
              </p>
              <button
                onClick={() => navigate('/')}
                style={{
                  padding: '12px 24px', borderRadius: 12, border: 'none',
                  background: primary, color: '#fff', fontSize: 14, fontWeight: 800,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >Volver a Pidoo</button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}>
              {restaurantes.map((r) => (
                <div
                  key={r.id}
                  onClick={() => abrirRestaurante(r)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') abrirRestaurante(r) }}
                  style={{
                    cursor: 'pointer',
                    background: '#fff',
                    borderRadius: 18,
                    overflow: 'hidden',
                    border: '1px solid rgba(0,0,0,0.06)',
                    transition: 'transform .15s ease, box-shadow .15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.06)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{
                    height: 140,
                    background: r.banner_url
                      ? `url(${r.banner_url}) center/cover`
                      : `linear-gradient(135deg, ${primary} 0%, #F76526 100%)`,
                    position: 'relative',
                  }}>
                    {r.logo_url && (
                      <img src={r.logo_url} alt=""
                        style={{
                          position: 'absolute', bottom: -20, left: 16,
                          width: 48, height: 48, borderRadius: '50%',
                          border: '3px solid #fff', objectFit: 'cover',
                          background: '#fff',
                        }} />
                    )}
                  </div>
                  <div style={{ padding: '28px 16px 16px' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#1F1F1E', lineHeight: 1.2 }}>
                      {r.nombre}
                    </div>
                    <div style={{
                      marginTop: 4, fontSize: 11, color: '#6B6B68',
                      textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
                    }}>
                      {r.tipo || 'Restaurante'}
                      {typeof r.rating === 'number' && r.rating > 0
                        ? ` · ★ ${r.rating.toFixed(1)}`
                        : ''}
                    </div>
                    {r.descripcion && (
                      <p style={{ fontSize: 13, color: '#6B6B68', lineHeight: 1.4, margin: '8px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {r.descripcion}
                      </p>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); abrirRestaurante(r) }}
                      style={{
                        marginTop: 14, padding: '10px 16px',
                        borderRadius: 10, border: 'none',
                        background: primary, color: '#fff',
                        fontSize: 13, fontWeight: 800, cursor: 'pointer',
                        fontFamily: 'inherit', width: '100%',
                      }}
                    >
                      Pedir ahora
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer mini */}
        <div style={{
          marginTop: 40, textAlign: 'center',
          fontSize: 11, color: '#6B6B68', letterSpacing: '0.06em',
        }}>
          Powered by <a href="/" style={{ color: primary, fontWeight: 800, textDecoration: 'none' }}>Pidoo</a>
        </div>
      </div>
    </div>
  )
}

const iconBtn = {
  width: 36, height: 36, borderRadius: '50%',
  background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  textDecoration: 'none',
}
