/* ──────────────────────────────────────────────────────────────────────────
 * PanelCuenta — lo que el cliente ve de su pedido mientras habla con Nico.
 *
 * ⚠️ TODOS LOS NÚMEROS DE ESTA PANTALLA VIENEN DEL SERVIDOR, NUNCA DEL MODELO.
 * Lo que se pinta aquí es literalmente el jsonb de `mesa_tickets` que escribió
 * la edge `ia-mesa` tras releer los precios de la base — la misma fila que
 * después se convierte en el pedido. Nico puede decir en voz alta lo que le dé
 * la gana: si lo que dice no cuadra con esto, lo que vale es esto.
 *
 * Por eso este componente NO recibe nada del SDK de voz, solo el objeto que
 * devuelve la acción `ver_ticket`. No hay ningún camino por el que un precio
 * hablado llegue hasta aquí.
 *
 * ⚠️ ES CRISTAL, NO UNA TARJETA BLANCA, Y ESO NO ES CAPRICHO. La pantalla del
 * camarero es el orbe sobre la carta emborronada; la cuenta se AÑADE a eso, no
 * lo sustituye. Una tarjeta opaca tapaba el glaseado y rompía la pantalla que
 * ya estaba bien. Va translúcida y con su propio desenfoque para que el fondo
 * siga leyéndose, pero con opacidad alta: el dinero se lee o no se pone.
 *
 * ⚠️ NO SE TOCA: no hay botones de quitar, ni de sumar, ni de editar. En el
 * momento en que la pantalla pudiera modificar el pedido con el dedo haría
 * falta estado de carrito en el navegador, que es exactamente lo que este
 * módulo mantiene fuera para que un `precio_local` no pueda acabar nunca en
 * `pedido_items`. Se habla, no se toca.
 * ────────────────────────────────────────────────────────────────────────── */

const C = {
  ink: '#1A1815', stone: '#6B6560',
  naranja: '#FF6B2C', marron: '#8A3D10',
}

const eur = n => Number(n || 0).toFixed(2).replace('.', ',') + ' €'

export default function PanelCuenta({ cuenta }) {
  if (!cuenta?.hay_cuenta || !cuenta.lineas?.length) return null

  const enviado = cuenta.estado === 'enviado'
  const cancelado = cuenta.estado === 'cancelado'

  // Una vez el pedido está en cocina, la cabecera deja de ser un cartel fijo y
  // pasa a contar en qué punto va: es lo único que le dice al cliente, sentado
  // y esperando, si su comida sigue haciéndose o ya puede ir a por ella.
  // `estado_pedido` es el estado CRUDO de `pedidos` que devuelve `ver_ticket`.
  // Si viniera vacío —una respuesta cacheada de la versión anterior del
  // servidor, que no lo traía— `includes` da false y se cae en "En
  // preparación", que es el mensaje correcto para un pedido recién mandado.
  const listo = enviado && ['listo', 'recogido', 'entregado'].includes(cuenta.estado_pedido)
  const rotulo = cancelado
    ? 'Pedido anulado'
    : !enviado
      ? 'Tu pedido'
      : listo
        ? '¡Listo! Recógelo en la barra'
        : cuenta.minutos
          ? `En preparación · unos ${cuenta.minutos} min`
          : 'En preparación'

  return (
    <div style={{
      width: '100%', maxWidth: 420,
      borderRadius: 22,
      // Cristal: la carta se sigue intuyendo detrás, igual que en el resto del
      // overlay. El respaldo es crema con alfa alta para los navegadores sin
      // backdrop-filter, donde queda un panel casi sólido en vez de un vacío.
      background: 'rgba(255,253,249,0.80)',
      backdropFilter: 'blur(20px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
      border: '1px solid rgba(255,255,255,0.75)',
      boxShadow: '0 10px 40px rgba(26,24,21,0.13)',
      overflow: 'hidden',
      opacity: cancelado ? 0.7 : 1,
      transition: 'opacity .4s ease',
    }}>
      {/* Cabecera: dice en qué punto está la cuenta, sin obligar a leer nada más */}
      <div style={{
        padding: '10px 16px 8px',
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: '1px solid rgba(232,224,213,0.7)',
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: 999, flexShrink: 0,
          // Verde solo cuando ya está listo para recoger. Mientras se cocina va
          // en naranja y latiendo: es información distinta y tiene que verse
          // distinta de un vistazo, sin leer.
          background: cancelado ? '#B0A69E' : listo ? '#16A34A' : C.naranja,
          boxShadow: cancelado ? 'none' : `0 0 0 4px ${listo ? 'rgba(22,163,74,.14)' : 'rgba(255,107,44,.16)'}`,
          animation: enviado && !listo ? 'pcLate 1.8s ease-in-out infinite' : 'none',
        }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: C.marron, letterSpacing: '-0.01em' }}>
          {rotulo}
        </span>
        {enviado && cuenta.pedido_codigo && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: C.stone, fontVariantNumeric: 'tabular-nums' }}>
            {cuenta.pedido_codigo}
          </span>
        )}
      </div>

      {/* Líneas. Ruedan por dentro: una mesa que pide varias rondas no puede
          empujar el orbe fuera de la pantalla. */}
      <div style={{ padding: '2px 16px', maxHeight: '34vh', overflowY: 'auto' }}>
        {cuenta.lineas.map((l, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '9px 0',
            borderTop: i === 0 ? 'none' : '1px solid rgba(232,224,213,0.55)',
          }}>
            <span style={{
              minWidth: 22, height: 22, borderRadius: 7, flexShrink: 0,
              background: 'rgba(255,107,44,0.13)', color: C.marron,
              fontSize: 11.5, fontWeight: 800, display: 'grid', placeItems: 'center',
              fontVariantNumeric: 'tabular-nums', marginTop: 1,
            }}>{l.cantidad}</span>

            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 650, color: C.ink, lineHeight: 1.3 }}>
                {l.nombre}
                {l.tamano ? <span style={{ color: C.stone, fontWeight: 500 }}> · {l.tamano}</span> : null}
              </span>
              {/* Los extras llegan ya formateados por el servidor
                  ("Queso (+0.50€)"): aquí no se recalcula nada. */}
              {l.extras?.length ? (
                <span style={{ display: 'block', fontSize: 11, color: C.stone, marginTop: 2, lineHeight: 1.35 }}>
                  {l.extras.join(' · ')}
                </span>
              ) : null}
            </span>

            <span style={{
              fontSize: 13, fontWeight: 700, color: C.ink, flexShrink: 0,
              fontVariantNumeric: 'tabular-nums', marginTop: 1,
            }}>{eur(l.importe)}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 16px',
        borderTop: '1px solid rgba(232,224,213,0.7)',
        background: 'rgba(255,107,44,0.05)',
      }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.stone }}>
          {enviado ? 'Se paga en la barra' : 'Total'}
        </span>
        <span style={{
          fontSize: 18, fontWeight: 850, color: C.marron,
          letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
        }}>{eur(cuenta.total)}</span>
      </div>

      {/* El latido del punto mientras se cocina. Respeta a quien haya pedido
          menos movimiento en su sistema: en una pantalla que se queda abierta
          en la mesa, un parpadeo eterno es exactamente lo que molesta. */}
      <style>{`@keyframes pcLate{0%,100%{opacity:1}50%{opacity:.45}}
@media(prefers-reduced-motion:reduce){@keyframes pcLate{0%,100%{opacity:1}}}`}</style>
    </div>
  )
}
