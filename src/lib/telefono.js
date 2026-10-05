// Teléfono del cliente. El restaurante y el repartidor lo necesitan para avisarle
// del pedido, así que ninguna cuenta se queda sin él (5 oct 2026: 219 de las 416
// cuentas de cliente no tenían; 149 de las 179 recientes entraron con Google o
// Apple, que nunca lo piden).
//
// Vale un número español —9 cifras que empiezan por 6, 7, 8 o 9, con o sin +34 /
// 0034 / 34 delante— o uno extranjero escrito con su prefijo (+44…, +49…): en
// Tenerife pide mucho turista. Del extranjero se quita el 0 nacional que muchos
// escriben detrás del prefijo ("+44 (0)7911…", "+49 0171…"), que no se puede
// marcar; menos en Italia y San Marino, donde ese 0 es parte del número.
//
// Se GUARDA como ya lo guarda la base de datos: el español en sus 9 cifras, sin
// prefijo ni espacios (188 de las 197 fichas con teléfono), y el extranjero con
// su +. Devuelve null si no es válido.

// Números de relleno que la gente escribe para pasar el formulario.
const DE_RELLENO = new Set(['612345678', '123456789', '987654321', '600000000', '666666666', '611111111'])

export function normalizarTelefono(valor) {
  let t = String(valor || '').replace(/\(0\)/g, '').replace(/[\s.\-()/]/g, '')
  if (t.startsWith('00')) t = '+' + t.slice(2)
  if (/^34[6789]\d{8}$/.test(t)) t = t.slice(2)
  if (t.startsWith('+34')) t = t.slice(3)
  if (/^[6789]\d{8}$/.test(t)) {
    if (DE_RELLENO.has(t) || /^(\d)\1{8}$/.test(t)) return null
    return t
  }
  t = t.replace(/^\+(44|49|31|32|33|353|41|43|45|46|47|48|351|358|420|421|36|30|40|359|385|386|370|371|372)0/, '+$1')
  if (/^\+[1-9]\d{7,14}$/.test(t)) return t
  return null
}

export function telefonoValido(valor) {
  return normalizarTelefono(valor) !== null
}

export const MSG_TELEFONO_INVALIDO = 'Pon un teléfono válido: 9 cifras, o con su prefijo si es extranjero (+44…)'
