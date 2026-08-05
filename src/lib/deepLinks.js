/* ──────────────────────────────────────────────────────────────────────────
 * deepLinks — traduce una URL entrante a lo que la app debe hacer con ella.
 *
 * Lo usan tres sitios:
 *   - App.jsx (nativo): appUrlOpen + getLaunchUrl → navegar / abrir navegador.
 *   - AppShell.jsx: leer el slug de /app/r/<slug> para abrir esa ficha.
 *   - AbrirEnApp.jsx (web): construir el enlace que salta a la app.
 *
 * Módulo PURO a propósito: sin React, sin Capacitor, sin import.meta.env.
 * Así se prueba con `npm run test:deeplinks` sin montar nada
 * (ver scripts/test-deeplinks.mjs).
 * ────────────────────────────────────────────────────────────────────────── */

export const ESQUEMA_APP = 'com.pidoo.app'
export const HOST_WEB = 'pidoo.es'
export const APPSTORE = 'https://apps.apple.com/es/app/pidoo/id6759052572'
export const GPLAY = 'https://play.google.com/store/apps/details?id=com.pidoo.app'

/** Los slugs de `establecimientos` son [a-z0-9-]. Validarlo NO es cosmético:
 *  el slug se incrusta en una URL `intent://…;…;end`, donde `;` y `#` son
 *  sintaxis del propio intent — un slug con basura permitiría colar
 *  parámetros en el intent que lanza Chrome. */
export const RE_SLUG = /^[a-z0-9-]+$/

export function slugValido(slug) {
  return typeof slug === 'string' && slug.length > 0 && slug.length <= 64 && RE_SLUG.test(slug)
}

/** Ruta interna que abre un restaurante dentro del shell de la app. */
export function rutaRestaurante(slug, query = '') {
  return '/app/r/' + slug + (query || '')
}

/** El inverso: saca el slug de /app/r/<slug>. Devuelve null si no es esa ruta
 *  o si el slug no es válido. */
