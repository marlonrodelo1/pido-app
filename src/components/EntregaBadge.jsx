const MODOS = {
  reparto: { l: 'Delivery', bg: '#DCFCE7', c: '#166534', i: '🛵' },
  recogida: { l: 'Recogida', bg: '#FEF3C7', c: '#92400E', i: '🏪' },
  ambos: { l: 'Delivery y recogida', bg: '#DBEAFE', c: '#1E40AF', i: '🛵' },
}

export default function EntregaBadge({ modo }) {
  const m = MODOS[modo] || MODOS.ambos
  return (
    <span style={{
      background: m.bg, color: m.c, fontSize: 9, fontWeight: 700,
      padding: '3px 7px', borderRadius: 6,
      display: 'inline-flex', alignItems: 'center', gap: 3
    }}>
      {m.i} {m.l}
    </span>
  )
}
