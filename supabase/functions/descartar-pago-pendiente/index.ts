// descartar-pago-pendiente v2 (28 ago 2026) — la mitad B1 del arreglo del carrito.
//
// v2 (revisión adversaria del 28 ago): (a) si el PI está 'succeeded', la edge PROMOCIONA
// ella misma la fila a 'nuevo' (con el mismo check de importe que stripe-webhook-pagos)
// en vez de devolver ya_pagado y rezar por el webhook — el webhook responde 200 a sus
// propios fallos y Stripe no reintenta, así que sin esto una fila pagada podía quedarse
// en 'pendiente_pago' y acabar REEMBOLSADA por el cron a los 20 min con el cliente
// viendo "pedido confirmado". (b) Si falta STRIPE_SECRET_KEY ya no se descarta a
// ciegas: clave ausente = Stripe no contesta = la fila se queda para el cron.
//
// QUE ES: al pagar con tarjeta, el pedido se apunta en `pedidos` como 'pendiente_pago'
// ANTES de pasar por Stripe. Si el cliente abandona ese intento y lo sustituye por otro
// (repite con el carrito cambiado, o pide en efectivo/datafono), la fila vieja quedaba
// de cadaver 20-25 min hasta que la cancelaba `recuperar-pagos-huerfanos`, y su
// PaymentIntent quedaba 'incomplete' en Stripe PARA SIEMPRE. Esta funcion cierra los
// dos en el acto, solo cuando es el propio cliente quien descarta su intento.
//
// POR QUE ES UNA EDGE Y NO UN UPDATE DESDE LA APP: `pedidos_guard_update` solo le
// permite al cliente la transicion pendiente_pago -> nuevo (confirmar su pago). Para
// cancelar su propia fila hace falta service_role, y para cancelar el PaymentIntent,
// la clave secreta de Stripe. Ninguna de las dos puede viajar al navegador.
//
// REGLAS QUE NO HAY QUE ROMPER:
//  - El motivo EMPIEZA por "Pedido sin completar el pago" A PROPOSITO: telegram-avisos
//    v8 silencia ese prefijo (regla `nuncaArranco`); con cualquier otro texto, cada
//    carrito abandonado sonaria en el Telegram del super-admin como "pedido nuevo".
//    El sufijo "(descartado por el cliente)" lo distingue del que escribe el cron
//    ("(cancelado automaticamente)") para poder medir cada camino por separado.
//  - EL PAYMENTINTENT MANDA. Si Stripe dice 'succeeded', NO se descarta: el cobro
//    entro (aunque el navegador no confirmara) y la propia edge PROMOCIONA la fila
//    a 'nuevo' (v2) y devuelve ya_pagado=true para que la app de ese pedido por
//    bueno en vez de cobrar otro. Si dice 'processing', no se toca nada: el banco
//    aun no ha contestado y descartar ahora podria cancelar un pago en vuelo.
//  - Si Stripe NO CONTESTA, no se descarta: sin poder afirmar que el pago no entro,
//    mejor dejar la fila al cron de 20 min, que ya sabe reembolsar si hizo falta.
//  - El cancel del PI es best-effort: si falla (y al releer sigue sin estar pagado),
//    la fila se descarta igual y el PI queda abierto — exactamente lo que pasaba
//    siempre, nunca peor.
//  - `trg_notificar_cliente_estado` NO avisa al cliente en pendiente_pago -> cancelado
//    (arreglo del 16 ago) y `trg_creadores_cupon_liberar` suelta el cupon reservado:
//    los dos hacen justo lo que este descarte necesita, sin tocarlos.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || ''

const MOTIVO_DESCARTE = 'Pedido sin completar el pago (descartado por el cliente)'

const ALLOWED_ORIGINS: string[] = [
  'https://pidoo.es', 'https://panel.pidoo.es', 'https://admin.pidoo.es', 'https://socio.pidoo.es',
  'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177',
  'https://localhost', 'capacitor://localhost', 'http://localhost',
]
const SUBDOMAIN_REGEX = /^https:\/\/([a-z0-9-]+\.)?pidoo\.es$/
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin')
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (!origin || ALLOWED_ORIGINS.includes(origin) || SUBDOMAIN_REGEX.test(origin)) {
    headers['Access-Control-Allow-Origin'] = origin || '*'
    headers['Vary'] = 'Origin'
  }
  return headers
}

