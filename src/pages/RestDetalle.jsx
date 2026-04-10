import { useState, useEffect } from 'react'
import { ArrowLeft, MapPin, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCart } from '../context/CartContext'
import Stars from '../components/Stars'

/* ─── ProductoCard ────────────────────────────────────────── */
function ProductoCard({ p, onOpen, carrito, tamanos = [] }) {
  const enCarrito = carrito.find(i => i.producto_id === p.id)
  const minPrecio = tamanos.length > 0 ? Math.min(...tamanos.map(t => t.precio)) : null

  return (
    <div style={{
      display: 'flex', gap: 14,
      padding: '16px', marginBottom: 12,
      background: 'rgba(255,255,255,0.08)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.1)',
    }}>
      {/* Imagen */}
      {p.imagen_url && (
        <img
          src={p.imagen_url}
          alt=""
          style={{
            width: 90, height: 90,
            borderRadius: 12, objectFit: 'cover', flexShrink: 0,
          }}
        />
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--c-text)', marginBottom: 4 }}>
            {p.nombre}
          </div>
          {p.descripcion && (
            <div style={{
              fontSize: 12, color: 'var(--c-muted)', lineHeight: 1.45,
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              marginBottom: 8,
            }}>
              {p.descripcion}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#FF6B2C' }}>
            {minPrecio !== null ? `Desde ${minPrecio.toFixed(2)} €` : `${p.precio.toFixed(2)} €`}
          </span>
          <button
            onClick={onOpen}
            style={{
              width: 36, height: 36, borderRadius: 12, border: 'none',
              background: enCarrito
                ? 'var(--c-btn-gradient)'
                : 'var(--c-btn-gradient)',
              color: '#fff',
              fontSize: 18, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            {enCarrito ? enCarrito.cantidad : '+'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── RestDetalle ─────────────────────────────────────────── */
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

  useEffect(() => { fetchCarta() }, [est.id])

  async function fetchCarta() {
    setLoading(true)
    const [catRes, prodRes, promosRes] = await Promise.all([
      supabase.from('categorias').select('*').eq('establecimiento_id', est.id).eq('activa', true).order('orden'),
      supabase.from('productos').select('*').eq('establecimiento_id', est.id).eq('disponible', true).order('orden'),
      supabase.from('promociones').select('*')
        .eq('establecimiento_id', est.id).eq('activa', true)
        .or('fecha_fin.is.null,fecha_fin.gt.' + new Date().toISOString()),
    ])
    setCategorias(catRes.data || [])
    setProductos(prodRes.data || [])
    setPromociones(promosRes.data || [])

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
    setModal(p); setCant(1); setExSel([]); setTamSel(null)
    const { data: tams } = await supabase.from('producto_tamanos').select('*').eq('producto_id', p.id).order('orden')
    setTamanos(tams || [])
    if (tams && tams.length > 0) setTamSel(0)
    const { data: prodExtras } = await supabase.from('producto_extras').select('grupo_id').eq('producto_id', p.id)
    if (prodExtras && prodExtras.length > 0) {
      const grupoIds = prodExtras.map(pe => pe.grupo_id)
      const { data: grupos } = await supabase.from('grupos_extras').select('*, extras_opciones(*)').in('id', grupoIds)
      setGruposExtras(grupos || [])
    } else {
      setGruposExtras([])
    }
  }

  function precioTotal() {
    if (!modal) return 0
    const base = tamSel !== null && tamanos[tamSel] ? tamanos[tamSel].precio : modal.precio
    return (base + exSel.reduce((s, e) => s + e.precio, 0)) * cant
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

      {/* ── Banner con botón volver superpuesto ── */}
      <div style={{ position: 'relative', marginBottom: 0 }}>
        <div
          className="banner-responsive"
          style={{
            height: 200, borderRadius: '22px 22px 0 0',
            background: est.banner_url
              ? `url(${est.banner_url}) center/cover`
              : 'linear-gradient(135deg, #FF6B2C 0%, #F76526 100%)',
          }}
        />
        {/* Gradient overlay top */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 80,
          background: 'linear-gradient(180deg, rgba(14,14,14,0.75) 0%, transparent 100%)',
          borderRadius: '22px 22px 0 0',
        }} />
        {/* Botón volver */}
        <button
          onClick={onBack}
          style={{
            position: 'absolute', top: 14, left: 14,
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            color: '#fff', padding: '7px 12px',
            borderRadius: 12, cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={15} strokeWidth={2.5} />
          Volver
        </button>
        {/* Logo superpuesto al banner */}
        {est.logo_url && (
          <div style={{
            position: 'absolute', bottom: -24, left: 16,
            width: 56, height: 56, borderRadius: 14,
            border: '3px solid #0E0E0E',
            overflow: 'hidden', background: 'rgba(255,255,255,0.08)',
            boxShadow: '0 4px 12px rgba(255,107,44,0.06)',
          }}>
            <img src={est.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
      </div>

      {/* ── Info del restaurante ── */}
      <div style={{
        background: '#0E0E0E',
        padding: est.logo_url ? '34px 16px 20px' : '20px 16px',
        marginBottom: 0,
      }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-text)', marginBottom: 6, letterSpacing: '-0.02em' }}>
          {est.nombre}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Stars rating={est.rating} size={13} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-primary-light)' }}>
            {est.rating?.toFixed(1)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--c-muted)' }}>({est.total_resenas} reseñas)</span>
        </div>
        {est.direccion && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--c-muted)', marginBottom: 6 }}>
            <MapPin size={13} strokeWidth={2} color="var(--c-muted)" />
            {est.direccion}
          </div>
        )}
        {est.descripcion && (
          <p style={{ fontSize: 13, color: 'var(--c-muted)', lineHeight: 1.5, marginTop: 4 }}>
            {est.descripcion}
          </p>
        )}
      </div>

      {/* ── Promociones ── */}
      {!loading && promociones.length > 0 && (
        <div style={{ padding: '16px 16px 0', background: '#0E0E0E' }}>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {promociones.map(promo => {
              const icon = promo.tipo === 'descuento_porcentaje' ? '🏷️'
                : promo.tipo === 'descuento_fijo' ? '💰'
                : promo.tipo === '2x1' ? '🔥' : '🎁'
              const badge = promo.tipo === 'descuento_porcentaje' ? `-${promo.valor}%`
                : promo.tipo === 'descuento_fijo' ? `-${promo.valor}€`
                : promo.tipo === '2x1' ? '2×1' : 'GRATIS'
              return (
                <div key={promo.id} style={{
                  minWidth: 190, flexShrink: 0,
                  padding: '14px 14px',
                  borderRadius: 12,
                  background: 'rgba(255,107,44,0.08)',
                  border: '1px solid rgba(255,107,44,0.2)',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                }}>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: '2px 7px',
                        borderRadius: 5, background: 'var(--c-primary)', color: '#fff',
                        letterSpacing: '0.03em',
                      }}>{badge}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text)', lineHeight: 1.3 }}>{promo.titulo}</div>
                    {promo.minimo_compra > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--c-muted)', marginTop: 2 }}>Min. {promo.minimo_compra}€</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Carta ── */}
      <div style={{ padding: '0 16px 16px', background: '#0E0E0E' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--c-muted)' }}>Cargando carta...</div>
        ) : (
          <>
            {/* Filtro categorías */}
            {categorias.length > 1 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '16px 0', marginBottom: 4 }}>
                <button
                  onClick={() => setCatFiltro(null)}
                  style={{
                    padding: '7px 16px', borderRadius: 20,
                    border: !catFiltro ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    background: !catFiltro ? 'var(--c-btn-gradient)' : 'rgba(255,255,255,0.08)',
                    color: !catFiltro ? '#fff' : 'var(--c-muted)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  Todos
                </button>
                {categorias.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCatFiltro(catFiltro === cat.id ? null : cat.id)}
                    style={{
                      padding: '7px 16px', borderRadius: 20,
                      border: catFiltro === cat.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      background: catFiltro === cat.id ? 'var(--c-btn-gradient)' : 'rgba(255,255,255,0.08)',
                      color: catFiltro === cat.id ? '#fff' : 'var(--c-muted)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>
            )}

            {/* Productos por categoría */}
            {categorias
              .filter(cat => !catFiltro || cat.id === catFiltro)
              .map(cat => {
                const prods = productos.filter(p => p.categoria_id === cat.id)
                if (prods.length === 0) return null
                return (
                  <div key={cat.id} style={{ marginBottom: 24 }}>
                    <h3 style={{
                      fontSize: 16, fontWeight: 700, color: 'var(--c-text)',
                      marginBottom: 12, marginTop: 8, letterSpacing: '-0.01em',
                    }}>
                      {cat.nombre}
                    </h3>
                    {prods.map(p => (
                      <ProductoCard
                        key={p.id} p={p}
                        onOpen={() => abrirProducto(p)}
                        carrito={carrito}
                        tamanos={prodTamanosMap[p.id] || []}
                      />
                    ))}
                  </div>
                )
              })}

            {/* Productos sin categoría */}
            {!catFiltro && productos
              .filter(p => !p.categoria_id)
              .map(p => (
                <ProductoCard
                  key={p.id} p={p}
                  onOpen={() => abrirProducto(p)}
                  carrito={carrito}
                  tamanos={prodTamanosMap[p.id] || []}
                />
              ))}
          </>
        )}
      </div>

      {/* ── Modal producto ── */}
      {modal && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 200, display: 'flex',
            alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setModal(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(20,20,20,0.95)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              borderRadius: '20px 20px 0 0',
              padding: '20px 20px 36px',
              width: '100%', maxWidth: 420,
              maxHeight: '88vh', overflowY: 'auto',
              animation: 'slideUp 0.3s ease',
              border: '1px solid rgba(255,255,255,0.1)',
              borderBottom: 'none',
              boxShadow: '0 12px 32px rgba(255,107,44,0.06)',
            }}
          >
            {/* Handle */}
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: 'rgba(255,255,255,0.1)', margin: '0 auto 20px',
            }} />

            {/* Imagen modal */}
            {modal.imagen_url && (
              <img
                src={modal.imagen_url}
                alt=""
                style={{
                  width: '100%', height: 180,
                  objectFit: 'cover', borderRadius: 12,
                  marginBottom: 16,
                }}
              />
            )}

            {/* Nombre y descripción */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.02em', flex: 1, marginRight: 12 }}>
                {modal.nombre}
              </h3>
              <button
                onClick={() => setModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: 'none',
                  width: 30, height: 30, borderRadius: 12,
                  cursor: 'pointer', color: 'var(--c-muted)',
                  fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
            {modal.descripcion && (
              <p style={{ fontSize: 13, color: 'var(--c-muted)', marginBottom: 20, lineHeight: 1.5 }}>
                {modal.descripcion}
              </p>
            )}

            {/* Tamaños */}
            {tamanos.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 11 }}>
                  Tamaño
                </div>
                {tamanos.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => setTamSel(i)}
                    style={{
                      display: 'flex', justifyContent: 'space-between',
                      width: '100%', padding: '13px 16px',
                      borderRadius: 14, marginBottom: 8,
                      border: tamSel === i
                        ? '1.5px solid var(--c-primary)'
                        : '1px solid rgba(255,255,255,0.1)',
                      background: tamSel === i ? 'rgba(255,107,44,0.08)' : 'rgba(255,255,255,0.08)',
                      backdropFilter: tamSel === i ? 'none' : 'blur(12px)',
                      WebkitBackdropFilter: tamSel === i ? 'none' : 'blur(12px)',
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--c-text)' }}>{t.nombre}</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--c-primary-light)' }}>{t.precio.toFixed(2)} €</span>
                  </button>
                ))}
              </div>
            )}

            {/* Extras */}
            {gruposExtras.map(g => (
              <div key={g.id} style={{ marginBottom: 20 }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {g.nombre}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 2 }}>
                    {g.tipo === 'single' ? 'Elige 1' : `Máx. ${g.max_selecciones}`}
                  </div>
                </div>
                {(g.extras_opciones || []).map(op => {
                  const sel = exSel.find(e => e.id === op.id)
                  return (
                    <button
                      key={op.id}
                      onClick={() => toggleExtra(op, g.max_selecciones)}
                      style={{
                        display: 'flex', justifyContent: 'space-between',
                        width: '100%', padding: '13px 16px',
                        borderRadius: 14, marginBottom: 8,
                        border: sel ? '1.5px solid var(--c-primary)' : '1px solid rgba(255,255,255,0.1)',
                        background: sel ? 'rgba(255,107,44,0.08)' : 'rgba(255,255,255,0.08)',
                        backdropFilter: sel ? 'none' : 'blur(12px)',
                        WebkitBackdropFilter: sel ? 'none' : 'blur(12px)',
                        cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 6,
                          border: sel ? 'none' : '1.5px solid rgba(255,255,255,0.1)',
                          background: sel ? 'var(--c-primary)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'all 0.15s ease',
                        }}>
                          {sel && <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 14, color: 'var(--c-text)', fontWeight: 500 }}>{op.nombre}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-primary-light)' }}>
                        +{op.precio.toFixed(2)} €
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}

            {/* Cantidad */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 24, marginBottom: 20,
              padding: '14px 0',
            }}>
              <button
                onClick={() => setCant(Math.max(1, cant - 1))}
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  fontSize: 20, cursor: 'pointer', fontFamily: 'inherit',
                  color: 'var(--c-text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                −
              </button>
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-text)', minWidth: 32, textAlign: 'center' }}>
                {cant}
              </span>
              <button
                onClick={() => setCant(cant + 1)}
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  border: 'none', background: 'var(--c-btn-gradient)',
                  color: '#fff', fontSize: 20, cursor: 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                +
              </button>
            </div>

            {/* Botón añadir */}
            <button
              onClick={confirmarItem}
              style={{
                width: '100%', padding: '16px 0',
                borderRadius: 12, border: 'none',
                background: 'var(--c-btn-gradient)',
                color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                letterSpacing: '0.01em',
              }}
            >
              Añadir al carrito — {precioTotal().toFixed(2)} €
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
