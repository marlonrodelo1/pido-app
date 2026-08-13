// TiendaDesktop.jsx
// Vista desktop (≥1024px) de la tienda pública del restaurante (pidoo.es/<slug>).
//
// Estructura (referencia: Uber Eats / Glovo en escritorio):
//   fila superior → panel de identidad (izq, 300px) + banner dentro de la caja (dcha)
//   fila inferior → navegación de categorías (izq, sticky) · carta · carrito (dcha, sticky)
//
// Decisiones que NO son estéticas:
//  · Las categorías NAVEGAN (anclas + scroll-spy), no filtran. Filtrar escondía
//    el resto de la carta, que es justo lo que el cliente viene a ver.
//  · Un producto SIN foto no pinta ilustración de relleno: con 24 fotos de 86
//    productos (Mamma Mia) o 0 de 53 (Octava Isla), el relleno convertía la
//    carta en un muro de iconos idénticos. Sin foto, el texto ocupa la tarjeta.
//  · El selector Entrega/Recogida vive ARRIBA y siempre visible. Antes estaba
//    dentro del carrito y solo aparecía con productos ya añadidos.
//
// IMPORTANTE: reutiliza CartContext + AuthContext + queries de Supabase.
// La lógica de checkout (Stripe, validación de dirección, etc.) sigue viviendo
// en Carrito.jsx — al pulsar "Pagar" abrimos el modal de Carrito existente.

import { useState, useEffect, useMemo, useRef } from 'react'
import { Star, MapPin, Clock, Phone, Mail, ShoppingCart, Plus, Minus, Trash2, Lock, UtensilsCrossed, Bike, ShoppingBag, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { estaAbierto, DIAS_ORDEN, DIAS_CORTO } from '../lib/horario'
import { FoodIcon } from '../lib/food'
import { permiteInvitado } from '../lib/invitado'

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

// Quita tildes y baja a minúsculas para que "jamon" encuentre "jamón".
const norm = (s) => (s || '')
  .toString()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')

const TIPO_LABEL = {
  restaurante: 'Restaurante',
  pizzeria: 'Pizzería',
  minimarket: 'Minimarket',
  farmacia: 'Farmacia',
  cafeteria: 'Cafetería',
}

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
      imagen_url: p.imagen_url || null,
      tamano: tamSel !== null && tamanos[tamSel] ? tamanos[tamSel].nombre : null,
      extras: extrasRich,
      precio_unitario: precioTotal / cant,
      cantidad: cant,
      establecimiento_id: est.id,
      establecimiento_nombre: est.nombre,
      coste_envio: 0,
    }
    // En una tienda que acepta invitados se añade al carrito sin más: pedir
    // cuenta para poder mirar la carta es lo que tira la venta.
    if (!user && !permiteInvitado(est)) {
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

/* ─── ProductRow ───────────────────────────────────────────────
   Tarjeta horizontal: texto a la izquierda, foto pequeña a la derecha.
   Sin foto NO se pinta hueco — el texto ocupa toda la tarjeta. */
function ProductRow({ p, onAddSimple, onOpenModal, carrito, updateCantidad, hasConfig, cerrado, getPrecio }) {
  const enCarritoIdx = carrito.findIndex(i => i.producto_id === p.id)
  const enCarrito = enCarritoIdx >= 0 ? carrito[enCarritoIdx] : null
  const precio = getPrecio ? getPrecio(p) : p.precio
  // Una URL de foto rota dejaría un cuadrado gris vacío, que se ve peor que no
  // tener foto. Si falla la carga, la tarjeta pasa a texto a todo el ancho.
  const [fotoRota, setFotoRota] = useState(false)
  const tieneFoto = !!p.imagen_url && !fotoRota

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
      className="td-card"
      onClick={cerrado ? undefined : () => onOpenModal(p)}
      style={{
        background: C.paper, borderRadius: 14,
        border: `1px solid ${C.border}`,
        padding: 14, minHeight: 124,
        display: 'flex', gap: 14, alignItems: 'flex-start',
        position: 'relative',
        cursor: cerrado ? 'default' : 'pointer',
        opacity: cerrado ? 0.6 : 1,
        transition: 'box-shadow .15s, border-color .15s',
      }}
    >
      <div style={{
        flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
        // hueco para que el botón + / el contador no pisen el precio
        paddingRight: tieneFoto ? 0 : 52,
      }}>
        <div style={{
          fontSize: 15, fontWeight: 700, color: C.ink, lineHeight: 1.3,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{p.nombre}</div>
        {p.descripcion && (
          <div style={{
            fontSize: 12.5, color: C.stone, marginTop: 5, lineHeight: 1.45,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>{p.descripcion}</div>
        )}
        <div style={{ flex: 1, minHeight: 8 }}/>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 16, color: C.ink, fontWeight: 800 }}>{fmt(precio)}</span>
          {hasConfig && (
            <span style={{ fontSize: 11, color: C.stone2, fontWeight: 600 }}>· opciones</span>
          )}
        </div>
      </div>

      {tieneFoto && (
        <div style={{
          width: 104, height: 104, borderRadius: 12, flexShrink: 0,
          background: C.cream2, overflow: 'hidden',
        }}>
          <img
            src={p.imagen_url} alt={p.nombre} loading="lazy"
            onError={() => setFotoRota(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* Acción: + o contador. Superpuesto abajo a la derecha (como Uber). */}
      <div style={{ position: 'absolute', right: 10, bottom: 10 }}>
        {enCarrito && !hasConfig ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: C.paper, borderRadius: 999, padding: 3,
            border: `1px solid ${C.border}`, boxShadow: SH.sm,
          }}>
            <button onClick={handleMinus} aria-label="Quitar uno" style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: C.cream2, color: C.ink, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Minus size={13}/></button>
            <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 800, fontSize: 13, color: C.ink }}>{enCarrito.cantidad}</span>
            <button onClick={handleAdd} aria-label="Añadir uno" style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: C.terracotta, color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Plus size={13}/></button>
          </div>
        ) : (
          <button
            onClick={handleAdd}
            disabled={cerrado}
            aria-label={`Añadir ${p.nombre}`}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: cerrado ? C.cream2 : '#fff',
              color: cerrado ? C.stone2 : C.ink,
              border: `1px solid ${cerrado ? C.border : 'rgba(26,24,21,0.12)'}`,
              cursor: cerrado ? 'not-allowed' : 'pointer',
              boxShadow: cerrado ? 'none' : '0 2px 8px rgba(26,24,21,0.16)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          ><Plus size={17} strokeWidth={2.4}/></button>
        )}
      </div>
    </div>
  )
}