// El PI está cobrado y la fila sigue en 'pendiente_pago': ascenderla a 'nuevo' AQUÍ,
// sin depender del webhook. Mismo check de importe que stripe-webhook-pagos; el update
// va condicionado a 'pendiente_pago' (si el webhook ganó la carrera, no-op y tan
// contentos). `trg_zz_notificar_pedido_nuevo` timbra al restaurante igual que siempre.
async function promoverAPagado(admin: any, pedido: any, pi: any): Promise<Record<string, unknown>> {
  const cobrado = Number(pi?.amount_received ?? 0)
  const esperado = Math.round((Number(pedido.total) || 0) * 100)
  if (esperado <= 0 || cobrado < esperado) {
    console.error('[descartar] importe insuficiente', pedido.codigo, { cobrado, esperado })
    // No se promociona ni se descarta: la fila queda para el cron, que sabe reembolsar.
    return { ok: false, motivo: 'importe_insuficiente', codigo: pedido.codigo }
  }
  const marcar = () => admin.from('pedidos')
    .update({ estado: 'nuevo', stripe_payment_id: pi.id })
    .eq('id', pedido.id).eq('estado', 'pendiente_pago').select('id')
  let { data: filas, error } = await marcar()
  if (error) ({ data: filas, error } = await marcar())
  if (error) {
    console.error('[descartar] promocion fallida', pedido.codigo, error.message)
    // promovido:false → la app intenta la promoción ella misma (confirmarPago:
    // pendiente_pago→nuevo es la única transición que el guard le permite al cliente).
    return { ok: true, ya_pagado: true, promovido: false, codigo: pedido.codigo, payment_intent: pi.id }
  }
  if (!filas || filas.length === 0) {
    const { data: ahora } = await admin.from('pedidos').select('estado').eq('id', pedido.id).maybeSingle()
    if (ahora && ['cancelado', 'fallido', 'rechazado'].includes(ahora.estado || '')) {
      // El cron canceló la fila en la carrera exacta. El cobro lo devuelve solo
      // reconciliar-reembolsos (cada 5 min); la app debe crear un pedido nuevo.
      return { ok: false, motivo: 'cancelado_en_carrera', codigo: pedido.codigo }
    }
  }
  return { ok: true, ya_pagado: true, promovido: true, codigo: pedido.codigo, payment_intent: pi.id }
}

