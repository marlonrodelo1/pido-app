import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

const ESTADO_COLORS = {
  entregado: { bg: '#DCFCE7', c: '#166534' },
  cancelado: { bg: '#FEE2E2', c: '#991B1B' },
  fallido: { bg: '#FEE2E2', c: '#991B1B' },
  nuevo: { bg: '#DBEAFE', c: '#1E40AF' },
  preparando: { bg: '#FEF3C7', c: '#92400E' },
  en_camino: { bg: '#DCFCE7', c: '#166534' },
}

export default function MisPedidos({ onTrack }) {
  const { user } = useAuth()
  const { addItem } = useCart()
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [repetido, setRepetido] = useState(null)

  useEffect(() => {
    if (user) fetchPedidos()
  }, [user])

  async function fetchPedidos() {
    setError(null)
    const hace90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data, error: queryError } = await supabase
      .from('pedidos')
      .select('*, establecimientos(nombre)')
      .eq('usuario_id', user.id)
      .gte('created_at', hace90d)
      .order('created_at', { ascending: false })
      .limit(50)
    if (queryError) {
      setError('No se pudieron cargar los pedidos')
      setLoading(false)
      return
    }
    setPedidos(data || [])
    setLoading(false)
  }

  async function repetirPedido(pedido) {
    const { data: items } = await supabase.from('pedido_items').select('*').eq('pedido_id', pedido.id)
    if (!items || items.length === 0) return
    for (const item of items) {
      addItem({
        producto_id: item.producto_id,
        establecimiento_id: pedido.establecimiento_id,
        establecimiento_nombre: pedido.establecimientos?.nombre || '',
        nombre: item.nombre_producto,
        precio_unitario: item.precio_unitario,
        cantidad: item.cantidad,
        tamano: item.tamano || null,
        extras: item.extras || null,
      })
    }
    setRepetido(pedido.id)
    setTimeout(() => setRepetido(null), 3000)
  }

  function formatFecha(f) {
    const d = new Date(f)
    const hoy = new Date()
    if (d.toDateString() === hoy.toDateString()) return `Hoy, ${d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1)
    if (d.toDateString() === ayer.toDateString()) return `Ayer, ${d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-text)', margin: '0 0 16px' }}>Mis pedidos</h2>
      {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--c-muted)' }}>Cargando...</div>}
      {error && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#EF4444', marginBottom: 12 }}>{error}</div>
          <button onClick={fetchPedidos} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid var(--c-border)', background: 'rgba(255,255,255,0.04)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--c-text)' }}>Reintentar</button>
        </div>
      )}
      {!loading && !error && pedidos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--c-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Aún no tienes pedidos</div>
        </div>
      )}
      {pedidos.map(p => {
        const colors = ESTADO_COLORS[p.estado] || ESTADO_COLORS.nuevo
        return (
          <div key={p.id} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--c-border)', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--c-text)' }}>{p.establecimientos?.nombre || 'Restaurante'}</span>
              <span style={{ background: colors.bg, color: colors.c, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, textTransform: 'capitalize' }}>{p.estado.replace('_', ' ')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--c-muted)', marginBottom: 4 }}>
              <span>{p.codigo}</span>
              <span>{p.metodo_pago === 'tarjeta' ? '💳' : '💵'} {p.metodo_pago}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--c-muted)' }}>
              <span>{formatFecha(p.created_at)}</span>
              <span style={{ fontWeight: 700, color: 'var(--c-text)' }}>{p.total.toFixed(2)} €</span>
            </div>
            {['nuevo', 'aceptado', 'preparando', 'listo', 'en_camino', 'recogido'].includes(p.estado) && (
              <button onClick={() => onTrack(p)} style={{
                width: '100%', marginTop: 10, padding: '8px 0', borderRadius: 8,
                border: 'none', background: 'var(--c-primary)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', color: '#fff',
              }}>Seguir pedido</button>
            )}
            {p.estado === 'entregado' && (
              <button onClick={() => repetirPedido(p)} style={{
                width: '100%', marginTop: 10, padding: '8px 0', borderRadius: 8,
                border: '1px solid var(--c-border)', background: repetido === p.id ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                color: repetido === p.id ? '#4ADE80' : 'var(--c-text)',
              }}>{repetido === p.id ? 'Añadido al carrito!' : 'Repetir pedido'}</button>
            )}
          </div>
        )
      })}
    </div>
  )
}
