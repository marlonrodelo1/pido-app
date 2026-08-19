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
 * ⚠️ NO SE TOCA: no hay botones de quitar, ni de sumar, ni de editar. En el
 * momento en que la pantalla pudiera modificar el pedido con el dedo haría
 * falta estado de carrito en el navegador, que es exactamente lo que este
 * módulo mantiene fuera para que un `precio_local` no pueda acabar nunca en
 * `pedido_items`. Se habla, no se toca.
 * ────────────────────────────────────────────────────────────────────────── */

const C = {
  ink: '#1A1815', stone: '#6B6560', paper: '#FFFDF9',
  border: '#E8E0D5', naranja: '#FF6B2C', marron: '#8A3D10',
}

const eur = n => Number(n || 0).toFixed(2).replace('.', ',') + ' €'

export default function PanelCuenta({ cuenta }) {
  if (!cuenta?.hay_cuenta || !cuenta.lineas?.length) return null

  const enviado = cuenta.estado === 'enviado'
  const cancelado = cuenta.estado === 'cancelado'

  return (
    <div style={{
      width: '100%', maxWidth: 380,
      borderRadius: 18,
      // Sólido, no translúcido: encima del glaseado, un panel transparente
      // dejaría los importes peleando con las letras de la carta de detrás.
      // El dinero se lee o no se pone.
      background: C.paper,
      border: `1px solid ${cancelado ? '#E8D5D5' : C.border}`,
      boxShadow: '0 6px 24px rgba(26,24,21,0.10)',
      overflow: 'hidden',
      opacity: cancelado ? 0.72 : 1,
    }}>
      {/* Cabecera: dice en qué punto está la cuenta, sin obligar a leer nada más */}
      <div style={{
        padding: '9px 14px',
        background: enviado ? '#FFF1E8' : '#FBF7F1',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: 999, flexShrink: 0,
          background: cancelado ? '#B99' : enviado ? '#16A34A' : C.naranja,
        }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: C.marron, letterSpacing: '-0.01em' }}>
          {cancelado ? 'Pedido anulado' : enviado ? 'Pedido enviado a cocina' : 'Tu pedido'}
        </span>
        {enviado && cuenta.pedido_codigo && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: C.stone, fontVariantNumeric: 'tabular-nums' }}>
            {cuenta.pedido_codigo}
          </span>
        )}
      </div>

      {/* Líneas */}
      <div style={{ padding: '4px 14px' }}>
        {cuenta.lineas.map((l, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '9px 0',
            borderTop: i === 0 ? 'none' : `1px solid #F2ECE3`,
          }}>
            <span style={{
              minWidth: 22, height: 22, borderRadius: 7, flexShrink: 0,
              background: '#FFEADC', color: C.marron,
              fontSize: 11.5, fontWeight: 800, display: 'grid', placeItems: 'center',
              fontVariantNumeric: 'tabular-nums', marginTop: 1,
            }}>{l.cantidad}</span>

            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 650, color: C.ink, lineHeight: 1.3 }}>
                {l.nombre}
                {l.tamano ? <span style={{ color: C.stone, fontWeight: 500 }}> · {l.tamano}</span> : null}
              </span>
              {/* Los extras llegan ya formateados por el servidor
                  ("Queso (+0.50€)"): no se recalcula nada aquí. */}
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
        padding: '11px 14px', borderTop: `1px solid ${C.border}`, background: '#FBF7F1',
      }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.stone }}>Total</span>
        <span style={{
          fontSize: 17, fontWeight: 850, color: C.marron,
          letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums',
        }}>{eur(cuenta.total)}</span>
      </div>

      {enviado && (
        <div style={{
          padding: '8px 14px', fontSize: 11, color: C.stone,
          background: '#FFF8F3', borderTop: `1px solid ${C.border}`, textAlign: 'center',
        }}>
          Se paga en la barra
        </div>
      )}
    </div>
  )
}
