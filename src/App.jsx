import { useState, useEffect, lazy, Suspense, Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { supabase } from './lib/supabase'
import AppShell from './AppShell'
import Landing from './pages/Landing'

// Lazy-loaded routes
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const PaginaLegal = lazy(() => import('./pages/PaginaLegal'))
const EliminarCuenta = lazy(() => import('./pages/EliminarCuenta'))
const TiendaPublicaRoute = lazy(() => import('./pages/TiendaPublicaRoute'))
const TiendaSocio = lazy(() => import('./pages/TiendaSocio'))

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
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#FAFAF7', color: '#1F1F1E', fontFamily: "'DM Sans', sans-serif", padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😵</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Algo salio mal</div>
          <p style={{ fontSize: 13, color: '#6B6B68', marginBottom: 24, maxWidth: 300, lineHeight: 1.5 }}>
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
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#FAFAF7',
    color: '#6B6B68',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
  }}>
    Cargando...
  </div>
)

function EmailConfirmadoScreen({ onClose }) {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF7',
      color: '#1F1F1E',
      fontFamily: "'DM Sans', sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32,
    }}>
      <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#1F1F1E', marginBottom: 8, textAlign: 'center' }}>
        Cuenta confirmada
      </div>
      <p style={{ fontSize: 14, color: '#6B6B68', marginBottom: 32, textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
        Tu cuenta ha sido verificada correctamente. Ya puedes iniciar sesion en pidoo.
      </p>
      <button onClick={() => { onClose(); window.location.hash = ''; navigate('/app') }} style={{
        display: 'inline-block', padding: '16px 40px', borderRadius: 14, border: 'none',
        background: '#FF6B2C', color: '#fff', fontSize: 16, fontWeight: 800,
        cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
      }}>
        Iniciar sesion
      </button>
      <button onClick={() => { onClose(); window.location.hash = '' }} style={{
        marginTop: 16, background: 'none', border: 'none', color: '#6B6B68',
        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        Continuar en la web
      </button>
    </div>
  )
}

function NativeBootstrap() {
  // Inicialización Capacitor (StatusBar, deeplinks OAuth, app updates).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    // Aplicar StatusBar en cada foreground: tras OAuth (Safari/Google) iOS
    // resetea la config de StatusBar y el webview queda desalineado hasta
    // que relanzas la app. Reaplicando aquí arreglamos el descuadre.
    const applyStatusBar = async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false })
        await StatusBar.setBackgroundColor({ color: '#FAFAF7' })
        await StatusBar.setStyle({ style: Style.Light })
      } catch (_) {}
    }
    applyStatusBar()

    const appStateHandle = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) applyStatusBar()
    })

    // Capturar deep link de OAuth callback
    const listenerHandle = CapApp.addListener('appUrlOpen', async ({ url }) => {
      try {
        try {
          const { Browser } = await import('@capacitor/browser')
          await Browser.close()
        } catch (_) {}

        const parsed = new URL(url)
        const hashStr = parsed.hash ? parsed.hash.substring(1) : ''
        const queryStr = parsed.search ? parsed.search.substring(1) : ''
        const params = new URLSearchParams(hashStr || queryStr)

        const code = params.get('code')
        if (code) {
          await supabase.auth.exchangeCodeForSession(code)
          await applyStatusBar()
          return
        }

        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token })
        }
        await applyStatusBar()
      } catch (err) {
        console.error('Error procesando deep link OAuth:', err)
        applyStatusBar()
      }
    })

    // Chequear actualizaciones de Play Store al abrir la app
    import('@capawesome/capacitor-app-update').then(({ AppUpdate }) => {
      AppUpdate.getAppUpdateInfo().then(info => {
        if (info.updateAvailability === 2) {
          AppUpdate.performImmediateUpdate().catch(() => {
            AppUpdate.startFlexibleUpdate().catch(() => {})
          })
        }
      }).catch(() => {})
    })

    return () => {
      try {
        if (appStateHandle && typeof appStateHandle.then === 'function') {
          appStateHandle.then(h => h?.remove?.())
        } else {
          appStateHandle?.remove?.()
        }
      } catch (_) {}
      try {
        if (listenerHandle && typeof listenerHandle.then === 'function') {
          listenerHandle.then(h => h?.remove?.())
        } else {
          listenerHandle?.remove?.()
        }
      } catch (_) {}
    }
  }, [])
  return null
}

function AppRoutes() {
  const [emailConfirmado, setEmailConfirmado] = useState(false)

  // Detectar confirmación de email desde Supabase (hash con type=signup)
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('type=signup') && !Capacitor.isNativePlatform()) {
      setEmailConfirmado(true)
    }
  }, [])

  if (emailConfirmado) {
    return <EmailConfirmadoScreen onClose={() => setEmailConfirmado(false)} />
  }

  return (
    <Suspense fallback={SuspenseFallback}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app/*" element={<AppShell />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terminos" element={<PaginaLegal slug="terminos" onBack={() => window.history.back()} />} />
        <Route path="/privacidad" element={<PaginaLegal slug="privacidad" onBack={() => window.history.back()} />} />
        <Route path="/eliminar-cuenta" element={<EliminarCuenta />} />
        <Route path="/s/:slug" element={<TiendaSocio />} />
        <Route path="/:slug" element={<TiendaPublicaRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <NativeBootstrap />
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
