import { useState, useEffect } from 'react'
import { ArrowLeft, MapPin, Star, Bike, ShoppingBag, UtensilsCrossed, Plus, Minus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { estaAbierto } from '../lib/horario'
import { FoodIcon } from '../lib/food'

// Paleta directa (alineada con bundle s4-tienda + sx-extras)
const C = {
  cream: '#F7F3EC', cream2: '#EFE9DD', paper: '#FBF8F2',
  ink: '#1A1815', ink2: '#2B2823', stone: '#6B6356', stone2: '#8A8174',
  terracotta: '#C5562C', terracotta2: '#A8451F', terracottaSoft: '#F1D9CC',
  sage: '#8B9D7A', sage2: '#6F8460', sageSoft: '#DDE3D3',
  warning: '#C99551', warningSoft: '#F0E1C8',
  danger: '#B5564A', dangerSoft: '#F1D0CB',
  border: '#E8E1D3',
}
const SH = {
  sm: '0 1px 2px rgba(26,24,21,0.06)',
  md: '0 4px 14px rgba(26,24,21,0.08)',
  glossy: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 10px rgba(0,0,0,0.18)',
}
const fmt = (n) => `${(n || 0).toFixed(2).replace('.', ',')} €`

/* ─── Chip ────────────────────────────────────────────────── */
function Chip({ children, tone, dot }) {
  const styles = {
    sage:    { background: C.sageSoft,      color: C.sage2 },
    danger:  { background: C.dangerSoft,    color: C.danger },
    paper:   { background: C.paper,         color: C.ink,    border: `1px solid ${C.border}` },
    warning: { background: C.warningSoft,   color: '#8B6126' },
  }[tone] || { background: C.cream2, color: C.stone }
  const dotColor = tone === 'sage' ? C.sage : tone === 'danger' ? C.danger : C.terracotta
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 700, padding: '4px 10px',
      borderRadius: 999, whiteSpace: 'nowrap', ...styles,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor }} />}
      {children}
    </span>
  )
}

