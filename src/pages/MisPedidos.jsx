import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronRight, MapPin, Store, CreditCard, Banknote } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { estaAbierto } from '../lib/horario'
import CreadoresCTA from '../components/CreadoresCTA'

// Un color por estado, con texto OSCURO y saturado para que se lea bien sobre el
// tema claro (antes era verde claro sobre verde claro = casi invisible, y "en camino"
// / "entregado" salían del mismo color). Azul = recién entrado, ámbar = en cocina,
// naranja = en camino, verde = entregado, rojo = cancelado.
const ESTADO_COLORS = {
  nuevo:      { bg: 'rgba(37,99,235,0.12)',  c: '#1D4ED8' },
  aceptado:   { bg: 'rgba(37,99,235,0.12)',  c: '#1D4ED8' },
  preparando: { bg: 'rgba(245,158,11,0.16)', c: '#B45309' },
  listo:      { bg: 'rgba(245,158,11,0.16)', c: '#B45309' },
  recogido:   { bg: 'rgba(255,107,44,0.14)', c: '#C2410C' },
  en_camino:  { bg: 'rgba(255,107,44,0.14)', c: '#C2410C' },
  entregado:  { bg: 'rgba(34,197,94,0.16)',  c: '#15803D' },
  cancelado:  { bg: 'rgba(239,68,68,0.12)',  c: '#DC2626' },
  fallido:    { bg: 'rgba(239,68,68,0.12)',  c: '#DC2626' },
}

const ESTADOS_EN_CURSO = ['nuevo', 'aceptado', 'preparando', 'listo', 'en_camino', 'recogido']
// Se puede repetir lo que ya terminó, también lo cancelado: quien se quedó sin su
// pedido es justo quien más quiere volver a pedirlo.
const ESTADOS_REPETIBLES = ['entregado', 'cancelado', 'fallido']

const METODO_PAGO = { tarjeta: 'Tarjeta', efectivo: 'Efectivo', datafono: 'Datáfono' }

const fmt = (n) => `${(Number(n) || 0).toFixed(2).replace('.', ',')} €`

// "Bacon (+1.00€)" → "Bacon (+1,00 €)": las etiquetas de extras se guardan así
// desde el carrito (formato legado de pedido_items.extras).
const etiquetaExtra = (e) => String(e || '').replace(/\(\+\s*([0-9]+)[.,]([0-9]{1,2})\s*€\)/, (_, a, b) => `(+${a},${b.padEnd(2, '0')} €)`)

const mismoTexto = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()

