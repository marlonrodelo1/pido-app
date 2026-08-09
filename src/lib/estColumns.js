// Columnas de `establecimientos` que necesita la ficha del restaurante.
//
// POR QUÉ ESTO EXISTE: el objeto que se le pasa a RestDetalle (por `onOpenRest`,
// por deep link o por el mapa) es el que la ficha pinta. Lo que no venga en el
// SELECT de origen, en la ficha aparece como `undefined`, y eso NO se ve como un
// hueco: se ve como una respuesta en firme y equivocada.
//
// Ya ha mordido tres veces, siempre igual — un listado nuevo se escribe su propia
// lista de columnas y se deja una fuera:
//   · sin `horario`/`activo` → estaAbierto() cae en "sin horario = cerrado" y un
//     restaurante abierto se veía cerrado al entrar desde el mapa.
//   · sin `activo` en el deep link → su guard es `=== false`, así que un cerrado
//     se pintaba abierto.
//   · sin `tiene_delivery` en las cards de promoción → chip "Solo recogida" falso
//     en un restaurante que sí reparte.
//
// Por eso hay UNA lista y la importa todo el que abra la ficha. Si la ficha pasa a
// depender de una columna nueva, se añade AQUÍ y llega a todas las entradas de golpe.
// Columnas explícitas a propósito (nada de `*`): evita traer PII y config interna.
export const COLS_ESTABLECIMIENTO =
  'id, nombre, descripcion, direccion, latitud, longitud, banner_url, logo_url, rating, tiene_delivery, tipo, radio_cobertura_km, horario, categoria_padre, destacado, activo'
