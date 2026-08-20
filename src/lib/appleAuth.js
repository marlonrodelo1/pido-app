// appleAuth.js — Sign in with Apple para la app de cliente.
//
// POR QUE EXISTE: el guideline 4.8 de Apple exige que, si se ofrece un login de
// terceros (aqui Google), haya ademas otro que (a) solo pida nombre y email,
// (b) permita ocultar el email y (c) no rastree para publicidad. Email +
// contrasena NO cumple (b). App Review rechazo la 1.47 (22) el 20 ago 2026 por
// esto exactamente. Es el mismo rechazo que se llevo pido-panel-socio el 7 jul
// y se resolvio igual: portado de `pido-panel-socio/src/lib/auth.js`.
//
// SOLO iOS. En web y Android el boton ni se pinta: alli Apple no es obligatorio
// y el flujo web (signInWithOAuth) necesita un Services ID + return URL que en
// este proyecto no estan configurados (en el socio dio "invalid_request").

import { supabase } from './supabase'
import { Capacitor } from '@capacitor/core'

// Bundle ID REAL de la app en la App Store. Es herencia del wrapper Median y NO
// coincide con el appId de Android (`com.pidoo.app`) ni con el del socio.
// Importa por dos motivos:
//   1. Es el `aud` del identityToken que firma Apple  ->  tiene que estar en
//      Supabase > Auth > Providers > Apple > Client IDs, o el login da 400.
//   2. La capability "Sign in with Apple" va en ESTE App ID en el portal de
//      Apple Developer (Team XR7JH7A8ZY), no en `com.pidoo.app`.
const IOS_BUNDLE_ID = 'co.median.ios.bnlkxpx'

/** true solo donde el flujo nativo de Apple existe. Sincrono: el puente de
 *  Capacitor se inyecta en el WebView antes de que corra el bundle. */
export function appleDisponible() {
  try { return Capacitor.getPlatform() === 'ios' } catch { return false }
}

function randomNonce() {
  const a = new Uint8Array(32)
  ;(globalThis.crypto || window.crypto).getRandomValues(a)
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(msg) {
  const data = new TextEncoder().encode(msg)
  const buf = await (globalThis.crypto || window.crypto).subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Apple solo entrega el nombre en la PRIMERA autorizacion; en los logins
// siguientes givenName/familyName llegan a null para siempre. Si no se guarda
// ahora, se pierde.
//
// El trigger `handle_new_user` ya habra creado la fila de `usuarios` con
// `split_part(email,'@',1)` como nombre, y con "Ocultar mi correo" ese prefijo
// es la cadena aleatoria de privaterelay: un nombre ilegible. Por eso se pisa,
// pero SOLO si sigue siendo ese placeholder — nunca un nombre que el usuario
// haya escrito el mismo en su perfil.
async function guardarNombre(user, fullName) {
  // En auth.users, para que el nombre sobreviva a futuros logins y lo lea
  // `fetchPerfil` (mira nombre / full_name / name en user_metadata).
  try {
    await supabase.auth.updateUser({ data: { nombre: fullName, full_name: fullName } })
  } catch { /* no bloquea el login */ }

  if (!user?.id) return
  const placeholder = (user.email || '').split('@')[0]
  // El trigger corre en la transaccion del alta, pero fetchPerfil ya demostro
  // que la fila puede tardar en verse: mismos reintentos que alli.
  for (let intento = 0; intento < 4; intento++) {
    const { data: fila } = await supabase
      .from('usuarios').select('nombre').eq('id', user.id).maybeSingle()
    if (fila) {
      const actual = (fila.nombre || '').trim()
      if (!actual || actual === placeholder || actual === 'Usuario') {
        await supabase.from('usuarios').update({ nombre: fullName }).eq('id', user.id)
      }
      return
    }
    await new Promise((r) => setTimeout(r, 700))
  }
}

/**
 * Abre la hoja nativa de Apple y canjea el identityToken por sesion de Supabase.
 * Lanza si falla. Cancelar la hoja tambien lanza (lo filtra quien llama).
 */
export async function loginApple() {
  if (!appleDisponible()) {
    throw new Error('Sign in with Apple solo está disponible en iPhone y iPad')
  }

  const { SignInWithApple } = await import('@capacitor-community/apple-sign-in')

  // REGLA DE ORO DEL NONCE (verificada, y facil de invertir sin darse cuenta):
  //   - a Apple  va el nonce HASHEADO en SHA-256.
  //   - a Supabase va el nonce CRUDO; Supabase lo re-hashea y lo compara con el
  //     claim `nonce` del token. Al reves = 400 en signInWithIdToken.
  const rawNonce = randomNonce()
  const hashedNonce = await sha256Hex(rawNonce)

  const { response } = await SignInWithApple.authorize({
    // OJO: el plugin nativo IGNORA clientId y redirectURI (mirar su Plugin.swift:
    // solo lee state, nonce y scopes). El `aud` del token lo pone iOS con el
    // bundle ID de la app. Van aqui para dejar constancia de cual es ese bundle
    // y porque el tipo del plugin los declara obligatorios. Cambiarlos NO
    // cambia el login; lo que hay que tocar es Supabase (ver IOS_BUNDLE_ID).
    clientId: IOS_BUNDLE_ID,
    redirectURI: '',
    scopes: 'name email',
    nonce: hashedNonce,
  })

  if (!response?.identityToken) throw new Error('Apple no devolvió el token de identidad')

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: response.identityToken,
    nonce: rawNonce,
  })
  if (error) throw error

  const fullName = [response.givenName, response.familyName].filter(Boolean).join(' ').trim()
  if (fullName) {
    try { await guardarNombre(data?.user, fullName) } catch { /* el login ya es valido */ }
  }

  return data
}

/** true si el error es "el usuario cerro la hoja de Apple", que no es un fallo
 *  que haya que pintarle en rojo. El plugin rechaza con
 *  `error.localizedDescription`, asi que solo hay texto: en ingles trae
 *  "canceled" y en espanol "cancelada" — /cancel/i cubre ambos. */
export function esCancelacionApple(err) {
  const msg = err?.message || String(err || '')
  return /cancel/i.test(msg)
}