export function slugDeRutaApp(pathname) {
  const m = /^\/app\/r\/([^/?#]+)\/?$/.exec(pathname || '')
  if (!m) return null
  let slug
  try { slug = decodeURIComponent(m[1]).toLowerCase() } catch (_) { return null }
  return slugValido(slug) ? slug : null
}

/* ── Enlaces que lanzan la app desde la web (página puente /abrir/<slug>) ── */

/** Android: Chrome abre la app si está instalada y, si no, va SOLO a Play.
 *  Sin temporizadores — lo resuelve el propio navegador. */
export function urlIntentAndroid(slug, fallback = GPLAY) {
  if (!slugValido(slug)) return null
  return 'intent://r/' + slug + '#Intent'
    + ';scheme=' + ESQUEMA_APP
    + ';package=' + ESQUEMA_APP
    + ';S.browser_fallback_url=' + encodeURIComponent(fallback)
    + ';end'
}

/** iOS: no hay fallback nativo, hay que lanzar el esquema y armar el rescate
 *  a la App Store aparte (ver AbrirEnApp.jsx). */
export function urlEsquemaApp(slug) {
  if (!slugValido(slug)) return null
  return ESQUEMA_APP + '://r/' + slug
}

/* ── Plataforma ─────────────────────────────────────────────────────────── */

/** 'android' | 'ios' | 'escritorio'. Los argumentos existen para poder
 *  probarla sin navegador; en la app se llama sin nada. */
export function detectarPlataforma(
  ua = (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
  puntosTactiles = (typeof navigator !== 'undefined' ? (navigator.maxTouchPoints || 0) : 0),
) {
  const s = String(ua || '')
  if (/android/i.test(s)) return 'android'
  if (/iphone|ipad|ipod/i.test(s)) return 'ios'
  // iPadOS 13+ se presenta como Mac; se distingue por el táctil.
  if (/Mac/i.test(s) && puntosTactiles > 1) return 'ios'
  return 'escritorio'
}

/* ── Parser de entrada ──────────────────────────────────────────────────── */

function llevaCredenciales(u) {
  // Mismo criterio que usaba App.jsx antes de existir este módulo: el hash
  // manda sobre la query (Supabase manda los tokens en el fragmento).
  const hash = u.hash ? u.hash.substring(1) : ''
  const query = u.search ? u.search.substring(1) : ''
  const p = new URLSearchParams(hash || query)
  return !!p.get('code') || (!!p.get('access_token') && !!p.get('refresh_token'))
}

function primerSegmento(pathname) {
  const seg = String(pathname || '').split('/').filter(Boolean)
  return seg
}

/**
 * Clasifica una URL entrante. Devuelve siempre un objeto con `tipo`:
 *
 *   { tipo: 'oauth' }               → dejársela al flujo de login de siempre.
 *   { tipo: 'interna', ruta }       → navegar dentro de la app.
 *   { tipo: 'externa', url }        → abrirla en el navegador (Browser.open).
 *   { tipo: 'ninguna' }             → no hacer nada.
 */
export function parseDeepLink(url) {
  let u
  try { u = new URL(String(url)) } catch (_) { return { tipo: 'ninguna' } }

  const esquema = u.protocol.replace(/:$/, '').toLowerCase()
  // OJO: para esquemas no estándar el parser NO normaliza el host a
  // minúsculas (com.pidoo.app://R/x deja hostname 'R'), hay que bajarlo aquí.
  const host = (u.hostname || '').toLowerCase()
  const esWeb = esquema === 'http' || esquema === 'https'

  // ── 1. Nuestro esquema propio ──────────────────────────────────────────
  if (esquema === ESQUEMA_APP) {
    // com.pidoo.app://login es SIEMPRE del OAuth, lleve tokens o lleve un
    // ?error=access_denied (usuario que cancela). Si cayera al caso genérico
    // de abajo, cancelar el login sacaría al usuario de donde estuviera.
    if (host === 'login') return { tipo: 'oauth' }

    if (host === 'r') {
      const slug = (primerSegmento(u.pathname)[0] || '').toLowerCase()
      if (slugValido(slug)) return { tipo: 'interna', ruta: rutaRestaurante(slug, u.search) }
    }

    // Cualquier otra cosa con NUESTRO esquema va a la home. Devolverla al
    // navegador con Browser.open sería un bucle: el sistema se la volvería a
    // dar a la app, que la volvería a devolver.
    return { tipo: 'interna', ruta: '/app' }
  }

  // ── 2. Otros esquemas propios heredados (co.median.ios.bnlkxpx, del OAuth
  //       de iOS). No son nuestros para interpretarlos: si traen credenciales
  //       van al login y si no, no se toca nada.
  if (!esWeb) return llevaCredenciales(u) ? { tipo: 'oauth' } : { tipo: 'ninguna' }

  // ── 3. https ───────────────────────────────────────────────────────────
  // La página puente va ANTES del chequeo de credenciales: un enlace de
  // campaña /abrir/x?code=PROMO no es un callback de OAuth.
  if (host === HOST_WEB || host === 'www.' + HOST_WEB) {
    const seg = primerSegmento(u.pathname)
    if (seg[0] === 'abrir') {
      const slug = (seg[1] || '').toLowerCase()
      if (slugValido(slug)) return { tipo: 'interna', ruta: rutaRestaurante(slug, u.search) }
      // /abrir sin slug o con basura: a la home. NO se rebota al navegador
      // por lo mismo que arriba — es una ruta que reclamamos, volvería.
      return { tipo: 'interna', ruta: '/app' }
    }
  }

  // Callback de Supabase (lo reclama el manifest con autoVerify) y cualquier
  // URL que traiga credenciales.
  if (u.pathname.startsWith('/auth/') || llevaCredenciales(u)) return { tipo: 'oauth' }

  // Todo lo demás (incluido pidoo.es/<slug>, /terminos, un email de reseña…)
  // al navegador. Tragárselo dejaría al usuario en una app que no sabe pintar
  // esa pantalla y sin manera de volver.
  return { tipo: 'externa', url: String(url) }
}
