import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * Callback unico para OAuth (Google y futuros providers).
 *
 * Flujo:
 *   1. supabase.auth.signInWithOAuth({ redirectTo: 'https://pidoo.es/auth/callback?next=/s/<slug>' })
 *   2. Google -> Supabase intercambia el code -> redirige aqui con la sesion ya creada
 *   3. Este componente lee ?next= y hace navigate(next)
 *
 * Una sola URL en la whitelist de Supabase, infinitos socios/destinos.
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState(null)
  const [next, setNext] = useState('/')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const hashParams = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : '')

    // 'next' puede venir en query (preferido) o en hash (fallback si OAuth lo movio)
    let nextParam = params.get('next') || hashParams.get('next') || '/'
    // Sanity: solo permitir paths internos (empieza con / pero no // para evitar open redirect)
    if (!nextParam.startsWith('/') || nextParam.startsWith('//')) nextParam = '/'
    setNext(nextParam)

    let cancelled = false
    let timeoutId = null

    const finish = (path) => {
      if (cancelled) return
      navigate(path, { replace: true })
    }

    const checkSession = async () => {
      try {
        // Si Supabase devolvio ?code= en query (PKCE), intercambiar por sesion
        const code = params.get('code')
        if (code) {
          try {
            await supabase.auth.exchangeCodeForSession(window.location.href)
          } catch (e) {
            console.error('[AuthCallback] exchangeCodeForSession', e)
          }
        }

        // Si Supabase devolvio el token en el hash (#access_token=...&refresh_token=...)
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        if (accessToken && refreshToken) {
          try {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          } catch (e) {
            console.error('[AuthCallback] setSession', e)
          }
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (session) return finish(nextParam)

        // Esperar onAuthStateChange por si aun no se ha procesado
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, sess) => {
          if (sess) {
            try { subscription.unsubscribe() } catch (_) {}
            finish(nextParam)
          }
        })

        // Si tras 5s no hay sesion, mostrar error
        timeoutId = setTimeout(() => {
          if (cancelled) return
          try { subscription.unsubscribe() } catch (_) {}
          setError('No pudimos completar el inicio de sesion. Intenta de nuevo.')
        }, 5000)
      } catch (e) {
        console.error('[AuthCallback]', e)
        if (!cancelled) setError(e.message || 'Error al iniciar sesion')
      }
    }

    checkSession()

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [location, navigate])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F3EC',
      color: '#1A1815',
      fontFamily: "'Plus Jakarta Sans','DM Sans',sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 32, textAlign: 'center',
    }}>
      {error ? (
        <>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Inicio de sesion fallido</div>
          <p style={{ fontSize: 13, color: '#6B6356', maxWidth: 320, lineHeight: 1.5, marginBottom: 24 }}>
            {error}
          </p>
          <button
            onClick={() => navigate(next, { replace: true })}
            style={{
              padding: '14px 32px', borderRadius: 14, border: 'none',
              background: '#C5562C', color: '#fff', fontSize: 15, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Volver
          </button>
        </>
      ) : (
        <>
          <div style={{
            width: 36, height: 36, borderRadius: 18,
            border: '3px solid rgba(255,107,44,0.18)',
            borderTopColor: '#C5562C',
            animation: 'spin 0.8s linear infinite',
            marginBottom: 16,
          }} />
          <div style={{ fontSize: 14, color: '#6B6356', fontWeight: 600 }}>
            Iniciando sesion...
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </>
      )}
    </div>
  )
}
