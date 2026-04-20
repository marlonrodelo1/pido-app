import { useState, useEffect, lazy, Suspense } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { estaAbierto } from '../lib/horario'
import TiendaBottomNav from '../components/TiendaBottomNav'
import Login from './Login'
import { X } from 'lucide-react'

const RestDetalle = lazy(() => import('./RestDetalle'))
const Carrito = lazy(() => import('./Carrito'))
const MisPedidos = lazy(() => import('./MisPedidos'))
const Perfil = lazy(() => import('./Perfil'))
const Tracking = lazy(() => import('./Tracking'))

const fallback = (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
    <div style={{ color: '#6B6B68', fontSize: 13 }}>Cargando...</div>
  </div>
)

export default function TiendaPublica({ establecimiento }) {
  const { user } = useAuth()
  const { setOrigenPedido, totalItems } = useCart()
  const [seccion, setSeccion] = useState('carta')
  const [carritoOpen, setCarritoOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [pedidoActivo, setPedidoActivo] = useState(null)

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
  }, [establecimiento?.id])

  // Cerrar login al iniciar sesión
  useEffect(() => {
    if (user && loginOpen) setLoginOpen(false)
  }, [user, loginOpen])

  function handlePedidoCreado(pedido) {
    setPedidoActivo(pedido)
    setSeccion('tracking')
    setCarritoOpen(false)
  }

  function handleTrackingClose() {
    setPedidoActivo(null)
    setSeccion('carta')
  }

  const estadoAbierto = estaAbierto(establecimiento)
  const abierto = estadoAbierto?.abierto

  return (
    <div style={{
      ...shellStyle,
      minHeight: '100vh', position: 'relative',
      paddingBottom: 'calc(20px + 64px + 20px + env(safe-area-inset-bottom, 0px))',
    }}>
      <style>{globalCss}</style>

      {/* Header propio */}
      <div style={{
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--c-bg)',
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid rgba(0,0,0,0.05)',
      }}>
        {establecimiento?.logo_url && (
          <img
            src={establecimiento.logo_url} alt=""
            style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', flexShrink: 0, background: 'rgba(0,0,0,0.05)' }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--c-text)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {establecimiento?.nombre}
          </div>
          <div style={{ fontSize: 11, color: abierto ? '#4ADE80' : '#EF4444', fontWeight: 700, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: abierto ? '#22C55E' : '#EF4444' }} />
            {abierto ? 'Abierto' : 'Cerrado'}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="tablet-pad" style={{ padding: 20, animation: 'fadeIn 0.3s ease' }}>
        <Suspense fallback={fallback}>
          {seccion === 'tracking' && pedidoActivo ? (
            <Tracking pedido={pedidoActivo} onClose={handleTrackingClose} />
          ) : seccion === 'pedidos' ? (
            <MisPedidos onTrack={(p) => { setPedidoActivo(p); setSeccion('tracking') }} />
          ) : seccion === 'perfil' ? (
            <Perfil />
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
            background: '#FF6B2C', color: '#fff',
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
          background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)',
          overflowY: 'auto', animation: 'fadeIn 0.25s ease',
        }}>
          <button
            onClick={() => setLoginOpen(false)}
            aria-label="Cerrar"
            style={{
              position: 'fixed', top: 'calc(12px + env(safe-area-inset-top, 0px))', right: 14, zIndex: 310,
              width: 36, height: 36, borderRadius: 999,
              background: 'rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.10)',
              color: '#1F1F1E', cursor: 'pointer',
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
  '--c-primary': '#FF6B2C',
  '--c-primary-light': 'rgba(255,107,44,0.15)',
  '--c-primary-soft': 'rgba(255,107,44,0.25)',
  '--c-bg': '#0D0D0D',
  '--c-surface': 'rgba(0,0,0,0.06)',
  '--c-surface2': 'rgba(0,0,0,0.04)',
  '--c-border': 'rgba(0,0,0,0.08)',
  '--c-text': '#1F1F1E',
  '--c-muted': '#6B6B68',
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
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
*{box-sizing:border-box;margin:0;padding:0}
::-webkit-scrollbar{display:none}
body{background:#0D0D0D;margin:0}
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
