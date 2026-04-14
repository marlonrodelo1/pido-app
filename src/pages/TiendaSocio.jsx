import { useState, useEffect, lazy, Suspense } from 'react'
import { User, LogOut, Home, ClipboardList } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Stars from '../components/Stars'
import { estaAbierto } from '../lib/horario'

const Login = lazy(() => import('./Login'))

// Glass — igual que Home.jsx
const G = {
  background: 'rgba(255,255,255,0.08)',
  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.1)',
}

// Variables CSS que Login.jsx necesita (--c-btn-gradient, --c-primary, etc.)
const shellVars = {
  '--c-primary':       '#FF6B2C',
  '--c-primary-light': 'rgba(255,107,44,0.6)',
  '--c-btn-gradient':  'linear-gradient(135deg, #FF6B2C 0%, #F76526 100%)',
  '--c-bg':            '#0D0D0D',
  '--c-surface':       'rgba(255,255,255,0.08)',
  '--c-border':        'rgba(255,255,255,0.1)',
  '--c-text':          '#F5F5F5',
  '--c-muted':         'rgba(255,255,255,0.45)',
}

const globalCss = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0D0D0D;margin:0}
::-webkit-scrollbar{display:none}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@media(min-width:768px){
  .ts-grid{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:24px!important}
  .ts-pad{padding:24px 32px!important}
  .ts-slider-card{min-width:280px!important}
}
@media(min-width:1024px){
  .ts-grid{grid-template-columns:repeat(3,1fr)!important}
  .ts-pad{padding:28px 48px!important}
}
`

export default function TiendaSocio({ slug }) {
  const { user, perfil, loading: authLoading, logout } = useAuth()
  const [socio, setSocio] = useState(null)
  const [establecimientos, setEstablecimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [perfilOpen, setPerfilOpen] = useState(false)

  useEffect(() => { cargar() }, [slug])

  // Cerrar login automáticamente cuando el usuario se loguea
  useEffect(() => {
    if (user && loginOpen) setLoginOpen(false)
  }, [user])

  async function cargar() {
    const { data: socioData, error: socioErr } = await supabase
      .from('socios')
      .select('id, nombre_comercial, slug, logo_url, banner_url, rating, total_resenas, modo_entrega, redes, en_servicio')
      .eq('slug', slug)
      .single()

    if (socioErr || !socioData) {
      setError('Tienda no encontrada')
      setLoading(false)
      return
    }
    setSocio(socioData)

    // Solo restaurantes con estado='aceptado'
    const { data: relaciones } = await supabase
      .from('socio_establecimiento')
      .select('establecimiento_id, destacado, exclusivo')
      .eq('socio_id', socioData.id)
      .eq('estado', 'aceptado')

    if (!relaciones || relaciones.length === 0) {
      setEstablecimientos([])
      setLoading(false)
      return
    }

    const estIds = relaciones.map(r => r.establecimiento_id)
    const { data: ests } = await supabase
      .from('establecimientos')
      .select('id, nombre, descripcion, tipo, logo_url, banner_url, rating, total_resenas, horario, activo')
      .in('id', estIds)
      .eq('activo', true)

    const conMeta = (ests || []).map(e => {
      const rel = relaciones.find(r => r.establecimiento_id === e.id)
      return { ...e, exclusivo: rel?.exclusivo ?? false, destacado: rel?.destacado ?? false }
    })

    setEstablecimientos(conMeta)
    setLoading(false)
  }

  const shell = {
    ...shellVars,
    minHeight: '100vh',
    background: '#0D0D0D',
    fontFamily: "'DM Sans', sans-serif",
    color: '#F5F5F5',
    paddingBottom: 'calc(20px + 64px + 20px + env(safe-area-inset-bottom, 0px))',
  }

  // ── Pantalla de login ──────────────────────────────────────────────────────
  if (loginOpen) {
    return (
      <div style={{ ...shell, paddingBottom: 0 }}>
        <style>{globalCss}</style>
        {/* Header con botón volver a la tienda */}
        <div style={{
          padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button onClick={() => setLoginOpen(false)} style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10,
            width: 36, height: 36, cursor: 'pointer', color: '#F5F5F5', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
          }}>←</button>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#F5F5F5' }}>
            {socio?.nombre_comercial || 'Tienda'}
          </div>
        </div>
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Cargando...</div>}>
          <Login />
        </Suspense>
      </div>
    )
  }

  if (loading || authLoading) {
    return (
      <div style={{ ...shell, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{globalCss}</style>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#FF6B2C' }}>Cargando tienda...</div>
      </div>
    )
  }

  if (error || !socio) {
    return (
      <div style={{ ...shell, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
        <style>{globalCss}</style>
        <div style={{ fontSize: 48 }}>😕</div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Tienda no encontrada</div>
      </div>
    )
  }

  const destacados = establecimientos.filter(e => e.destacado)
  const redes = socio.redes || {}

  // Inicial del nombre del usuario para el avatar
  const inicialUsuario = perfil?.nombre?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'

  return (
    <div style={shell}>
      <style>{globalCss}</style>

      {/* ── Banner + Logo + Botón usuario ── */}
      <div style={{ position: 'relative', marginBottom: 48 }}>
        {/* Banner */}
        <div style={{ height: 180, overflow: 'hidden', position: 'relative' }}>
          {socio.banner_url
            ? <img src={socio.banner_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #FF6B2C 0%, #F76526 100%)' }} />
          }
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.65))' }} />

          {/* Botón usuario — top right del banner */}
          <div style={{ position: 'absolute', top: 14, right: 14 }}>
            {user ? (
              <button onClick={() => setPerfilOpen(v => !v)} style={{
                width: 38, height: 38, borderRadius: 12,
                background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)',
                border: '1.5px solid rgba(255,255,255,0.2)',
                cursor: 'pointer', color: '#fff', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 800,
              }}>
                {perfil?.avatar_url
                  ? <img src={perfil.avatar_url} alt="" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover' }} />
                  : inicialUsuario
                }
              </button>
            ) : (
              <button onClick={() => setLoginOpen(true)} style={{
                padding: '7px 14px', borderRadius: 12,
                background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)',
                border: '1.5px solid rgba(255,255,255,0.2)',
                cursor: 'pointer', color: '#fff', fontFamily: 'inherit',
                fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <User size={14} strokeWidth={2} />
                Entrar
              </button>
            )}

            {/* Dropdown perfil */}
            {perfilOpen && user && (
              <div style={{
                position: 'absolute', top: 46, right: 0,
                background: '#1E1E1E', borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                minWidth: 200, overflow: 'hidden', zIndex: 100,
                animation: 'fadeIn 0.15s ease',
              }}>
                {/* Info usuario */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#F5F5F5', marginBottom: 2 }}>
                    {perfil?.nombre || 'Usuario'}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                    {user.email}
                  </div>
                </div>
                {/* Ir a pido-app */}
                <button onClick={() => { window.location.href = '/' }} style={{
                  width: '100%', padding: '12px 16px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'inherit',
                  fontSize: 13, fontWeight: 600, color: '#F5F5F5',
                  display: 'flex', alignItems: 'center', gap: 10,
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                }}>
                  🏠 Ir a Pidoo
                </button>
                {/* Cerrar sesión */}
                <button onClick={async () => { await logout(); setPerfilOpen(false) }} style={{
                  width: '100%', padding: '12px 16px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', fontFamily: 'inherit',
                  fontSize: 13, fontWeight: 600, color: '#EF4444',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <LogOut size={14} strokeWidth={2} /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Logo — fuera del overflow:hidden del banner */}
        <div style={{
          position: 'absolute', bottom: -36, left: '50%', transform: 'translateX(-50%)',
          width: 80, height: 80, borderRadius: 22,
          overflow: 'hidden', background: '#1A1A1A',
          border: '3px solid #0D0D0D', boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}>
          {socio.logo_url
            ? <img src={socio.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>🛵</div>
          }
        </div>
      </div>

      {/* ── Info socio ── */}
      <div style={{ textAlign: 'center', padding: '0 20px 24px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: '-0.025em' }}>
          {socio.nombre_comercial}
        </h1>
        {socio.rating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ color: '#ff9066', fontSize: 14, fontWeight: 700 }}>★ {socio.rating?.toFixed(1)}</span>
            <span style={{ color: '#adaaaa', fontSize: 12 }}>({socio.total_resenas || 0} reseñas)</span>
          </div>
        )}

        {/* Estado en servicio */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 14px', borderRadius: 20, ...G,
          fontSize: 12, fontWeight: 700,
          color: socio.en_servicio ? '#22C55E' : '#adaaaa',
          marginBottom: 14,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: socio.en_servicio ? '#22C55E' : '#555',
            boxShadow: socio.en_servicio ? '0 0 6px #22C55E' : 'none',
          }} />
          {socio.en_servicio ? 'En servicio' : 'Fuera de servicio'}
        </div>

        {/* Redes sociales */}
        {(redes.whatsapp || redes.instagram || redes.tiktok) && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
            {redes.whatsapp && (
              <a href={`https://wa.me/${redes.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                style={{ width: 38, height: 38, borderRadius: 12, ...G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, textDecoration: 'none' }}>💬</a>
            )}
            {redes.instagram && (
              <a href={`https://instagram.com/${redes.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                style={{ width: 38, height: 38, borderRadius: 12, ...G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, textDecoration: 'none' }}>📸</a>
            )}
            {redes.tiktok && (
              <a href={`https://tiktok.com/@${redes.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                style={{ width: 38, height: 38, borderRadius: 12, ...G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, textDecoration: 'none' }}>🎵</a>
            )}
          </div>
        )}

        {/* Bienvenida si está logueado */}
        {user && perfil && (
          <div style={{
            marginTop: 14, padding: '8px 16px', borderRadius: 12,
            background: 'rgba(255,107,44,0.1)', border: '1px solid rgba(255,107,44,0.2)',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 13, color: '#ff9066', fontWeight: 600,
          }}>
            👋 Hola, {perfil.nombre?.split(' ')[0]}
          </div>
        )}
      </div>

      {/* ── Contenido ── */}
      <div className="ts-pad" style={{ padding: '0 20px', animation: 'fadeIn 0.3s ease' }}
        onClick={() => perfilOpen && setPerfilOpen(false)}>

        {/* ── Destacados ── */}
        {destacados.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '0 4px' }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.025em', color: '#ffffff', margin: 0 }}>Destacados</h2>
            </div>
            <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 24 }}>
              {destacados.map(r => {
                const est = estaAbierto(r)
                return (
                  <div key={r.id} className="ts-slider-card" style={{ minWidth: 240, flexShrink: 0, cursor: 'pointer' }}>
                    <div style={{ position: 'relative', height: 176, borderRadius: 22, overflow: 'hidden', ...G, marginBottom: 16 }}>
                      <div style={{
                        width: '100%', height: '100%',
                        background: r.banner_url ? `url(${r.banner_url}) center/cover` : 'linear-gradient(135deg, #FF6B2C 0%, #F76526 100%)',
                      }} />
                      <div style={{
                        position: 'absolute', top: 16, left: 16,
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
                        padding: '4px 12px', borderRadius: 9999,
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                        color: '#fff', display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: est.abierto ? '#22c55e' : '#ef4444' }} />
                        {est.abierto ? 'Abierto' : 'Cerrado'}
                      </div>
                      <div style={{
                        position: 'absolute', top: 16, right: 16,
                        background: r.exclusivo ? 'rgba(255,107,44,0.9)' : 'rgba(34,197,94,0.9)',
                        backdropFilter: 'blur(8px)', padding: '3px 8px', borderRadius: 8,
                        fontSize: 9, fontWeight: 700, color: '#fff',
                      }}>
                        {r.exclusivo ? '🔒 Exclusivo' : '🛵 Cobertura'}
                      </div>
                      {r.rating > 0 && (
                        <div style={{
                          position: 'absolute', bottom: 16, right: 16,
                          background: 'rgba(255,144,102,0.9)', backdropFilter: 'blur(12px)',
                          padding: '4px 8px', borderRadius: 8,
                          fontSize: 12, fontWeight: 700, color: '#571a00',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <span style={{ fontSize: 14 }}>★</span> {r.rating?.toFixed(1)}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '0 4px' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff', lineHeight: 1.25 }}>{r.nombre}</div>
                      <div style={{ fontSize: 10, color: '#adaaaa', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                        {r.tipo || 'Restaurante'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Título ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '0 4px' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.025em', color: '#ffffff', margin: 0 }}>
            {establecimientos.length === 0 ? 'Sin restaurantes' : 'Restaurantes'}
          </h2>
        </div>

        {establecimientos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#adaaaa' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🍽️</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Esta tienda aún no tiene restaurantes</div>
          </div>
        )}

        {/* ── Cards restaurantes (glass = Home.jsx) ── */}
        <div className="ts-grid" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 24 }}>
          {establecimientos.map(r => {
            const estado = estaAbierto(r)
            return (
              <div key={r.id} style={{ borderRadius: 22, overflow: 'hidden', cursor: 'pointer', ...G, opacity: estado.abierto ? 1 : 0.65 }}>
                <div style={{ height: 192, position: 'relative' }}>
                  <div style={{
                    width: '100%', height: '100%',
                    background: r.banner_url ? `url(${r.banner_url}) center/cover` : 'linear-gradient(135deg, #FF6B2C 0%, #F76526 100%)',
                  }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)' }} />
                  <div style={{
                    position: 'absolute', top: 12, left: 12,
                    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)',
                    padding: '3px 10px', borderRadius: 9999,
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: '#fff', display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: estado.abierto ? '#22c55e' : '#ef4444' }} />
                    {estado.abierto ? 'Abierto' : 'Cerrado'}
                  </div>
                  <div style={{
                    position: 'absolute', top: 12, right: 12,
                    background: r.exclusivo ? 'rgba(255,107,44,0.88)' : 'rgba(34,197,94,0.88)',
                    padding: '3px 8px', borderRadius: 8, fontSize: 9, fontWeight: 700, color: '#fff',
                  }}>
                    {r.exclusivo ? '🔒 Exclusivo' : '🛵 Cobertura garantizada'}
                  </div>
                  <div style={{ position: 'absolute', bottom: 16, left: 24 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{r.nombre}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      {r.rating > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ff9066', fontSize: 14, fontWeight: 700 }}>
                          <span style={{ fontSize: 12 }}>★</span> {r.rating?.toFixed(1)}
                        </div>
                      )}
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {r.tipo || 'Restaurante'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── BottomNav de la tienda (solo acciones relevantes para este socio) ── */}
      <div style={{
        position: 'fixed', bottom: 20, left: 0, right: 0, zIndex: 50,
        display: 'flex', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <div style={{
          width: '60%', maxWidth: 220,
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
          height: 64,
          background: 'rgba(0,0,0,0.92)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 22,
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 12px 40px rgba(255,107,44,0.06)',
          padding: '0 6px',
          pointerEvents: 'auto',
        }}>
          {/* Tienda — siempre activo (ya estamos aquí) */}
          <button style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 2,
            background: 'rgba(255,107,44,0.15)', border: 'none', cursor: 'default',
            color: '#FF6B2C', padding: '6px 16px', borderRadius: 14,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <Home size={20} strokeWidth={2.2} />
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.02em' }}>Tienda</span>
          </button>

          {/* Cuenta — abre login si no hay sesión, o perfil/dropdown si hay */}
          <button
            onClick={() => user ? setPerfilOpen(v => !v) : setLoginOpen(true)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 2,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: user ? '#FF6B2C' : 'rgba(255,255,255,0.4)',
              padding: '6px 16px', borderRadius: 14,
              fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.2s ease',
            }}
          >
            <User size={20} strokeWidth={user ? 2.2 : 1.5} />
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.02em' }}>
              {user ? (perfil?.nombre?.split(' ')[0] || 'Cuenta') : 'Entrar'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
