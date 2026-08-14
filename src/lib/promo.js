// Cómo se pinta una promoción. Nada de React aquí: solo el texto, el emoji y
// los degradados.
//
// POR QUÉ EXISTE: la misma promoción salía de dos maneras distintas en la misma
// app. En la Home era una tarjeta con degradado, la cifra enorme en cursiva y un
// emoji gigante de fondo; al entrar en el restaurante se convertía en una cajita
// gris con la cifra en 10 px. Y no solo era más fea: el texto del distintivo
// tampoco coincidía — la Home decía "-20 %" y la ficha "20% OFF".
//
// Es la misma clase de fallo que ya mordió tres veces con las columnas de
// `establecimientos` (ver `lib/estColumns.js`): cada pantalla escribiéndose su
// propia versión de algo que debería ser uno.
//
// ⚠️ `Home.jsx` todavía lleva su copia. No se tocó aquí a propósito: ese fichero
// arrastra cambios sin commitear de otra sesión y mezclarlos complica separar
// los commits. Cuando ese lote entre, Home tiene que importar de aquí y borrar
// sus copias de `promoBadge`, `promoEmoji` y `promoGradients`.

export function promoBadge(promo) {
  if (promo?.tipo === 'descuento_porcentaje') return `-${promo.valor}%`
  if (promo?.tipo === 'descuento_fijo') return `-${promo.valor}€`
  if (promo?.tipo === '2x1') return '2×1'
  return 'GRATIS'
}

export function promoEmoji(promo) {
  if (promo?.tipo === 'descuento_porcentaje') return '🏷️'
  if (promo?.tipo === 'descuento_fijo') return '💰'
  if (promo?.tipo === '2x1') return '🍔'
  return '🎁'
}

export const PROMO_GRADIENTES = [
  'linear-gradient(to right, #9f0519, #ff9066)',
  'linear-gradient(to right, #f5a61c, #ff8d44)',
  'linear-gradient(to right, #ff9066, #ff8d44)',
]

export const promoGradiente = (i) => PROMO_GRADIENTES[i % PROMO_GRADIENTES.length]