async function stripePI(metodo: 'GET' | 'POST', path: string): Promise<{ ok: boolean; pi: any }> {
  const r = await fetch(`https://api.stripe.com/v1${path}`, {
    method: metodo,
    headers: {
      Authorization: `Basic ${btoa(`${STRIPE_SECRET_KEY}:`)}`,
      ...(metodo === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: metodo === 'POST' ? new URLSearchParams({ cancellation_reason: 'abandoned' }).toString() : undefined,
  })
  const pi = await r.json().catch(() => ({}))
  return { ok: r.ok, pi }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: getCorsHeaders(req) })
  const CORS = getCorsHeaders(req)

  try {
    const body = await req.json().catch(() => ({}))
    const pedidoId = typeof body?.pedido_id === 'string' ? body.pedido_id : null
    if (!pedidoId) return Response.json({ error: 'Falta pedido_id' }, { status: 400, headers: CORS })

    // Solo el dueño del pedido puede descartarlo: se valida su JWT de sesion.
    // (Los invitados no llegan aqui: crear_pedido_invitado rechaza la tarjeta con
    // PD113, asi que un pedido sin cuenta jamas esta en 'pendiente_pago'.)
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
    if (!jwt) return Response.json({ error: 'No autorizado' }, { status: 401, headers: CORS })
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })
    const { data: userData } = await userClient.auth.getUser()
    const userId = userData?.user?.id || null
    if (!userId) return Response.json({ error: 'No autorizado' }, { status: 401, headers: CORS })

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)
    const { data: pedido, error: selErr } = await admin
      .from('pedidos')
      .select('id, codigo, usuario_id, estado, stripe_payment_id, total')
      .eq('id', pedidoId)
      .maybeSingle()
    if (selErr) return Response.json({ error: 'No se pudo leer el pedido' }, { status: 500, headers: CORS })
    if (!pedido) return Response.json({ error: 'Pedido no encontrado' }, { status: 404, headers: CORS })
    if (!pedido.usuario_id || pedido.usuario_id !== userId) {
      return Response.json({ error: 'Pedido no corresponde al usuario' }, { status: 403, headers: CORS })
    }

    if (pedido.estado !== 'pendiente_pago') {
      // Ya lo resolvio otro: si esta vivo es que el webhook rescato el pago y la app
      // debe darlo por bueno (ya_pagado); si esta cancelado, no hay nada que hacer.
      const yaPagado = !['cancelado', 'fallido', 'rechazado'].includes(pedido.estado || '')
      return Response.json(
        { ok: true, ignorado: pedido.estado, ya_pagado: yaPagado, codigo: pedido.codigo },
        { status: 200, headers: CORS },
      )
    }

    // ── El PaymentIntent manda ─────────────────────────────────────────────
    // v2: sin la clave de Stripe NO se puede afirmar que el pago no entró, así
    // que no se descarta a ciegas — la fila se queda para el cron, como cuando
    // Stripe no contesta.
    if (pedido.stripe_payment_id && !STRIPE_SECRET_KEY) {
      console.error('[descartar] falta STRIPE_SECRET_KEY: no se descarta a ciegas', pedido.codigo)
      return Response.json({ ok: false, motivo: 'stripe_no_disponible', codigo: pedido.codigo }, { status: 200, headers: CORS })
    }
    if (pedido.stripe_payment_id) {
      const { ok, pi } = await stripePI('GET', `/payment_intents/${pedido.stripe_payment_id}`)
      if (!ok) {
        console.warn('[descartar] no se pudo leer el PI', pedido.stripe_payment_id, pi?.error?.message)
        return Response.json({ ok: false, motivo: 'stripe_no_disponible', codigo: pedido.codigo }, { status: 200, headers: CORS })
      }
      if (pi.status === 'succeeded') {
        return Response.json(await promoverAPagado(admin, pedido, pi), { status: 200, headers: CORS })
      }
      if (pi.status === 'processing') {
        return Response.json({ ok: true, procesando: true, codigo: pedido.codigo }, { status: 200, headers: CORS })
      }
      if (pi.status !== 'canceled') {
        const cancelado = await stripePI('POST', `/payment_intents/${pi.id}/cancel`)
        if (!cancelado.ok) {
          // Carrera posible: ¿se acaba de pagar? Se relee UNA vez antes de decidir.
          const otraVez = await stripePI('GET', `/payment_intents/${pi.id}`)
          if (otraVez.ok && otraVez.pi?.status === 'succeeded') {
            return Response.json(await promoverAPagado(admin, pedido, otraVez.pi), { status: 200, headers: CORS })
          }
          if (otraVez.ok && otraVez.pi?.status === 'processing') {
            return Response.json({ ok: true, procesando: true, codigo: pedido.codigo }, { status: 200, headers: CORS })
          }
          console.warn('[descartar] no se pudo cancelar el PI', pi.id, cancelado.pi?.error?.message)
          // Se sigue: la fila se descarta igual y el PI queda abierto (como siempre).
        }
      }
    }

    // ── Descartar la fila (idempotente y a prueba de carreras con el webhook) ──
    const { data: filas, error: updErr } = await admin
      .from('pedidos')
      .update({ estado: 'cancelado', motivo_cancelacion: MOTIVO_DESCARTE, cancelado_at: new Date().toISOString() })
      .eq('id', pedido.id)
      .eq('estado', 'pendiente_pago')
      .select('id')
    if (updErr) {
      console.error('[descartar] update', pedido.codigo, updErr.message)
      return Response.json({ ok: false, motivo: 'update_failed', codigo: pedido.codigo }, { status: 200, headers: CORS })
    }
    if (!filas || filas.length === 0) {
      // Alguien gano la carrera (webhook o cron): contar la verdad de AHORA.
      const { data: ahora } = await admin.from('pedidos').select('estado').eq('id', pedido.id).maybeSingle()
      const yaPagado = !!ahora && !['cancelado', 'fallido', 'rechazado', 'pendiente_pago'].includes(ahora.estado || '')
      return Response.json({ ok: true, carrera: ahora?.estado || null, ya_pagado: yaPagado, codigo: pedido.codigo }, { status: 200, headers: CORS })
    }

    console.log('[descartar] pedido descartado por el cliente', pedido.codigo)
    return Response.json({ ok: true, descartado: true, codigo: pedido.codigo }, { status: 200, headers: CORS })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[descartar-pago-pendiente]', msg)
    return Response.json({ error: msg }, { status: 500, headers: getCorsHeaders(req) })
  }
})
