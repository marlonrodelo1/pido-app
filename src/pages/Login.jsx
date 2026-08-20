import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Capacitor } from '@capacitor/core'
import { Mail, Lock, User, Phone, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import LogoAnimado from '../components/LogoAnimado'
import { loginApple, appleDisponible, esCancelacionApple } from '../lib/appleAuth'

export default function Login({ nextPath = null, dark = false }) {
  const { login, registro, resetPassword, authError, setAuthError } = useAuth()
  const [modo, setModo] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resetEnviado, setResetEnviado] = useState(false)
  const [errores, setErrores] = useState({})
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [registroExitoso, setRegistroExitoso] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [blockedUntil, setBlockedUntil] = useState(null)
  const [appleLoading, setAppleLoading] = useState(false)
  const lastSubmit = useRef(0)

  // Sign in with Apple: SOLO en iOS, donde el flujo es nativo (hoja del sistema).
  // Es lo que exige el guideline 4.8 para poder seguir ofreciendo Google, y lo
  // que costó el rechazo de la 1.47 (22) el 20 ago 2026. En web y Android no se
  // pinta: allí Apple no es obligatorio y el flujo web necesitaría un Services
  // ID que este proyecto no tiene configurado.
  const mostrarApple = appleDisponible()

  // Colores de los textos "flotantes" (sin fondo propio) según el glaseado del modal:
  // AppShell usa overlay OSCURO (dark=true) → texto claro; TiendaPublica usa overlay
  // claro (dark=false) → texto oscuro como estaba. Los inputs/tabs tienen fondo propio.
  const titleColor = dark ? '#FFFFFF' : 'var(--c-text)'
  const subColor = dark ? 'rgba(255,255,255,0.90)' : 'var(--c-muted)'
  const hintColor = dark ? 'rgba(255,255,255,0.72)' : '#767575'
  const termsColor = dark ? 'rgba(255,255,255,0.85)' : 'var(--c-muted)'
  const sepColor = dark ? 'rgba(255,255,255,0.60)' : '#767575'
  const dividerColor = dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.05)'

  function validar() {
    const e = {}
    if (!email.trim()) e.email = 'El email es obligatorio'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email no válido'
    if (modo !== 'reset') {
      if (!password) e.password = 'La contraseña es obligatoria'
      else if (modo === 'registro' && !/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) e.password = 'Mínimo 8 caracteres, 1 mayúscula y 1 número'
      else if (modo === 'login' && password.length < 6) e.password = 'Mínimo 6 caracteres'
    }
    if (modo === 'registro') {
      if (!nombre.trim()) e.nombre = 'El nombre es obligatorio'
      if (telefono && !/^\+?\d{7,15}$/.test(telefono.replace(/\s/g, ''))) e.telefono = 'Teléfono no válido'
      if (!aceptaTerminos) e.terminos = 'Debes aceptar los términos y condiciones'
    }
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (loading) return
    if (blockedUntil && Date.now() < blockedUntil) return
    const now = Date.now()
    if (now - lastSubmit.current < 5000) return
    lastSubmit.current = now
    if (!validar()) return
    setError(null)
    if (setAuthError) setAuthError(null)
    setLoading(true)
    try {
      if (modo === 'reset') { await resetPassword(email); setResetEnviado(true) }
      else if (modo === 'login') { await login(email, password); setFailedAttempts(0) }
      else { await registro(email, password, nombre.trim(), telefono.replace(/\s/g, '')); setRegistroExitoso(true) }
    } catch (err) {
      setError(err.message)
      if (modo === 'login') {
        const next = failedAttempts + 1
        if (next >= 5) { setBlockedUntil(Date.now() + 60000); setFailedAttempts(0) }
        else setFailedAttempts(next)
      }
    } finally { setLoading(false) }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit() }

  // Apple abre la hoja NATIVA del sistema y resuelve la sesión sin salir de la
  // app: no hay redirect ni deep link que esperar, así que al volver ya hay
  // sesión y el AuthContext repinta solo.
  const handleApple = async () => {
    if (appleLoading || loading) return
    setError(null)
    if (setAuthError) setAuthError(null)
    setAppleLoading(true)
    try {
      await loginApple()
    } catch (err) {
      // Cerrar la hoja de Apple no es un fallo que pintar en rojo.
      if (!esCancelacionApple(err)) setError('Error al conectar con Apple: ' + (err?.message || 'inténtalo de nuevo'))
    } finally {
      setAppleLoading(false)
    }
  }

  const inputWrap = { position: 'relative', marginBottom: 14 }
  const iconStyle = { position: 'absolute', left: 14, top: 14, color: '#767575' }
  const inputStyle = {
    width: '100%', padding: '14px 16px 14px 44px', borderRadius: 14,
    border: '1px solid transparent', fontSize: 14, fontFamily: 'inherit',
    background: '#EFE9DD', color: 'var(--c-text)', outline: 'none',
    boxSizing: 'border-box', transition: 'border 0.2s',
  }
  const inputFocus = { borderColor: 'var(--c-primary)' }
  const inputError = { ...inputStyle, borderColor: '#EF4444' }
  const errorTextStyle = { color: '#EF4444', fontSize: 11, marginTop: 3, marginLeft: 4 }

  /* ── Pantalla confirmación email ── */
  if (registroExitoso) {
    return (
      <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', justifyContent: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: titleColor, marginBottom: 8, textAlign: 'center', letterSpacing: '-0.02em' }}>
          Confirma tu correo
        </div>
        <p style={{ fontSize: 13, color: subColor, marginBottom: 28, textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
          Enviamos un enlace de confirmación a <strong style={{ color: titleColor }}>{email}</strong>. Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
        </p>
        <button onClick={() => { setModo('login'); setRegistroExitoso(false); setError(null); setErrores({}) }} style={{
          padding: '14px 32px', borderRadius: 10, border: 'none',
          background: 'var(--c-btn-gradient)', color: '#fff',
          fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Ir a iniciar sesión
        </button>
      </div>
    )
  }

  /* ── Pantalla reset enviado ── */
  if (modo === 'reset' && resetEnviado) {
    return (
      <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', justifyContent: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📩</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: titleColor, marginBottom: 8, textAlign: 'center', letterSpacing: '-0.02em' }}>
          Revisa tu email
        </div>
        <p style={{ fontSize: 13, color: subColor, marginBottom: 28, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
          Enviamos un enlace a <strong style={{ color: titleColor }}>{email}</strong> para restablecer tu contraseña
        </p>
        <button onClick={() => { setModo('login'); setResetEnviado(false); setError(null); setErrores({}) }} style={{
          padding: '14px 32px', borderRadius: 10, border: 'none',
          background: 'var(--c-btn-gradient)', color: '#fff',
          fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          Volver al inicio de sesión
        </button>
      </div>
    )
  }

  /* ── Login / Registro principal ── */
  return (
    <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', justifyContent: 'center' }}>
      {/* Logo animado (ocupa en layout lo mismo que ocupaba el PNG de 170 px) */}
      <LogoAnimado ancho={170} style={{ marginBottom: 12 }} />
      <p style={{ fontSize: 13, color: subColor, marginBottom: 36, textAlign: 'center' }}>
        {modo === 'reset' ? 'Introduce tu email para recuperar tu contraseña' : 'Tu comida favorita, al alcance de un toque'}
      </p>

      <div style={{ width: '100%', maxWidth: 340 }}>
        {/* Tab switcher */}
        {modo !== 'reset' ? (
          <div style={{ display: 'flex', background: '#EFEDE6', borderRadius: 14, padding: 3, marginBottom: 24 }}>
            {['login', 'registro'].map(m => (
              <button key={m} onClick={() => { setModo(m); setError(null); setErrores({}) }} style={{
                flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
                background: modo === m ? 'var(--c-btn-gradient)' : 'transparent',
                color: modo === m ? '#fff' : '#2B2823',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.2s ease',
              }}>
                {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>
        ) : (
          <button onClick={() => { setModo('login'); setError(null); setErrores({}) }} style={{
            display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
            color: 'var(--c-primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', marginBottom: 20, padding: 0,
          }}>
            <ArrowLeft size={16} strokeWidth={2.5} /> Volver
          </button>
        )}

        {/* Nombre (registro) */}
        {modo === 'registro' && (
          <div style={inputWrap}>
            <User size={16} strokeWidth={1.8} style={iconStyle} />
            <input placeholder="Nombre completo" value={nombre} onChange={e => setNombre(e.target.value)}
              onKeyDown={handleKeyDown} style={errores.nombre ? inputError : inputStyle}
              onFocus={e => { if (!errores.nombre) e.target.style.borderColor = 'var(--c-primary)' }}
              onBlur={e => { if (!errores.nombre) e.target.style.borderColor = 'transparent' }}
            />
            {errores.nombre && <div style={errorTextStyle}>{errores.nombre}</div>}
          </div>
        )}

        {/* Email */}
        <div style={inputWrap}>
          <Mail size={16} strokeWidth={1.8} style={iconStyle} />
          <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={handleKeyDown} style={errores.email ? inputError : inputStyle}
            onFocus={e => { if (!errores.email) e.target.style.borderColor = 'var(--c-primary)' }}
            onBlur={e => { if (!errores.email) e.target.style.borderColor = 'transparent' }}
          />
          {errores.email && <div style={errorTextStyle}>{errores.email}</div>}
        </div>

        {/* Contraseña */}
        {modo !== 'reset' && (
          <div style={inputWrap}>
            <Lock size={16} strokeWidth={1.8} style={iconStyle} />
            <input placeholder="Contraseña" type={showPassword ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown}
              style={errores.password ? inputError : inputStyle}
              onFocus={e => { if (!errores.password) e.target.style.borderColor = 'var(--c-primary)' }}
              onBlur={e => { if (!errores.password) e.target.style.borderColor = 'transparent' }}
            />
            <button onClick={() => setShowPassword(!showPassword)} style={{
              position: 'absolute', right: 12, top: 12, background: 'none', border: 'none',
              cursor: 'pointer', color: '#767575', padding: 4,
            }}>
              {showPassword ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
            </button>
            {errores.password && <div style={errorTextStyle}>{errores.password}</div>}
            {modo === 'registro' && !errores.password && (
              <div style={{ fontSize: 11, color: hintColor, marginTop: 4, marginLeft: 4 }}>
                Mínimo 8 caracteres · 1 mayúscula · 1 número
              </div>
            )}
          </div>
        )}

        {/* Teléfono (registro) */}
        {modo === 'registro' && (
          <div style={inputWrap}>
            <Phone size={16} strokeWidth={1.8} style={iconStyle} />
            <input placeholder="Teléfono (opcional)" value={telefono} onChange={e => setTelefono(e.target.value)}
              onKeyDown={handleKeyDown} style={errores.telefono ? inputError : inputStyle}
              onFocus={e => { if (!errores.telefono) e.target.style.borderColor = 'var(--c-primary)' }}
              onBlur={e => { if (!errores.telefono) e.target.style.borderColor = 'transparent' }}
            />
            {errores.telefono && <div style={errorTextStyle}>{errores.telefono}</div>}
          </div>
        )}

        {/* Errores */}
        {(error || authError) && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: 12,
            padding: '10px 14px', borderRadius: 14, marginBottom: 14,
            textAlign: 'center', fontWeight: 600, border: '1px solid rgba(239,68,68,0.15)',
          }}>
            {error || authError}
          </div>
        )}

        {blockedUntil && Date.now() < blockedUntil && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontSize: 12,
            padding: '10px 14px', borderRadius: 14, marginBottom: 14,
            textAlign: 'center', fontWeight: 600, border: '1px solid rgba(239,68,68,0.15)',
          }}>
            Demasiados intentos. Espera 60 segundos.
          </div>
        )}

        {/* CTA */}
        <button onClick={handleSubmit} disabled={loading || !!(blockedUntil && Date.now() < blockedUntil)} style={{
          width: '100%', padding: '16px 0', borderRadius: 12, border: 'none',
          background: (loading || (blockedUntil && Date.now() < blockedUntil)) ? 'rgba(197,86,44,0.45)' : 'var(--c-btn-gradient)',
          color: '#fff', fontSize: 15, fontWeight: 700,
          cursor: (loading || (blockedUntil && Date.now() < blockedUntil)) ? 'default' : 'pointer',
          fontFamily: 'inherit', marginTop: 4, letterSpacing: '0.01em',
        }}>
          {loading ? 'Cargando...' : modo === 'login' ? 'Entrar' : modo === 'registro' ? 'Crear cuenta' : 'Enviar enlace'}
        </button>

        {/* Separador + Google */}
        {modo !== 'reset' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: dividerColor }} />
              <span style={{ fontSize: 11, color: sepColor, fontWeight: 600 }}>o</span>
              <div style={{ flex: 1, height: 1, background: dividerColor }} />
            </div>

            {/* Apple va ANTES que Google a propósito: las HIG piden que el botón
                de Sign in with Apple no quede por debajo de otros botones
                sociales, y este login ya se llevó un rechazo por el 4.8. */}
            {mostrarApple && (
              <button onClick={handleApple} disabled={loading || appleLoading} style={{
                width: '100%', padding: '14px 0', borderRadius: 14,
                // Sobre el overlay oscuro del AppShell, el negro puro se funde
                // con el fondo: se le da un filo claro para despegarlo.
                border: dark ? '1px solid rgba(255,255,255,0.35)' : '1px solid #000000',
                background: '#000000', color: '#FFFFFF',
                fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                cursor: (loading || appleLoading) ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                opacity: (loading || appleLoading) ? 0.6 : 1,
                marginBottom: 10,
                boxShadow: '0 1px 2px rgba(15,15,15,0.04)',
              }}>
                <svg width="16" height="19" viewBox="0 0 17 20" fill="#FFFFFF" aria-hidden="true">
                  <path d="M14.5 15.2c-.26.6-.57 1.16-.93 1.67-.49.7-.89 1.18-1.2 1.45-.48.44-1 .67-1.55.68-.4 0-.88-.11-1.44-.34-.56-.23-1.08-.34-1.55-.34-.5 0-1.03.11-1.6.34-.57.23-1.03.35-1.38.36-.53.02-1.06-.22-1.59-.7-.34-.29-.75-.79-1.26-1.5-.54-.76-.98-1.63-1.33-2.63-.38-1.06-.56-2.1-.56-3.12 0-1.16.25-2.17.75-3 .4-.68.92-1.21 1.58-1.6.66-.39 1.37-.59 2.14-.6.42 0 .98.13 1.68.39.7.26 1.15.39 1.35.39.15 0 .65-.15 1.5-.46.8-.28 1.48-.4 2.03-.35 1.5.12 2.62.71 3.37 1.77-1.34.81-2 1.95-1.99 3.41.01 1.14.42 2.09 1.24 2.84.37.35.79.62 1.25.81-.1.29-.21.57-.33.84zM11.6.4c0 .87-.32 1.68-.95 2.43-.76.89-1.69 1.41-2.69 1.33a2.7 2.7 0 01-.02-.33c0-.83.36-1.72 1.01-2.45.32-.37.73-.68 1.23-.92C10.7.15 11.17.02 11.6 0c.01.13.01.27.01.4z" />
                </svg>
                {appleLoading
                  ? 'Conectando…'
                  : modo === 'login' ? 'Iniciar sesión con Apple' : 'Registrarse con Apple'}
              </button>
            )}

            <button disabled={loading || appleLoading} onClick={async () => {
              setError(null); setLoading(true)
              try {
                const isNative = Capacitor.isNativePlatform()
                // Web: callback unico /auth/callback?next=<destino> (1 sola URL en whitelist Supabase).
                // Si nextPath no llega como prop, usamos pathname+search actual para no perder contexto.
                let webNext = nextPath
                if (!webNext && !isNative) {
                  const cur = window.location.pathname + window.location.search
                  webNext = cur && cur !== '/auth/callback' ? cur : '/'
                }
                const safeNext = webNext && webNext.startsWith('/') && !webNext.startsWith('//') ? webNext : '/'
                const webRedirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`
                // Deep link nativo distinto por plataforma porque los bundle IDs
                // son distintos:
                //   - Android (applicationId 'com.pidoo.app')   → 'com.pidoo.app://login'
                //   - iOS (bundleId 'co.median.ios.bnlkxpx')    → 'co.median.ios.bnlkxpx://login'
                // Ambos deben estar registrados en Supabase Auth > Redirect URLs y
                // matchear AndroidManifest / iOS Info.plist respectivamente.
                let redirectTo
                if (isNative) {
                  redirectTo = Capacitor.getPlatform() === 'ios'
                    ? 'co.median.ios.bnlkxpx://login'
                    : 'com.pidoo.app://login'
                } else {
                  redirectTo = webRedirect
                }
                const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
                  provider: 'google', options: { redirectTo, skipBrowserRedirect: isNative },
                })
                if (oauthError) { setError(oauthError.message); setLoading(false); return }
                if (isNative && data?.url) {
                  const { Browser } = await import('@capacitor/browser')
                  await Browser.open({ url: data.url }); setLoading(false)
                }
              } catch (err) { setError('Error al conectar con Google: ' + err.message); setLoading(false) }
            }} style={{
              width: '100%', padding: '14px 0', borderRadius: 14,
              border: '1px solid #D8CDB8',
              background: '#FFFFFF', color: '#1A1815',
              fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
              cursor: (loading || appleLoading) ? 'default' : 'pointer',
              opacity: (loading || appleLoading) ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'border-color 0.2s',
              boxShadow: '0 1px 2px rgba(15,15,15,0.04)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continuar con Google
            </button>
          </>
        )}

        {/* Olvidé contraseña */}
        {modo === 'login' && (
          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <button onClick={() => { setModo('reset'); setError(null); setErrores({}) }} style={{
              background: 'none', border: 'none', color: 'var(--c-primary)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        )}

        {/* Términos */}
        {modo === 'registro' && (
          <div style={{ marginTop: 18 }}>
            <button onClick={() => setAceptaTerminos(!aceptaTerminos)} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: 0,
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                border: aceptaTerminos ? 'none' : errores.terminos ? '1.5px solid #EF4444' : dark ? '1.5px solid rgba(255,255,255,0.5)' : '1.5px solid rgba(0,0,0,0.08)',
                background: aceptaTerminos ? 'var(--c-primary)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: '#fff', transition: 'all 0.15s',
              }}>
                {aceptaTerminos && '✓'}
              </div>
              <span style={{ fontSize: 12, color: termsColor, lineHeight: 1.4 }}>
                Acepto los <a href="/terminos" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-primary)', fontWeight: 600, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>términos y condiciones</a> y la <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-primary)', fontWeight: 600, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>política de privacidad</a>
              </span>
            </button>
            {errores.terminos && <div style={{ color: '#EF4444', fontSize: 11, marginTop: 4, marginLeft: 30 }}>{errores.terminos}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
