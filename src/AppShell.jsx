import { useState, useEffect, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { Bell, Share2, CircleUser, X } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider, useCart } from './context/CartContext'
import Login from './pages/Login'
import BottomNav from './components/BottomNav'

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
const LandingRepartidores = lazy(() => import('./pages/LandingRepartidores'))

const SuspenseFallback = (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
    <div style={{ color: '#6B6B68', fontSize: 13 }}>Cargando...</div>
  </div>
)

function AppContent({ socioData = null, restaurantesFilter = null }) {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [onboarded, setOnboarded] = useState(() => !!localStorage.getItem('pido_onboarded'))
  const [categoriaPadre, setCategoriaPadre] = useState(() => localStorage.getItem('pido_categoria') || null)
  const [seccion, setSeccion] = useState('home')
  const [restOpen, setRestOpen] = useState(null)
  const [pedidoActivo, setPedidoActivo] = useState(null)
  const [notifsNoLeidas, setNotifsNoLeidas] = useState(0)
  const [carritoOpen, setCarritoOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const { totalItems } = useCart()

  const SECCIONES_PROTEGIDAS = ['favoritos', 'pedidos', 'notificaciones', 'perfil']

  useEffect(() => {
    if (user && loginOpen) setLoginOpen(false)
  }, [user, loginOpen])

  useEffect(() => {
    if (!user) { setNotifsNoLeidas(0); return }
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

      <div style={{
        padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(250,250,247,0.85)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        borderBottom: '1px solid var(--c-border)',
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
          <button onClick={() => {
            if (!user) { setLoginOpen(true); return }
            setSeccion('notificaciones'); setNotifsNoLeidas(0)
          }} style={{
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
          <button onClick={() => {
            if (!user) { setLoginOpen(true); return }
            setSeccion('perfil'); setRestOpen(null)
          }} style={{
            width: 34, height: 34, borderRadius: 10, background: 'var(--c-surface2)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CircleUser size={18} strokeWidth={1.8} color="var(--c-text)" />
          </button>
        </div>
      </div>

      <div className="tablet-pad" style={{ padding: 20, animation: 'fadeIn 0.3s ease' }}>
        <Suspense fallback={SuspenseFallback}>
          {seccion === 'tracking' && pedidoActivo
            ? <Tracking pedido={pedidoActivo} onClose={handleTrackingClose} />
            : restOpen && seccion === 'home'
            ? <RestDetalle establecimiento={restOpen} onBack={() => setRestOpen(null)} onRequireLogin={() => setLoginOpen(true)} />
            : seccion === 'repartidores'
            ? <LandingRepartidores onBack={() => setSeccion('home')} />
            : seccion === 'home'
            ? <Home onOpenRest={abrirRest} categoriaPadre={categoriaPadre} onOpenRepartidores={() => setSeccion('repartidores')} socioData={socioData} restaurantesFilter={restaurantesFilter} />
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
        <Carrito onPedidoCreado={handlePedidoCreado} open={carritoOpen} setOpen={setCarritoOpen} onRequireLogin={() => setLoginOpen(true)} />
      </Suspense>
      <BottomNav active={seccion} totalItems={totalItems} onChange={s => {
        if (s === 'carrito') {
          setCarritoOpen(true)
          return
        }
        if (!user && SECCIONES_PROTEGIDAS.includes(s)) {
          setLoginOpen(true)
          return
        }
        if (s === 'home' && socioData) {
          // Si está en marketplace de un socio y pulsa Inicio → Home global
          try { sessionStorage.removeItem('pidoo_socio_id') } catch (_) {}
          navigate('/app')
          return
        }
        setSeccion(s)
        setRestOpen(null)
        if (s === 'notificaciones') setNotifsNoLeidas(0)
      }} />

      {loginOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(15,15,15,0.55)', backdropFilter: 'blur(6px)',
          overflowY: 'auto', animation: 'fadeIn 0.25s ease',
        }}>
          <button
            onClick={() => setLoginOpen(false)}
            aria-label="Cerrar"
            style={{
              position: 'fixed', top: 'calc(12px + env(safe-area-inset-top, 0px))', right: 14, zIndex: 310,
              width: 36, height: 36, borderRadius: 999,
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid #E8E6E0',
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

export default function AppShell({ socioData = null, restaurantesFilter = null }) {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent socioData={socioData} restaurantesFilter={restaurantesFilter} />
      </CartProvider>
    </AuthProvider>
  )
}

const shellStyle = {
  '--c-primary': '#FF6B2C',
  '--c-primary-light': 'rgba(255,107,44,0.10)',
  '--c-primary-soft': 'rgba(255,107,44,0.18)',
  '--c-bg': '#FAFAF7',
  '--c-surface': '#FFFFFF',
  '--c-surface2': '#F4F2EC',
  '--c-border': '#E8E6E0',
  '--c-text': '#1F1F1E',
  '--c-muted': '#6B6B68',
  '--c-glass': 'rgba(255,255,255,0.7)',
  '--c-glass-border': 'rgba(0,0,0,0.06)',
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
body{background:#FAFAF7;color:#1F1F1E;margin:0}
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
