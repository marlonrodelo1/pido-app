// Ofertas por producto (1.55).
//
// `productos.precio_antes` es lo que costaría el producto sin la oferta (en un
// menú: el bocadillo, las papas y el refresco por separado). Lo que se cobra es
// SIEMPRE `precio`, que ya va rebajado: esto solo sirve para enseñar el tachado,
// el −X % y el ahorro del carrito. Por eso las versiones viejas de la app, que no
// conocen la columna, cobran exactamente lo mismo, y el servidor no tiene ningún
// descuento que validar.

// Cuánto vale el producto sin la oferta por cada euro que se cobra
// (menú 8,10 € por separado / 6,48 € = 1,25). Se aplica también a lo que suman
// los extras: en un menú, las opciones van rebajadas en la misma proporción.
// null = el producto no está en oferta.
export function factorOferta(p) {
  const antes = Number(p?.precio_antes)
  const ahora = Number(p?.precio)
  if (!(antes > 0) || !(ahora > 0) || antes < ahora + 0.01) return null
  return antes / ahora
}

// El −X % que se enseña (entero).
export function pctOferta(p) {
  const f = factorOferta(p)
  return f ? Math.round((1 - 1 / f) * 100) : 0
}

// Precio sin oferta de un importe ya rebajado, o null si no hay oferta.
export function precioAntesDe(importe, factor) {
  if (!factor) return null
  return Math.round(Number(importe) * factor * 100) / 100
}

// Lo que se ahorra el cliente con las ofertas de su carrito. Las líneas que
// entraron antes de la 1.55 (o desde "Repetir") no traen `precio_antes_unitario`
// y simplemente no suman ahorro.
export function ahorroOfertas(carrito) {
  const total = (carrito || []).reduce((s, i) => {
    const antes = Number(i.precio_antes_unitario)
    return antes > i.precio_unitario ? s + (antes - i.precio_unitario) * i.cantidad : s
  }, 0)
  return Math.round(total * 100) / 100
}
