// TiendaDesktop.jsx
// Vista desktop (≥1024px) de la tienda pública del restaurante (pidoo.es/<slug>).
// Layout de 3 columnas: sidebar categorías · grid productos · carrito sticky.
//
// IMPORTANTE: reutiliza CartContext + AuthContext + queries de Supabase.
// La lógica de checkout (Stripe, validación de dirección, etc.) sigue viviendo
// en Carrito.jsx — al pulsar "Pagar" abrimos el modal de Carrito existente.

import { useState, useEffect, useMemo, useRef } from 'react'
import { Star, MapPin, Clock, Phone, Mail, ShoppingCart, Plus, Minus, Trash2, Lock, UtensilsCrossed, Bike, ShoppingBag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { estaAbierto } from '../lib/horario'
import { FoodIcon } from '../lib/food'

// Paleta tipo design system (DESIGN.md cream/terracotta/sage)
const C = {
  cream: '#F7F3EC',
  cream2: '#EFE9DD',
  paper: '#FBF8F2',
  ink: '#1A1815',
  ink2: '#2B2823',
  stone: '#6B6356',
  stone2: '#8A8174',
  terracotta: '#C5562C',
  terracotta2: '#A8451F',
  terracottaSoft: '#F1D9CC',
  sage: '#8B9D7A',
  sage2: '#6F8460',
  sageSoft: '#DDE3D3',
  warning: '#C99551',
  warningSoft: '#F0E1C8',
  danger: '#B5564A',
  dangerSoft: '#F1D0CB',
  border: '#E8E1D3',
}

const SH = {
  sm: '0 1px 2px rgba(26,24,21,0.06)',
  md: '0 4px 14px rgba(26,24,21,0.08)',
  lg: '0 12px 32px rgba(26,24,21,0.10)',
  glossy: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 10px rgba(0,0,0,0.18)',
}

const fmt = (n) => `${(n || 0).toFixed(2).replace('.', ',')} €`

/* ─── Modal de producto con tamaños y extras ───────────────── */
function ProductoModal({ p, est, onClose, onAdded, cerrado, getPrecio }) {
  const { addItem } = useCart()
  const { user } = useAuth()
  const [tamanos, setTamanos] = useState([])
  const [grupos, setGrupos] = useState([])
  const [tamSel, setTamSel] = useState(null)
  const [exSel, setExSel] = useState([])
  const [cant, setCant] = useState(1)

  useEffect(() => {
    if (!p?.id) return
    let cancel = false
    ;(async () => {
      const { data: tams } = await supabase.from('producto_tamanos')
        .select('*').eq('producto_id', p.id).order('orden')
      if (cancel) return
      setTamanos(tams || [])
      if (tams && tams.length > 0) setTamSel(0)

      const { data: prodExtras } = await supabase.from('producto_extras')
        .select('grupo_id').eq('producto_id', p.id)
      if (cancel) return
      if (prodExtras && prodExtras.length > 0) {
        const grupoIds = prodExtras.map(pe => pe.grupo_id)
        const { data: grupos } = await supabase.from('grupos_extras')
          .select('*, extras_opciones(*)').in('id', grupoIds)
        if (cancel) return
        const grs = (grupos || []).map(g => ({
          ...g,
          extras_opciones: [...(g.extras_opciones || [])].sort(
            (a, b) => (a.orden || 0) - (b.orden || 0) || a.nombre.localeCompare(b.nombre)
          ),
        })).sort((a, b) => a.nombre.localeCompare(b.nombre))
        setGrupos(grs)
      }
    })()
    return () => { cancel = true }
  }, [p?.id])

  function toggleExtra(op, grupo) {
    const opWithGrupo = { ...op, grupo_id: grupo.id }
    setExSel(prev => {
      if (grupo.tipo === 'unico' || grupo.tipo === 'single') {
        const sinEsteGrupo = prev.filter(e => e.grupo_id !== grupo.id)
        const yaSel = prev.find(e => e.grupo_id === grupo.id && e.id === op.id)
        if (yaSel) return sinEsteGrupo
        return [...sinEsteGrupo, opWithGrupo]
      }
      const existe = prev.find(e => e.grupo_id === grupo.id && e.id === op.id)
      if (existe) return prev.filter(e => !(e.grupo_id === grupo.id && e.id === op.id))
      const enGrupo = prev.filter(e => e.grupo_id === grupo.id)
      const max = grupo.max_selecciones || 99
      if (enGrupo.length >= max) return prev
      return [...prev, opWithGrupo]
    })
  }

  function grupoValido(g) {
    if (g.tipo === 'unico' || g.tipo === 'single') return exSel.some(e => e.grupo_id === g.id)
    return true
  }
  const puedeConfirmar = grupos.every(grupoValido)

  const base = tamSel !== null && tamanos[tamSel] ? tamanos[tamSel].precio : (getPrecio ? getPrecio(p) : p.precio)
  const precioTotal = (base + exSel.reduce((s, e) => s + e.precio, 0)) * cant

  function confirmar() {
    if (cerrado) return
    if (!puedeConfirmar) return
    const extrasRich = grupos.map(g => {
      const opciones = exSel
        .filter(e => e.grupo_id === g.id)
        .map(e => ({ id: e.id, nombre: e.nombre, precio: e.precio }))
      if (opciones.length === 0) return null
      return { grupo_id: g.id, grupo_nombre: g.nombre, opciones }
    }).filter(Boolean)
    const item = {
      producto_id: p.id,
      nombre: p.nombre,
      tamano: tamSel !== null && tamanos[tamSel] ? tamanos[tamSel].nombre : null,
      extras: extrasRich,
      precio_unitario: precioTotal / cant,
      cantidad: cant,
      establecimiento_id: est.id,
      establecimiento_nombre: est.nombre,
      coste_envio: 0,
    }
    if (!user) {
      try { localStorage.setItem('pido_pending_cart_item', JSON.stringify(item)) } catch (_) {}
      onAdded?.({ requireLogin: true })
      return
    }
    addItem(item)
    onAdded?.()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 250,
        background: 'rgba(26,24,21,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.paper, borderRadius: 18,
          width: '92vw', maxWidth: 540, maxHeight: '88vh', overflowY: 'auto',
          boxShadow: SH.lg, border: `1px solid ${C.border}`,
        }}
      >
        {p.imagen_url && (
          <img src={p.imagen_url} alt="" style={{
            width: '100%', height: 220, objectFit: 'cover',
            borderRadius: '18px 18px 0 0',
          }}/>
        )}
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 8 }}>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: 0, letterSpacing: '-0.01em' }}>{p.nombre}</h3>
            <button onClick={onClose} style={{
              width: 32, height: 32, borderRadius: 8, border: 'none',
              background: C.cream2, color: C.stone, cursor: 'pointer',
              fontSize: 18, lineHeight: 1, flexShrink: 0,
            }}>×</button>
          </div>
          {p.descripcion && (
            <p style={{ fontSize: 13, color: C.stone, lineHeight: 1.5, marginBottom: 20 }}>{p.descripcion}</p>
          )}

          {tamanos.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Tamaño</div>
              {tamanos.map((t, i) => (
                <button key={t.id} onClick={() => setTamSel(i)} style={{
                  display: 'flex', justifyContent: 'space-between', width: '100%',
                  padding: '12px 14px', borderRadius: 12, marginBottom: 6,
                  border: tamSel === i ? `1.5px solid ${C.terracotta}` : `1px solid ${C.border}`,
                  background: tamSel === i ? C.terracottaSoft : C.cream,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{t.nombre}</span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: C.ink }}>{fmt(t.precio)}</span>
                </button>
              ))}
            </div>
          )}

          {grupos.map(g => {
            const esUnico = g.tipo === 'unico' || g.tipo === 'single'
            const enGrupo = exSel.filter(e => e.grupo_id === g.id)
            const max = g.max_selecciones || 99
            const alcanzadoMax = !esUnico && enGrupo.length >= max
            return (
              <div key={g.id} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                  {g.nombre} {esUnico && <span style={{ color: C.terracotta }}>*</span>}
                </div>
                <div style={{ fontSize: 11, color: C.stone, marginBottom: 8 }}>
                  {esUnico ? 'Elige 1 (obligatorio)' : `Máx. ${max}`}
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
                        display: 'flex', justifyContent: 'space-between', width: '100%',
                        padding: '12px 14px', borderRadius: 12, marginBottom: 6,
                        border: sel ? `1.5px solid ${C.terracotta}` : `1px solid ${C.border}`,
                        background: sel ? C.terracottaSoft : C.cream,
                        cursor: bloqueado ? 'not-allowed' : 'pointer',
                        opacity: bloqueado ? 0.45 : 1, fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ fontSize: 14, color: C.ink, fontWeight: 500 }}>{op.nombre}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
                        {op.precio > 0 ? `+${fmt(op.precio)}` : 'Gratis'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 12, marginBottom: 18 }}>
            <button onClick={() => setCant(Math.max(1, cant - 1))} style={{
              width: 40, height: 40, borderRadius: 10, border: `1px solid ${C.border}`,
              background: C.cream, color: C.ink, fontSize: 20, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>−</button>
            <span style={{ fontSize: 20, fontWeight: 800, color: C.ink, minWidth: 28, textAlign: 'center' }}>{cant}</span>
            <button onClick={() => setCant(cant + 1)} style={{
              width: 40, height: 40, borderRadius: 10, border: 'none',
              background: C.terracotta, color: '#fff', fontSize: 20, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>+</button>
          </div>

          <button
            onClick={confirmar}
            disabled={!puedeConfirmar || cerrado}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
              background: puedeConfirmar && !cerrado ? `linear-gradient(180deg, ${C.ink2}, ${C.ink})` : C.cream2,
              color: puedeConfirmar && !cerrado ? '#fff' : C.stone,
              fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
              cursor: puedeConfirmar && !cerrado ? 'pointer' : 'not-allowed',
              boxShadow: puedeConfirmar && !cerrado ? SH.glossy : 'none',
            }}
          >
            {cerrado
              ? 'Restaurante cerrado'
              : puedeConfirmar
                ? `Añadir al carrito · ${fmt(precioTotal)}`
                : 'Selecciona las opciones obligatorias'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── ProductCardDesktop ──────────────────────────────────── */
function ProductCardDesktop({ p, est, onAddSimple, onOpenModal, carrito, updateCantidad, hasConfig, cerrado, getPrecio }) {
  const enCarritoIdx = carrito.findIndex(i => i.producto_id === p.id)
  const enCarrito = enCarritoIdx >= 0 ? carrito[enCarritoIdx] : null
  const precio = getPrecio ? getPrecio(p) : p.precio

  function handleAdd(e) {
    e.stopPropagation()
    if (cerrado) return
    if (hasConfig) {
      onOpenModal(p)
    } else if (enCarrito) {
      updateCantidad(enCarritoIdx, enCarrito.cantidad + 1)
    } else {
      onAddSimple(p)
    }
  }

  function handleMinus(e) {
    e.stopPropagation()
    if (!enCarrito) return
    updateCantidad(enCarritoIdx, enCarrito.cantidad - 1)
  }

  return (
    <div
      onClick={hasConfig ? () => onOpenModal(p) : undefined}
      style={{
        background: C.paper, borderRadius: 14, padding: 14,
        border: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        cursor: cerrado ? 'default' : (hasConfig ? 'pointer' : 'default'),
        opacity: cerrado ? 0.65 : 1,
        transition: 'transform .15s, box-shadow .15s',
        position: 'relative', minHeight: 220,
      }}
      onMouseEnter={e => { if (!cerrado) e.currentTarget.style.boxShadow = SH.md }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{
        width: '100%', aspectRatio: '1.4', borderRadius: 10,
        background: C.cream2, marginBottom: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {p.imagen_url
          ? <img src={p.imagen_url} alt={p.nombre} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          : <div style={{ transform: 'scale(1.2)' }}><FoodIcon kw={p.nombre} size={86}/></div>
        }
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>{p.nombre}</div>
      {p.descripcion && (
        <div style={{
          fontSize: 12, color: C.stone, marginTop: 4, lineHeight: 1.45, flex: 1,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{p.descripcion}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <span style={{ fontSize: 18, color: C.terracotta, fontWeight: 800 }}>{fmt(precio)}</span>
        {enCarrito && !hasConfig ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={handleMinus} style={{
              width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`,
              background: C.cream, color: C.ink, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}><Minus size={14}/></button>
            <span style={{ minWidth: 22, textAlign: 'center', fontWeight: 800, fontSize: 14, color: C.ink }}>{enCarrito.cantidad}</span>
            <button onClick={handleAdd} style={{
              width: 32, height: 32, borderRadius: 8, border: 'none',
              background: C.terracotta, color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}><Plus size={14}/></button>
          </div>
        ) : (
          <button
            onClick={handleAdd}
            disabled={cerrado}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: cerrado ? C.cream2 : `linear-gradient(180deg, ${C.ink2}, ${C.ink})`,
              color: cerrado ? C.stone2 : '#fff',
              border: 'none', cursor: cerrado ? 'not-allowed' : 'pointer',
              boxShadow: cerrado ? 'none' : SH.glossy,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          ><Plus size={16}/></button>
        )}
      </div>
    </div>
  )
}

/* ─── CategoriaSidebar ────────────────────────────────────── */
function CategoriaSidebar({ categorias, productos, activeId, onChange }) {
  return (
    <aside style={{ position: 'sticky', top: 20, width: 196, flexShrink: 0, alignSelf: 'flex-start' }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: C.stone, textTransform: 'uppercase',
        letterSpacing: '0.06em', marginBottom: 10, padding: '0 12px',
      }}>Categorías</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div
          onClick={() => onChange(null)}
          style={{
            padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
            background: !activeId ? C.cream2 : 'transparent',
            color: !activeId ? C.ink : C.stone,
            fontWeight: !activeId ? 600 : 500, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderLeft: !activeId ? `3px solid ${C.terracotta}` : '3px solid transparent',
            transition: 'all .15s',
          }}
        >
          <span>Todos</span>
          <span style={{ fontSize: 11, color: C.stone2, fontWeight: 600 }}>{productos.length}</span>
        </div>
        {categorias.map(cat => {
          const n = productos.filter(p => p.categoria_id === cat.id).length
          if (n === 0) return null
          const isActive = cat.id === activeId
          return (
            <div
              key={cat.id}
              onClick={() => onChange(cat.id)}
              style={{
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                background: isActive ? C.cream2 : 'transparent',
                color: isActive ? C.ink : C.stone,
                fontWeight: isActive ? 600 : 500, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderLeft: isActive ? `3px solid ${C.terracotta}` : '3px solid transparent',
                transition: 'all .15s',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.nombre}</span>
              <span style={{ fontSize: 11, color: C.stone2, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{n}</span>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

/* ─── CartSticky (carrito persistente columna derecha) ─────── */
function CartSticky({ est, deliveryDisponible, cerrado, onCheckout }) {
  const {
    carrito, removeItem, updateCantidad, totalItems,
    subtotal, envio, total, propina,
    modoEntrega, setModoEntrega, elegirEntrega,
  } = useCart()
  const itemsDeEsteResto = carrito.filter(i => i.establecimiento_id === est.id)
  const cantDeEsteResto = itemsDeEsteResto.reduce((s, i) => s + i.cantidad, 0)
  const subtotalEsteResto = itemsDeEsteResto.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0)
  const vacio = cantDeEsteResto === 0

  // Si no hay reparto disponible, forzar recogida (evita un carrito en modo
  // delivery cuando solo se puede recoger).
  useEffect(() => {
    if (!deliveryDisponible && modoEntrega === 'delivery') elegirEntrega('recogida')
  }, [deliveryDisponible, modoEntrega])

  return (
    <aside style={{ position: 'sticky', top: 20, width: 336, flexShrink: 0, alignSelf: 'flex-start' }}>
      <div style={{
        background: C.paper, borderRadius: 16, overflow: 'hidden',
        boxShadow: SH.md, border: `1px solid ${C.border}`,
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${C.cream2}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.ink }}>Tu pedido</div>
          {!vacio && (
            <div style={{
              fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 999,
              background: C.terracottaSoft, color: C.terracotta2,
            }}>{cantDeEsteResto}</div>
          )}
        </div>

        {vacio ? (
          <div style={{ padding: '50px 24px', textAlign: 'center', color: C.stone2 }}>
            <ShoppingCart size={42} strokeWidth={1.5}/>
            <div style={{ fontSize: 14, marginTop: 14, fontWeight: 700, color: C.stone }}>Tu carrito está vacío</div>
            <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
              Añade productos del catálogo para empezar.
            </div>
          </div>
        ) : (
          <>
            {/* Selector entrega */}
            <div style={{ padding: 12, display: 'flex', gap: 6, background: C.cream }}>
              {deliveryDisponible ? (
                <>
                  <button
                    onClick={() => elegirEntrega('delivery')}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 10,
                      border: modoEntrega === 'delivery' ? `1.5px solid ${C.terracotta}` : `1px solid ${C.border}`,
                      background: modoEntrega === 'delivery' ? C.terracottaSoft : C.paper,
                      color: modoEntrega === 'delivery' ? C.terracotta2 : C.ink,
                      fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  ><Bike size={13}/> Delivery</button>
                  <button
                    onClick={() => elegirEntrega('recogida')}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 10,
                      border: modoEntrega === 'recogida' ? `1.5px solid ${C.terracotta}` : `1px solid ${C.border}`,
                      background: modoEntrega === 'recogida' ? C.terracottaSoft : C.paper,
                      color: modoEntrega === 'recogida' ? C.terracotta2 : C.ink,
                      fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  ><ShoppingBag size={13}/> Recogida</button>
                </>
              ) : (
                <div style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  border: `1.5px solid ${C.terracotta}`, background: C.terracottaSoft,
                  color: C.terracotta2, fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}><ShoppingBag size={13}/> Solo recogida</div>
              )}
            </div>

            {/* Items */}
            <div style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 320, overflowY: 'auto' }}>
              {itemsDeEsteResto.map((it) => {
                const idx = carrito.indexOf(it)
                const extrasTxt = (() => {
                  if (!it.extras || it.extras.length === 0) return null
                  if (typeof it.extras[0] === 'object' && it.extras[0] !== null && 'opciones' in it.extras[0]) {
                    return it.extras.flatMap(g => (g.opciones || []).map(o => o.nombre)).join(' · ')
                  }
                  return it.extras.join(' · ')
                })()
                return (
                  <div key={`${it.producto_id}-${idx}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, background: C.cream2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      overflow: 'hidden',
                    }}>
                      <div style={{ transform: 'scale(0.5)', transformOrigin: 'center', display: 'flex' }}>
                        <FoodIcon kw={it.nombre} size={86}/>
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {it.nombre}{it.tamano ? ` · ${it.tamano}` : ''}
                      </div>
                      {extrasTxt && (
                        <div style={{ fontSize: 10, color: C.stone, marginTop: 2, lineHeight: 1.3,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {extrasTxt}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <button onClick={() => updateCantidad(idx, it.cantidad - 1)} style={{
                          width: 22, height: 22, borderRadius: '50%', border: `1px solid ${C.border}`,
                          background: C.paper, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink,
                        }}><Minus size={10}/></button>
                        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 16, textAlign: 'center', color: C.ink }}>{it.cantidad}</span>
                        <button onClick={() => updateCantidad(idx, it.cantidad + 1)} style={{
                          width: 22, height: 22, borderRadius: '50%', border: 'none',
                          background: C.terracotta, color: '#fff', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}><Plus size={10}/></button>
                        <button
                          onClick={() => removeItem(idx)}
                          title="Eliminar"
                          style={{
                            width: 22, height: 22, borderRadius: '50%', border: 'none',
                            background: 'transparent', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: C.stone2, marginLeft: 'auto',
                          }}
                        ><Trash2 size={12}/></button>
                      </div>
                    </div>
                    <span style={{ fontSize: 13, color: C.terracotta, fontWeight: 800, minWidth: 56, textAlign: 'right' }}>
                      {fmt(it.precio_unitario * it.cantidad)}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Totales */}
            <div style={{ padding: 16, borderTop: `1px solid ${C.cream2}`, background: C.cream }}>
              <ResLine label="Subtotal" value={fmt(subtotalEsteResto)}/>
              {modoEntrega === 'delivery' && envio > 0 && <ResLine label="Envío" value={fmt(envio)}/>}
              {propina > 0 && <ResLine label="Propina" value={fmt(propina)}/>}
              <div style={{ height: 1, background: C.border, margin: '10px 0' }}/>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700, color: C.ink, fontSize: 14 }}>Total</span>
                <span style={{ fontSize: 22, color: C.ink, fontWeight: 800 }}>{fmt(total)}</span>
              </div>
              <button
                onClick={cerrado ? undefined : onCheckout}
                disabled={cerrado}
                style={{
                  width: '100%', marginTop: 14, padding: '14px 0', borderRadius: 12,
                  border: 'none', background: cerrado ? C.cream2 : C.terracotta,
                  color: cerrado ? C.stone : '#fff', fontSize: 15, fontWeight: 800, fontFamily: 'inherit',
                  cursor: cerrado ? 'not-allowed' : 'pointer', boxShadow: cerrado ? 'none' : SH.glossy,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  letterSpacing: '0.01em',
                }}
              >
                <Lock size={14}/> {cerrado ? 'Restaurante cerrado' : `Pagar ${fmt(total)}`}
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}

function ResLine({ label, value, tone }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
      <span style={{ color: C.stone }}>{label}</span>
      <span style={{ color: tone === 'sage' ? C.sage2 : C.ink, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

/* ─── HeroBannerWide ──────────────────────────────────────── */
function HeroBannerWide({ est }) {
  const tagline = [est.tipo, est.direccion?.split(',').slice(-2, -1)?.[0]?.trim()].filter(Boolean).join(' · ')
  return (
    <div style={{ position: 'relative', height: 228, overflow: 'hidden' }}>
      {est.banner_url ? (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            background: `url(${est.banner_url}) center/cover`,
          }}/>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(26,24,21,0.0) 0%, rgba(26,24,21,0.35) 100%)',
          }}/>
        </>
      ) : (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(135deg, ${C.terracotta} 0%, ${C.terracotta2} 100%)`,
          }}/>
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.18 }}>
            <circle cx="120" cy="60" r="120" fill="#fff"/>
            <circle cx="700" cy="140" r="160" fill="#fff" opacity="0.4"/>
            <circle cx="500" cy="240" r="80" fill="#fff" opacity="0.3"/>
            <circle cx="950" cy="80" r="110" fill="#fff" opacity="0.5"/>
          </svg>
        </>
      )}
      {tagline && (
        <div style={{
          position: 'absolute', inset: 0, padding: 28,
          color: '#fff', display: 'flex', alignItems: 'flex-end',
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
            textTransform: 'uppercase', opacity: 0.92,
            textShadow: '0 1px 2px rgba(0,0,0,0.25)',
          }}>{tagline}</div>
        </div>
      )}
    </div>
  )
}

/* ─── TiendaDesktop ───────────────────────────────────────── */
export default function TiendaDesktop({ establecimiento, onCheckout, onRequireLogin }) {
  const { user } = useAuth()
  const { addItem, carrito, updateCantidad } = useCart()
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [promociones, setPromociones] = useState([])
  const [loading, setLoading] = useState(true)
  const [catFiltro, setCatFiltro] = useState(null)
  const [prodTamanosMap, setProdTamanosMap] = useState({})
  const [prodExtrasSet, setProdExtrasSet] = useState(new Set())
  const [modalProd, setModalProd] = useState(null)
  const [toast, setToast] = useState(null)
  const [tieneDeliveryLive, setTieneDeliveryLive] = useState(establecimiento.tiene_delivery)

  const est = establecimiento
  const estadoAbierto = estaAbierto(est)
  const cerrado = !estadoAbierto.abierto

  // Precio único (el trigger trg_sync_precio_tienda mantiene precio_tienda_publica := precio)
  const getPrecioMostrado = (p) => Number(p.precio)

  // Realtime tiene_delivery
  useEffect(() => {
    setTieneDeliveryLive(est.tiene_delivery)
    if (!est.id) return
    let cancel = false
    function refetch() {
      supabase.from('establecimientos').select('tiene_delivery').eq('id', est.id).maybeSingle()
        .then(({ data }) => { if (!cancel && data) setTieneDeliveryLive(!!data.tiene_delivery) })
    }
    const channel = supabase
      .channel(`est_live_desktop_${est.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'establecimientos',
        filter: `id=eq.${est.id}`,
      }, (payload) => {
        if (!cancel && payload?.new) setTieneDeliveryLive(!!payload.new.tiene_delivery)
      })
      .subscribe()
    function onVisible() { if (document.visibilityState === 'visible') refetch() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      cancel = true
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [est.id, est.tiene_delivery])

  // Verificación socio Shipday
  useEffect(() => {
    if (!est.id) return
    supabase.functions.invoke('check-socio-availability-now', { body: { establecimiento_id: est.id } }).catch(() => {})
  }, [est.id])

  // Restaurar item pendiente tras login
  useEffect(() => {
    if (!user) return
    let raw
    try { raw = localStorage.getItem('pido_pending_cart_item') } catch (_) { return }
    if (!raw) return
    let item
    try { item = JSON.parse(raw) } catch (_) { localStorage.removeItem('pido_pending_cart_item'); return }
    if (!item || item.establecimiento_id !== est.id) return
    addItem(item)
    try { localStorage.removeItem('pido_pending_cart_item') } catch (_) {}
    showToast('Producto añadido al carrito')
  }, [user, est.id])

  // Fetch carta
  useEffect(() => {
    let cancel = false
    async function fetchCarta() {
      setLoading(true)
      const [catRes, prodRes, promosRes] = await Promise.all([
        supabase.from('categorias').select('*').eq('establecimiento_id', est.id).eq('activa', true).order('orden'),
        supabase.from('productos').select('*').eq('establecimiento_id', est.id).eq('disponible', true).order('orden'),
        supabase.from('promociones').select('*').eq('establecimiento_id', est.id).eq('activa', true)
          .or('fecha_fin.is.null,fecha_fin.gt.' + new Date().toISOString()),
      ])
      if (cancel) return
      setCategorias(catRes.data || [])
      setProductos(prodRes.data || [])
      setPromociones(promosRes.data || [])

      const ids = (prodRes.data || []).map(p => p.id)
      if (ids.length > 0) {
        const [{ data: tams }, { data: pexs }] = await Promise.all([
          supabase.from('producto_tamanos').select('producto_id, precio').in('producto_id', ids),
          supabase.from('producto_extras').select('producto_id').in('producto_id', ids),
        ])
        if (cancel) return
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
    fetchCarta()
    return () => { cancel = true }
  }, [est.id])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function guardarPendingItem(item) {
    try { localStorage.setItem('pido_pending_cart_item', JSON.stringify(item)) } catch (_) {}
    onRequireLogin?.()
  }

  function addItemSimple(p) {
    if (cerrado) return
    const item = {
      producto_id: p.id,
      nombre: p.nombre,
      tamano: null, extras: [],
      precio_unitario: getPrecioMostrado(p),
      cantidad: 1,
      establecimiento_id: est.id,
      establecimiento_nombre: est.nombre,
      coste_envio: 0,
    }
    if (!user) { guardarPendingItem(item); return }
    addItem(item)
    showToast('Producto añadido al carrito')
  }

  // Productos visibles según filtro
  const productosVisibles = useMemo(() => {
    if (catFiltro) return productos.filter(p => p.categoria_id === catFiltro)
    return productos
  }, [productos, catFiltro])

  const productosPorCategoria = useMemo(() => {
    const map = new Map()
    for (const cat of categorias) {
      const arr = productosVisibles.filter(p => p.categoria_id === cat.id)
      if (arr.length > 0) map.set(cat, arr)
    }
    const sinCat = productosVisibles.filter(p => !p.categoria_id)
    if (sinCat.length > 0) map.set({ id: null, nombre: 'Otros' }, sinCat)
    return map
  }, [productosVisibles, categorias])

  const deliveryDisponible = tieneDeliveryLive

  return (
    <div style={{
      minHeight: '100vh',
      background: C.cream,
      color: C.ink,
      fontFamily: "'Plus Jakarta Sans', 'DM Sans', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeInUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        .desktop-product-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(185px, 1fr)); }
        @media (min-width: 1300px) {
          .desktop-product-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1600px) {
          .desktop-product-grid { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>

      {/* Hero */}
      <HeroBannerWide est={est}/>

      {/* Contenido */}
      <div style={{ maxWidth: 1380, margin: '0 auto', padding: '0 clamp(20px, 3vw, 32px)', marginTop: -54 }}>
        {/* Identidad restaurante */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22 }}>
          <div style={{
            width: 110, height: 110, borderRadius: '50%',
            background: '#fff', border: `5px solid ${C.cream}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: SH.md, overflow: 'hidden', flexShrink: 0,
          }}>
            {est.logo_url
              ? <img src={est.logo_url} alt={est.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
              : <div style={{ transform: 'scale(0.9)' }}><FoodIcon kw={est.tipo || ''} size={70}/></div>
            }
          </div>
          <div style={{ flex: 1, paddingBottom: 12 }}>
            <h1 style={{
              fontSize: 32, fontWeight: 800, color: C.ink, margin: 0,
              letterSpacing: '-0.02em', lineHeight: 1.1,
            }}>{est.nombre}</h1>
            {(est.tipo || est.direccion) && (
              <div style={{
                fontSize: 12, color: C.stone, marginTop: 4,
                fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>
                {est.tipo}{est.tipo && est.direccion ? ' · ' : ''}{est.direccion?.split(',')[0]}
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              <Chip tone={cerrado ? 'danger' : 'sage'} dot>
                {cerrado ? (estadoAbierto.proximaApertura || 'Cerrado') : 'Abierto'}
              </Chip>
              {est.rating > 0 && (
                <Chip tone="paper">
                  <Star size={11} fill={C.warning} color={C.warning} style={{ marginRight: 2 }}/>
                  {est.rating.toFixed(1)}
                </Chip>
              )}
              {deliveryDisponible && <Chip tone="paper"><Bike size={11} style={{ marginRight: 4 }}/> Delivery</Chip>}
              <Chip tone={deliveryDisponible ? 'paper' : 'warning'}><ShoppingBag size={11} style={{ marginRight: 4 }}/> {deliveryDisponible ? 'Recogida' : 'Solo recogida'}</Chip>
            </div>
          </div>
        </div>

        {/* Banners de estado */}
        {cerrado && (
          <BannerEstado tono="danger" icon={<Clock size={22}/>}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.danger }}>{est.nombre} está cerrado</div>
            <div style={{ fontSize: 13, color: C.danger, opacity: 0.85 }}>
              {estadoAbierto.proximaApertura || 'No se pueden realizar pedidos ahora mismo.'} Mientras tanto, puedes ver la carta.
            </div>
          </BannerEstado>
        )}
        {!cerrado && !deliveryDisponible && (
          <BannerSoloRecogida />
        )}

        {/* Promociones */}
        {promociones.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 24, overflowX: 'auto', paddingBottom: 4 }}>
            {promociones.map(promo => {
              const badge = promo.tipo === 'descuento_porcentaje' ? `${promo.valor}% OFF`
                : promo.tipo === 'descuento_fijo' ? `-${promo.valor}€`
                : promo.tipo === '2x1' ? '2×1' : 'GRATIS'
              return (
                <div key={promo.id} style={{
                  minWidth: 240, flexShrink: 0, padding: 14,
                  borderRadius: 14, background: C.paper, border: `1px solid ${C.border}`,
                }}>
                  <div style={{
                    display: 'inline-block', fontSize: 10, fontWeight: 800,
                    padding: '3px 8px', borderRadius: 6,
                    background: C.terracotta, color: '#fff',
                    letterSpacing: '0.04em', marginBottom: 8,
                  }}>{badge}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>{promo.titulo}</div>
                  {promo.minimo_compra > 0 && (
                    <div style={{ fontSize: 11, color: C.stone, marginTop: 4 }}>Min. {promo.minimo_compra}€</div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Layout 3 columnas */}
        <div style={{
          display: 'flex', gap: 'clamp(18px, 1.8vw, 28px)', marginTop: 28, alignItems: 'flex-start',
          filter: cerrado ? 'grayscale(0.45)' : 'none',
          paddingBottom: 48,
        }}>
          <CategoriaSidebar
            categorias={categorias}
            productos={productos}
            activeId={catFiltro}
            onChange={setCatFiltro}
          />

          {/* Columna central */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {loading ? (
              <div style={{ padding: 60, textAlign: 'center', color: C.stone }}>Cargando carta...</div>
            ) : productos.length === 0 ? (
              <div style={{
                background: C.paper, borderRadius: 16, padding: 60,
                textAlign: 'center', border: `1px solid ${C.border}`,
              }}>
                <div style={{
                  width: 88, height: 88, borderRadius: '50%', background: C.cream2,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  color: C.stone2, marginBottom: 18,
                }}>
                  <UtensilsCrossed size={42} strokeWidth={1.5}/>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>
                  Este restaurante todavía no tiene productos en su carta
                </div>
                <div style={{ fontSize: 14, color: C.stone, marginTop: 8, maxWidth: 420, margin: '8px auto 0' }}>
                  Vuelve más tarde. Estamos preparando todo para que puedas pedir cuanto antes.
                </div>
              </div>
            ) : (
              <>
                {Array.from(productosPorCategoria.entries()).map(([cat, prods]) => (
                  <div key={cat.id || 'otros'} style={{ marginBottom: 32 }} id={`cat-${cat.id || 'otros'}`}>
                    <h2 style={{
                      fontSize: 22, fontWeight: 800, color: C.ink,
                      margin: '0 0 14px', letterSpacing: '-0.01em',
                    }}>{cat.nombre}</h2>
                    <div className="desktop-product-grid">
                      {prods.map(p => (
                        <ProductCardDesktop
                          key={p.id}
                          p={p}
                          est={est}
                          onAddSimple={addItemSimple}
                          onOpenModal={(prod) => setModalProd(prod)}
                          carrito={carrito}
                          updateCantidad={updateCantidad}
                          hasConfig={(prodTamanosMap[p.id] || []).length > 0 || prodExtrasSet.has(p.id)}
                          cerrado={cerrado}
                          getPrecio={getPrecioMostrado}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {/* Footer info */}
                <div style={{
                  background: C.paper, borderRadius: 16, padding: 24,
                  marginTop: 16, border: `1px solid ${C.border}`,
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                    {est.direccion && (
                      <div>
                        <SectionLabel><MapPin size={11}/> Dirección</SectionLabel>
                        <div style={{ fontSize: 13, color: C.ink, fontWeight: 600, marginTop: 6 }}>
                          {est.direccion}
                        </div>
                      </div>
                    )}
                    {est.horario && (
                      <div>
                        <SectionLabel><Clock size={11}/> Horarios</SectionLabel>
                        <HorariosRender horario={est.horario}/>
                      </div>
                    )}
                    {(est.telefono || est.email) && (
                      <div>
                        <SectionLabel>Contacto</SectionLabel>
                        {est.telefono && (
                          <div style={{ fontSize: 13, color: C.ink, fontWeight: 600, marginTop: 6,
                            display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Phone size={12}/> {est.telefono}
                          </div>
                        )}
                        {est.email && (
                          <div style={{ fontSize: 12, color: C.stone, fontFamily: 'ui-monospace, monospace',
                            marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Mail size={12}/> {est.email}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Columna derecha: carrito */}
          <CartSticky
            est={est}
            deliveryDisponible={deliveryDisponible}
            cerrado={cerrado}
            onCheckout={() => onCheckout?.()}
          />
        </div>
      </div>

      {/* Modal de producto */}
      {modalProd && (
        <ProductoModal
          p={modalProd}
          est={est}
          cerrado={cerrado}
          getPrecio={getPrecioMostrado}
          onClose={() => setModalProd(null)}
          onAdded={(opts) => {
            setModalProd(null)
            if (opts?.requireLogin) {
              onRequireLogin?.()
            } else {
              showToast('Producto añadido al carrito')
            }
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 28, left: '50%', transform: 'translateX(-50%)',
          zIndex: 400, padding: '10px 18px', borderRadius: 12,
          background: C.ink, color: '#fff', fontSize: 13, fontWeight: 700,
          boxShadow: SH.lg, animation: 'fadeInUp 0.25s ease',
        }}>{toast}</div>
      )}
    </div>
  )
}

/* ─── Helpers visuales ─────────────────────────────────────── */
function Chip({ children, tone, dot }) {
  const styles = {
    sage: { background: C.sageSoft, color: C.sage2 },
    danger: { background: C.dangerSoft, color: C.danger },
    paper: { background: C.paper, color: C.ink, border: `1px solid ${C.border}` },
    warning: { background: C.warningSoft, color: '#8B6126' },
  }[tone] || { background: C.cream2, color: C.stone }
  const dotColor = tone === 'sage' ? C.sage : tone === 'danger' ? C.danger : C.terracotta
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 700, padding: '4px 10px',
      borderRadius: 999, ...styles,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor }}/>}
      {children}
    </span>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: C.stone,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>{children}</div>
  )
}

// Banner glossy "Solo recogida" — cuando el restaurante no tiene reparto disponible.
function BannerSoloRecogida() {
  return (
    <div style={{
      marginTop: 22,
      padding: '15px 18px',
      borderRadius: 16,
      background: 'linear-gradient(135deg, rgba(201,149,81,0.20) 0%, rgba(201,149,81,0.07) 55%, rgba(255,255,255,0.35) 100%)',
      border: '1px solid rgba(201,149,81,0.38)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65), 0 8px 26px rgba(201,149,81,0.16)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: 'linear-gradient(160deg, #D6A864 0%, #B9863F 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), 0 4px 10px rgba(168,69,31,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
      }}>
        <ShoppingBag size={21} strokeWidth={2.2}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: '#7A5A1E', letterSpacing: '-0.01em' }}>Solo recogida</div>
        <div style={{ fontSize: 12.5, color: '#8B6B30', opacity: 0.92, marginTop: 2, lineHeight: 1.4 }}>
          Este restaurante no tiene reparto a domicilio ahora mismo. Haz tu pedido y pásate a recogerlo cuando esté listo.
        </div>
      </div>
    </div>
  )
}

function BannerEstado({ tono, icon, children }) {
  const bg = tono === 'danger' ? C.dangerSoft : C.warningSoft
  const fg = tono === 'danger' ? C.danger : '#8B6126'
  return (
    <div style={{
      marginTop: 22, padding: 16, borderRadius: 14,
      background: bg, border: 'none',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ color: fg, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

function HorariosRender({ horario }) {
  // horario es JSONB con formato { lun: [{open, close}], mar: [...] } etc.
  if (!horario || typeof horario !== 'object') return null
  const dias = [
    ['lun', 'Lun'], ['mar', 'Mar'], ['mie', 'Mié'], ['jue', 'Jue'],
    ['vie', 'Vie'], ['sab', 'Sáb'], ['dom', 'Dom'],
  ]
  return (
    <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.6, marginTop: 6 }}>
      {dias.map(([key, label]) => {
        const slots = horario[key]
        if (!slots || (Array.isArray(slots) && slots.length === 0)) {
          return <div key={key}><b style={{ color: C.stone }}>{label}</b> · Cerrado</div>
        }
        const txt = Array.isArray(slots)
          ? slots.map(s => `${s.open}–${s.close}`).join(' · ')
          : slots
        return <div key={key}><b style={{ color: C.stone, fontWeight: 600 }}>{label}</b> · {txt}</div>
      })}
    </div>
  )
}
