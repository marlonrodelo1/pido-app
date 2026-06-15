import { useState, useEffect, lazy, Suspense } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { supabase } from '../lib/supabase'
import TiendaBottomNav from '../components/TiendaBottomNav'
import Login from './Login'
import { X, Bike } from 'lucide-react'

const ESTADOS_PEDIDO_ACTIVO = ['nuevo', 'aceptado', 'preparando', 'listo', 'recogido', 'en_camino']

const RestDetalle = lazy(() => import('./RestDetalle'))
const Carrito = lazy(() => import('./Carrito'))
const MisPedidos = lazy(() => import('./MisPedidos'))
const Perfil = lazy(() => import('./Perfil'))
const Tracking = lazy(() => import('./Tracking'))
const TiendaDesktop = lazy(() => import('./TiendaDesktop'))

const fallback = (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
    <div style={{ color: '#6B6356', fontSize: 13 }}>Cargando...</div>
  </div>
)

// Hook que devuelve isDesktop = window.innerWidth >= 1024 con listener resize
function useIsDesktop(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth >= breakpoint
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    function onResize() {
      setIsDesktop(window.innerWidth >= breakpoint)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return isDesktop
}

export default function TiendaPublica({ establecimiento }) {
  const { user } = useAuth()
  const { setOrigenPedido, totalItems } = useCart()
  const [seccion, setSeccion] = useState('carta')
  const [carritoOpen, setCarritoOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [pedidoActivo, setPedidoActivo] = useState(null)
  const isDesktop = useIsDesktop(1024)

  // Setear origen del pedido a 'tienda_publica' al montar
  useEffect(() => {
    if (typeof setOrigenPedido === 'function') setOrigenPedido('tienda_publica')
    return () => {
      if (typeof setOrigenPedido === 'function') setOrigenPedido('pido')
    }
  }, [])

  // Meta tags OG + title dinámicos
  useEffect(() => {
    const nombre = establecimiento?.nombre || 'Tienda'
    document.title = `${nombre} · Pedir online`
    const desc = establecimiento?.descripcion || `Pide online en ${nombre} con Pidoo`
    const img = establecimiento?.banner_url || establecimiento?.logo_url || ''
    const url = `https://pidoo.es/${establecimiento?.slug || ''}`

    const setMeta = (attr, key, value) => {
      if (!value) return
      let el = document.querySelector(`meta[${attr}="${key}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      el.setAttribute('content', value)
    }
    setMeta('name', 'description', desc)
    setMeta('property', 'og:title', nombre)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:image', img)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:type', 'website')
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', nombre)
    setMeta('name', 'twitter:description', desc)
    setMeta('name', 'twitter:image', img)

    // Favicon dinamico = logo del restaurante
    const logo = establecimiento?.logo_url
    if (logo) {
      let link = document.querySelector("link[rel='icon']")
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = logo
      return () => {
        if (link) link.href = '/favicon.svg'
      }
    }
  }, [establecimiento?.id])

  // Cerrar login al iniciar sesión
  useEffect(() => {
    if (user && loginOpen) setLoginOpen(false)
  }, [user, loginOpen])

  // Cargar pedido activo del usuario en este restaurante al montar / cambiar user
  useEffect(() => {
    if (!user?.id || !establecimiento?.id) {
      setPedidoActivo(null)
      return
    }
    let cancel = false
    ;(async () => {
      const { data } = await supabase
        .from('pedidos')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('establecimiento_id', establecimiento.id)
        .in('estado', ESTADOS_PEDIDO_ACTIVO)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!cancel) setPedidoActivo(data || null)
    })()
    return () => { cancel = true }
  }, [user?.id, establecimiento?.id])

  // Realtime: limpiar pedidoActivo si pasa a entregado/cancelado/fallido
  useEffect(() => {
    if (!pedidoActivo?.id) return
    const channel = supabase
      .channel(`tienda-pedido-${pedidoActivo.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'pedidos',
        filter: `id=eq.${pedidoActivo.id}`,
      }, (payload) => {
        const nuevo = payload.new
        if (!ESTADOS_PEDIDO_ACTIVO.includes(nuevo.estado)) {
          setPedidoActivo(null)
          if (seccion === 'tracking') setSeccion('carta')
        } else {
          setPedidoActivo((prev) => ({ ...prev, ...nuevo }))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [pedidoActivo?.id, seccion])

  function handlePedidoCreado(pedido) {
    setPedidoActivo(pedido)
    setSeccion('tracking')
    setCarritoOpen(false)
  }

  function handleTrackingClose() {
    setPedidoActivo(null)
    setSeccion('carta')
  }

  // Banner "Tienes pedido en curso" — sticky arriba cuando hay pedido activo en sección carta
  const pedidoBanner = pedidoActivo && seccion === 'carta' ? (
    <div style={{
      position: 'fixed',
      top: 'calc(12px + env(safe-area-inset-top, 0px))',
      left: 14, right: 14, zIndex: 60,
      maxWidth: 720, marginLeft: 'auto', marginRight: 'auto',
      pointerEvents: 'none',
    }}>
      <button
        onClick={() => setSeccion('tracking')}
        style={{
          width: '100%',
          padding: '12px 14px 12px 16px',
          borderRadius: 14, border: 'none',
          background: 'linear-gradient(180deg, #C5562C, #A8451F)',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 10px 26px rgba(26,24,21,0.32), inset 0 1px 0 rgba(255,255,255,0.10)',
          animation: 'slideDown 0.35s ease',
          pointerEvents: 'auto',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.20)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
          }}>
            <Bike size={16} strokeWidth={2.4} />
          </span>
          <span style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            minWidth: 0, gap: 1,
          }}>
            <span style={{
              fontWeight: 800, fontSize: 13, letterSpacing: '-0.01em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              Tienes un pedido en curso
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.65)',
              letterSpacing: '0.02em',
            }}>
              {pedidoActivo.codigo || 'En seguimiento'}
            </span>
          </span>
        </span>
        <span style={{
          fontSize: 12, fontWeight: 700,
          color: 'rgba(255,255,255,0.85)', flexShrink: 0,
          background: 'rgba(255,255,255,0.10)',
          padding: '6px 10px', borderRadius: 999,
        }}>
          Ver seguimiento
        </span>
      </button>
    </div>
  ) : null

  // ─── Render DESKTOP ≥1024px ────────────────────────────────
  // Solo cuando estamos en la sección "carta" (catálogo). En tracking,
  // pedidos y perfil reutilizamos la UI mobile centrada (es suficiente).
  if (isDesktop && seccion === 'carta') {
    return (
      <div style={{
        ...shellStyle,
        minHeight: '100vh', position: 'relative',
        background: '#F7F3EC',
      }}>
        <style>{globalCss}</style>
        {pedidoBanner}
        <Suspense fallback={fallback}>
          <TiendaDesktop
            establecimiento={establecimiento}
            onCheckout={() => {
              if (!user) { setLoginOpen(true); return }
              setCarritoOpen(true)
            }}
            onRequireLogin={() => setLoginOpen(true)}
          />
        </Suspense>

        {/* Carrito modal (lógica completa de checkout sigue aquí) */}
        <Suspense fallback={null}>
          <Carrito
            onPedidoCreado={handlePedidoCreado}
            open={carritoOpen}
            setOpen={setCarritoOpen}
            onRequireLogin={() => setLoginOpen(true)}
          />
        </Suspense>

        {loginOpen && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(247,243,236,0.96)', backdropFilter: 'blur(6px)',
            overflowY: 'auto', animation: 'fadeIn 0.25s ease',
          }}>
            <button
              onClick={() => setLoginOpen(false)}
              aria-label="Cerrar"
              style={{
                position: 'fixed', top: 16, right: 16, zIndex: 310,
                width: 36, height: 36, borderRadius: 999,
                background: 'rgba(255,255,255,0.95)',
                border: '1px solid #E8E1D3',
                color: '#1A1815', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={18} strokeWidth={2.2}/>
            </button>
            <Login />
          </div>
        )}
      </div>
    )
  }

  // ─── Render MOBILE (≤1023px) o secciones no-carta ─────────
  return (
    <div style={{
      ...shellStyle,
      minHeight: '100vh', position: 'relative',
      paddingBottom: 'calc(20px + 64px + 20px + env(safe-area-inset-bottom, 0px))',
    }}>
      <style>{globalCss}</style>
      {pedidoBanner}

      {/* Contenido */}
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <Suspense fallback={fallback}>
          {seccion === 'tracking' && pedidoActivo ? (
            <div style={{
              padding: 'calc(16px + env(safe-area-inset-top, 0px)) 16px 8px',
              maxWidth: 720, marginLeft: 'auto', marginRight: 'auto',
            }}>
              <Tracking pedido={pedidoActivo} onClose={handleTrackingClose} />
            </div>
          ) : seccion === 'pedidos' ? (
            <div style={{
              padding: 'calc(16px + env(safe-area-inset-top, 0px)) 16px 8px',
              maxWidth: 720, marginLeft: 'auto', marginRight: 'auto',
            }}>
              <MisPedidos onTrack={(p) => { setPedidoActivo(p); setSeccion('tracking') }} />
            </div>
          ) : seccion === 'perfil' ? (
            <div style={{
              padding: 'calc(16px + env(safe-area-inset-top, 0px)) 16px 8px',
              maxWidth: 720, marginLeft: 'auto', marginRight: 'auto',
            }}>
              <Perfil />
            </div>
          ) : (
            <RestDetalle establecimiento={establecimiento} modoTienda={true} onRequireLogin={() => setLoginOpen(true)} />
          )}
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <Carrito
          onPedidoCreado={handlePedidoCreado}
          open={carritoOpen}
          setOpen={setCarritoOpen}
          onRequireLogin={() => setLoginOpen(true)}
        />
      </Suspense>

      {/* Botón flotante carrito */}
      {totalItems > 0 && seccion === 'carta' && (
        <button
          onClick={() => setCarritoOpen(true)}
          style={{
            position: 'fixed',
            bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
            right: 20, zIndex: 55,
            padding: '12px 18px',
            borderRadius: 999, border: 'none',
            background: '#C5562C', color: '#fff',
            fontSize: 14, fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 8px 24px rgba(255,107,44,0.35)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <span>Ver carrito</span>
          <span style={{
            background: 'rgba(0,0,0,0.30)', borderRadius: 10,
            padding: '2px 8px', fontSize: 12, fontWeight: 800,
          }}>{totalItems}</span>
        </button>
      )}

      <TiendaBottomNav
        active={seccion}
        onChange={(s) => {
          if (s === 'carta') {
            setSeccion('carta')
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
          }
          if (!user && (s === 'pedidos' || s === 'perfil')) {
            setLoginOpen(true)
            return
          }
          setSeccion(s)
        }}
      />

      {loginOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(247,243,236,0.97)', backdropFilter: 'blur(6px)',
          overflowY: 'auto', animation: 'fadeIn 0.25s ease',
        }}>
          <button
            onClick={() => setLoginOpen(false)}
            aria-label="Cerrar"
            style={{
              position: 'fixed', top: 'calc(12px + env(safe-area-inset-top, 0px))', right: 14, zIndex: 310,
              width: 36, height: 36, borderRadius: 999,
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid #E8E1D3',
              color: '#1A1815', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(10px)',
            }}
          >
            <X size={18} strokeWidth={2.2} />
          </button>
          <Login />
        </div>
      )}
    </div>
  )
}

const shellStyle = {
  '--c-primary': '#C5562C',
  '--c-primary-light': 'rgba(255,107,44,0.15)',
  '--c-primary-soft': 'rgba(255,107,44,0.25)',
  '--c-bg': '#F7F3EC',
  '--c-surface': 'rgba(0,0,0,0.06)',
  '--c-surface2': 'rgba(0,0,0,0.04)',
  '--c-border': 'rgba(0,0,0,0.08)',
  '--c-text': '#1A1815',
  '--c-muted': '#6B6356',
  '--c-glass': 'rgba(0,0,0,0.05)',
  '--c-glass-border': 'rgba(0,0,0,0.08)',
  fontFamily: "'DM Sans', sans-serif",
  margin: '0 auto',
  background: 'var(--c-bg)',
  color: 'var(--c-text)',
}

const globalCss = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes slideDown{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
*{box-sizing:border-box;margin:0;padding:0}
::-webkit-scrollbar{display:none}
body{background:#F7F3EC;margin:0}
@media(min-width:768px){
  .tablet-pad{padding:24px 32px!important}
  .modal-sheet{max-width:560px!important}
  .login-form{max-width:400px!important}
}
@media(min-width:1024px){
  .tablet-pad{padding:28px 48px!important}
  .modal-sheet{max-width:650px!important}
  .login-form{max-width:440px!important}
}
`
