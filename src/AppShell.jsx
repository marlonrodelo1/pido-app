import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { slugDeRutaApp } from './lib/deepLinks'
import { COLS_ESTABLECIMIENTO } from './lib/estColumns'
import { Bell, Share2, CircleUser, X } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider, useCart } from './context/CartContext'
import Login from './pages/Login'
import SplashPidoo from './components/SplashPidoo'
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

const SuspenseFallback = (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
    <div style={{ color: '#6B6356', fontSize: 13 }}>Cargando...</div>
  </div>
)

// El restaurante que llega por deep link tiene que traer EXACTAMENTE la misma
// forma que el que llega por `onOpenRest`. Ver lib/estColumns.js.
const COLS_REST_DEEP_LINK = COLS_ESTABLECIMIENTO

function AppContent({ socioData = null, restaurantesFilter = null, restaurantesFlags = null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading } = useAuth()
  const [onboarded, setOnboarded] = useState(() => !!localStorage.getItem('pido_onboarded'))
  // Splash del marketplace del socio: se muestra al abrir su tienda (haya o no
  // onboarding previo), unos segundos, con su branding. En la app general = false.
  const [socioSplash, setSocioSplash] = useState(() => !!socioData)
  const [categoriaPadre, setCategoriaPadre] = useState(() => localStorage.getItem('pido_categoria') || null)
  const [seccion, setSeccion] = useState('home')
  const [restOpen, setRestOpen] = useState(null)
  const [pedidoActivo, setPedidoActivo] = useState(null)
  const [notifsNoLeidas, setNotifsNoLeidas] = useState(0)
  const [carritoOpen, setCarritoOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [perfilSubInicial, setPerfilSubInicial] = useState(null)
  const { totalItems, setOrigenPedido } = useCart()
  // Scroll de la Home antes de abrir un restaurante (ver abrirRest/cerrarRest).
  // Debe declararse aquí, ANTES de los return tempranos (reglas de hooks).
  const scrollHomePrevio = useRef(0)

  // Si NO estamos en el marketplace de un socio (socioData null = /app general),
  // limpiar el contexto socio para que los pedidos NO se etiqueten como del
  // marketplace de un socio (evita el "leak" de pidoo_socio_id de una visita previa).
  useEffect(() => {
    if (!socioData) {
      try { sessionStorage.removeItem('pidoo_socio_id'); sessionStorage.removeItem('pidoo_socio_slug') } catch (_) {}
      // Mismo leak con el canal de venta: 'tienda_publica' persiste en localStorage
      // si el usuario cerró la pestaña dentro de una tienda (el cleanup de unmount
      // no llega a ejecutarse) y contaminaba comisión y tarifa de envío de los
      // pedidos hechos después desde la app general.
      setOrigenPedido('pido')
    }
  }, [socioData])

  const SECCIONES_PROTEGIDAS = ['favoritos', 'pedidos', 'notificaciones', 'perfil']

  useEffect(() => {
    if (user && loginOpen) setLoginOpen(false)
  }, [user, loginOpen])

  // Badge de notificaciones sin leer.
  //
  // Antes esto solo escuchaba INSERT y hacía `prev + 1`: sabía SUMAR pero no
  // restar. Al marcar una leída el contador se quedaba clavado hasta recargar la
  // app entera, así que el cliente leía sus notificaciones y seguía viendo el
  // mismo número encima de la campana. Ahora escucha cualquier cambio (`*`) y
  // vuelve a CONTAR contra la base de datos en vez de llevar la cuenta a mano:
  // así el número no puede desviarse de la realidad, venga el cambio de donde
  // venga (otra pestaña, otro dispositivo, o la propia pantalla de avisos).
  useEffect(() => {
    if (!user) { setNotifsNoLeidas(0); return }
    let vivo = true
    const contar = () => supabase
      .from('notificaciones').select('id', { count: 'exact', head: true })
      .eq('usuario_id', user.id).eq('leida', false)
      .then(({ count }) => { if (vivo) setNotifsNoLeidas(count || 0) })
    contar()
    const ch = supabase.channel('notifs-badge-' + user.id)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${user.id}` },
        contar)
      .subscribe()
    return () => { vivo = false; supabase.removeChannel(ch) }
  }, [user?.id])

  // ── Deep link /app/r/<slug> → abrir ESE restaurante dentro del shell ────
  // Es el destino de la página puente /abrir/<slug> y del esquema
  // com.pidoo.app://r/<slug>. Sin esta ruta no hay deep link posible: dentro
  // del shell el restaurante abierto es ESTADO (restOpen), no una URL.
  //
  // Se resuelve igual que TiendaPublicaRoute (por slug + estado 'activo'). Un
  // restaurante CERRADO (activo=false) sí se abre a propósito: su ficha ya
  // pinta el cartel de cerrado y bloquea el pedido, y mandar el QR de un
  // flyer a la home genérica es peor.
  useEffect(() => {
    // En la tienda de un socio (/s/<slug>) esta ruta no existe; además su
    // catálogo está filtrado y abrir por slug se lo saltaría.
    if (socioData) return
    const slug = slugDeRutaApp(location.pathname)
    if (!slug) return

    let cancelado = false
    supabase.from('establecimientos').select(COLS_REST_DEEP_LINK)
      .eq('slug', slug).eq('estado', 'activo').maybeSingle()
      .then(({ data }) => {
        if (cancelado) return
        if (data) { setRestOpen(data); setSeccion('home') }
        // La URL se CONSUME. El shell navega por estado, así que si se dejara
        // puesta: (a) al cerrar la ficha la URL seguiría diciendo /app/r/x, y
        // (b) el segundo toque del MISMO enlace no haría nada, porque el
        // guard de App.jsx compara con la ruta actual y la vería igual.
        // Si no se encontró, esto es además el "a la home" del enlace roto.
        navigate('/app', { replace: true })
      })
      // Si la consulta se cae por red, a la home igual: dejar la URL puesta
      // la volvería a intentar en cada render y el usuario se quedaría con
      // una URL que miente.
      .catch(() => { if (!cancelado) navigate('/app', { replace: true }) })
    return () => { cancelado = true }
  }, [location.pathname, socioData])

  if (loading) {
    return <div style={{ ...shellStyle, minHeight: '100vh' }} />
  }

  // Tienda de un socio (white-label): splash breve con SU branding y sin selector de
  // categorías; auto-entra a la tienda tras unos segundos. Prevalece sobre el
  // onboarding general (que solo aplica en la app Pidoo sin socio).
  if (socioData && socioSplash) {
    return (
      <div style={shellStyle}>
        <style>{globalCss}</style>
        <Suspense fallback={SuspenseFallback}>
          <Onboarding socioData={socioData} onComplete={() => {
            setCategoriaPadre('comida'); setOnboarded(true); setSocioSplash(false)
            localStorage.setItem('pido_onboarded', '1'); localStorage.setItem('pido_categoria', 'comida')
          }} />
        </Suspense>
      </div>
    )
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

  // El scroll de la Home hay que capturarlo AQUÍ, antes de desmontar la vista:
  // cuando RestDetalle monta (cargando, página corta) el navegador ya ha
  // recortado body.scrollTop y se pierde la posición real.
  function abrirRest(r) {
    scrollHomePrevio.current = Math.max(window.scrollY, document.body.scrollTop)
    setRestOpen(r); setSeccion('home')
  }
  // Lo llaman el banner de la Home y la ficha del restaurante. Una sola función
  // para que las dos puertas se comporten igual: sin sesión no hay premios que
  // enseñar, y además `crear_participacion_creador` rechaza al invitado con
  // PD142, así que iniciar sesión es el paso que hay que dar de todos modos.
  function abrirCreadores() {
    if (!user) { setLoginOpen(true); return }
    setPerfilSubInicial('creadores'); setSeccion('perfil'); setRestOpen(null)
  }
  function cerrarRest() {
    setRestOpen(null)
    const objetivo = scrollHomePrevio.current
    if (objetivo <= 0) return
    // La Home recarga datos async: reintenta hasta que la altura alcance (~1,2s máx)
    const restaurar = (intento = 0) => {
      window.scrollTo(0, objetivo)
      document.body.scrollTop = objetivo
      const actual = Math.max(window.scrollY, document.body.scrollTop)
      if (actual + 5 < objetivo && intento < 8) setTimeout(() => restaurar(intento + 1), 150)
    }
    setTimeout(restaurar, 0)
  }
  function handlePedidoCreado(pedido) { setPedidoActivo(pedido); setSeccion('tracking') }
  function handleTrack(pedido) { setPedidoActivo(pedido); setSeccion('tracking') }
  function handleTrackingClose() { setPedidoActivo(null); setSeccion('home') }

  const catEmoji = categoriaPadre === 'comida' ? '🍕' : categoriaPadre === 'farmacia' ? '💊' : '🛒'
  const catLabel = categoriaPadre === 'comida' ? 'Comida' : categoriaPadre === 'farmacia' ? 'Farmacia' : 'Market'

  return (
    <div style={{ ...shellStyle, minHeight: '100vh', position: 'relative', paddingBottom: 'calc(64px + 20px + env(safe-area-inset-bottom, 0px))' }}>
      <style>{globalCss}</style>

      {/* El fondo del header cruza toda la pantalla (es una barra), pero su
          contenido se centra con .shell-max: sin esto, en escritorio el botón
          de categoría y los iconos de la derecha quedan pegados a las esquinas
          con 1800px de vacío en medio. */}
      <div style={{
        background: 'rgba(250,250,247,0.85)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        borderBottom: '1px solid var(--c-border)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
      <div className="shell-max shell-head" style={{
        padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {socioData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {socioData.logo_url && (
                <img src={socioData.logo_url} alt={socioData.nombre_comercial || ''}
                  style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--c-border)', flexShrink: 0 }} />
              )}
              {socioData.nombre_comercial && (
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--c-text)', letterSpacing: '-0.01em' }}>{socioData.nombre_comercial}</span>
              )}
            </div>
          )}
          {!socioData && (
            <button onClick={() => setOnboarded(false)} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
              borderRadius: 8, border: '1px solid var(--c-border)', background: 'var(--c-surface2)',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--c-text)',
            }}>
              {catEmoji} {catLabel}
              <span style={{ fontSize: 8, marginLeft: 2, color: 'var(--c-muted)' }}>▼</span>
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {pedidoActivo && !['cancelado', 'fallido', 'entregado'].includes(pedidoActivo.estado) && (
            <button onClick={() => setSeccion('tracking')} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
              borderRadius: 10, border: 'none', background: '#DCFCE7',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#166534',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: '#8B9D7A', animation: 'pulse 1.5s infinite' }} />
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
            const socioSlug = socioData?.slug
            const socioNombre = socioData?.nombre_comercial
            const shareData = socioSlug
              ? {
                  title: `${socioNombre || 'Pidoo'} · Pidoo`,
                  text: `Mira la tienda de ${socioNombre || 'este socio'} en Pidoo`,
                  url: `https://pidoo.es/s/${socioSlug}`,
                }
              : {
                  title: 'Pidoo',
                  text: 'Descárgate pidoo 🍕 Tus restaurantes, locales y farmacias a domicilio. 100% canario 🌴',
                  url: 'https://pidoo.es/descargar',
                }
            if (navigator.share) { try { await navigator.share(shareData) } catch (_) {} }
            else { try { await navigator.clipboard.writeText(shareData.url) } catch (_) {} }
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
      </div>

      <div className="tablet-pad shell-max" style={{ padding: 20, animation: 'fadeIn 0.3s ease' }}>
        <Suspense fallback={SuspenseFallback}>
          {seccion === 'tracking' && pedidoActivo
            ? <Tracking pedido={pedidoActivo} onClose={handleTrackingClose} />
            : restOpen && seccion === 'home'
            ? <RestDetalle establecimiento={restOpen} onBack={cerrarRest} onRequireLogin={() => setLoginOpen(true)} onOpenCreadores={abrirCreadores} socioData={socioData} />
            : seccion === 'home'
            ? <Home onOpenRest={abrirRest} categoriaPadre={categoriaPadre} onOpenDirecciones={() => {
                if (!user) { setLoginOpen(true); return }
                setPerfilSubInicial('direcciones'); setSeccion('perfil'); setRestOpen(null)
              }} onOpenCreadores={abrirCreadores} socioData={socioData} restaurantesFilter={restaurantesFilter} restaurantesFlags={restaurantesFlags} />
            : seccion === 'favoritos'
            ? <Favoritos onOpenRest={abrirRest} />
            : seccion === 'mapa'
            ? <Mapa onOpenRest={abrirRest} restaurantesFilter={restaurantesFilter} />
            : seccion === 'pedidos'
            ? <MisPedidos onTrack={handleTrack} />
            : seccion === 'notificaciones'
            ? <Notificaciones />
            : seccion === 'perfil'
            ? <Perfil initialSub={perfilSubInicial} onInitialSubConsumed={() => setPerfilSubInicial(null)} />
            : null
          }
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <Carrito onPedidoCreado={handlePedidoCreado} open={carritoOpen} setOpen={setCarritoOpen} onRequireLogin={() => setLoginOpen(true)} socioData={socioData} />
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
          // Si está en marketplace de un socio y pulsa Inicio → home del socio (cierra ficha de restaurante abierta)
          setSeccion('home')
          setRestOpen(null)
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
          <div className="login-shell">
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
          <Login dark nextPath={socioData?.slug ? `/s/${socioData.slug}` : null} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function AppShell({ socioData = null, restaurantesFilter = null, restaurantesFlags = null }) {
  return (
    <AuthProvider>
      <CartProvider>
        {/* El logo que se dibuja solo. Va SOLO en el shell de la app, no en la
            landing ni en la tienda pública: ahí el visitante viene de un enlace
            y meterle una animación de tres segundos por delante es perder la
            visita. */}
        <SplashPidoo />
        <AppContent socioData={socioData} restaurantesFilter={restaurantesFilter} restaurantesFlags={restaurantesFlags} />
      </CartProvider>
    </AuthProvider>
  )
}

const shellStyle = {
  '--c-primary': '#C5562C',
  '--c-primary-light': 'rgba(255,107,44,0.10)',
  '--c-primary-soft': 'rgba(255,107,44,0.18)',
  '--c-bg': '#F7F3EC',
  '--c-surface': '#FFFFFF',
  '--c-surface2': '#EFE9DD',
  '--c-border': '#E8E1D3',
  '--c-text': '#1A1815',
  '--c-muted': '#6B6356',
  '--c-glass': 'rgba(255,255,255,0.7)',
  '--c-glass-border': 'rgba(0,0,0,0.06)',
  fontFamily: "'DM Sans', sans-serif",
  margin: '0 auto',
  background: 'var(--c-bg)',
  color: 'var(--c-text)',
}

const globalCss = `
@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
*{box-sizing:border-box;margin:0;padding:0}
::-webkit-scrollbar{display:none}
body{background:#F7F3EC;color:#1A1815;margin:0}
input::placeholder,textarea::placeholder{color:rgba(107,99,86,0.75);opacity:1}
input::-webkit-input-placeholder,textarea::-webkit-input-placeholder{color:rgba(107,99,86,0.75);opacity:1}
@media(min-width:768px){
  .tablet-grid{display:grid!important;grid-template-columns:repeat(2,1fr)!important;gap:14px!important}
  .tablet-grid>*{margin-bottom:0!important}
  .tablet-pad{padding:24px 32px!important}
  .tablet-slider-card{min-width:280px!important}
  .bottom-nav-wrap{max-width:560px!important}
  .modal-sheet{max-width:560px!important}
  .login-form{max-width:400px!important}
  .legal-content{max-width:700px!important}
  /* Tope de ancho del shell. shellStyle ya traía margin:'0 auto', pero sin
     max-width centrar es un no-op: el contenido se estiraba hasta la ventana
     (a 1920px el buscador medía 1730px). 1380 = el mismo ancho que usa
     TiendaDesktop.jsx:856 para la tienda pública, para que escritorio hable
     un solo idioma. Vive DENTRO de la media query: por debajo de 768px —la
     app de las stores— no existe y el render es idéntico al de siempre. */
  .shell-max{max-width:1380px;margin-left:auto;margin-right:auto}
  /* Los bloques de una sola línea (dirección, buscador) no deben estirarse a
     1380: un input de 1380px no se lee, se sufre. */
  .shell-narrow{max-width:640px}
  /* El header sticky va a sangre (su fondo cruza toda la pantalla) pero su
     CONTENIDO se alinea con el del .tablet-pad, o el botón de categoría queda
     desalineado con el contenido de abajo. */
  .shell-head{padding-left:32px!important;padding-right:32px!important}
  /* Carruseles horizontales (Destacados, Ofertas): en móvil se arrastran con
     el dedo y funcionan; en escritorio no hay dedo ni flechas, así que las
     tarjetas de la derecha quedaban cortadas y sin forma de llegar a ellas.
     A partir de 768px pasan a rejilla. auto-FILL (no auto-fit) a propósito:
     con 5 destacados y sitio para 4, el quinto ocupa UNA columna en la fila
     siguiente en vez de estirarse a todo el ancho. */
  .shell-carrusel{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))!important;gap:20px!important;overflow-x:visible!important}
  .shell-carrusel>*{min-width:0!important}
  /* Fila de categorías: mismo problema, pero aquí basta con que baje de línea. */
  .shell-wrap{flex-wrap:wrap!important;overflow-x:visible!important}
  /* Contenido de lectura y gestión (notificaciones, pedidos, perfil): NO se
     reparte en columnas, se limita a un ancho legible. Una fila de 1380px con
     el título a la izquierda y el dato a la derecha no se lee de un vistazo. */
  .shell-lista{max-width:760px}
  /* La carta del restaurante: filas foto+nombre+precio. Se reparten en columnas
     de mínimo 380px para que la descripción siga cabiendo (con .tablet-grid a
     4 columnas quedarían en 310px y el texto se rompería). */
  .shell-carta{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(380px,1fr))!important;gap:12px!important}
  .shell-carta>*{margin-bottom:0!important}
  /* Modales. En móvil son bottom-sheets: suben desde abajo, esquinas de arriba
     redondeadas, pegados al filo inferior — el gesto que espera un pulgar. En
     escritorio no hay pulgar: una tira soldada al borde de abajo con 750px de
     oscuridad a cada lado es un accidente, no un diseño. A partir de 768px se
     centran y se cierran por los cuatro lados. El override de la animación es
     obligatorio: el slideUp inline entra desde abajo y descuadra un modal ya
     centrado. Cubre el carrito, el modal de extras y el de borrar cuenta. */
  .modal-overlay{align-items:center!important}
  .modal-sheet{border-radius:20px!important;max-height:86vh!important;animation:fadeIn .2s ease!important}
  /* El mapa: su calc(100vh - 160px) descuenta 160px de cromo cuando en
     escritorio hay 236. Sobraba pantalla en blanco y la barra flotante tapaba
     el borde de abajo del lienzo. El valor de móvil está calibrado a mano
     contra el WebView y no se toca. */
  .mapa-canvas{height:calc(100vh - 236px)!important}
}
@media(min-width:1024px){
  .tablet-grid{grid-template-columns:repeat(3,1fr)!important}
  .tablet-pad{padding:28px 48px!important}
  .shell-head{padding-left:48px!important;padding-right:48px!important}
  .bottom-nav-wrap{max-width:650px!important}
  .modal-sheet{max-width:650px!important}
  .login-form{max-width:440px!important}
  .legal-content{max-width:900px!important}
  .mapa-canvas{height:calc(100vh - 244px)!important}
  /* Login: el formulario mide 340px y la X estaba fija contra la esquina de la
     PANTALLA, o sea a ~790px del cuadro que cierra. Deja de leerse como parte
     del diálogo. Aquí se ancla al propio formulario. */
  .login-shell{max-width:460px;margin:0 auto;min-height:100vh;display:flex;align-items:center;position:relative}
  .login-shell>button{position:absolute!important;top:24px!important;right:0!important}
}
@media(min-width:1500px){
  .tablet-grid{grid-template-columns:repeat(4,1fr)!important}
}
@media(max-width:359px){
  .small-text{font-size:11px!important}
  .small-heading{font-size:20px!important}
}
@media(orientation:landscape) and (max-height:500px){
  .banner-responsive{height:100px!important}
}
`
