// Número de la casa en la dirección de entrega.
//
// Las direcciones que salen del GPS (Nominatim) casi nunca lo traen —"Calle X,
// Barrio, Municipio, Santa Cruz de Tenerife, Canarias, 38379, España"— y el
// repartidor llegaba a la calle sin saber a qué puerta llamar: 79 de los 152
// pedidos a domicilio de la app en 30 días (sep-oct 2026). El carrito ya no deja
// pedir a domicilio sin él.

// Tramo que empieza por un tipo de vía ("Calle…", "C/…", "Avda.…", "TF-5…").
const ES_VIA = /^(?:c\/|c\.|cl\.|avda\.?|av\.|ctra\.|carr\.|cam\.|pl\.|pza\.|pje\.|urb\.|trv\.|p\.º|(?:calle|avenida|carretera|camino|callej[oó]n|plaza|pasaje|paseo|urbanizaci[oó]n|transversal|traves[ií]a|rambla|ronda|subida|bajada|cuesta|v[ií]a|carril|senda|vereda|lugar|barranco)(?=\s|$)|[A-Z]{1,3}-\d{1,4}(?=\s|$))/i

const ES_COORDENADA = /^-?\d{1,3}\.\d{3,}$/

// ¿Lleva número de casa? Antes de buscarlo se quita lo que tiene cifras y NO es
// un número de casa: coordenadas sueltas (lo que se guarda cuando el GPS no
// consigue ponerle nombre a la calle), el código postal, el punto kilométrico,
// las fechas de los nombres de calle ("Avenida 25 de Julio") y los códigos de
// carretera ("TF-217", "FV-2": Google y Nominatim los escriben en MAYÚSCULA, por
// eso esa regla no ignora mayúsculas y no toca un "12-14" ni un "3-B").
// Vale "12", "12B", "12 bis", "nº 12", "N12" y "s/n".
export function tieneNumeroCasa(dir) {
  const t = String(dir || '')
  if (!t.trim()) return false
  // El cliente ya dijo que su casa no tiene número.
  if (/\bs\/n\b|\bsin n[uú]mero\b/i.test(t)) return true
  const sinRuido = t
    .replace(/-?\d+\.\d{4,}/g, ' ')
    .replace(/\b\d{5}\b/g, ' ')
    .replace(/\bkm\.?\s*\d+(?:[.,]\d+)?/gi, ' ')
    .replace(/\b\d{1,2}\s+de\s+\p{L}+/giu, ' ')
    .replace(/\b[A-Z]{1,3}-\d{1,4}\b/g, ' ')
  return /\b(?:n[º°o]?\.?\s?)?\d{1,4}\s?(?:bis|[a-z])?\b/i.test(sinRuido)
}

// Mete el número como tramo propio JUSTO DETRÁS DE LA CALLE, al estilo de Google:
// "Calle X, 12, 2º B, Barrio, …". Así lo leen igual el repartidor, el panel y la
// IA del teléfono (que toma como número el primer tramo corto de cifras).
// La calle es el primer tramo que parece una vía: la dirección del GPS puede
// empezar por un local o un barrio ("Bar Pepe, Calle X, …"). Si ninguno lo
// parece, el primero. Sin número: "Calle X s/n (casa blanca - portón verde), …"
// (las comas de la indicación se cambian para no partir la dirección).
// "lo que escribió el cliente (dirección de Google)": se trabaja sobre lo de fuera
// del paréntesis.
export function componerDireccion(dir, { numero = '', piso = '', sinNumero = false, indicacion = '' } = {}) {
  const t = String(dir || '').trim()
  const par = t.indexOf(' (')
  const cabeza = par > 0 && t.endsWith(')') ? t.slice(0, par) : t
  const cola = cabeza === t ? '' : t.slice(par)
  const partes = cabeza.split(',').map(s => s.trim()).filter(Boolean)
  const n = String(numero).trim()
  const p = String(piso).trim()
  const ind = String(indicacion).trim().replace(/\s*,\s*/g, ' - ')

  // Solo coordenadas (el GPS no encontró calle): delante, para que se lea primero.
  if (partes.length === 0 || partes.every(x => ES_COORDENADA.test(x))) {
    const delante = sinNumero ? `s/n${ind ? ` (${ind})` : ''}` : `Nº ${n}`
    return [delante, ...(p ? [p] : []), cabeza].filter(Boolean).join(', ') + cola
  }

  let i = partes.findIndex(x => ES_VIA.test(x))
  if (i === -1) i = 0
  const calle = sinNumero ? `${partes[i]} s/n${ind ? ` (${ind})` : ''}` : partes[i]
  const nuevos = [
    ...partes.slice(0, i),
    calle,
    ...(sinNumero ? [] : [n]),
    ...(p ? [p] : []),
    ...partes.slice(i + 1),
  ]
  return nuevos.join(', ') + cola
}

// Texto de la dirección a partir de la respuesta de Nominatim (reverse, con
// addressdetails=1): CALLE PRIMERO, como hace Home.jsx. `display_name` empieza a
// veces por un local o un barrio y el número acababa pegado a eso. Sin calle, el
// display_name tal cual (mejor que nada).
export function direccionDeNominatim(json) {
  const a = json?.address || {}
  const calle = a.road || a.pedestrian || a.footway || a.path || a.cycleway
  if (!calle) return json?.display_name || null
  return [
    calle,
    a.house_number,
    a.suburb || a.neighbourhood || a.quarter || a.hamlet,
    a.village || a.town || a.city || a.municipality,
    a.postcode,
  ].filter(Boolean).join(', ')
}

// Para enseñarla en una o dos líneas: calle, número (y piso) y barrio, sin
// provincia, código postal ni país. Los tramos de solo número no cuentan.
export function direccionCorta(dir) {
  const partes = String(dir || '').split(',').map(s => s.trim()).filter(Boolean)
  const out = []
  let conTexto = 0
  for (const x of partes) {
    if (conTexto >= 2 && !/^\d/.test(x)) break
    out.push(x)
    if (!/^\d/.test(x)) conTexto++
  }
  return out.join(', ')
}
