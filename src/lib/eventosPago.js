import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { supabase } from './supabase'

// Registro de lo que pasa en la pantalla de pago con tarjeta (tabla eventos_pago,
// por la RPC registrar_evento_pago; solo la lee el superadmin).
//
// Hasta el 5 oct 2026 no quedaba NADA: en agosto el primer intento de pago fallaba
// en 7 de cada 8 compras y no se pudo saber por qué. "Pulsó y no pasó nada" y "no
// pulsó" dejaban el mismo rastro: ninguno. Con esto cada apertura del formulario
// (una `sesion`) deja su cadena: abierto → listo → pulsa → ok / error con su código.
//
// NUNCA puede molestar al pago: no se espera desde la pantalla y cualquier fallo se
// traga. (`await` sobre supabase.rpc va bien; `.catch` NO: el builder no es una
// Promise de verdad, ver AuthContext.)

let version = null
function versionApp() {
  if (!version) {
    version = Capacitor.isNativePlatform()
      ? CapApp.getInfo().then(i => `${i.version} (${i.build})`).catch(() => null)
      : Promise.resolve('web')
  }
  return version
}

export function nuevaSesionPago() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// Código de error de Stripe en una línea: "card_error/card_declined/insufficient_funds".
export function codigoErrorStripe(err) {
  if (!err) return null
  return [err.type, err.code, err.decline_code].filter(Boolean).join('/') || null
}

export async function registrarEventoPago(etapa, datos = {}) {
  try {
    const p = {
      etapa,
      pedido_id: datos.pedido?.id || null,
      pedido_codigo: datos.pedido?.codigo || null,
      establecimiento_id: datos.pedido?.establecimiento_id || null,
      sesion: datos.sesion || null,
      metodo: datos.metodo || null,
      codigo_error: datos.codigo_error || null,
      mensaje: datos.mensaje ? String(datos.mensaje).slice(0, 500) : null,
      importe: datos.importe != null && Number.isFinite(Number(datos.importe)) ? Number(datos.importe).toFixed(2) : null,
      plataforma: Capacitor.getPlatform(),
      version_app: await versionApp(),
      user_agent: typeof navigator !== 'undefined' ? String(navigator.userAgent || '').slice(0, 300) : null,
    }
    await supabase.rpc('registrar_evento_pago', { p })
  } catch { /* el registro jamás tumba un pago */ }
}
