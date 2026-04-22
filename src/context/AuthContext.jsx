import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabase'
import { registerWebPush, unregisterWebPush } from '../lib/webPush'
import { registerPushNotifications, unregisterPushNotifications } from '../lib/pushNotifications'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  // Refresh proactivo: si el token expira en menos de 5 min, renovarlo
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const expiresAt = session.expires_at * 1000
      if (expiresAt - Date.now() < 5 * 60 * 1000) {
        await supabase.auth.refreshSession()
      }
    }, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchPerfil(session.user.id)
      else { setPerfil(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchPerfil(userId, intentos = 0) {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single()

    // Si no existe perfil aún (race condition con trigger), reintentar
    if (!data && intentos < 3) {
      setTimeout(() => fetchPerfil(userId, intentos + 1), 800)
      return
    }

    // Si después de reintentos no existe (trigger falló, ej. Google OAuth), crear manualmente
    if (!data && intentos >= 3) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const meta = authUser.user_metadata || {}
        const nombre = meta.nombre || meta.full_name || meta.name || authUser.email?.split('@')[0] || 'Usuario'
        const { data: newPerfil, error: insertError } = await supabase
          .from('usuarios')
          .upsert({
            id: userId,
            nombre,
            email: authUser.email,
            avatar_url: meta.avatar_url || meta.picture || null,
            rol: 'cliente',
          }, { onConflict: 'id' })
          .select()
          .single()
        if (insertError) {
          console.error('Error creando perfil:', insertError)
          // No cerrar sesión por error transitorio — reintentar en siguiente carga
          setLoading(false)
          return
        }
        setPerfil(newPerfil)
        setLoading(false)
        registerWebPush('cliente', { user_id: userId })
        registerPushNotifications('cliente', { user_id: userId })
        // Claim de tokens huerfanos iOS (AppDelegate los guarda sin user_id antes del login)
        setTimeout(() => { supabase.rpc('claim_orphan_push_tokens', { p_user_type: 'cliente' }).catch(() => {}) }, 2000)
        setTimeout(() => { supabase.rpc('claim_orphan_push_tokens', { p_user_type: 'cliente' }).catch(() => {}) }, 6000)
        setTimeout(() => { supabase.rpc('claim_orphan_push_tokens', { p_user_type: 'cliente' }).catch(() => {}) }, 15000)
        return
      }
      setPerfil(null)
      setLoading(false)
      return
    }

    // Validar que el rol sea 'cliente' — pido-app es solo para clientes
    if (data && data.rol && data.rol !== 'cliente') {
      await supabase.auth.signOut()
      setUser(null)
      setPerfil(null)
      setLoading(false)
      setAuthError('Esta app es solo para clientes. Usa la app correspondiente a tu rol.')
      return
    }

    // Si viene de Google OAuth y no tiene rol asignado, asegurar que sea 'cliente'
    if (data && !data.rol) {
      const { error: rolError } = await supabase.from('usuarios').update({ rol: 'cliente' }).eq('id', userId)
      if (!rolError) data.rol = 'cliente'
    }

    setPerfil(data)
    setLoading(false)
    // Registrar push notifications (web + nativo)
    registerWebPush('cliente', { user_id: userId })
    registerPushNotifications('cliente', { user_id: userId })
    // Reclamar tokens huerfanos creados por AppDelegate iOS antes del login.
    // Se reintenta varias veces por si el FCM token llega con retraso.
    const claimTokens = () => {
      supabase.rpc('claim_orphan_push_tokens', { p_user_type: 'cliente' }).then(() => {}).catch(() => {})
    }
    setTimeout(claimTokens, 2000)
    setTimeout(claimTokens, 6000)
    setTimeout(claimTokens, 15000)
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(traducirError(error.message))
    return data
  }

  async function registro(email, password, nombre, telefono) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, rol: 'cliente' },
        emailRedirectTo: window.location.origin || 'https://pidoo.es',
      },
    })
    if (error) throw new Error(traducirError(error.message))

    // El trigger on_auth_user_created crea el perfil automáticamente
    // Actualizamos con nombre completo y teléfono si el perfil ya existe
    if (data.user) {
      await supabase.from('usuarios').update({
        nombre,
        telefono: telefono || null,
      }).eq('id', data.user.id)
    }

    return data
  }

  async function updatePerfil(campos) {
    if (!perfil?.id) throw new Error('No hay sesión activa')
    const { data, error } = await supabase
      .from('usuarios')
      .update(campos)
      .eq('id', perfil.id)
      .select()
      .single()
    if (error) throw new Error('Error al actualizar el perfil')
    setPerfil(data)
    return data
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://pidoo.es/reset-password',
    })
    if (error) throw new Error(traducirError(error.message))
  }

  async function logout() {
    // Limpiar tokens push antes de cerrar sesión (si hay usuario)
    if (user?.id) {
      try { await unregisterWebPush('cliente', { user_id: user.id }) } catch (e) { console.error('[Auth] unregisterWebPush', e) }
      try { await unregisterPushNotifications() } catch (e) { console.error('[Auth] unregisterPushNotifications', e) }
    }
    await supabase.auth.signOut()
    setUser(null)
    setPerfil(null)
  }

  const contextValue = useMemo(() => ({
    user, perfil, loading, authError, setAuthError, login, registro, logout, fetchPerfil, updatePerfil, resetPassword,
  }), [user, perfil, loading, authError])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

function traducirError(msg) {
  const map = {
    'Invalid login credentials': 'Email o contraseña incorrectos',
    'Email not confirmed': 'Confirma tu email antes de iniciar sesión',
    'User already registered': 'Este email ya está registrado',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 8 caracteres, 1 mayúscula y 1 número',
    'Unable to validate email address: invalid format': 'Formato de email inválido',
    'Signup requires a valid password': 'Introduce una contraseña válida',
    'Email rate limit exceeded': 'Demasiados intentos. Espera unos minutos.',
    'For security purposes, you can only request this once every 60 seconds': 'Espera 60 segundos antes de intentar de nuevo',
  }
  return map[msg] || msg
}

export const useAuth = () => useContext(AuthContext)
