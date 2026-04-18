import { useState, useEffect, lazy, Suspense, Component } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { supabase } from './lib/supabase'
import { Bell, Share2, ShoppingBag, CircleUser } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider, useCart } from './context/CartContext'
import Login from './pages/Login'
import BottomNav from './components/BottomNav'
import AnimatedSplash from './components/AnimatedSplash'

// Lazy-loaded routes (code splitting)
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Home = lazy(() => import('./pages/Home'))
const RestDetalle = lazy(() => import('./pages/RestDetalle'))
const Carrito = lazy(() => import('./pages/Carrito'))
const Tracking = lazy(() => import('./pages/Tracking'))
const Favoritos = lazy(() => import('./pages/Favoritos'))
const Mapa = lazy(() => import('./pages/Mapa'))
const MisPedidos = lazy(() => import('./pages/MisPedidos'))
const Notificaciones = lazy(() => import('./pages/Notificaciones'))
const Perfil = lazy(() => import('./pages/Perfil'))
const PaginaLegal = lazy(() => import('./pages/PaginaLegal'))
const LandingRepartidores = lazy(() => import('./pages/LandingRepartidores'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

// Error Boundary — evita pantalla blanca si algo falla
class ErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0D0D0D', color: '#F5F5F5', fontFamily: "'DM Sans', sans-serif", padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😵</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Algo salio mal</div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 24, maxWidth: 300, lineHeight: 1.5 }}>
            Ha ocurrido un error inesperado. Intenta recargar la pagina.
          </p>
          <button onClick={() => window.location.reload()} style={{
            padding: '14px 32px', borderRadius: 14, border: 'none',
            background: '#FF6B2C', color: '#fff', fontSize: 15, fontWeight: 800,
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}>
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const SuspenseFallback = (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Cargando...</div>
  </div>
)

function AppContent() {
  const { user, loading } = useAuth()
  const [onboarded, setOnboarded] = useState(() => !!localStorage.getItem('pido_onboarded'))
  const [categoriaPadre, setCategoriaPadre] = useState(() => localStorage.getItem('pido_categoria') || null)
  const [seccion, setSeccion] = useState('home')
  const [restOpen, setRestOpen] = useState(null)
  const [pedidoActivo, setPedidoActivo] = useState(null)
  const [notifsNoLeidas, setNotifsNoLeidas] = useState(0)
  const [carritoOpen, setCarritoOpen] = useState(false)
  const { totalItems } = useCart()

  // Cargar y escuchar notificaciones no leídas en tiempo real
  useEffect(() => {
    if (!user) return
    supabase.from('notificaciones').select('id', { count: 'exact', head: true })
      .eq('usuario_id', user.id).eq('leida', false)
      .then(({ count }) => setNotifsNoLeidas(count || 0))
    const ch = supabase.channel('notifs-badge-' + user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${user.id}` },
        () => setNotifsNoLeidas(prev => prev + 1))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user?.id])

  if (loading) {
    return <div style={{ ...shellStyle, minHeight: '100vh' }} />
  }

  // Login obligatorio
  if (!user) {
    return <div style={shellStyle}><style>{globalCss}</style><Login /></div>
  }

  // Onboarding
  if (!onboarded) {
    return (
      <div style={shellStyle}>
        <style>{globalCss}</style>
        <Suspense fallback={SuspenseFallback}>
          <Onboarding onComplete={cat => { setCategoriaPadre(cat); setOnboarded(true); localStorage.setItem('pido_onboarded', '1'); localStorage.setItem('pido_categoria', cat) }} />
        </Suspense>
      </div>
    )
  }

  function abrirRest(r) { setRestOpen(r); setSeccion('home') }
  function handlePedidoCreado(pedido) { setPedidoActivo(pedido); setSeccion('tracking') }
  function handleTrack(pedido) { setPedidoActivo(pedido); setSeccion('tracking') }
  function handleTrackingClose() { setPedidoActivo(null); setSeccion('home') }

  const catEmoji = categoriaPadre === 'comida' ? '🍕' : categoriaPadre === 'farmacia' ? '💊' : '🛒'
  const catLabel = categoriaPadre === 'comida' ? 'Comida' : categoriaPadre === 'farmacia' ? 'Farmacia' : 'Market'

  return (
    <div style={{ ...shellStyle, minHeight: '100vh', position: 'relative', paddingBottom: 'calc(20px + 64px + 20px + env(safe-area-inset-bottom, 0px))' }}>
      <style>{globalCss}</style>

      {/* Header */}
      <div style={{
        padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--c-bg)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setOnboarded(false)} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
            borderRadius: 8, border: '1px solid var(--c-border)', background: 'var(--c-surface2)',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--c-text)',
          }}>
            {catEmoji} {catLabel}
            <span style={{ fontSize: 8, marginLeft: 2, color: 'var(--c-muted)' }}>▼</span>
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {pedidoActivo && !['cancelado', 'fallido', 'entregado'].includes(pedidoActivo.estado) && (
            <button onClick={() => setSeccion('tracking')} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
              borderRadius: 10, border: 'none', background: '#DCFCE7',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#166534',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: '#16A34A', animation: 'pulse 1.5s infinite' }} />
              En curso
            </button>
          )}
          <button onClick={() => { setSeccion('notificaciones'); setNotifsNoLeidas(0) }} style={{
            width: 34, height: 34, borderRadius: 10, background: 'var(--c-surface2)',
            border: 'none', cursor: 'pointer', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bell size={18} strokeWidth={1.8} color="var(--c-text)" />
            {notifsNoLeidas > 0 && (
              <span style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: 8, background: 'var(--c-primary)', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{notifsNoLeidas}</span>
            )}
          </button>
          <button onClick={async () => {
            const shareData = { title: 'Pidoo', text: 'Descubre pidoo 🍕 Tus restaurantes, locales y farmacias más cerca. 100% canario 🌴', url: 'https://pidoo.es' }
            if (navigator.share) { try { await navigator.share(shareData) } catch (_) {} }
            else { try { await navigator.clipboard.writeText('https://pidoo.es') } catch (_) {} }
          }} style={{
            width: 34, height: 34, borderRadius: 10, background: 'var(--c-surface2)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Share2 size={18} strokeWidth={1.8} color="var(--c-text)" />
          </button>
          <button onClick={() => { setSeccion('perfil'); setRestOpen(null) }} style={{
            width: 34, height: 34, borderRadius: 10, background: 'var(--c-surface2)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CircleUser size={18} strokeWidth={1.8} color="var(--c-text)" />
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className="tablet-pad" style={{ padding: 20, animation: 'fadeIn 0.3s ease' }}>
        <Suspense fallback={SuspenseFallback}>
          {seccion === 'tracking' && pedidoActivo
            ? <Tracking pedido={pedidoActivo} onClose={handleTrackingClose} />
            : restOpen && seccion === 'home'
            ? <RestDetalle establecimiento={restOpen} onBack={() => setRestOpen(null)} />
            : seccion === 'repartidores'
            ? <LandingRepartidores onBack={() => setSeccion('home')} />
            : seccion === 'home'
            ? <Home onOpenRest={abrirRest} categoriaPadre={categoriaPadre} onOpenRepartidores={() => setSeccion('repartidores')} />
            : seccion === 'favoritos'
            ? <Favoritos onOpenRest={abrirRest} />
            : seccion === 'mapa'
            ? <Mapa onOpenRest={abrirRest} />
            : seccion === 'pedidos'
            ? <MisPedidos onTrack={handleTrack} />
            : seccion === 'notificaciones'
            ? <Notificaciones />
            : seccion === 'perfil'
            ? <Perfil />
            : null
          }
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <Carrito onPedidoCreado={handlePedidoCreado} open={carritoOpen} setOpen={setCarritoOpen} />
      </Suspense>
      <BottomNav active={seccion} totalItems={totalItems} onChange={s => {
        if (s === 'carrito') {
          setCarritoOpen(true)
          return
        }
        setSeccion(s)
        setRestOpen(null)
        if (s === 'notificaciones') setNotifsNoLeidas(0)
      }} />
    </div>
  )
}

const shellStyle = {
  '--c-primary': '#FF6B2C',
  '--c-primary-light': 'rgba(255,107,44,0.15)',
  '--c-primary-soft': 'rgba(255,107,44,0.25)',
  '--c-bg': '#0D0D0D',
  '--c-surface': 'rgba(255,255,255,0.08)',
  '--c-surface2': 'rgba(255,255,255,0.05)',
  '--c-border': 'rgba(255,255,255,0.1)',
  '--c-text': '#F5F5F5',
  '--c-muted': 'rgba(255,255,255,0.45)',
  '--c-glass': 'rgba(255,255,255,0.06)',
  '--c-glass-border': 'rgba(255,255,255,0.12)',
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
  .tablet-grid{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:14px!important}
  .tablet-grid>*{margin-bottom:0!important}
  .tablet-pad{padding:24px 32px!important}
  .tablet-slider-card{min-width:280px!important}
  .bottom-nav-wrap{max-width:560px!important}
  .modal-sheet{max-width:560px!important}
  .login-form{max-width:400px!important}
  .legal-content{max-width:700px!important}
}
@media(min-width:1024px){
  .tablet-grid{grid-template-columns:repeat(3,1fr)!important}
  .tablet-pad{padding:28px 48px!important}
  .bottom-nav-wrap{max-width:650px!important}
  .modal-sheet{max-width:650px!important}
  .login-form{max-width:440px!important}
  .legal-content{max-width:900px!important}
}
@media(max-width:359px){
  .small-text{font-size:11px!important}
  .small-heading{font-size:20px!important}
}
@media(orientation:landscape) and (max-height:500px){
  .banner-responsive{height:100px!important}
}
`

function TiendaDetector() {
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('pido_splash_shown'))
  const [checking, setChecking] = useState(true)
  const [emailConfirmado, setEmailConfirmado] = useState(false)
  const [paginaLegal, setPaginaLegal] = useState(null)
  const [isResetPassword, setIsResetPassword] = useState(false)

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: false })
      StatusBar.setBackgroundColor({ color: '#0D0D0D' })
      StatusBar.setStyle({ style: Style.Dark })

      // Capturar deep link de OAuth callback
      CapApp.addListener('appUrlOpen', async ({ url }) => {
        try {
          // Cerrar el navegador externo si sigue abierto
          try {
            const { Browser } = await import('@capacitor/browser')
            await Browser.close()
          } catch (_) {}

          // Extraer parámetros del deep link (puede venir como hash o query)
          const parsed = new URL(url)
          const hashStr = parsed.hash ? parsed.hash.substring(1) : ''
          const queryStr = parsed.search ? parsed.search.substring(1) : ''
          const params = new URLSearchParams(hashStr || queryStr)

          // PKCE flow: Supabase v2 envía ?code=xxx (no access_token)
          const code = params.get('code')
          if (code) {
            await supabase.auth.exchangeCodeForSession(code)
            return
          }

          // Fallback: implicit flow con access_token + refresh_token
          const access_token = params.get('access_token')
          const refresh_token = params.get('refresh_token')
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token })
          }
        } catch (err) {
          console.error('Error procesando deep link OAuth:', err)
        }
      })

      // Chequear actualizaciones de Play Store al abrir la app
      import('@capawesome/capacitor-app-update').then(({ AppUpdate }) => {
        AppUpdate.getAppUpdateInfo().then(info => {
          // updateAvailability: 2 = UPDATE_AVAILABLE
          if (info.updateAvailability === 2) {
            // Intentar update inmediato (pantalla completa de Play Store)
            AppUpdate.performImmediateUpdate().catch(() => {
              // Si falla el inmediato, intentar flexible
              AppUpdate.startFlexibleUpdate().catch(() => {})
            })
          }
        }).catch(() => {})
      })
    }
  }, [])

  // Detectar confirmación de email desde Supabase
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('type=signup') && !Capacitor.isNativePlatform()) {
      setEmailConfirmado(true)
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    const path = window.location.pathname.replace(/^\//, '')
    // Reset password
    if (path === 'reset-password') {
      setIsResetPassword(true)
      setChecking(false)
      return
    }
    // Rutas de páginas legales
    if (path === 'terminos' || path === 'privacidad') {
      setPaginaLegal(path)
      setChecking(false)
      return
    }
    // Rutas internas de la app (sin slug externo)
    setChecking(false)
  }, [])

  if (showSplash) {
    return <AnimatedSplash onComplete={() => { sessionStorage.setItem('pido_splash_shown', '1'); setShowSplash(false) }} />
  }

  if (checking) {
    return <div style={{ ...shellStyle, minHeight: '100vh' }} />
  }

  if (emailConfirmado) {
    return (
      <div style={{ ...shellStyle, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <style>{globalCss}</style>
        <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#F5F5F5', marginBottom: 8, textAlign: 'center' }}>
          Cuenta confirmada
        </div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32, textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
          Tu cuenta ha sido verificada correctamente. Ya puedes iniciar sesion en pidoo.
        </p>
        <button onClick={() => { setEmailConfirmado(false); window.location.hash = ''; window.location.href = '/' }} style={{
          display: 'inline-block', padding: '16px 40px', borderRadius: 14, border: 'none',
          background: '#FF6B2C', color: '#fff', fontSize: 16, fontWeight: 800,
          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
        }}>
          Iniciar sesion
        </button>
        <button onClick={() => { setEmailConfirmado(false); window.location.hash = '' }} style={{
          marginTop: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)',
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Continuar en la web
        </button>
      </div>
    )
  }

  if (isResetPassword) {
    return (
      <div style={shellStyle}>
        <style>{globalCss}</style>
        <Suspense fallback={SuspenseFallback}>
          <ResetPassword />
        </Suspense>
      </div>
    )
  }

  if (paginaLegal) {
    return (
      <div style={{ ...shellStyle, minHeight: '100vh' }}>
        <style>{globalCss}</style>
        <Suspense fallback={SuspenseFallback}>
          <PaginaLegal slug={paginaLegal} onBack={() => window.history.back()} />
        </Suspense>
      </div>
    )
  }

  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <TiendaDetector />
    </ErrorBoundary>
  )
}