/* ─── CategoriaNav (anclas + scroll-spy) ──────────────────── */
function CategoriaNav({ secciones, activa, onIr }) {
  if (secciones.length === 0) return null
  return (
    <nav>
      <div style={{
        fontSize: 11, fontWeight: 700, color: C.stone, textTransform: 'uppercase',
        letterSpacing: '0.06em', marginBottom: 10, padding: '0 12px',
      }}>Carta</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 'calc(100vh - 130px)', overflowY: 'auto' }}>
        {secciones.map(s => {
          const isActive = s.key === activa
          return (
            <button
              key={s.key}
              onClick={() => onIr(s.key)}
              style={{
                padding: '9px 12px', borderRadius: 10, cursor: 'pointer',
                background: isActive ? C.cream2 : 'transparent',
                color: isActive ? C.ink : C.stone,
                fontWeight: isActive ? 700 : 500, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                border: 'none',
                borderLeft: `3px solid ${isActive ? C.terracotta : 'transparent'}`,
                transition: 'all .15s', textAlign: 'left', width: '100%',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nombre}</span>
              <span style={{ fontSize: 11, color: C.stone2, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{s.n}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/* ─── CartSticky (carrito persistente columna derecha) ─────── */
function CartSticky({ est, cerrado, onCheckout }) {
  const {
    carrito, removeItem, updateCantidad,
    envio, total, propina, modoEntrega,
  } = useCart()
  const itemsDeEsteResto = carrito.filter(i => i.establecimiento_id === est.id)
  const cantDeEsteResto = itemsDeEsteResto.reduce((s, i) => s + i.cantidad, 0)
  const subtotalEsteResto = itemsDeEsteResto.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0)
  const vacio = cantDeEsteResto === 0

  return (
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
        <div style={{ padding: '38px 24px', textAlign: 'center', color: C.stone2 }}>
          <ShoppingCart size={38} strokeWidth={1.5}/>
          <div style={{ fontSize: 14, marginTop: 12, fontWeight: 700, color: C.stone }}>Tu carrito está vacío</div>
          <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
            Añade productos de la carta para empezar.
          </div>
        </div>
      ) : (
        <>
          {/* Items */}
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 320, overflowY: 'auto' }}>
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
                    {it.imagen_url
                      ? <img src={it.imagen_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                      : (
                        <div style={{ transform: 'scale(0.5)', transformOrigin: 'center', display: 'flex' }}>
                          <FoodIcon kw={it.nombre} size={86}/>
                        </div>
                      )}
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
                  <span style={{ fontSize: 13, color: C.ink, fontWeight: 800, minWidth: 56, textAlign: 'right' }}>
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

/* ─── HeroCard ─────────────────────────────────────────────────
   El banner va DENTRO de la caja de contenido, no a sangre: pegado a los
   bordes de la ventana quedaba desconectado del resto y se comía 240px de
   alto en cuanto la pantalla era ancha. */
function HeroCard({ est }) {
  return (
    <div style={{
      position: 'relative', borderRadius: 18, overflow: 'hidden',
      minHeight: 260, border: `1px solid ${C.border}`, background: C.cream2,
    }}>
      {est.banner_url ? (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            background: `url(${est.banner_url}) center/cover`,
          }}/>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(26,24,21,0.0) 55%, rgba(26,24,21,0.18) 100%)',
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
    </div>
  )
}

/* ─── InfoPanel (identidad del restaurante, columna izquierda) ─ */
function InfoPanel({ est, estadoAbierto, cerrado, deliveryDisponible }) {
  const [verHorarios, setVerHorarios] = useState(false)
  const tipo = TIPO_LABEL[est.tipo] || (est.tipo ? est.tipo[0].toUpperCase() + est.tipo.slice(1) : null)

  return (
    <div style={{
      background: C.paper, border: `1px solid ${C.border}`, borderRadius: 18,
      padding: 22, display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <div style={{
          width: 58, height: 58, borderRadius: '50%', flexShrink: 0,
          background: '#fff', border: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', boxShadow: SH.sm,
        }}>
          {est.logo_url
            ? <img src={est.logo_url} alt={est.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
            : <div style={{ transform: 'scale(0.55)' }}><FoodIcon kw={est.tipo || ''} size={70}/></div>
          }
        </div>
        <h1 style={{
          fontSize: 'clamp(20px, 1.7vw, 25px)', fontWeight: 800, color: C.ink, margin: 0,
          letterSpacing: '-0.02em', lineHeight: 1.15, minWidth: 0,
        }}>{est.nombre}</h1>
      </div>

      {/* Valoración y tipo — una sola línea, como en los marketplaces */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 13, color: C.stone }}>
        {est.rating > 0 && (
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: C.ink, fontWeight: 700 }}>
              <Star size={13} fill={C.warning} color={C.warning}/>
              {est.rating.toFixed(1)}
            </span>
            {est.total_resenas > 0 && <span>({est.total_resenas})</span>}
            {tipo && <span>·</span>}
          </>
        )}
        {tipo && <span style={{ fontWeight: 600 }}>{tipo}</span>}
      </div>

      {est.descripcion && (
        <div style={{
          fontSize: 12.5, color: C.stone, lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{est.descripcion}</div>
      )}

      <div style={{ height: 1, background: C.cream2 }}/>

      {/* Estado + horario de hoy. La dirección solo aparece AQUÍ (antes salía
          también flotando sobre el banner: el mismo dato dos veces). */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
            background: cerrado ? C.danger : C.sage,
          }}/>
          <span style={{ color: cerrado ? C.danger : C.sage2, fontWeight: 700 }}>
            {cerrado
              ? (estadoAbierto.proximaApertura || 'Cerrado ahora')
              : `Abierto${estadoAbierto.turnoActual?.abre ? ` · ${estadoAbierto.turnoActual.abre}–${estadoAbierto.turnoActual.cierra}` : ''}`}
          </span>
        </div>
        {est.direccion && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: C.stone }}>
            <MapPin size={14} style={{ flexShrink: 0, marginTop: 2 }}/>
            <span style={{ lineHeight: 1.4 }}>{est.direccion}</span>
          </div>
        )}
        {est.telefono && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.stone }}>
            <Phone size={14} style={{ flexShrink: 0 }}/>
            <a href={`tel:${est.telefono}`} style={{ color: C.stone, textDecoration: 'none' }}>{est.telefono}</a>
          </div>
        )}
      </div>

      {est.horario && (
        <div>
          <button
            onClick={() => setVerHorarios(v => !v)}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: C.terracotta2,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Clock size={13}/> {verHorarios ? 'Ocultar horarios' : 'Ver horarios'}
          </button>
          {verHorarios && (
            <div style={{ marginTop: 8 }}>
              <HorariosRender horario={est.horario}/>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {deliveryDisponible && <Chip tone="paper"><Bike size={11} style={{ marginRight: 4 }}/> Envío a domicilio</Chip>}
        <Chip tone={deliveryDisponible ? 'paper' : 'warning'}>
          <ShoppingBag size={11} style={{ marginRight: 4 }}/> {deliveryDisponible ? 'Recogida' : 'Solo recogida'}
        </Chip>
      </div>
    </div>
  )
}

/* ─── TiendaDesktop ───────────────────────────────────────── */
export default function TiendaDesktop({ establecimiento, onCheckout, onRequireLogin }) {
  const { user } = useAuth()
  const { addItem, carrito, updateCantidad, modoEntrega, elegirEntrega } = useCart()
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [promociones, setPromociones] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [catActiva, setCatActiva] = useState(null)
  const [prodTamanosMap, setProdTamanosMap] = useState({})
  const [prodExtrasSet, setProdExtrasSet] = useState(new Set())
  const [modalProd, setModalProd] = useState(null)
  const [toast, setToast] = useState(null)
  const [tieneDeliveryLive, setTieneDeliveryLive] = useState(establecimiento.tiene_delivery)

  const est = establecimiento
  // 'activo' llega congelado desde la ruta pública (el enlace del flyer). El motor de
  // presencia abre y cierra solo, así que se mantiene vivo con realtime + refetch.
  const [activoLive, setActivoLive] = useState(establecimiento?.activo)
  const estadoAbierto = estaAbierto(est ? { ...est, activo: activoLive ?? est.activo } : est)
  const cerrado = !estadoAbierto.abierto

  // Precio único (el trigger trg_sync_precio_tienda mantiene precio_tienda_publica := precio)
  const getPrecioMostrado = (p) => Number(p.precio)

  // Realtime tiene_delivery
  useEffect(() => {
    setTieneDeliveryLive(est.tiene_delivery)
    setActivoLive(est.activo)
    if (!est.id) return
    let cancel = false
    function refetch() {
      supabase.from('establecimientos').select('tiene_delivery, activo').eq('id', est.id).maybeSingle()
        .then(({ data }) => {
          if (cancel || !data) return
          setTieneDeliveryLive(!!data.tiene_delivery)
          setActivoLive(data.activo)
        })
    }
    const channel = supabase
      .channel(`est_live_desktop_${est.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'establecimientos',
        filter: `id=eq.${est.id}`,
      }, (payload) => {
        if (cancel || !payload?.new) return
        setTieneDeliveryLive(!!payload.new.tiene_delivery)
        setActivoLive(payload.new.activo)
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
    // Si el restaurante ha cerrado mientras el cliente se logueaba, el producto no entra
    // solo en el carrito: se queda guardado para cuando vuelva a abrir.
    if (cerrado) { showToast(`${est.nombre} está cerrado ahora mismo`); return }
    addItem(item)
    try { localStorage.removeItem('pido_pending_cart_item') } catch (_) {}
    showToast('Producto añadido al carrito')
  }, [user, est.id, cerrado])

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

  const deliveryDisponible = tieneDeliveryLive

  // Sin reparto, el carrito no puede quedarse en modo delivery. Vive aquí y no
  // en el carrito porque el selector es visible desde el primer momento.
  useEffect(() => {
    if (!deliveryDisponible && modoEntrega === 'delivery') elegirEntrega('recogida')
  }, [deliveryDisponible, modoEntrega])

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
      imagen_url: p.imagen_url || null,
      tamano: null, extras: [],
      precio_unitario: getPrecioMostrado(p),
      cantidad: 1,
      establecimiento_id: est.id,
      establecimiento_nombre: est.nombre,
      coste_envio: 0,
    }
    if (!user && !permiteInvitado(est)) { guardarPendingItem(item); return }
    addItem(item)
    showToast('Producto añadido al carrito')
  }

  // Búsqueda dentro de la carta (nombre + descripción, sin tildes)
  const buscando = busqueda.trim().length > 0
  const productosVisibles = useMemo(() => {
    if (!buscando) return productos
    const q = norm(busqueda.trim())
    // También por nombre de categoría: buscar "ensalada" en una carta cuyos
    // platos se llaman "César" o "Caprese" devolvía cero resultados.
    const nombreCat = new Map(categorias.map(c => [c.id, norm(c.nombre)]))
    return productos.filter(p =>
      norm(p.nombre).includes(q) ||
      norm(p.descripcion).includes(q) ||
      (nombreCat.get(p.categoria_id) || '').includes(q)
    )
  }, [productos, categorias, busqueda, buscando])

  // Secciones de la carta (y lo que alimenta la navegación lateral).
  // Se calculan SIEMPRE, también mientras se busca: si no, la columna izquierda
  // se quedaba en blanco al escribir y el ancho de la página daba un salto.
  const secciones = useMemo(() => {
    const out = []
    for (const cat of categorias) {
      const prods = productos.filter(p => p.categoria_id === cat.id)
      if (prods.length > 0) out.push({ key: String(cat.id), nombre: cat.nombre, n: prods.length, prods })
    }
    const sinCat = productos.filter(p => !p.categoria_id)
    if (sinCat.length > 0) out.push({ key: 'otros', nombre: 'Otros', n: sinCat.length, prods: sinCat })
    return out
  }, [productos, categorias])

  // Arriba del todo aún no hay ninguna sección dentro de la banda del
  // observador, así que sin esto la lateral empieza sin nada marcado.
  useEffect(() => {
    if (secciones.length > 0 && catActiva === null) setCatActiva(secciones[0].key)
  }, [secciones, catActiva])

  // Scroll-spy: marca en la lateral la sección por la que va el cliente.
  useEffect(() => {
    if (buscando || secciones.length === 0) return
    const els = secciones
      .map(s => document.getElementById(`td-sec-${s.key}`))
      .filter(Boolean)
    if (els.length === 0) return
    const estado = new Map()
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) estado.set(e.target.id, e.isIntersecting)
      const primera = els.find(el => estado.get(el.id))
      if (primera) setCatActiva(primera.id.replace('td-sec-', ''))
    }, { rootMargin: '-90px 0px -68% 0px', threshold: 0 })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [secciones, buscando])

  // Salto pendiente: al pulsar una categoría con una búsqueda escrita, las
  // secciones aún no existen en el DOM. Se limpia la búsqueda y el salto lo
  // hace el efecto de abajo, que corre YA con la carta completa pintada
  // (con requestAnimationFrame el scroll caía en la sección equivocada).
  const saltoPendiente = useRef(null)

  useEffect(() => {
    if (buscando || !saltoPendiente.current) return
    const key = saltoPendiente.current
    saltoPendiente.current = null
    const el = document.getElementById(`td-sec-${key}`)
    if (el) el.scrollIntoView({ block: 'start' })
    setCatActiva(key)
  }, [buscando, secciones])

  function irACategoria(key) {
    if (buscando) {
      saltoPendiente.current = key
      setBusqueda('')
      return
    }
    const el = document.getElementById(`td-sec-${key}`)
    if (!el) return
    // scrollIntoView y NO window.scrollTo: en esta app quien scrollea es <body>
    // (index.css deja html en overflow:hidden), así que window.scrollY es
    // siempre 0 y un scrollTo calculado con él no movería nada.
    // El hueco superior lo pone `scrollMarginTop` en cada sección.
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setCatActiva(key)
  }

  const propsCard = {
    onAddSimple: addItemSimple,
    onOpenModal: (prod) => setModalProd(prod),
    carrito,
    updateCantidad,
    cerrado,
    getPrecio: getPrecioMostrado,
  }
  const tieneConfig = (p) => (prodTamanosMap[p.id] || []).length > 0 || prodExtrasSet.has(p.id)

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

        .td-shell { max-width: 1440px; margin: 0 auto; padding: 0 clamp(16px, 2.4vw, 40px); }
        .td-top { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 26px; padding-top: 26px; }
        .td-main { display: grid; grid-template-columns: 300px minmax(0, 1fr) 340px; gap: 26px; margin-top: 26px; padding-bottom: 60px; }
        .td-sticky { position: sticky; top: 20px; }
        .td-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .td-card:hover { box-shadow: 0 6px 18px rgba(26,24,21,0.09); border-color: #DED5C3 !important; }

        @media (max-width: 1379px) {
          .td-top  { grid-template-columns: 268px minmax(0, 1fr); gap: 20px }
          .td-main { grid-template-columns: 268px minmax(0, 1fr) 316px; gap: 20px }
          .td-cards { grid-template-columns: 1fr }
        }
        @media (max-width: 1150px) {
          .td-top  { grid-template-columns: 238px minmax(0, 1fr); gap: 16px }
          .td-main { grid-template-columns: 238px minmax(0, 1fr) 300px; gap: 16px }
        }
      `}</style>

      <div className="td-shell">
        {/* Fila superior: identidad + banner */}
        <div className="td-top">
          <InfoPanel
            est={est}
            estadoAbierto={estadoAbierto}
            cerrado={cerrado}
            deliveryDisponible={deliveryDisponible}
          />
          <HeroCard est={est}/>
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
        {!cerrado && !deliveryDisponible && <BannerSoloRecogida />}

        {/* Promociones */}
        {promociones.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 20, overflowX: 'auto', paddingBottom: 4 }}>
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

        {/* Fila inferior: navegación · carta · carrito */}
        <div className="td-main" style={{ filter: cerrado ? 'grayscale(0.35)' : 'none' }}>
          {/* Izquierda: categorías */}
          <div>
            <div className="td-sticky">
              <CategoriaNav secciones={secciones} activa={buscando ? null : catActiva} onIr={irACategoria}/>
            </div>
          </div>

          {/* Centro: buscador + selector de entrega + carta */}
          <div style={{ minWidth: 0 }}>
            <div style={{
              display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
              marginBottom: 22,
            }}>
              <div style={{
                flex: '1 1 220px', minWidth: 0, position: 'relative',
                display: 'flex', alignItems: 'center',
              }}>
                <Search size={15} style={{ position: 'absolute', left: 13, color: C.stone2, pointerEvents: 'none' }}/>
                <input
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder={`Buscar en ${est.nombre}`}
                  style={{
                    width: '100%', padding: '11px 14px 11px 36px',
                    borderRadius: 999, border: `1px solid ${C.border}`,
                    background: C.paper, color: C.ink,
                    fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
                  }}
                />
                {buscando && (
                  <button
                    onClick={() => setBusqueda('')}
                    aria-label="Limpiar búsqueda"
                    style={{
                      position: 'absolute', right: 10, width: 22, height: 22, borderRadius: '50%',
                      border: 'none', background: C.cream2, color: C.stone, cursor: 'pointer',
                      fontSize: 14, lineHeight: 1, fontFamily: 'inherit',
                    }}
                  >×</button>
                )}
              </div>

              {/* Entrega / Recogida — siempre visible, no solo con el carrito lleno */}
              <div style={{
                display: 'flex', gap: 4, padding: 4, borderRadius: 999,
                background: C.cream2, flexShrink: 0,
              }}>
                <button
                  onClick={() => deliveryDisponible && elegirEntrega('delivery')}
                  disabled={!deliveryDisponible}
                  title={deliveryDisponible ? undefined : 'Este restaurante no tiene reparto ahora mismo'}
                  style={{
                    padding: '8px 16px', borderRadius: 999, border: 'none',
                    background: modoEntrega === 'delivery' ? C.paper : 'transparent',
                    color: !deliveryDisponible ? C.stone2 : (modoEntrega === 'delivery' ? C.ink : C.stone),
                    boxShadow: modoEntrega === 'delivery' ? SH.sm : 'none',
                    fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                    cursor: deliveryDisponible ? 'pointer' : 'not-allowed',
                    opacity: deliveryDisponible ? 1 : 0.5,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                ><Bike size={14}/> Entrega</button>
                <button
                  onClick={() => elegirEntrega('recogida')}
                  style={{
                    padding: '8px 16px', borderRadius: 999, border: 'none',
                    background: modoEntrega === 'recogida' ? C.paper : 'transparent',
                    color: modoEntrega === 'recogida' ? C.ink : C.stone,
                    boxShadow: modoEntrega === 'recogida' ? SH.sm : 'none',
                    fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                ><ShoppingBag size={14}/> Recogida</button>
              </div>
            </div>

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
            ) : buscando ? (
              /* Resultados de búsqueda: una sola lista, sin categorías */
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: C.ink, margin: '0 0 14px' }}>
                  {productosVisibles.length === 0
                    ? 'Sin resultados'
                    : `${productosVisibles.length} resultado${productosVisibles.length === 1 ? '' : 's'}`}
                </h2>
                {productosVisibles.length === 0 ? (
                  <div style={{
                    background: C.paper, borderRadius: 16, padding: 40, textAlign: 'center',
                    border: `1px solid ${C.border}`, color: C.stone, fontSize: 14,
                  }}>
                    No hemos encontrado nada con «{busqueda.trim()}» en la carta de {est.nombre}.
                  </div>
                ) : (
                  <div className="td-cards">
                    {productosVisibles.map(p => (
                      <ProductRow key={p.id} p={p} hasConfig={tieneConfig(p)} {...propsCard}/>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {secciones.map(s => (
                  <div key={s.key} id={`td-sec-${s.key}`} style={{ marginBottom: 34, scrollMarginTop: 18 }}>
                    <h2 style={{
                      fontSize: 21, fontWeight: 800, color: C.ink,
                      margin: '0 0 14px', letterSpacing: '-0.01em',
                    }}>{s.nombre}</h2>
                    <div className="td-cards">
                      {s.prods.map(p => (
                        <ProductRow key={p.id} p={p} hasConfig={tieneConfig(p)} {...propsCard}/>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Footer info */}
                <div style={{
                  background: C.paper, borderRadius: 16, padding: 24,
                  marginTop: 16, border: `1px solid ${C.border}`,
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24 }}>
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

          {/* Derecha: carrito */}
          <div>
            <div className="td-sticky">
              <CartSticky
                est={est}
                cerrado={cerrado}
                onCheckout={() => onCheckout?.()}
              />
            </div>
          </div>
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
    paper: { background: C.cream, color: C.ink, border: `1px solid ${C.border}` },
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
      marginTop: 20,
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
      marginTop: 20, padding: 16, borderRadius: 14,
      background: bg, border: 'none',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ color: fg, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

function HorariosRender({ horario }) {
  // El horario de BD viene como { lunes: [{ abre, cierra }], ... }. Antes aquí
  // se leía { lun: [{ open, close }] }: claves y campos que no existen, así que
  // la tienda pública pintaba "Cerrado" LOS SIETE DÍAS aunque estuviera abierta.
  // DIAS_ORDEN / DIAS_CORTO salen de lib/horario.js, que es quien manda.
  if (!horario || typeof horario !== 'object') return null
  return (
    <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.6, marginTop: 6 }}>
      {DIAS_ORDEN.map((key) => {
        const label = DIAS_CORTO[key] || key
        const slots = horario[key]
        if (!Array.isArray(slots) || slots.length === 0) {
          return <div key={key}><b style={{ color: C.stone }}>{label}</b> · Cerrado</div>
        }
        const txt = slots
          .filter(s => s?.abre && s?.cierra)
          .map(s => `${s.abre}–${s.cierra}`)
          .join(' · ')
        if (!txt) return <div key={key}><b style={{ color: C.stone }}>{label}</b> · Cerrado</div>
        return <div key={key}><b style={{ color: C.stone, fontWeight: 600 }}>{label}</b> · {txt}</div>
      })}
    </div>
  )
}
