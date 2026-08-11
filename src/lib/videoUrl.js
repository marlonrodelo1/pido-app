// Reconocimiento de enlaces de vídeo para Pidoo Creadores.
//
// POR QUÉ ESTO ES UN MÓDULO PURO (sin React, sin Capacitor, sin red):
// para poder probarlo con `node --test`, igual que `deepLinks.js`. El cliente
// pega aquí un enlace copiado del botón Compartir de su móvil y de eso depende
// que su vídeo entre o no al programa; si falla, no hay premio y no hay error
// visible. Es exactamente el tipo de código que tiene que estar cubierto.
//
// LO QUE NO SE PUEDE HACER SIN RED, Y HAY QUE ASUMIR:
// los enlaces cortos (vm.tiktok.com/ZMxxxx, vt.tiktok.com, tiktok.com/t/,
// instagram.com/share/...) son REDIRECCIONES: el id del vídeo solo se conoce
// siguiéndolas. Y son justo los que copia el botón Compartir, así que no se
// pueden rechazar. Se aceptan con `videoId: null` y la deduplicación la hace el
// servidor por la URL normalizada (`share_url_norm`, única en toda la tabla).

const RE_TIKTOK_LARGO   = /^(?:www\.|m\.)?tiktok\.com\/@([\w.\-]+)\/(?:video|photo)\/(\d{6,25})/i
const RE_TIKTOK_M_HTML  = /^m\.tiktok\.com\/v\/(\d{6,25})/i
const RE_TIKTOK_CORTO   = /^(?:vm|vt)\.tiktok\.com\/([A-Za-z0-9]{4,32})/i
const RE_TIKTOK_T       = /^(?:www\.)?tiktok\.com\/t\/([A-Za-z0-9]{4,32})/i

const RE_IG_DIRECTO     = /^(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:reels?|p|tv)\/([A-Za-z0-9_-]{5,30})/i
const RE_IG_CON_USUARIO = /^(?:www\.)?instagram\.com\/([\w.]+)\/(?:reels?|p|tv)\/([A-Za-z0-9_-]{5,30})/i
const RE_IG_SHARE       = /^(?:www\.)?instagram\.com\/share\//i

/**
 * Normaliza una URL igual que `creadores_normalizar_url()` en la base de datos.
 * Las dos tienen que dar EXACTAMENTE lo mismo o la deduplicación del servidor
 * rechazará vídeos que la app daba por buenos (y al revés).
 * Minúsculas, sin protocolo, sin `www.`, sin querystring, sin fragmento y sin
 * barra final.
 */
export function normalizarUrl(url) {
  if (typeof url !== 'string') return ''
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
}

/**
 * Analiza el enlace que pega el cliente.
 *
 * @returns {{
 *   ok: boolean,
 *   red: 'tiktok'|'instagram'|null,
 *   videoId: string|null,
 *   usuario: string|null,
 *   urlNormalizada: string,
 *   corto: boolean,      // enlace de redirección: no se puede sacar el id sin red
 *   motivo: string|null, // por qué no vale, en español y para enseñar al cliente
 * }}
 */
export function analizarUrlVideo(entrada) {
  const fallo = (motivo) => ({
    ok: false, red: null, videoId: null, usuario: null,
    urlNormalizada: '', corto: false, motivo,
  })

  if (typeof entrada !== 'string' || !entrada.trim()) {
    return fallo('Pega el enlace de tu vídeo.')
  }

  const bruto = entrada.trim()
  if (bruto.length > 500) return fallo('Ese enlace es demasiado largo.')

  // Sin protocolo también vale: el botón Compartir de Android a veces lo omite,
  // y el cliente muchas veces pega texto con el enlace dentro.
  const soloUrl = (bruto.match(/https?:\/\/\S+/i) || [bruto])[0]
  const sinProto = soloUrl.replace(/^https?:\/\//i, '')
  const norm = normalizarUrl(soloUrl)

  if (!norm) return fallo('Ese enlace no es válido.')

  // ── TikTok ────────────────────────────────────────────────────────────────
  let m = sinProto.match(RE_TIKTOK_LARGO)
  if (m) return { ok: true, red: 'tiktok', videoId: m[2], usuario: m[1], urlNormalizada: norm, corto: false, motivo: null }

  m = sinProto.match(RE_TIKTOK_M_HTML)
  if (m) return { ok: true, red: 'tiktok', videoId: m[1], usuario: null, urlNormalizada: norm, corto: false, motivo: null }

  if (RE_TIKTOK_CORTO.test(sinProto) || RE_TIKTOK_T.test(sinProto)) {
    return { ok: true, red: 'tiktok', videoId: null, usuario: null, urlNormalizada: norm, corto: true, motivo: null }
  }

  // ── Instagram ─────────────────────────────────────────────────────────────
  // El de `share/` va EL PRIMERO: `instagram.com/share/reel/ABC` encaja también
  // en el patrón "usuario/reel/id" tomando `share` como si fuera el usuario, y
  // entonces daría por bueno un id que no lo es. Lo cazó el test.
  if (RE_IG_SHARE.test(sinProto)) {
    return { ok: true, red: 'instagram', videoId: null, usuario: null, urlNormalizada: norm, corto: true, motivo: null }
  }

  // El de usuario antes que el directo: instagram.com/pepe/reel/ABC también
  // encaja en el patrón directo, pero ahí `pepe` no es el código del vídeo.
  m = sinProto.match(RE_IG_CON_USUARIO)
  if (m) return { ok: true, red: 'instagram', videoId: m[2], usuario: m[1], urlNormalizada: norm, corto: false, motivo: null }

  m = sinProto.match(RE_IG_DIRECTO)
  if (m) return { ok: true, red: 'instagram', videoId: m[1], usuario: null, urlNormalizada: norm, corto: false, motivo: null }

  // ── Ni una cosa ni la otra ────────────────────────────────────────────────
  if (/instagram\.com|instagr\.am/i.test(sinProto)) {
    return fallo('Ese enlace de Instagram no es de un vídeo. Abre tu reel y usa Compartir → Copiar enlace.')
  }
  if (/tiktok\.com/i.test(sinProto)) {
    return fallo('Ese enlace de TikTok no es de un vídeo. Abre tu vídeo y usa Compartir → Copiar enlace.')
  }
  if (/youtube\.com|youtu\.be|facebook\.com|twitter\.com|x\.com/i.test(sinProto)) {
    return fallo('De momento solo valen vídeos de TikTok e Instagram.')
  }
  return fallo('No reconozco ese enlace. Tiene que ser de TikTok o de Instagram.')
}

export const NOMBRE_RED = { tiktok: 'TikTok', instagram: 'Instagram' }
