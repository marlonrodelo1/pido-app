import { useState, useEffect } from 'react'
import { ArrowLeft, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCart } from '../context/CartContext'
import { estaAbierto } from '../lib/horario'

/* ─── ProductoCard ────────────────────────────────────────── */
function ProductoCard({ p, onOpen, onAddSimple, carrito, updateCantidad, tamanos = [], tieneExtras = false, cerrado = false, onIntentoCerrado }) {
  const enCarritoIdx = carrito.findIndex(i => i.producto_id === p.id)
  const enCarrito = enCarritoIdx >= 0 ? carrito[enCarritoIdx] : null
  const minPrecio = tamanos.length > 0 ? Math.min(...tamanos.map(t => t.precio)) : null
  const tieneConfig = tamanos.length > 0 || tieneExtras

  function handleIncrementar(e) {
    e.stopPropagation()
    if (cerrado) { onIntentoCerrado?.(); return }
    if (enCarrito && !tieneConfig) {
      updateCantidad(enCarritoIdx, enCarrito.cantidad + 1)
    } else if (tieneConfig) {
      onOpen()
    } else {
      onAddSimple(p)
    }
  }

  function handleDecrementar(e) {
    e.stopPropagation()
    if (!enCarrito) return
    updateCantidad(enCarritoIdx, enCarrito.cantidad - 1)
  }

  return (
    <div style={{
      display: 'flex', gap: 14, alignItems: 'stretch',
      padding: '12px', marginBottom: 10,
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.06)',
      cursor: 'pointer',
    }} onClick={cerrado ? onIntentoCerrado : onOpen}>
      {p.imagen_url && (
        <img
          src={p.imagen_url}
          alt=""
          style={{
            width: 86, height: 86,
            borderRadius: 12, objectFit: 'cover', flexShrink: 0,
          }}
        />
      )}

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--c-text)', marginBottom: 4, lineHeight: 1.25 }}>
            {p.nombre}
          </div>
          {p.descripcion && (
            <div style={{
              fontSize: 12, color: 'var(--c-muted)', lineHeight: 1.4,
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {p.descripcion}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#FF6B2C' }}>
            {minPrecio !== null ? `${minPrecio.toFixed(2)} €` : `${p.precio.toFixed(2)} €`}
          </span>

          {enCarrito ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button
                onClick={handleDecrementar}
                aria-label="Restar"
                style={{
                  width: 34, height: 34, borderRadius: 10, border: 'none',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'var(--c-text)', fontSize: 20, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >−</button>
              <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 800, fontSize: 15, color: 'var(--c-text)' }}>
                {enCarrito.cantidad}
              </span>
              <button
                onClick={handleIncrementar}
                aria-label="Sumar"
                style={{
                  width: 34, height: 34, borderRadius: 10, border: 'none',
                  background: 'var(--c-primary)',
                  color: '#fff', fontSize: 20, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >+</button>
            </div>
          ) : (
            <button
              onClick={handleIncrementar}
              aria-label="Añadir"
              style={{
                width: 36, height: 36, borderRadius: 11, border: 'none',
                background: 'var(--c-primary)',
                color: '#fff', fontSize: 22, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1,
              }}
            >+</button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── RestDetalle ─────────────────────────────────────────── */
export default function RestDetalle({ establecimiento, onBack }) {
  const { addItem, carrito, updateCantidad, totalItems, subtotal } = useCart()
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
  const [prodExtrasSet, setProdExtrasSet] = useState(new Set())
  const [ridersOnline, setRidersOnline] = useState(null)
  const [avisoCerrado, setAvisoCerrado] = useState(false)

  const est = establecimiento
  const estadoAbierto = estaAbierto(est)
  const cerrado = !estadoAbierto.abierto

  function mostrarAvisoCerrado() {
    setAvisoCerrado(true)
    setTimeout(() => setAvisoCerrado(false), 2800)
  }

  useEffect(() => { fetchCarta() }, [est.id])

  useEffect(() => {
    if (!est.id || !est.tiene_delivery) { setRidersOnline(null); return }
    let cancel = false
    supabase
      .from('drivers_status')
      .select('online_count')
      .eq('establecimiento_id', est.id)
      .maybeSingle()
      .then(({ data }) => { if (!cancel) setRidersOnline(data?.online_count ?? 0) })
    const channel = supabase
      .channel(`drivers_status_det_${est.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'drivers_status',
        filter: `establecimiento_id=eq.${est.id}`,
      }, (payload) => {
        if (!cancel) setRidersOnline(payload.new?.online_count ?? 0)
      })
      .subscribe()
    return () => { cancel = true; supabase.removeChannel(channel) }
  }, [est.id, est.tiene_delivery])

  const sinRiders = est.tiene_delivery && ridersOnline === 0

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
      const [{ data: tams }, { data: pexs }] = await Promise.all([
        supabase.from('producto_tamanos').select('producto_id, precio').in('producto_id', ids),
        supabase.from('producto_extras').select('producto_id').in('producto_id', ids),
      ])
      const map = {}
      for (const t of (tams || [])) {
        if (!map[t.producto_id]) map[t.producto_id] = []
        map[t.producto_id].push(t)
      }
      setProdTamanosMap(map)
      setProdExtrasSet(new Set((pexs || []).map(pe => pe.producto_id)))
    }
    setLoading(false)
  }

  async function abrirProducto(p) {
    if (cerrado) { mostrarAvisoCerrado(); return }
    setModal(p); setCant(1); setExSel([]); setTamSel(null)
    const { data: tams } = await supabase.from('producto_tamanos').select('*').eq('producto_id', p.id).order('orden')
    setTamanos(tams || [])
    if (tams && tams.length > 0) setTamSel(0)
    const { data: prodExtras } = await supabase.from('producto_extras').select('grupo_id').eq('producto_id', p.id)
    if (prodExtras && prodExtras.length > 0) {
      const grupoIds = prodExtras.map(pe => pe.grupo_id)
      const { data: grupos } = await supabase.from('grupos_extras').select('*, extras_opciones(*)').in('id', grupoIds)
      const grs = (grupos || []).map(g => ({
        ...g,
        extras_opciones: [...(g.extras_opciones || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0) || a.nombre.localeCompare(b.nombre)),
      })).sort((a, b) => a.nombre.localeCompare(b.nombre))
      setGruposExtras(grs)
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
    if (cerrado) { mostrarAvisoCerrado(); setModal(null); return }
    if (!puedeConfirmar) return
    // Agrupar opciones seleccionadas por grupo
    const extrasRich = gruposExtras
      .map(g => {
        const opciones = exSel
          .filter(e => e.grupo_id === g.id)
          .map(e => ({ id: e.id, nombre: e.nombre, precio: e.precio }))
        if (opciones.length === 0) return null
        return { grupo_id: g.id, grupo_nombre: g.nombre, opciones }
      })
      .filter(Boolean)
    addItem({
      producto_id: modal.id,
      nombre: modal.nombre,
      tamano: tamSel !== null && tamanos[tamSel] ? tamanos[tamSel].nombre : null,
      extras: extrasRich,
      precio_unitario: precioTotal() / cant,
      cantidad: cant,
      establecimiento_id: est.id,
      establecimiento_nombre: est.nombre,
      coste_envio: 0,
    })
    setModal(null)
  }

  function addItemSimple(p) {
    if (cerrado) { mostrarAvisoCerrado(); return }
    addItem({
      producto_id: p.id,
      nombre: p.nombre,
      tamano: null,
      extras: [],
      precio_unitario: p.precio,
      cantidad: 1,
      establecimiento_id: est.id,
      establecimiento_nombre: est.nombre,
      coste_envio: 0,
    })
  }

  function toggleExtra(op, grupo) {
    const opWithGrupo = { ...op, grupo_id: grupo.id }
    setExSel(prev => {
      if (grupo.tipo === 'unico') {
        // Radio: reemplaza cualquier opción previa de este grupo
        const sinEsteGrupo = prev.filter(e => e.grupo_id !== grupo.id)
        const yaSel = prev.find(e => e.grupo_id === grupo.id && e.id === op.id)
        if (yaSel) return sinEsteGrupo // deseleccionar tapping igual (aunque es obligatorio al confirmar)
        return [...sinEsteGrupo, opWithGrupo]
      }
      // multiple (checkboxes)
      const existe = prev.find(e => e.grupo_id === grupo.id && e.id === op.id)
      if (existe) return prev.filter(e => !(e.grupo_id === grupo.id && e.id === op.id))
      const enGrupo = prev.filter(e => e.grupo_id === grupo.id)
      const max = grupo.max_selecciones || 99
      if (enGrupo.length >= max) return prev
      return [...prev, opWithGrupo]
    })
  }

  function grupoValido(g) {
    if (g.tipo === 'unico') return exSel.some(e => e.grupo_id === g.id)
    return true
  }
  const puedeConfirmar = gruposExtras.every(grupoValido)

  // ¿Hay items del carrito que pertenecen a ESTE restaurante? (para mostrar botón "Ver carrito")
  const itemsDeEsteResto = carrito.filter(i => i.establecimiento_id === est.id)
  const totalDeEsteResto = itemsDeEsteResto.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0)
  const cantDeEsteResto = itemsDeEsteResto.reduce((s, i) => s + i.cantidad, 0)

  return (
    <div style={{ animation: 'slideIn 0.3s ease', paddingBottom: cantDeEsteResto > 0 ? 90 : 0 }}>

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
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 80,
          background: 'linear-gradient(180deg, rgba(14,14,14,0.75) 0%, transparent 100%)',
          borderRadius: '22px 22px 0 0',
        }} />
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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-text)', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>
            {est.nombre}
          </h2>
          {est.rating > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
              background: 'rgba(255,255,255,0.04)', padding: '4px 10px',
              borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 13 }}>⭐</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)' }}>
                {est.rating?.toFixed(1)}
              </span>
            </div>
          )}
        </div>
        {est.direccion && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--c-muted)', marginBottom: 8 }}>
            <MapPin size={13} strokeWidth={2} color="var(--c-muted)" />
            {est.direccion}
          </div>
        )}
        {est.descripcion && (
          <p style={{ fontSize: 13, color: 'var(--c-muted)', lineHeight: 1.5, margin: 0 }}>
            {est.descripcion}
          </p>
        )}
        {cerrado && (
          <div style={{
            marginTop: 12,
            padding: '10px 12px',
            borderRadius: 12,
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.35)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#F87171', lineHeight: 1.2 }}>
                Restaurante cerrado
              </div>
              <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 2, lineHeight: 1.35 }}>
                {estadoAbierto.proximaApertura || 'No se pueden realizar pedidos ahora mismo'}
              </div>
            </div>
          </div>
        )}
        {!cerrado && sinRiders && (
          <div style={{
            marginTop: 12,
            padding: '10px 12px',
            borderRadius: 12,
            background: 'rgba(251,191,36,0.12)',
            border: '1px solid rgba(251,191,36,0.35)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>🛵</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#FBBF24', lineHeight: 1.2 }}>
                Sin repartidores · Solo recogida
              </div>
              <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 2, lineHeight: 1.35 }}>
                Ahora mismo no hay repartidores disponibles. Puedes pedir para recoger tú.
              </div>
            </div>
          </div>
        )}
      </div>

      {avisoCerrado && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 300, padding: '10px 16px', borderRadius: 10,
          background: 'rgba(239,68,68,0.95)', color: '#fff',
          fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          animation: 'slideIn 0.25s ease',
          maxWidth: 'calc(100% - 40px)',
          textAlign: 'center',
        }}>
          Restaurante cerrado · No se puede pedir
        </div>
      )}

      {/* ── Promociones ── */}
      {!loading && promociones.length > 0 && (
        <div style={{ padding: '16px 0 0', background: '#0E0E0E' }}>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, paddingLeft: 16, paddingRight: 16 }}>
            {promociones.map(promo => {
              const badge = promo.tipo === 'descuento_porcentaje' ? `${promo.valor}% OFF`
                : promo.tipo === 'descuento_fijo' ? `-${promo.valor}€`
                : promo.tipo === '2x1' ? '2×1' : 'GRATIS'
              return (
                <div key={promo.id} style={{
                  minWidth: 220, flexShrink: 0,
                  padding: '14px 14px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{
                    display: 'inline-block', fontSize: 10, fontWeight: 800,
                    padding: '3px 8px', borderRadius: 6,
                    background: 'var(--c-primary)', color: '#fff',
                    letterSpacing: '0.04em', marginBottom: 8,
                  }}>{badge}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text)', lineHeight: 1.35 }}>
                    {promo.titulo}
                  </div>
                  {promo.minimo_compra > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--c-muted)', marginTop: 4 }}>Min. {promo.minimo_compra}€</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Carta ── */}
      <div style={{ padding: '0 8px 16px', background: '#0E0E0E' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--c-muted)' }}>Cargando carta...</div>
        ) : (
          <>
            {/* Filtro categorías */}
            {categorias.length > 1 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '16px 8px 8px', marginBottom: 4 }}>
                <button
                  onClick={() => setCatFiltro(null)}
                  style={{
                    padding: '8px 18px', borderRadius: 22,
                    border: 'none',
                    background: !catFiltro ? 'var(--c-primary)' : 'rgba(255,255,255,0.06)',
                    color: !catFiltro ? '#fff' : 'var(--c-text)',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
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
                      padding: '8px 18px', borderRadius: 22,
                      border: 'none',
                      background: catFiltro === cat.id ? 'var(--c-primary)' : 'rgba(255,255,255,0.06)',
                      color: catFiltro === cat.id ? '#fff' : 'var(--c-text)',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
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
                      marginBottom: 12, marginTop: 8, marginLeft: 4, letterSpacing: '-0.01em',
                    }}>
                      {cat.nombre}
                    </h3>
                    {prods.map(p => (
                      <ProductoCard
                        key={p.id} p={p}
                        onOpen={() => abrirProducto(p)}
                        onAddSimple={addItemSimple}
                        carrito={carrito}
                        updateCantidad={updateCantidad}
                        tamanos={prodTamanosMap[p.id] || []}
                        tieneExtras={prodExtrasSet.has(p.id)}
                        cerrado={cerrado}
                        onIntentoCerrado={mostrarAvisoCerrado}
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
                  onAddSimple={addItemSimple}
                  carrito={carrito}
                  updateCantidad={updateCantidad}
                  tamanos={prodTamanosMap[p.id] || []}
                  tieneExtras={prodExtrasSet.has(p.id)}
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
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: 'rgba(255,255,255,0.1)', margin: '0 auto 20px',
            }} />

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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--c-text)', letterSpacing: '-0.02em', flex: 1, marginRight: 12 }}>
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

            {tamanos.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text)', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
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
                      border: tamSel === i ? '1.5px solid var(--c-primary)' : '1px solid rgba(255,255,255,0.08)',
                      background: tamSel === i ? 'rgba(255,107,44,0.14)' : 'rgba(255,255,255,0.04)',
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--c-text)' }}>{t.nombre}</span>
                    <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--c-text)' }}>{t.precio.toFixed(2)} €</span>
                  </button>
                ))}
              </div>
            )}

            {gruposExtras.map(g => {
              const esUnico = g.tipo === 'unico' || g.tipo === 'single'
              const enGrupo = exSel.filter(e => e.grupo_id === g.id)
              const max = g.max_selecciones || 99
              const alcanzadoMax = !esUnico && enGrupo.length >= max
              return (
              <div key={g.id} style={{ marginBottom: 20 }}>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {g.nombre} {esUnico && <span style={{ color: '#FF6B2C' }}>*</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 2 }}>
                    {esUnico ? 'Elige 1 (obligatorio)' : `Máx. ${max}`}
                  </div>
                </div>
                {(g.extras_opciones || []).map(op => {
                  const sel = exSel.find(e => e.grupo_id === g.id && e.id === op.id)
                  const bloqueado = !sel && alcanzadoMax
                  return (
                    <button
                      key={op.id}
                      onClick={() => !bloqueado && toggleExtra(op, g)}
                      disabled={bloqueado}
                      style={{
                        display: 'flex', justifyContent: 'space-between',
                        width: '100%', padding: '13px 16px',
                        borderRadius: 14, marginBottom: 8,
                        border: sel ? '1.5px solid var(--c-primary)' : '1px solid rgba(255,255,255,0.08)',
                        background: sel ? 'rgba(255,107,44,0.14)' : 'rgba(255,255,255,0.04)',
                        cursor: bloqueado ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        opacity: bloqueado ? 0.45 : 1,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: esUnico ? 10 : 6,
                          border: sel ? 'none' : '1.5px solid rgba(255,255,255,0.12)',
                          background: sel ? 'var(--c-primary)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'all 0.15s ease',
                        }}>
                          {sel && (esUnico
                            ? <span style={{ width: 8, height: 8, borderRadius: 4, background: '#fff' }} />
                            : <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>✓</span>
                          )}
                        </div>
                        <span style={{ fontSize: 14, color: 'var(--c-text)', fontWeight: 500 }}>{op.nombre}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)' }}>
                        {op.precio > 0 ? `+${op.precio.toFixed(2)} €` : 'Gratis'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )})}

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 24, marginBottom: 20,
              padding: '14px 0',
            }}>
              <button
                onClick={() => setCant(Math.max(1, cant - 1))}
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
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
                  border: 'none', background: 'var(--c-primary)',
                  color: '#fff', fontSize: 20, cursor: 'pointer',
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                +
              </button>
            </div>

            <button
              onClick={confirmarItem}
              disabled={!puedeConfirmar}
              style={{
                width: '100%', padding: '16px 0',
                borderRadius: 12, border: 'none',
                background: puedeConfirmar ? 'var(--c-primary)' : 'rgba(255,255,255,0.08)',
                color: puedeConfirmar ? '#fff' : 'rgba(255,255,255,0.4)',
                fontSize: 15, fontWeight: 800,
                cursor: puedeConfirmar ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                letterSpacing: '0.01em',
              }}
            >
              {puedeConfirmar
                ? `Añadir al carrito — ${precioTotal().toFixed(2)} €`
                : 'Selecciona las opciones obligatorias'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
