import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // 1) Si Supabase ya proceso el token antes de montar, hay sesion activa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    // 2) Listener por si el evento llega despues del mount
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setSessionReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async () => {
    setError(null)
    if (!password) { setError('Introduce tu nueva contrasena'); return }
    if (password.length < 6) { setError('La contrasena debe tener al menos 6 caracteres'); return }
    if (password !== confirm) { setError('Las contrasenas no coinciden'); return }

    setLoading(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setSuccess(true)
      // Cerrar sesion temporal de recovery y redirigir al login
      await supabase.auth.signOut()
      setTimeout(() => { window.location.href = '/' }, 3000)
    } catch (err) {
      if (err.message?.includes('same_password')) setError('La nueva contrasena debe ser diferente a la anterior')
      else setError(err.message || 'Error al actualizar la contrasena')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit() }

  if (success) {
    return (
      <div style={containerStyle}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#F5F5F5', marginBottom: 8, textAlign: 'center' }}>
          Contrasena actualizada
        </div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32, textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
          Tu contrasena se ha cambiado correctamente. Redirigiendo al inicio de sesion...
        </p>
        <a href="/" style={btnStyle}>
          Ir al inicio de sesion
        </a>
      </div>
    )
  }

  if (!sessionReady) {
    return (
      <div style={containerStyle}>
        <div style={{ fontSize: 48, fontWeight: 800, color: '#FF6B2C', letterSpacing: -2, marginBottom: 16 }}>pidoo</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Verificando enlace...</div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={{ fontSize: 48, fontWeight: 800, color: '#FF6B2C', letterSpacing: -2, marginBottom: 8 }}>pidoo</div>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 32, textAlign: 'center' }}>
        Introduce tu nueva contrasena
      </p>

      <div className="login-form" style={{ width: '100%', maxWidth: 340 }}>
        <a href="/" style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
          color: '#FF6B2C', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif", marginBottom: 16, padding: 0, textDecoration: 'none',
        }}>
          <ArrowLeft size={16} strokeWidth={2.5} /> Volver al login
        </a>

        {/* Nueva contrasena */}
        <div style={inputWrap}>
          <Lock size={16} strokeWidth={1.8} style={iconStyle} />
          <input
            placeholder="Nueva contrasena"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            style={inputStyle}
          />
          <button onClick={() => setShowPassword(!showPassword)} style={eyeBtn}>
            {showPassword ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
          </button>
        </div>

        {/* Confirmar contrasena */}
        <div style={inputWrap}>
          <Lock size={16} strokeWidth={1.8} style={iconStyle} />
          <input
            placeholder="Confirmar contrasena"
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={handleKeyDown}
            style={inputStyle}
          />
          <button onClick={() => setShowConfirm(!showConfirm)} style={eyeBtn}>
            {showConfirm ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
          </button>
        </div>

        {error && (
          <div style={{
            background: '#FEF2F2', color: '#DC2626', fontSize: 12, padding: '10px 14px',
            borderRadius: 10, marginBottom: 12, textAlign: 'center', fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', padding: '16px 0', borderRadius: 14, border: 'none',
          background: loading ? 'rgba(255,255,255,0.45)' : '#FF6B2C', color: '#fff',
          fontSize: 16, fontWeight: 800, cursor: loading ? 'default' : 'pointer',
          fontFamily: "'DM Sans', sans-serif", marginTop: 6, transition: 'background 0.2s',
        }}>
          {loading ? 'Actualizando...' : 'Cambiar contrasena'}
        </button>
      </div>
    </div>
  )
}

const containerStyle = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', padding: '40px 20px', background: '#0D0D0D',
  fontFamily: "'DM Sans', sans-serif", color: '#F5F5F5',
}

const inputWrap = { position: 'relative', marginBottom: 12 }

const iconStyle = { position: 'absolute', left: 14, top: 14, color: 'rgba(255,255,255,0.45)' }

const inputStyle = {
  width: '100%', padding: '14px 16px 14px 44px', borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)', fontSize: 14,
  fontFamily: "'DM Sans', sans-serif",
  background: 'rgba(255,255,255,0.08)', color: '#F5F5F5', outline: 'none',
  boxSizing: 'border-box', transition: 'border 0.2s',
}

const eyeBtn = {
  position: 'absolute', right: 12, top: 12, background: 'none', border: 'none',
  cursor: 'pointer', color: 'rgba(255,255,255,0.45)', padding: 4,
}

const btnStyle = {
  display: 'inline-block', padding: '16px 40px', borderRadius: 14, border: 'none',
  background: '#FF6B2C', color: '#fff', fontSize: 16, fontWeight: 800,
  textDecoration: 'none', fontFamily: "'DM Sans', sans-serif",
}
