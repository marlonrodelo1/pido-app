import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useCart } from '../context/CartContext'
import Stars from '../components/Stars'
import EntregaBadge from '../components/EntregaBadge'

function ProductoCard({ p, onOpen, carrito, tamanos = [] }) {
  const enCarrito = carrito.find(i => i.producto_id === p.id)
  const minPrecio = tamanos.length > 0 ? Math.min(...tamanos.map(t => t.precio)) : null
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
      {p.imagen_url && <img src={p.imagen_url} alt="" style={{ width: 50, height: 50, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--c-text)', marginBottom: 2 }}>{p.nombre}</div>
        {p.descripcion && <div style={{ fontSize: 12, color: 'var(--c-muted)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.descripcion}</div>}
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--c-primary)' }}>
          {minPrecio !== null ? `Desde ${minPrecio.toFixed(2)} €` : `${p.precio.toFixed(2)} €`}
        </div>
      </div>
      <button onClick={onOpen} style={{
        width: 44, height: 44, borderRadius: 10, border: 'none',
        background: enCarrito ? 'var(--c-primary)' : 'rgba(255,255,255,0.08)',
        color: enCarrito ? '#fff' : 'var(--c-primary)',
        fontSize: 20, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {enCarrito ? enCarrito.cantidad : '+'}
      </button>
    </div>
  )
}

export default function RestDetalle({ establecimiento, onBack }) {
  const { addItem, carrito } = useCart()
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [promociones, setPromociones] = useState([])
  const [modal, setModal] = useState(null)
  const [tamanos, setTamanos] = useState([])
  const [gruposExtras, setGruposExtras] = useState([])
  const [tamSel, setTamSel] = useState(null)
  const [exSel, setExSel] = useState([])
  const [cant, setCant] = useState(1)
  const [loading, setLoading] = useState(true)
  const [catFiltro, setCatFiltro] = useState(null)
  const [prodTamanosMap, setProdTamanosMap] = useState({})

  const est = establecimiento

  useEffect(() => {
    fetchCarta()
  }, [est.id])

  async function fetchCarta() {
    setLoading(true)
    const [catRes, prodRes, promosRes] = await Promise.all([
      supabase.from('categorias').select('*').eq('establecimiento_id', est.id).eq('activa', true).order('orden'),
      supabase.from('productos').select('*').eq('establecimiento_id', est.id).eq('disponible', true).order('orden'),
      supabase.from('promociones').select('*')
        .eq('establecimiento_id', est.id)
        .eq('activa', true)
        .or('fecha_fin.is.null,fecha_fin.gt.' + new Date().toISOString()),
    ])
    setCategorias(catRes.data || [])
    setProductos(prodRes.data || [])
    setPromociones(promosRes.data || [])
    // Cargar tamaños de todos los productos para mostrar "Desde X€" en la lista
    const ids = (prodRes.data || []).map(p => p.id)
    if (ids.length > 0) {
      const { data: tams } = await supabase.from('producto_tamanos').select('producto_id, precio').in('producto_id', ids)
      const map = {}
      for (const t of (tams || [])) {
        if (!map[t.producto_id]) map[t.producto_id] = []
        map[t.producto_id].push(t)
      }
      setProdTamanosMap(map)
    }
    setLoading(false)
  }

  async function abrirProducto(p) {
    setModal(p)
    setCant(1)
    setExSel([])
    setTamSel(null)

    // Cargar tamaños
    const { data: tams } = await supabase
      .from('producto_tamanos')
      .select('*')
      .eq('producto_id', p.id)
      .order('orden')
    setTamanos(tams || [])
    if (tams && tams.length > 0) setTamSel(0)

    // Cargar extras
    const { data: prodExtras } = await supabase
      .from('producto_extras')
      .select('grupo_id')
      .eq('producto_id', p.id)

    if (prodExtras && prodExtras.length > 0) {
      const grupoIds = prodExtras.map(pe => pe.grupo_id)
      const { data: grupos } = await supabase
        .from('grupos_extras')
        .select('*, extras_opciones(*)')
        .in('id', grupoIds)
      setGruposExtras(grupos || [])
    } else {
      setGruposExtras([])
    }
  }

  function precioTotal() {
    if (!modal) return 0
    const base = tamSel !== null && tamanos[tamSel] ? tamanos[tamSel].precio : modal.precio
    const extrasTotal = exSel.reduce((s, e) => s + e.precio, 0)
    return (base + extrasTotal) * cant
  }

  function confirmarItem() {
    addItem({
      producto_id: modal.id,
      nombre: modal.nombre,
      tamano: tamSel !== null && tamanos[tamSel] ? tamanos[tamSel].nombre : null,
      extras: exSel.map(e => e.nombre),
      precio_unitario: precioTotal() / cant,
      cantidad: cant,
      establecimiento_id: est.id,
      establecimiento_nombre: est.nombre,
      coste_envio: 0,
    })
    setModal(null)
  }

  function toggleExtra(op, max) {
    setExSel(prev => {
      if (prev.find(e => e.id === op.id)) return prev.filter(e => e.id !== op.id)
      if (prev.length >= max) return prev
      return [...prev, op]
    })
  }

  return (
    <div style={{ animation: 'slideIn 0.3s ease' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--c-primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16, padding: 0, fontFamily: 'inherit' }}>← Volver</button>

      {/* Banner */}
      <div className="banner-responsive" style={{
        height: 150, borderRadius: 16, marginBottom: 16,
        background: est.banner_url ? `url(${est.banner_url}) center/cover` : 'linear-gradient(135deg, var(--c-primary-light), var(--c-primary-soft))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52,
      }}>
        {est.logo_url ? <img src={est.logo_url} alt="" style={{ width: 70, height: 70, borderRadius: 18, objectFit: 'cover' }} /> : '🍽️'}
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-text)', margin: '0 0 4px' }}>{est.nombre}</h2>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: 'var(--c-muted)', marginBottom: 4, flexWrap: 'wrap' }}>
        <Stars rating={est.rating} />
        <span>({est.total_resenas})</span>
        <span>📍 {est.direccion}</span>
      </div>
      {est.descripcion && <p style={{ fontSize: 12, color: 'var(--c-muted)', marginBottom: 12 }}>{est.descripcion}</p>}

      {/* Promociones del restaurante */}
      {!loading && promociones.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {promociones.map(promo => {
              const icon = promo.tipo === 'descuento_porcentaje' ? '🏷️' : promo.tipo === 'descuento_fijo' ? '💰' : promo.tipo === '2x1' ? '🔥' : '🎁'
              const badge = promo.tipo === 'descuento_porcentaje' ? `-${promo.valor}%`
                : promo.tipo === 'descuento_fijo' ? `-${promo.valor}€`
                : promo.tipo === '2x1' ? '2x1' : 'GRATIS'
              return (
                <div key={promo.id} style={{
                  minWidth: 200, padding: '14px 16px', borderRadius: 14, flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(255,107,44,0.15), rgba(255,107,44,0.05))',
                  border: '1px solid rgba(255,107,44,0.25)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 22 }}>{icon}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                      background: 'var(--c-primary)', color: '#fff',
                    }}>{badge}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', marginBottom: 2, lineHeight: 1.3 }}>{promo.titulo}</div>
                  {promo.descripcion && <div style={{ fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.3 }}>{promo.descripcion}</div>}
                  {promo.minimo_compra > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--c-muted)', marginTop: 4 }}>Min. {promo.minimo_compra}€</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Carta */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--c-muted)' }}>Cargando carta...</div>
      ) : (
        <>
          {/* Filtro por categorías */}
          {categorias.length > 1 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
              <button onClick={() => setCatFiltro(null)} style={{ padding: '7px 14px', borderRadius: 50, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', background: !catFiltro ? 'var(--c-primary)' : 'rgba(255,255,255,0.08)', color: !catFiltro ? '#fff' : 'rgba(255,255,255,0.5)' }}>Todos</button>
              {categorias.map(cat => (
                <button key={cat.id} onClick={() => setCatFiltro(catFiltro === cat.id ? null : cat.id)} style={{ padding: '7px 14px', borderRadius: 50, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', background: catFiltro === cat.id ? 'var(--c-primary)' : 'rgba(255,255,255,0.08)', color: catFiltro === cat.id ? '#fff' : 'rgba(255,255,255,0.5)' }}>{cat.nombre}</button>
              ))}
            </div>
          )}

          {categorias.filter(cat => !catFiltro || cat.id === catFiltro).map(cat => {
            const prods = productos.filter(p => p.categoria_id === cat.id)
            if (prods.length === 0) return null
            return (
              <div key={cat.id} style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--c-text)', marginBottom: 10 }}>{cat.nombre}</h3>
                {prods.map(p => <ProductoCard key={p.id} p={p} onOpen={() => abrirProducto(p)} carrito={carrito} tamanos={prodTamanosMap[p.id] || []} />)}
              </div>
            )
          })}
          {!catFiltro && productos.filter(p => !p.categoria_id).map(p => <ProductoCard key={p.id} p={p} onOpen={() => abrirProducto(p)} carrito={carrito} tamanos={prodTamanosMap[p.id] || []} />)}
        </>
      )}

      {/* Modal producto */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setModal(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ background: 'var(--c-bg)', borderRadius: '24px 24px 0 0', padding: '24px 20px 32px', width: '100%', maxWidth: 420, maxHeight: '85vh', overflowY: 'auto', animation: 'slideUp 0.3s ease', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--c-text)' }}>{modal.nombre}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--c-muted)' }}>×</button>
            </div>
            {modal.descripcion && <p style={{ fontSize: 12, color: 'var(--c-muted)', marginBottom: 16 }}>{modal.descripcion}</p>}

            {/* Tamaños */}
            {tamanos.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', marginBottom: 8 }}>Tamaño</div>
                {tamanos.map((t, i) => (
                  <button key={t.id} onClick={() => setTamSel(i)} style={{
                    display: 'flex', justifyContent: 'space-between', width: '100%', padding: '12px 14px',
                    borderRadius: 10, marginBottom: 6,
                    border: tamSel === i ? '2px solid var(--c-primary)' : '1px solid var(--c-border)',
                    background: tamSel === i ? 'var(--c-primary-light)' : 'var(--c-surface)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-text)' }}>{t.nombre}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--c-primary)' }}>{t.precio.toFixed(2)} €</span>
                  </button>
                ))}
              </div>
            )}

            {/* Extras */}
            {gruposExtras.map(g => (
              <div key={g.id} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', marginBottom: 4 }}>{g.nombre}</div>
                <div style={{ fontSize: 10, color: 'var(--c-muted)', marginBottom: 8 }}>
                  {g.tipo === 'single' ? 'Elige 1' : `Máx. ${g.max_selecciones}`}
                </div>
                {(g.extras_opciones || []).map(op => {
                  const sel = exSel.find(e => e.id === op.id)
                  return (
                    <button key={op.id} onClick={() => toggleExtra(op, g.max_selecciones)} style={{
                      display: 'flex', justifyContent: 'space-between', width: '100%', padding: '10px 14px',
                      borderRadius: 10, marginBottom: 6,
                      border: sel ? '2px solid var(--c-primary)' : '1px solid var(--c-border)',
                      background: sel ? 'var(--c-primary-light)' : 'var(--c-surface)',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 5,
                          border: sel ? 'none' : '2px solid var(--c-border)',
                          background: sel ? 'var(--c-primary)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{sel && <span style={{ color: '#fff', fontSize: 10, fontWeight: 800 }}>✓</span>}</div>
                        <span style={{ fontSize: 13, color: 'var(--c-text)' }}>{op.nombre}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-primary)' }}>+{op.precio.toFixed(2)} €</span>
                    </button>
                  )
                })}
              </div>
            ))}

            {/* Cantidad */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
              <button onClick={() => setCant(Math.max(1, cant - 1))} style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid var(--c-border)', background: 'rgba(255,255,255,0.08)', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--c-text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-text)', minWidth: 32, textAlign: 'center' }}>{cant}</span>
              <button onClick={() => setCant(cant + 1)} style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: 'var(--c-primary)', color: '#fff', fontSize: 18, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>

            <button onClick={confirmarItem} style={{ width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', background: 'var(--c-primary)', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              Añadir — {precioTotal().toFixed(2)} €
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
