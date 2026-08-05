// ¿Se puede pedir en esta tienda SIN crear cuenta?
//
// Solo en la tienda pública del restaurante abierta en el navegador: es el
// enlace del flyer y del QR, donde obligar a registrarse tira la venta. Dentro
// de la app instalada se sigue pidiendo cuenta (el cliente ya la tiene).
//
// Esto solo decide QUÉ SE ENSEÑA. La regla de verdad vive en el servidor:
// el RPC `crear_pedido_invitado` vuelve a mirar `exige_registro_cliente` y
// rechaza con PD112 si el restaurante exige cuenta.
//
// OJO: si el `select` del establecimiento no trae `exige_registro_cliente`,
// aquí llegaría `undefined` y se daría por permitido. La columna tiene que
// estar en la consulta (TiendaPublicaRoute.jsx).
import { Capacitor } from '@capacitor/core'

export function permiteInvitado(establecimiento) {
  if (!establecimiento) return false
  if (Capacitor.isNativePlatform()) return false
  return establecimiento.exige_registro_cliente !== true
}
