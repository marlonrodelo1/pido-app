import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Capacitor } from '@capacitor/core'
import { Mail, Lock, User, Phone, ArrowLeft, Eye, EyeOff } from 'lucide-react'

export default function Login() {
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
  const lastSubmit = useRef(0)

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

  const inputWrap = { position: 'relative', marginBottom: 14 }
  const iconStyle = { position: 'absolute', left: 14, top: 14, color: '#767575' }
  const inputStyle = {
    width: '100%', padding: '14px 16px 14px 44px', borderRadius: 14,
    border: '1px solid transparent', fontSize: 14, fontFamily: 'inherit',
    background: '#F4F2EC', color: 'var(--c-text)', outline: 'none',
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
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-text)', marginBottom: 8, textAlign: 'center', letterSpacing: '-0.02em' }}>
          Confirma tu correo
        </div>
        <p style={{ fontSize: 13, color: 'var(--c-muted)', marginBottom: 28, textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
          Enviamos un enlace de confirmación a <strong style={{ color: 'var(--c-text)' }}>{email}</strong>. Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
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
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-text)', marginBottom: 8, textAlign: 'center', letterSpacing: '-0.02em' }}>
          Revisa tu email
        </div>
        <p style={{ fontSize: 13, color: 'var(--c-muted)', marginBottom: 28, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
          Enviamos un enlace a <strong style={{ color: 'var(--c-text)' }}>{email}</strong> para restablecer tu contraseña
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
      {/* Logo */}
      <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--c-primary)', marginBottom: 8, letterSpacing: '-0.04em' }}>pidoo</div>
      <p style={{ fontSize: 13, color: 'var(--c-muted)', marginBottom: 36, textAlign: 'center' }}>
        {modo === 'reset' ? 'Introduce tu email para recuperar tu contraseña' : 'Tu comida favorita, al alcance de un toque'}
      </p>

      <div style={{ width: '100%', maxWidth: 340 }}>
        {/* Tab switcher */}
        {modo !== 'reset' ? (
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.06)', borderRadius: 14, padding: 3, marginBottom: 24 }}>
            {['login', 'registro'].map(m => (
              <button key={m} onClick={() => { setModo(m); setError(null); setErrores({}) }} style={{
                flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
                background: modo === m ? 'var(--c-btn-gradient)' : 'transparent',
                color: modo === m ? '#fff' : 'var(--c-muted)',
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
            color: 'var(--c-primary-light)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
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
              <div style={{ fontSize: 11, color: '#767575', marginTop: 4, marginLeft: 4 }}>
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
          background: (loading || (blockedUntil && Date.now() < blockedUntil)) ? 'rgba(0,0,0,0.06)' : 'var(--c-btn-gradient)',
          color: '#1F1F1E', fontSize: 15, fontWeight: 700,
          cursor: (loading || (blockedUntil && Date.now() < blockedUntil)) ? 'default' : 'pointer',
          fontFamily: 'inherit', marginTop: 4, letterSpacing: '0.01em',
        }}>
          {loading ? 'Cargando...' : modo === 'login' ? 'Entrar' : modo === 'registro' ? 'Crear cuenta' : 'Enviar enlace'}
        </button>

        {/* Separador + Google */}
        {modo !== 'reset' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.05)' }} />
              <span style={{ fontSize: 11, color: '#767575', fontWeight: 600 }}>o</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.05)' }} />
            </div>
            <button onClick={async () => {
              setError(null); setLoading(true)
              try {
                const isNative = Capacitor.isNativePlatform()
                const redirectTo = isNative ? 'co.median.ios.bnlkxpx://login' : window.location.origin
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
              border: '1px solid rgba(0,0,0,0.08)',
              background: 'rgba(0,0,0,0.06)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', color: 'var(--c-text)',
              fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              transition: 'border-color 0.2s',
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
              background: 'none', border: 'none', color: 'var(--c-primary-light)',
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
                border: aceptaTerminos ? 'none' : errores.terminos ? '1.5px solid #EF4444' : '1.5px solid rgba(0,0,0,0.08)',
                background: aceptaTerminos ? 'var(--c-primary)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: '#1F1F1E', transition: 'all 0.15s',
              }}>
                {aceptaTerminos && '✓'}
              </div>
              <span style={{ fontSize: 12, color: 'var(--c-muted)', lineHeight: 1.4 }}>
                Acepto los <a href="/terminos" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-primary-light)', fontWeight: 600, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>términos y condiciones</a> y la <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-primary-light)', fontWeight: 600, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>política de privacidad</a>
              </span>
            </button>
            {errores.terminos && <div style={{ color: '#EF4444', fontSize: 11, marginTop: 4, marginLeft: 30 }}>{errores.terminos}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