// `restaurantesPermitidos`: dentro de la tienda de un restaurante (/:slug) o del
// marketplace de un socio (/s/:slug) solo se repiten pedidos de ESOS restaurantes.
// Repetir aquí el de otro dejaba en el carrito sus productos y el pedido salía con
// el origen de esta tienda (tienda_publica / marketplace_socio): comisión y tarifa
// de envío equivocadas. null = sin restricción (la app general).
export default function MisPedidos({ onTrack, onOpenCart, restaurantesPermitidos = null }) {
  const { user } = useAuth()
  const { carrito, replaceCart } = useCart()
  const [pedidos, setPedidos] = useState([])
  const [itemsMap, setItemsMap] = useState({})
  const [sociosMap, setSociosMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [resenados, setResenados] = useState(() => new Set())
  // Detalle abierto (hoja que sube desde abajo).
  const [detalle, setDetalle] = useState(null)
  const [repitiendo, setRepitiendo] = useState(false)
  const [repMsg, setRepMsg] = useState(null) // { tipo: 'error' | 'ok', texto }

  useEffect(() => { if (user) fetchPedidos() }, [user])

  async function fetchPedidos() {
    setError(null)
    const hace90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data, error: queryError } = await supabase
      .from('pedidos').select('*, establecimientos(nombre)')
      .eq('usuario_id', user.id).gte('created_at', hace90d)
      .neq('estado', 'pendiente_pago')
      .order('created_at', { ascending: false }).limit(50)
    if (queryError) { setError('No se pudieron cargar los pedidos'); setLoading(false); return }
    const lista = data || []
    setPedidos(lista)
    setLoading(false)

    // Los productos de cada pedido, de una vez: la tarjeta enseña el resumen y el
    // detalle la lista entera. Antes el cliente no veía en ningún sitio qué pidió.
    const ids = lista.map(p => p.id)
    if (ids.length > 0) {
      const { data: its } = await supabase.from('pedido_items')
        .select('id, pedido_id, producto_id, nombre_producto, cantidad, precio_unitario, tamano, extras, extras_ids, notas')
        .in('pedido_id', ids)
      const map = {}
      for (const it of (its || [])) {
        if (!map[it.pedido_id]) map[it.pedido_id] = []
        map[it.pedido_id].push(it)
      }
      setItemsMap(map)
    }

    // Pedidos entregados que el usuario YA reseñó → para mostrar "Valorar" solo en los que faltan
    const entregadosIds = lista.filter(p => p.estado === 'entregado').map(p => p.id)
    if (entregadosIds.length > 0) {
      const { data: rs } = await supabase.from('resenas')
        .select('pedido_id').eq('usuario_id', user.id).in('pedido_id', entregadosIds)
      if (rs) setResenados(new Set(rs.map(r => r.pedido_id)))
    }

    const socioIds = [...new Set(lista.map(p => p.socio_id).filter(Boolean))]
    if (socioIds.length > 0) {
      const { data: socios } = await supabase.from('socios')
        .select('id, nombre_comercial, logo_url, color_primario')
        .in('id', socioIds)
      if (socios) {
        const map = {}
        socios.forEach(s => { map[s.id] = s })
        setSociosMap(map)
      }
    }
  }

  const permitido = (p) => !Array.isArray(restaurantesPermitidos) || restaurantesPermitidos.includes(p.establecimiento_id)

  function abrirDetalle(p) { setRepMsg(null); setDetalle(p) }
  function cerrarDetalle() { if (!repitiendo) { setDetalle(null); setRepMsg(null) } }

  // Repetir = las MISMAS cosas con los precios de HOY. Antes se repetía con el
  // precio de entonces cuando el producto llevaba tamaño o extras, y si el
  // restaurante había subido la carta el pago acababa en PD280 ("el precio ha
  // cambiado"). Ahora se recompone: precio del tamaño + precio actual de cada
  // extra (pedido_items.extras_ids los identifica). Si algún extra ya no se
  // reconoce, se queda con su etiqueta y nunca por debajo del precio de carta.
  async function repetirPedido(pedido) {
    setRepMsg(null)
    if (!permitido(pedido)) {
      setRepMsg({ tipo: 'error', texto: `Este pedido es de ${pedido.establecimientos?.nombre || 'otro restaurante'}. Para repetirlo, ábrelo desde la app de Pidoo o desde su tienda.` })
      return
    }
    setRepitiendo(true)
    try {
      const items = itemsMap[pedido.id] || []
      // Las líneas a 0 € son regalos de una promo: no se piden, el servidor los
      // vuelve a poner si la promo sigue y el pedido la cumple.
      const lineas = items.filter(i => Number(i.precio_unitario) > 0)
      if (lineas.length === 0) {
        setRepMsg({ tipo: 'error', texto: 'No hemos podido leer los productos de este pedido.' })
        return
      }

      // Repetir a un restaurante CERRADO llenaba el carrito y el cliente no se
      // enteraba hasta el checkout (error crudo de PD101). Si la lectura falla,
      // tampoco se sigue. Y se mira 'estado' además del horario: un restaurante
      // suspendido está oculto en el resto de la app, aquí también.
      const { data: est } = await supabase.from('establecimientos')
        .select('nombre, activo, horario, estado').eq('id', pedido.establecimiento_id).maybeSingle()
      if (!est || est.estado !== 'activo') {
        setRepMsg({ tipo: 'error', texto: `${est?.nombre || 'Este restaurante'} no está aceptando pedidos ahora mismo.` })
        return
      }
      const apertura = estaAbierto(est)
      if (!apertura.abierto) {
        setRepMsg({ tipo: 'error', texto: `${est.nombre} está cerrado ahora mismo.${apertura.proximaApertura ? ` ${apertura.proximaApertura}.` : ''}` })
        return
      }

      const ids = [...new Set(lineas.map(i => i.producto_id).filter(Boolean))]
      const extraIds = [...new Set(lineas.flatMap(i => i.extras_ids || []))]
      const [prodRes, tamRes, extRes] = await Promise.all([
        ids.length
          ? supabase.from('productos').select('id, nombre, precio, disponible, imagen_url').in('id', ids)
          : Promise.resolve({ data: [], error: null }),
        ids.length
          ? supabase.from('producto_tamanos').select('producto_id, nombre, precio').in('producto_id', ids)
          : Promise.resolve({ data: [], error: null }),
        extraIds.length
          ? supabase.from('extras_opciones').select('id, nombre, precio, grupo_id, grupos_extras(nombre)').in('id', extraIds)
          : Promise.resolve({ data: [], error: null }),
      ])
      if (prodRes.error || tamRes.error || extRes.error) {
        setRepMsg({ tipo: 'error', texto: 'No hemos podido consultar la carta. Inténtalo de nuevo.' })
        return
      }
      const prodMap = Object.fromEntries((prodRes.data || []).map(p => [p.id, p]))
      const opMap = Object.fromEntries((extRes.data || []).map(o => [o.id, o]))

      const nuevos = []
      const fuera = []
      for (const it of lineas) {
        const prod = it.producto_id ? prodMap[it.producto_id] : null
        if (!prod || prod.disponible === false) { fuera.push(it.nombre_producto); continue }

        let base = Number(prod.precio) || 0
        if (it.tamano) {
          const tam = (tamRes.data || []).find(t => t.producto_id === prod.id && mismoTexto(t.nombre, it.tamano))
          if (!tam) { fuera.push(`${it.nombre_producto} (${it.tamano})`); continue }
          base = Number(tam.precio) || 0
        }

        const etiquetas = it.extras || []
        const idsExtra = it.extras_ids || []
        let extras = []
        let precio
        if (etiquetas.length === 0) {
          precio = base
        } else if (idsExtra.length === etiquetas.length && idsExtra.every(id => opMap[id])) {
          // Mismo formato que monta RestDetalle al elegir extras: por grupos.
          const grupos = new Map()
          for (const id of idsExtra) {
            const op = opMap[id]
            if (!grupos.has(op.grupo_id)) {
              grupos.set(op.grupo_id, { grupo_id: op.grupo_id, grupo_nombre: op.grupos_extras?.nombre || '', opciones: [] })
            }
            grupos.get(op.grupo_id).opciones.push({ id: op.id, nombre: op.nombre, precio: Number(op.precio) || 0 })
          }
          extras = [...grupos.values()]
          precio = base + extras.reduce((s, g) => s + g.opciones.reduce((t, o) => t + o.precio, 0), 0)
        } else {
          // Sin poder reconocer los extras: se cobran como dicen sus etiquetas
          // ("Bacon (+1.00€)", mismo patrón que _stock_extras_ids_de_etiquetas)
          // sobre el precio de HOY, y nunca por debajo de lo que se pagó.
          extras = etiquetas
          const sumaEtiquetas = etiquetas.reduce((s, e) => {
            const m = String(e || '').match(/\(\+\s*([0-9]+(?:[.,][0-9]+)?)\s*€\)/)
            return s + (m ? Number(m[1].replace(',', '.')) || 0 : 0)
          }, 0)
          precio = Math.max(Number(it.precio_unitario) || 0, base + sumaEtiquetas)
        }

        nuevos.push({
          producto_id: prod.id,
          nombre: prod.nombre || it.nombre_producto,
          imagen_url: prod.imagen_url || null,
          tamano: it.tamano || null,
          extras,
          precio_unitario: Math.round(precio * 100) / 100,
          cantidad: it.cantidad || 1,
          establecimiento_id: pedido.establecimiento_id,
          establecimiento_nombre: est.nombre || pedido.establecimientos?.nombre || '',
          coste_envio: 0,
        })
      }

      if (nuevos.length === 0) {
        setRepMsg({ tipo: 'error', texto: 'Los productos de este pedido ya no están en la carta.' })
        return
      }

      // Carrito de OTRO restaurante: se sustituye (el botón ya lo avisa). Del mismo,
      // se suma a lo que hubiera.
      const otroRest = carrito.length > 0 && carrito[0].establecimiento_id !== pedido.establecimiento_id
      replaceCart(otroRest ? nuevos : [...carrito, ...nuevos])

      if (fuera.length > 0 || !onOpenCart) {
        setRepMsg({
          tipo: 'ok',
          texto: fuera.length > 0
            ? `Añadido al carrito con los precios de hoy. No hemos añadido lo que ya no está en la carta: ${fuera.join(', ')}.`
            : 'Añadido al carrito con los precios de hoy.',
        })
        return
      }
      // Todo bien: al carrito directamente, que es donde se ve lo que se va a pagar.
      setDetalle(null)
      onOpenCart()
    } finally {
      setRepitiendo(false)
    }
  }

  function formatFecha(f) {
    const d = new Date(f), hoy = new Date()
    if (d.toDateString() === hoy.toDateString()) return `Hoy, ${d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`
    const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1)
    if (d.toDateString() === ayer.toDateString()) return `Ayer, ${d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
  }

  function resumen(items) {
    return (items || []).map(i => `${i.cantidad}× ${i.nombre_producto}`).join(' · ')
  }

  const btnPrimario = {
    width: '100%', marginTop: 10, padding: '11px 0', borderRadius: 12,
    border: 'none', background: 'var(--c-btn-gradient, #E4671F)', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit', color: '#fff',
  }
  const btnSecundario = {
    width: '100%', marginTop: 10, padding: '11px 0', borderRadius: 12,
    border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.06)',
    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--c-text)',
  }

  return (
    <div className="shell-lista" style={{ animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-text)', margin: '0 0 16px', letterSpacing: '-0.02em' }}>Mis pedidos</h2>
      {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--c-muted)' }}>Cargando...</div>}
      {error && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#EF4444', marginBottom: 12 }}>{error}</div>
          <button onClick={fetchPedidos} style={{ padding: '8px 20px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.06)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--c-text)' }}>Reintentar</button>
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
        const socio = p.socio_id ? sociosMap[p.socio_id] : null
        const textoItems = resumen(itemsMap[p.id])
        return (
          // Toda la tarjeta abre el detalle. Los botones de dentro paran el clic
          // para no abrirlo a la vez.
          <div key={p.id} role="button" tabIndex={0}
            onClick={() => abrirDetalle(p)}
            onKeyDown={e => { if (e.key === 'Enter') abrirDetalle(p) }}
            style={{ background: 'rgba(0,0,0,0.06)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(0,0,0,0.08)', marginBottom: 10, cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--c-text)' }}>{p.establecimientos?.nombre || 'Restaurante'}</span>
              <span style={{ background: colors.bg, color: colors.c, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, textTransform: 'capitalize' }}>{p.estado.replace('_', ' ')}</span>
            </div>
            {socio && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#767575', marginBottom: 6 }}>
                <span>vía</span>
                {socio.logo_url ? (
                  <img src={socio.logo_url} alt="" style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover', background: '#fff' }} />
                ) : (
                  <span style={{ width: 14, height: 14, borderRadius: '50%', background: socio.color_primario || '#C5562C', display: 'inline-block' }} />
                )}
                <span style={{ fontWeight: 700, color: socio.color_primario || 'var(--c-text)' }}>{socio.nombre_comercial}</span>
              </div>
            )}
            {textoItems && (
              <div style={{ fontSize: 12, color: 'var(--c-text)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {textoItems}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#767575', marginBottom: 4 }}>
              <span>{p.codigo}</span>
              <span>{METODO_PAGO[p.metodo_pago] || 'Efectivo'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#767575' }}>
              <span>{formatFecha(p.created_at)}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontWeight: 700, color: 'var(--c-text)' }}>
                {fmt(p.total)} <ChevronRight size={15} strokeWidth={2.2} color="#767575" />
              </span>
            </div>
            {ESTADOS_EN_CURSO.includes(p.estado) && (
              <button onClick={e => { e.stopPropagation(); onTrack(p) }} style={btnPrimario}>Seguir pedido</button>
            )}
            {p.estado === 'entregado' && !resenados.has(p.id) && (
              <button onClick={e => { e.stopPropagation(); onTrack(p) }} style={btnPrimario}>⭐ Valorar pedido</button>
            )}
            {/* "Repetir" abre el detalle: el cliente ve QUÉ va a pedir antes de
                que entre en el carrito (antes se metía a ciegas). */}
            {p.estado === 'entregado' && permitido(p) && (
              <button onClick={e => { e.stopPropagation(); abrirDetalle(p) }} style={btnSecundario}>Repetir pedido</button>
            )}
            {p.estado === 'entregado' && (
              <div onClick={e => e.stopPropagation()}>
                <CreadoresCTA pedido={p} establecimientoNombre={p.establecimientos?.nombre} compacto />
              </div>
            )}
          </div>
        )
      })}

      {detalle && typeof document !== 'undefined' && createPortal(
        <DetallePedido
          pedido={detalle}
          items={itemsMap[detalle.id]}
          socio={detalle.socio_id ? sociosMap[detalle.socio_id] : null}
          carrito={carrito}
          resenado={resenados.has(detalle.id)}
          permitido={permitido(detalle)}
          repitiendo={repitiendo}
          repMsg={repMsg}
          onCerrar={cerrarDetalle}
          onRepetir={() => repetirPedido(detalle)}
          onSeguir={() => { setDetalle(null); onTrack(detalle) }}
          onVerCarrito={onOpenCart ? () => { setDetalle(null); onOpenCart() } : null}
        />,
        document.body
      )}
    </div>
  )
}

/* ─── Detalle del pedido ─────────────────────────────────── */
// Hoja que sube desde abajo (en escritorio, centrada: .modal-overlay/.modal-sheet).
// Colores literales: va en un portal a <body>, fuera del contenedor del shell.
function DetallePedido({ pedido: p, items, socio, carrito, resenado, permitido, repitiendo, repMsg, onCerrar, onRepetir, onSeguir, onVerCarrito }) {
  const colors = ESTADO_COLORS[p.estado] || ESTADO_COLORS.nuevo
  const lineas = items || []
  const esDomicilio = p.modo_entrega === 'delivery'
  const descuento = Number(p.descuento) || 0
  const propina = Number(p.propina) || 0
  const envio = Number(p.coste_envio) || 0
  const otroRest = carrito.length > 0 && carrito[0].establecimiento_id !== p.establecimiento_id
  const repetible = ESTADOS_REPETIBLES.includes(p.estado) && lineas.some(i => Number(i.precio_unitario) > 0)
  const puedeRepetir = repetible && permitido
  const fecha = new Date(p.created_at).toLocaleString('es', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

  const fila = (label, valor, opts = {}) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, padding: '3px 0', color: opts.color || '#2B2823' }}>
      <span>{label}</span>
      <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{valor}</span>
    </div>
  )

  return (
    <div
      className="modal-overlay"
      onClick={onCerrar}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,15,15,0.55)', zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        className="modal-sheet"
        onClick={e => e.stopPropagation()}
        style={{
          background: '#F7F3EC', color: '#1A1815', fontFamily: "'DM Sans', sans-serif",
          borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 420, maxHeight: '88vh', overflowY: 'auto',
          padding: '18px 18px calc(24px + env(safe-area-inset-bottom, 0px))',
          animation: 'slideUp 0.3s ease', boxShadow: '0 -8px 32px rgba(15,15,15,0.12)',
        }}
      >
        {/* Asa pegada arriba con el fondo de la hoja (igual que el carrito): al
            bajar, el contenido no llega cortado hasta el borde redondeado. */}
        <div style={{
          position: 'sticky', top: -18, zIndex: 5,
          margin: '-18px -18px 6px', padding: '10px 0 12px',
          background: '#F7F3EC', borderRadius: '20px 20px 0 0',
        }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.10)', margin: '0 auto' }} />
        </div>

        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{p.establecimientos?.nombre || 'Restaurante'}</div>
            <div style={{ fontSize: 12, color: '#6B6356', marginTop: 4 }}>{p.codigo} · {fecha}</div>
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" style={{
            width: 34, height: 34, borderRadius: '50%', background: '#EFE9DD', border: 'none', flexShrink: 0,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} strokeWidth={2.4} color="#6B6356" />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <span style={{ background: colors.bg, color: colors.c, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, textTransform: 'capitalize' }}>{p.estado.replace('_', ' ')}</span>
          {socio && <span style={{ fontSize: 11, color: '#6B6356' }}>vía <strong style={{ color: socio.color_primario || '#1A1815' }}>{socio.nombre_comercial}</strong></span>}
        </div>

        {/* Productos */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6B6356', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '18px 0 8px' }}>
          Productos
        </div>
        <div style={{ background: '#FBF8F2', border: '1px solid #E8E1D3', borderRadius: 14, padding: '4px 14px' }}>
          {lineas.length === 0 && (
            <div style={{ fontSize: 13, color: '#6B6356', padding: '10px 0' }}>No hay productos guardados en este pedido.</div>
          )}
          {lineas.map((it, idx) => {
            const regalo = Number(it.precio_unitario) === 0
            return (
              <div key={it.id || idx} style={{ display: 'flex', gap: 10, padding: '10px 0', borderTop: idx === 0 ? 'none' : '1px solid #EFE9DD' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#A85018', minWidth: 24 }}>{it.cantidad}×</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{it.nombre_producto}</div>
                  {it.tamano && <div style={{ fontSize: 12, color: '#6B6356', marginTop: 2 }}>{it.tamano}</div>}
                  {it.extras?.length > 0 && (
                    <div style={{ fontSize: 12, color: '#6B6356', marginTop: 2, lineHeight: 1.4 }}>{it.extras.map(etiquetaExtra).join(' · ')}</div>
                  )}
                  {it.notas && <div style={{ fontSize: 12, color: '#6B6356', marginTop: 2, fontStyle: 'italic' }}>«{it.notas}»</div>}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', color: regalo ? '#6F8460' : '#1A1815' }}>
                  {regalo ? 'Gratis' : fmt(Number(it.precio_unitario) * (it.cantidad || 1))}
                </span>
              </div>
            )
          })}
        </div>

        {/* Importes */}
        <div style={{ background: '#FBF8F2', border: '1px solid #E8E1D3', borderRadius: 14, padding: '10px 14px', marginTop: 10 }}>
          {fila('Subtotal', fmt(p.subtotal))}
          {descuento > 0 && fila(p.promo_titulo ? `Descuento · ${p.promo_titulo}` : 'Descuento', `−${fmt(descuento)}`, { color: '#6F8460' })}
          {esDomicilio ? fila('Envío', envio > 0 ? fmt(envio) : 'Gratis') : fila('Recogida en el local', 'Sin envío')}
          {propina > 0 && fila('Propina', fmt(propina))}
          <div style={{ height: 1, background: '#E8E1D3', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{fmt(p.total)}</span>
          </div>
        </div>

        {/* Pago, entrega, notas */}
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
            {p.metodo_pago === 'efectivo'
              ? <Banknote size={16} color="#6B6356" style={{ flexShrink: 0, marginTop: 1 }} />
              : <CreditCard size={16} color="#6B6356" style={{ flexShrink: 0, marginTop: 1 }} />}
            <span>Pago: <strong>{METODO_PAGO[p.metodo_pago] || 'Efectivo'}</strong></span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
            {esDomicilio
              ? <MapPin size={16} color="#6B6356" style={{ flexShrink: 0, marginTop: 1 }} />
              : <Store size={16} color="#6B6356" style={{ flexShrink: 0, marginTop: 1 }} />}
            <span style={{ lineHeight: 1.4 }}>
              {esDomicilio
                ? <>A domicilio{p.direccion_entrega ? <>: <strong>{p.direccion_entrega}</strong></> : ''}</>
                : 'Recogida en el local'}
            </span>
          </div>
          {p.notas && (
            <div style={{ fontSize: 13, color: '#2B2823', lineHeight: 1.4 }}>
              <span style={{ color: '#6B6356' }}>Notas: </span>{p.notas}
            </div>
          )}
          {p.reembolsado_at && (
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#15803D', background: 'rgba(34,197,94,0.10)', borderRadius: 10, padding: '8px 12px' }}>
              Te devolvimos {fmt(p.monto_reembolsado || p.total)} el {new Date(p.reembolsado_at).toLocaleDateString('es', { day: 'numeric', month: 'long' })}.
            </div>
          )}
        </div>

        {/* Aviso del último intento de repetir */}
        {repMsg && (
          <div style={{
            marginTop: 14, padding: '10px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 600, lineHeight: 1.4,
            background: repMsg.tipo === 'error' ? 'rgba(181,86,74,0.10)' : 'rgba(34,197,94,0.10)',
            color: repMsg.tipo === 'error' ? '#B5564A' : '#15803D',
          }}>
            {repMsg.texto}
          </div>
        )}

        {/* Acciones */}
        <div style={{ marginTop: 6 }}>
          {repetible && !permitido && (
            <div style={{ fontSize: 12, color: '#6B6356', marginTop: 12, lineHeight: 1.4, textAlign: 'center' }}>
              Este pedido es de {p.establecimientos?.nombre || 'otro restaurante'}. Para repetirlo, ábrelo desde la app de Pidoo o desde su tienda.
            </div>
          )}
          {ESTADOS_EN_CURSO.includes(p.estado) && (
            <button onClick={onSeguir} style={{ ...botonHoja, background: '#E4671F', color: '#fff', border: 'none' }}>Seguir pedido</button>
          )}
          {p.estado === 'entregado' && !resenado && (
            <button onClick={onSeguir} style={{ ...botonHoja, background: '#fff', color: '#1A1815' }}>⭐ Valorar pedido</button>
          )}
          {puedeRepetir && repMsg?.tipo === 'ok' && onVerCarrito && (
            <button onClick={onVerCarrito} style={{ ...botonHoja, background: '#E4671F', color: '#fff', border: 'none' }}>Ver carrito</button>
          )}
          {puedeRepetir && repMsg?.tipo !== 'ok' && (
            <>
              {otroRest && (
                <div style={{ fontSize: 11.5, color: '#6B6356', marginTop: 12, lineHeight: 1.4 }}>
                  Tu carrito tiene productos de {carrito[0]?.establecimiento_nombre || 'otro restaurante'}: se cambiarán por los de este pedido.
                </div>
              )}
              <button onClick={onRepetir} disabled={repitiendo} style={{
                ...botonHoja, background: repitiendo ? '#E8E1D3' : '#E4671F', color: '#fff', border: 'none',
                cursor: repitiendo ? 'default' : 'pointer',
              }}>
                {repitiendo ? 'Comprobando la carta…' : otroRest ? 'Vaciar el carrito y repetir' : 'Repetir este pedido'}
              </button>
              <div style={{ fontSize: 11, color: '#6B6356', textAlign: 'center', marginTop: 8 }}>
                Se añaden con los precios de hoy. Podrás revisarlo en el carrito antes de pagar.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const botonHoja = {
  width: '100%', marginTop: 12, padding: '14px 0', borderRadius: 14,
  border: '1px solid #E8E1D3', fontSize: 15, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit',
}