/* ─── ProductoCard ────────────────────────────────────────── */
function ProductoCard({ p, onOpen, onAddSimple, carrito, updateCantidad, tamanos = [], tieneExtras = false, cerrado = false, onIntentoCerrado, getPrecio }) {
  const enCarritoIdx = carrito.findIndex(i => i.producto_id === p.id)
  const enCarrito = enCarritoIdx >= 0 ? carrito[enCarritoIdx] : null
  const minPrecio = tamanos.length > 0 ? Math.min(...tamanos.map(t => t.precio)) : null
  const tieneConfig = tamanos.length > 0 || tieneExtras
  const precioBase = getPrecio ? getPrecio(p) : p.precio

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
    <div
      onClick={cerrado ? onIntentoCerrado : onOpen}
      style={{
        display: 'flex', gap: 14, alignItems: 'stretch',
        padding: 12, marginBottom: 10,
        background: C.cream2,
        borderRadius: 14,
        cursor: cerrado ? 'default' : 'pointer',
        opacity: cerrado ? 0.65 : 1,
        position: 'relative',
      }}
    >
      <div style={{
        width: 86, height: 86, borderRadius: 10,
        background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, overflow: 'hidden',
      }}>
        {p.imagen_url
          ? <img src={p.imagen_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <FoodIcon kw={p.nombre} size={70} />
        }
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 3, lineHeight: 1.25,
          }}>
            {p.nombre}
          </div>
          {p.descripcion && (
            <div style={{
              fontSize: 12, color: C.stone, lineHeight: 1.4,
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>
              {p.descripcion}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 17, color: C.terracotta }}>
            {minPrecio !== null ? fmt(minPrecio) : fmt(precioBase)}
          </span>

          {enCarrito ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button
                onClick={handleDecrementar}
                aria-label="Restar"
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: `1px solid ${C.border}`,
                  background: C.paper, color: C.ink, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              ><Minus size={14} strokeWidth={2.4} /></button>
              <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 800, fontSize: 15, color: C.ink }}>
                {enCarrito.cantidad}
              </span>
              <button
                onClick={handleIncrementar}
                aria-label="Sumar"
                style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none',
                  background: C.terracotta, color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              ><Plus size={14} strokeWidth={2.4} /></button>
            </div>
          ) : (
            <button
              onClick={handleIncrementar}
              aria-label="Añadir"
              disabled={cerrado}
              style={{
                width: 38, height: 38, borderRadius: '50%', border: 'none',
                background: cerrado ? C.cream2 : C.terracotta,
                color: cerrado ? C.stone2 : '#fff', cursor: cerrado ? 'not-allowed' : 'pointer',
                boxShadow: cerrado ? 'none' : SH.glossy, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            ><Plus size={18} strokeWidth={2.4} /></button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── RestDetalle ─────────────────────────────────────────── */
export default function RestDetalle({ establecimiento, onBack, modoTienda = false, onRequireLogin, socioData = null }) {
  const { addItem, carrito, updateCantidad, totalItems, subtotal } = useCart()
  const { user } = useAuth()
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
  const [avisoCerrado, setAvisoCerrado] = useState(false)
  const [toastAdded, setToastAdded] = useState(false)

  const est = establecimiento
  const estadoAbierto = estaAbierto(est)
  const cerrado = !estadoAbierto.abierto

  // Precio único (el trigger trg_sync_precio_tienda mantiene precio_tienda_publica := precio)
  const getPrecioMostrado = (p) => Number(p.precio)

  function mostrarAvisoCerrado() {
    setAvisoCerrado(true)
    setTimeout(() => setAvisoCerrado(false), 2800)
  }

  function guardarPendingItem(item) {
    try { localStorage.setItem('pido_pending_cart_item', JSON.stringify(item)) } catch (_) {}
    onRequireLogin?.()
  }

  // Restaurar item pendiente tras login si pertenece a este restaurante
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
    setToastAdded(true)
    setTimeout(() => setToastAdded(false), 2500)
  }, [user, est.id])

  useEffect(() => { fetchCarta() }, [est.id])

  // El detalle sustituye a la Home en el mismo scroll: sin esto se abre "a
  // mitad" (hereda el scroll que llevabas en la lista) con el banner cortado.
  // Al volver, se restaura el punto de la Home donde estabas.
  useEffect(() => {
    // El detalle sustituye a la Home en el mismo scroll (que en esta app vive
    // en el <body>, no en window): sin esto se abre "a mitad" con el banner
    // cortado. La restauración al volver la hace AppShell.cerrarRest.
    window.scrollTo(0, 0)
    document.body.scrollTop = 0
  }, [est.id])

  // Al abrir el restaurante, fuerza una verificacion en directo a Shipday
  // del estado del socio. La edge actualiza socios.en_servicio si difiere
  // → triggers cascada → tiene_delivery → Realtime refresca esta misma
  // pantalla en <2s. Latencia percibida casi cero.
  useEffect(() => {
    if (!est.id) return
    supabase.functions.invoke('check-socio-availability-now', {
      body: { establecimiento_id: est.id },
    }).catch(() => {})
  }, [est.id])

  // tiene_delivery refrescado en vivo: si el socio del establecimiento se
  // desconecta de Shipday, este valor cambia y la UI reacciona al instante.
  const [tieneDeliveryLive, setTieneDeliveryLive] = useState(est.tiene_delivery)
  // En el marketplace de un socio el reparto lo hace ESE socio (= rider): si está
  // offline, no hay domicilio aunque el flag global del establecimiento diga lo
  // contrario (es compartido con otros socios). Sin socioData (app general) no aplica.
  const socioOnline = socioData ? !!socioData.rider_online : true
  const deliveryDisponible = tieneDeliveryLive && socioOnline

  useEffect(() => {
    setTieneDeliveryLive(est.tiene_delivery)
    if (!est.id) return
    // Refresco al volver a foreground (por si Realtime perdio algun evento).
    let cancel = false
    function refetch() {
      supabase.from('establecimientos').select('tiene_delivery').eq('id', est.id).maybeSingle()
        .then(({ data }) => { if (!cancel && data) setTieneDeliveryLive(!!data.tiene_delivery) })
    }
    const channel = supabase
      .channel(`est_live_${est.id}`)
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
    const base = tamSel !== null && tamanos[tamSel] ? tamanos[tamSel].precio : getPrecioMostrado(modal)
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
    const item = {
      producto_id: modal.id,
      nombre: modal.nombre,
      tamano: tamSel !== null && tamanos[tamSel] ? tamanos[tamSel].nombre : null,
      extras: extrasRich,
      precio_unitario: precioTotal() / cant,
      cantidad: cant,
      establecimiento_id: est.id,
      establecimiento_nombre: est.nombre,
      coste_envio: 0,
    }
    if (!user) { guardarPendingItem(item); setModal(null); return }
    addItem(item)
    setModal(null)
  }

  function addItemSimple(p) {
    if (cerrado) { mostrarAvisoCerrado(); return }
    const item = {
      producto_id: p.id,
      nombre: p.nombre,
      tamano: null,
      extras: [],
      precio_unitario: getPrecioMostrado(p),
      cantidad: 1,
      establecimiento_id: est.id,
      establecimiento_nombre: est.nombre,
      coste_envio: 0,
    }
    if (!user) { guardarPendingItem(item); return }
    addItem(item)
  }

  function toggleExtra(op, grupo) {
    const opWithGrupo = { ...op, grupo_id: grupo.id }
    setExSel(prev => {
      // 'single' llega del importador last.shop; el render ya lo trata como radio
      // obligatorio, pero aquí y en grupoValido solo se contemplaba 'unico'.
      if (grupo.tipo === 'unico' || grupo.tipo === 'single') {
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
    if (g.tipo === 'unico' || g.tipo === 'single') return exSel.some(e => e.grupo_id === g.id)
    return true
  }
  const puedeConfirmar = gruposExtras.every(grupoValido)

  // ¿Hay items del carrito que pertenecen a ESTE restaurante? (para mostrar botón "Ver carrito")
  const itemsDeEsteResto = carrito.filter(i => i.establecimiento_id === est.id)
  const totalDeEsteResto = itemsDeEsteResto.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0)
  const cantDeEsteResto = itemsDeEsteResto.reduce((s, i) => s + i.cantidad, 0)

  return (
    <div style={{
      animation: 'slideIn 0.3s ease', paddingBottom: cantDeEsteResto > 0 ? 90 : 0,
      background: C.cream, minHeight: '100vh',
    }}>

      {/* ── Hero compacto: card con banner de fondo + logo overlay + nombre dentro ── */}
      {/* Padding horizontal 0: el ancho lo marca el wrapper del AppShell (20px),
          igual que las cards de Home. Antes se sumaban 14-18px extra por dentro. */}
      <div style={{ padding: '14px 0 0' }}>
        <div style={{
          position: 'relative', height: 200, borderRadius: 18, overflow: 'hidden',
          background: est.banner_url
            ? '#000'
            : `linear-gradient(135deg, ${C.terracotta} 0%, ${C.terracotta2} 100%)`,
          boxShadow: SH.md,
        }}>
          {est.banner_url ? (
            <img
              src={est.banner_url} alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.18 }}>
              <circle cx="60" cy="40" r="80" fill="#fff" />
              <circle cx="380" cy="80" r="100" fill="#fff" opacity="0.4" />
              <circle cx="300" cy="180" r="60" fill="#fff" opacity="0.3" />
            </svg>
          )}

          {/* Overlay para legibilidad del nombre abajo */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)',
          }} />

          {/* Volver (solo en modal app) — circular pequeño top-left */}
          {!modoTienda && (
            <button
              onClick={onBack}
              style={{
                position: 'absolute', top: 12, left: 12,
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: SH.sm, color: C.ink,
              }}
              aria-label="Volver"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
          )}

          {/* Pill estado abierto/cerrado — top-left (o top-center si hay Volver) */}
          <div style={{
            position: 'absolute', top: 14,
            left: !modoTienda ? 58 : 14,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            padding: '6px 11px', borderRadius: 999,
            fontSize: 11.5, fontWeight: 700, color: C.ink,
            boxShadow: SH.sm, maxWidth: 'calc(100% - 90px)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: cerrado ? C.danger : C.sage, flexShrink: 0 }} />
            {cerrado
              ? (estadoAbierto.proximaApertura || 'Cerrado')
              : `Abierto ahora${estadoAbierto.turnoActual?.cierra ? ` · Cierra ${estadoAbierto.turnoActual.cierra}` : ''}`
            }
          </div>

          {/* Logo overlay top-right */}
          <div style={{
            position: 'absolute', top: 12, right: 12,
            width: 62, height: 62, borderRadius: '50%',
            background: '#fff',
            border: '3px solid rgba(255,255,255,0.95)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: SH.md, overflow: 'hidden',
          }}>
            {est.logo_url
              ? <img src={est.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <FoodIcon kw={est.tipo || ''} size={42} />
            }
          </div>

          {/* Nombre + tipo·dirección abajo, sobre overlay oscuro */}
          <div style={{ position: 'absolute', bottom: 14, left: 16, right: 16 }}>
            <h1 style={{
              fontSize: 22, fontWeight: 800, color: '#fff',
              letterSpacing: '-0.02em', margin: 0, lineHeight: 1.15,
              textShadow: '0 2px 8px rgba(0,0,0,0.45)',
            }}>{est.nombre}</h1>
            {(est.tipo || est.direccion) && (
              <div style={{
                fontSize: 11, color: 'rgba(255,255,255,0.92)', marginTop: 3,
                fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase',
                textShadow: '0 1px 4px rgba(0,0,0,0.4)',
              }}>
                {est.tipo}{est.tipo && est.direccion ? ' · ' : ''}{est.direccion?.split(',')[0]}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Chips (rating · delivery · recogida) + descripción ── */}
      <div style={{ padding: '14px 0 0' }}>
        <div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {est.rating > 0 && (
              <Chip tone="paper">
                <Star size={11} fill={C.warning} color={C.warning} style={{ marginRight: 2 }} />
                {est.rating.toFixed(1)}
              </Chip>
            )}
            {deliveryDisponible && (
              <Chip tone="paper">
                <Bike size={11} style={{ marginRight: 4 }} /> Delivery
              </Chip>
            )}
            <Chip tone="paper">
              <ShoppingBag size={11} style={{ marginRight: 4 }} /> {deliveryDisponible ? 'Recogida' : 'Solo recogida'}
            </Chip>
          </div>
          {est.descripcion && (
            <p style={{ fontSize: 13, color: C.stone, lineHeight: 1.5, margin: '14px 0 0' }}>
              {est.descripcion}
            </p>
          )}
        </div>

        {/* Banners de estado */}
        {cerrado && (
          <div style={{
            marginTop: 14, padding: '12px 14px', borderRadius: 12,
            background: C.dangerSoft, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.danger, flexShrink: 0,
            }}>!</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.danger, lineHeight: 1.2 }}>
                {est.nombre} está cerrado
              </div>
              <div style={{ fontSize: 11, color: C.danger, opacity: 0.85, marginTop: 2, lineHeight: 1.4 }}>
                {estadoAbierto.proximaApertura || 'No se pueden realizar pedidos ahora mismo'}
              </div>
            </div>
          </div>
        )}
        {!cerrado && !deliveryDisponible && (
          <div style={{
            marginTop: 14, padding: '13px 15px', borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(201,149,81,0.20) 0%, rgba(201,149,81,0.07) 55%, rgba(255,255,255,0.30) 100%)',
            border: '1px solid rgba(201,149,81,0.38)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 6px 20px rgba(201,149,81,0.14)',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: 'linear-gradient(160deg, #D6A864 0%, #B9863F 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), 0 4px 10px rgba(168,69,31,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            }}>
              <ShoppingBag size={18} strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#7A5A1E', lineHeight: 1.2 }}>
                Solo recogida
              </div>
              <div style={{ fontSize: 11.5, color: '#8B6B30', opacity: 0.92, marginTop: 2, lineHeight: 1.4 }}>
                Este restaurante no tiene reparto ahora mismo. Haz tu pedido y pásate a recogerlo.
              </div>
            </div>
          </div>
        )}
      </div>

      {avisoCerrado && (
        <div style={{
          position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 20px)', left: '50%', transform: 'translateX(-50%)',
          zIndex: 300, padding: '10px 16px', borderRadius: 10,
          background: 'rgba(239,68,68,0.95)', color: '#1A1815',
          fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          animation: 'slideIn 0.25s ease',
          maxWidth: 'calc(100% - 40px)',
          textAlign: 'center',
        }}>
          Restaurante cerrado · No se puede pedir
        </div>
      )}

      {toastAdded && (
        <div style={{
          position: 'fixed', top: 'calc(env(safe-area-inset-top, 0px) + 20px)', left: '50%', transform: 'translateX(-50%)',
          zIndex: 300, padding: '10px 16px', borderRadius: 10,
          background: '#C5562C', color: '#fff',
          fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          animation: 'slideIn 0.25s ease',
          maxWidth: 'calc(100% - 40px)',
          textAlign: 'center',
        }}>
          Producto añadido al carrito
        </div>
      )}

      {/* ── Promociones ── */}
      {!loading && promociones.length > 0 && (
        <div style={{ padding: '18px 0 0', background: C.cream }}>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, paddingLeft: 18, paddingRight: 18 }}>
            {promociones.map(promo => {
              const badge = promo.tipo === 'descuento_porcentaje' ? `${promo.valor}% OFF`
                : promo.tipo === 'descuento_fijo' ? `-${promo.valor}€`
                : promo.tipo === '2x1' ? '2×1' : 'GRATIS'
              return (
                <div key={promo.id} style={{
                  minWidth: 220, flexShrink: 0,
                  padding: 14,
                  borderRadius: 14,
                  background: C.paper,
                  border: `1px solid ${C.border}`,
                }}>
                  <div style={{
                    display: 'inline-block', fontSize: 10, fontWeight: 800,
                    padding: '3px 8px', borderRadius: 6,
                    background: C.terracotta, color: '#fff',
                    letterSpacing: '0.04em', marginBottom: 8,
                  }}>{badge}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>
                    {promo.titulo}
                  </div>
                  {promo.minimo_compra > 0 && (
                    <div style={{ fontSize: 10, color: C.stone, marginTop: 4 }}>Min. {promo.minimo_compra}€</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Carta ── */}
      <div style={{ background: C.cream, filter: cerrado ? 'grayscale(0.45)' : 'none' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: C.stone }}>Cargando carta...</div>
        ) : productos.length === 0 ? (
          /* Catálogo vacío */
          <div style={{ padding: '40px 0 60px' }}>
            <div style={{
              background: C.paper, borderRadius: 16, padding: '40px 24px',
              border: `1px solid ${C.border}`, textAlign: 'center',
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%', background: C.cream2,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: C.stone2, marginBottom: 16,
              }}>
                <UtensilsCrossed size={38} strokeWidth={1.5} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, lineHeight: 1.3 }}>
                Este restaurante todavía no tiene productos en su carta
              </div>
              <div style={{ fontSize: 13, color: C.stone, marginTop: 8, lineHeight: 1.5 }}>
                Vuelve más tarde. Estamos preparando todo para que puedas pedir cuanto antes.
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Filtro categorías sticky */}
            {categorias.length > 1 && (
              <div style={{
                position: 'sticky', top: 0, zIndex: 5,
                background: C.cream, borderBottom: `1px solid ${C.cream2}`,
                padding: '12px 0', display: 'flex', gap: 8,
                overflowX: 'auto',
              }}>
                <button
                  onClick={() => setCatFiltro(null)}
                  style={{
                    padding: '8px 14px', borderRadius: 999, border: 'none',
                    background: !catFiltro ? C.ink : 'transparent',
                    color: !catFiltro ? C.cream : C.stone,
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
                      padding: '8px 14px', borderRadius: 999, border: 'none',
                      background: catFiltro === cat.id ? C.ink : 'transparent',
                      color: catFiltro === cat.id ? C.cream : C.stone,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>
            )}

            <div style={{ padding: '18px 0 100px' }}>
              {/* Productos por categoría */}
              {categorias
                .filter(cat => !catFiltro || cat.id === catFiltro)
                .map(cat => {
                  const prods = productos.filter(p => p.categoria_id === cat.id)
                  if (prods.length === 0) return null
                  return (
                    <div key={cat.id} style={{ marginBottom: 22 }}>
                      <h2 style={{
                        fontSize: 18, fontWeight: 800, color: C.ink,
                        margin: '0 0 12px', letterSpacing: '-0.01em',
                      }}>
                        {cat.nombre}
                      </h2>
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
                          getPrecio={getPrecioMostrado}
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
                    cerrado={cerrado}
                    onIntentoCerrado={mostrarAvisoCerrado}
                    getPrecio={getPrecioMostrado}
                  />
                ))}
            </div>
          </>
        )}
      </div>

      {/* ── Modal producto (bottom-sheet) ── */}
      {modal && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(26,24,21,0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 200, display: 'flex',
            alignItems: 'flex-end', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={() => setModal(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: C.cream,
              borderRadius: '20px 20px 0 0',
              width: '100%', maxWidth: 420,
              maxHeight: '90%',
              display: 'flex', flexDirection: 'column',
              animation: 'slideUp 0.3s ease',
              overflow: 'hidden',
            }}
          >
            {/* Hero del producto */}
            <div style={{ position: 'relative' }}>
              <div style={{
                height: 200, background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {modal.imagen_url
                  ? <img src={modal.imagen_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <FoodIcon kw={modal.nombre} size={140} />
                }
              </div>
              <button
                onClick={() => setModal(null)}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 34, height: 34, borderRadius: '50%',
                  border: 'none', background: 'rgba(255,255,255,0.95)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: SH.sm, color: C.ink, fontSize: 18, lineHeight: 1,
                }}
              >×</button>
            </div>

            <div style={{ padding: '18px 18px 12px', flex: 1, overflowY: 'auto' }}>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: 0, letterSpacing: '-0.01em' }}>
                {modal.nombre}
              </h3>
              {modal.descripcion && (
                <p style={{ fontSize: 13, color: C.stone, marginTop: 4, marginBottom: 0, lineHeight: 1.5 }}>
                  {modal.descripcion}
                </p>
              )}

              {tamanos.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: C.stone,
                    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8,
                  }}>
                    Tamaño · Elige 1
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {tamanos.map((t, i) => (
                      <button
                        key={t.id}
                        onClick={() => setTamSel(i)}
                        style={{
                          padding: '12px 14px', borderRadius: 12,
                          background: tamSel === i ? C.terracottaSoft : C.paper,
                          border: tamSel === i ? `1.5px solid ${C.terracotta}` : `1px solid ${C.border}`,
                          display: 'flex', alignItems: 'center', gap: 12,
                          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                        }}
                      >
                        <span style={{
                          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${tamSel === i ? C.terracotta : '#C8C1B0'}`,
                          background: tamSel === i ? '#fff' : 'transparent',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {tamSel === i && <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.terracotta }} />}
                        </span>
                        <span style={{ flex: 1, fontSize: 14, color: C.ink, fontWeight: 600 }}>{t.nombre}</span>
                        <span style={{ fontSize: 14, color: tamSel === i ? C.terracotta : C.stone, fontWeight: 700 }}>
                          {fmt(t.precio)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {gruposExtras.map(g => {
                const esUnico = g.tipo === 'unico' || g.tipo === 'single'
                const enGrupo = exSel.filter(e => e.grupo_id === g.id)
                const max = g.max_selecciones || 99
                const alcanzadoMax = !esUnico && enGrupo.length >= max
                return (
                  <div key={g.id} style={{ marginTop: 18 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: C.stone,
                      textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8,
                    }}>
                      {g.nombre} · {esUnico ? 'Elige 1 (obligatorio)' : `Múltiple (máx. ${max})`}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(g.extras_opciones || []).map(op => {
                        const sel = !!exSel.find(e => e.grupo_id === g.id && e.id === op.id)
                        const bloqueado = !sel && alcanzadoMax
                        return (
                          <button
                            key={op.id}
                            onClick={() => !bloqueado && toggleExtra(op, g)}
                            disabled={bloqueado}
                            style={{
                              padding: '11px 14px', borderRadius: 12,
                              background: sel ? C.terracottaSoft : C.paper,
                              border: sel ? `1.5px solid ${C.terracotta}` : `1px solid ${C.border}`,
                              display: 'flex', alignItems: 'center', gap: 12,
                              cursor: bloqueado ? 'not-allowed' : 'pointer',
                              opacity: bloqueado ? 0.45 : 1, fontFamily: 'inherit', textAlign: 'left',
                            }}
                          >
                            <span style={{
                              width: 18, height: 18, borderRadius: esUnico ? '50%' : 5, flexShrink: 0,
                              border: `2px solid ${sel ? C.terracotta : '#C8C1B0'}`,
                              background: sel ? (esUnico ? '#fff' : C.terracotta) : 'transparent',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff',
                            }}>
                              {sel && esUnico && <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.terracotta }} />}
                              {sel && !esUnico && <span style={{ fontSize: 11, fontWeight: 800, lineHeight: 1 }}>✓</span>}
                            </span>
                            <span style={{ flex: 1, fontSize: 14, color: C.ink, fontWeight: 600 }}>{op.nombre}</span>
                            <span style={{ fontSize: 13, color: C.stone, fontWeight: 700 }}>
                              {op.precio > 0 ? `+ ${fmt(op.precio)}` : 'Gratis'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.stone }}>Cantidad</span>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 14,
                  padding: '6px 8px', borderRadius: 999, background: C.cream2,
                }}>
                  <button
                    onClick={() => setCant(Math.max(1, cant - 1))}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', border: 'none',
                      background: '#fff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: C.ink, boxShadow: SH.sm,
                    }}
                  ><Minus size={14} strokeWidth={2.4} /></button>
                  <span style={{
                    fontSize: 17, color: C.ink, fontWeight: 800,
                    minWidth: 16, textAlign: 'center',
                  }}>{cant}</span>
                  <button
                    onClick={() => setCant(cant + 1)}
                    style={{
                      width: 32, height: 32, borderRadius: '50%', border: 'none',
                      background: C.terracotta, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff',
                    }}
                  ><Plus size={14} strokeWidth={2.4} /></button>
                </div>
              </div>
            </div>

            <div style={{ padding: 14, borderTop: `1px solid ${C.border}`, background: C.paper }}>
              <button
                onClick={confirmarItem}
                disabled={!puedeConfirmar}
                style={{
                  width: '100%', padding: '14px 18px', borderRadius: 14,
                  border: 'none', cursor: puedeConfirmar ? 'pointer' : 'not-allowed',
                  background: puedeConfirmar
                    ? `linear-gradient(180deg, ${C.ink2}, ${C.ink})`
                    : C.cream2,
                  color: puedeConfirmar ? C.cream : C.stone,
                  fontFamily: 'inherit', fontWeight: 700, fontSize: 15,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  boxShadow: puedeConfirmar ? SH.glossy : 'none',
                }}
              >
                <span>{puedeConfirmar ? 'Añadir al carrito' : 'Selecciona las opciones obligatorias'}</span>
                {puedeConfirmar && <span>{fmt(precioTotal())}</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
