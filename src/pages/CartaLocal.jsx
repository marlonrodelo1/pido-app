/* ──────────────────────────────────────────────────────────────────────────
 * CartaLocal — pidoo.es/<slug>/carta
 *
 * La carta que el cliente ve al escanear el QR de la mesa, con los precios de
 * CONSUMO EN EL LOCAL (`productos.precio_local`, distintos de los de reparto).
 *
 * Es igual que la tienda pública por fuera —mismo hero, mismos chips, mismas
 * cards— pero SIN barra inferior, sin botones de añadir y sin carrito.
 *
 * ES DE SOLO LECTURA A PROPÓSITO, y eso no es una decisión de UI: es la que
 * mantiene el precio de local fuera del dinero. Esta página NO monta
 * CartProvider ni AuthProvider, así que no existe ningún camino por el que un
 * `precio_local` pueda acabar en `pedido_items` — ni por error ni manipulando
 * el navegador. Comisión, liquidación de los lunes, pedido mínimo y promos
 * siguen viendo un único precio, el de siempre (`productos.precio`).
 *
 * Por eso el aspecto está REPLICADO y no importado de RestDetalle: compartir
 * ese componente traería consigo el carrito y se perdería la garantía.
 *
 * Si alguna vez se quisiera pedir desde la mesa, NO basta con añadir botones
 * aquí: habría que tocar enforce_pedido_item_precio(), crear_pedido_invitado,
 * el CHECK de pedidos.origen_pedido y calcular_liquidacion_restaurante.
 * ────────────────────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { Search, X, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { horarioHoyTexto } from '../lib/horario'
import { FoodIcon } from '../lib/food'
import AppDownloadBanner from '../components/AppDownloadBanner'

// Misma paleta que RestDetalle, para que las dos pantallas sean la misma marca.
const C = {
  cream: '#F7F3EC', cream2: '#EFE9DD', paper: '#FBF8F2',
  ink: '#1A1815', stone: '#6B6356', stone2: '#8A8174',
  terracotta: '#C5562C', terracotta2: '#A8451F',
  border: '#E8E1D3',
}
const SH = {
  sm: '0 1px 2px rgba(26,24,21,0.06)',
  md: '0 4px 14px rgba(26,24,21,0.08)',
}
const fmt = (n) => `${(Number(n) || 0).toFixed(2).replace('.', ',')} €`

// Columnas explícitas (nada de `*`): no traer PII ni configuración interna a
// una página pública que abre cualquiera sin identificarse.
const COLS_EST =
  'id, nombre, descripcion, direccion, logo_url, banner_url, slug, tipo, rating, activo, horario, carta_local_activa'

/** Precio a mostrar: el de local si lo han puesto, si no el normal. */
function precioLocal(fila) {
  if (!fila) return 0
  const local = fila.precio_local
  if (local !== null && local !== undefined && local !== '') return Number(local)
  return Number(fila.precio) || 0
}

const pantalla = (texto) => (
  <div style={{
    minHeight: '100vh', background: C.cream, color: C.stone,
    fontFamily: "'DM Sans', sans-serif",
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
  }}>{texto}</div>
)

export default function CartaLocal() {
  const { slug } = useParams()
  const slugOk = !!slug && /^[a-z0-9-]+$/i.test(slug)

  const [estado, setEstado] = useState(slugOk ? 'loading' : 'notfound')
  const [est, setEst] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [tamanosPorProducto, setTamanosPorProducto] = useState({})
  const [extrasPorProducto, setExtrasPorProducto] = useState({})
  const [busqueda, setBusqueda] = useState('')
  const [catFiltro, setCatFiltro] = useState(null)

  /* ── 1. Resolver el restaurante por slug ─────────────────────────────── */
  useEffect(() => {
    if (!slugOk) return
    let cancelado = false
    supabase
      .from('establecimientos')
      .select(COLS_EST)
      .eq('slug', slug)
      .eq('estado', 'activo')
      .maybeSingle()
      .then(({ data }) => {
        if (cancelado) return
        if (!data) { setEstado('notfound'); return }
        setEst(data)
        // Sin carta de local activa no hay página que enseñar: se manda a la
        // tienda normal en vez de dar un 404. Un QR ya impreso en una mesa no
        // se puede corregir, así que nunca debe llevar a una página muerta.
        setEstado(data.carta_local_activa ? 'ok' : 'sin-carta')
      })
    return () => { cancelado = true }
  }, [slug, slugOk])

  /* ── 2. Cargar la carta ──────────────────────────────────────────────── */
  useEffect(() => {
    if (estado !== 'ok' || !est?.id) return
    let cancelado = false
    ;(async () => {
      const [catRes, prodRes] = await Promise.all([
        // OJO: `categorias` NO tiene columna `emoji`. Pedirla hace fallar la
        // query ENTERA y el fallo es mudo: las categorías llegan vacías y todos
        // los platos caen en "Otros" sin ningún error a la vista.
        supabase.from('categorias')
          .select('id, nombre, orden')
          .eq('establecimiento_id', est.id).eq('activa', true).order('orden'),
        supabase.from('productos')
          .select('id, nombre, descripcion, precio, precio_local, imagen_url, categoria_id, orden')
          .eq('establecimiento_id', est.id).eq('disponible', true).order('orden'),
      ])
      if (cancelado) return
      if (catRes.error) console.error('[CartaLocal] categorias:', catRes.error.message)
      if (prodRes.error) console.error('[CartaLocal] productos:', prodRes.error.message)
      const prods = prodRes.data || []
      setCategorias(catRes.data || [])
      setProductos(prods)

      const ids = prods.map(p => p.id)
      if (ids.length === 0) return

      const [tamRes, peRes] = await Promise.all([
        supabase.from('producto_tamanos')
          .select('producto_id, nombre, precio, precio_local, orden')
          .in('producto_id', ids).order('orden'),
        supabase.from('producto_extras')
          .select('producto_id, grupo_id')
          .in('producto_id', ids),
      ])
      if (cancelado) return

      const porProd = {}
      for (const t of (tamRes.data || [])) {
        if (!porProd[t.producto_id]) porProd[t.producto_id] = []
        porProd[t.producto_id].push(t)
      }
      setTamanosPorProducto(porProd)

      const gruposIds = [...new Set((peRes.data || []).map(pe => pe.grupo_id))]
      if (gruposIds.length === 0) return
      const { data: grupos } = await supabase
        .from('grupos_extras')
        .select('id, nombre, extras_opciones(nombre, precio, orden)')
        .in('id', gruposIds)
      if (cancelado) return

      const porId = {}
      for (const g of (grupos || [])) porId[g.id] = g
      const mapa = {}
      for (const pe of (peRes.data || [])) {
        const g = porId[pe.grupo_id]
        if (!g) continue
        if (!mapa[pe.producto_id]) mapa[pe.producto_id] = []
        mapa[pe.producto_id].push(g)
      }
      setExtrasPorProducto(mapa)
    })()
    return () => { cancelado = true }
  }, [estado, est?.id])

  /* ── 3. Título y meta ────────────────────────────────────────────────── */
  useEffect(() => {
    if (estado !== 'ok' || !est) return
    const previo = document.title
    document.title = `Carta · ${est.nombre}`

    // noindex a propósito: la página que debe posicionar en Google es la
    // tienda (/<slug>), con los precios de reparto. Si se indexaran las dos,
    // el buscador enseñaría dos precios del mismo plato sin contexto.
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, follow'
    document.head.appendChild(meta)

    return () => {
      document.title = previo
      if (meta.parentNode) meta.parentNode.removeChild(meta)
    }
  }, [estado, est?.id, est?.nombre])

  /* ── 4. Agrupar y filtrar ────────────────────────────────────────────── */
  const grupos = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    const visibles = texto
      ? productos.filter(p =>
          p.nombre.toLowerCase().includes(texto) ||
          (p.descripcion || '').toLowerCase().includes(texto))
      : productos

    const salida = []
    for (const cat of categorias) {
      if (catFiltro && cat.id !== catFiltro) continue
      const items = visibles.filter(p => p.categoria_id === cat.id)
      if (items.length) salida.push({ id: cat.id, nombre: cat.nombre, items })
    }
    if (!catFiltro) {
      const sueltos = visibles.filter(p => !p.categoria_id || !categorias.some(c => c.id === p.categoria_id))
      if (sueltos.length) salida.push({ id: '_otros', nombre: 'Otros', items: sueltos })
    }
    return salida
  }, [productos, categorias, busqueda, catFiltro])

  if (estado === 'loading') return pantalla('Cargando carta...')
  if (estado === 'notfound') return <Navigate to="/" replace />
  if (estado === 'sin-carta') return <Navigate to={'/' + slug} replace />

  const horarioHoy = horarioHoyTexto(est.horario)
  const totalVisibles = grupos.reduce((s, g) => s + g.items.length, 0)

  return (
    <div style={{
      minHeight: '100vh', background: C.cream, color: C.ink,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{css}</style>

      <div style={{
        maxWidth: 720, margin: '0 auto',
        padding: 'calc(14px + env(safe-area-inset-top, 0px)) 20px 0',
      }}>
        {/* ── Banner de la app ────────────────────────────────────────── */}
        <AppDownloadBanner
          slug={est.slug}
          titulo="¿Prefieres que te lo llevemos a casa?"
          subtitulo="Pide a domicilio con Pidoo. El precio a domicilio es el de la tienda online."
        />

        {/* ── Hero: banner + logo + nombre, igual que la tienda ───────── */}
        <div style={{ padding: '14px 0 0' }}>
          <div style={{
            position: 'relative', height: 200, borderRadius: 18, overflow: 'hidden',
            background: est.banner_url ? '#000' : `linear-gradient(135deg, ${C.terracotta} 0%, ${C.terracotta2} 100%)`,
            boxShadow: SH.md,
          }}>
            {est.banner_url && (
              <img
                src={est.banner_url} alt="" loading="eager" decoding="async"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.6) 100%)',
            }} />

            {/* Solo el horario, NUNCA un "Abierto / Cerrado". Quien mira esta
                carta está SENTADO en el bar, así que un cartel de "Cerrado
                ahora" sería absurdo — y llegaría solo: `activo` se apaga cuando
                el panel del restaurante pierde la conexión (motor de presencia),
                no cuando el local echa el cierre. */}
            {horarioHoy && (
              <div style={{
                position: 'absolute', top: 14, left: 14,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                padding: '6px 11px', borderRadius: 999,
                fontSize: 11.5, fontWeight: 700, color: C.ink,
                boxShadow: SH.sm, maxWidth: 'calc(100% - 90px)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                <Clock size={12} strokeWidth={2.4} style={{ flexShrink: 0 }} />
                Hoy · {horarioHoy}
              </div>
            )}

            <div style={{
              position: 'absolute', top: 12, right: 12,
              width: 62, height: 62, borderRadius: '50%',
              background: '#fff', border: '3px solid rgba(255,255,255,0.95)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: SH.md, overflow: 'hidden',
            }}>
              {est.logo_url
                ? <img src={est.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <FoodIcon kw={est.tipo || ''} size={42} />}
            </div>

            <div style={{ position: 'absolute', bottom: 14, left: 16, right: 16 }}>
              <h1 style={{
                fontSize: 22, fontWeight: 800, color: '#fff',
                letterSpacing: '-0.02em', margin: 0, lineHeight: 1.15,
                textShadow: '0 2px 8px rgba(0,0,0,0.45)',
              }}>{est.nombre}</h1>
              {est.direccion && (
                <div style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.92)', marginTop: 3,
                  fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase',
                  textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                }}>
                  {est.direccion.split(',')[0]}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Aviso de precios ────────────────────────────────────────── */}
        {/* Es la pieza que evita el "en la carta ponía otro precio" si alguien
            comparte este enlace por WhatsApp. */}
        <div style={{
          marginTop: 14, padding: '11px 13px',
          background: C.paper, border: `1px solid ${C.border}`, borderRadius: 14,
        }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '-0.01em' }}>
            Carta del local
          </div>
          <div style={{ fontSize: 12.5, color: C.stone, lineHeight: 1.4, marginTop: 2 }}>
            Precios para consumo en el establecimiento, IGIC incluido.
            Los pedidos a domicilio tienen su propia tarifa.
          </div>
        </div>

        {/* ── Buscador ────────────────────────────────────────────────── */}
        <div style={{ position: 'relative', marginTop: 14 }}>
          <Search
            size={16} strokeWidth={2.2}
            style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: C.stone }}
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en la carta"
            aria-label="Buscar en la carta"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 38px 12px 37px', borderRadius: 13,
              border: `1px solid ${C.border}`, background: C.paper,
              fontSize: 14.5, color: C.ink, fontFamily: 'inherit', outline: 'none',
            }}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              aria-label="Borrar búsqueda"
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                width: 26, height: 26, borderRadius: '50%', border: 'none',
                background: 'transparent', color: C.stone, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            ><X size={15} strokeWidth={2.4} /></button>
          )}
        </div>
      </div>

      {/* ── Chips de categoría, sticky (igual que la tienda) ──────────── */}
      {categorias.length > 1 && (
        <div className="cl-chips" style={{
          position: 'sticky', top: 0, zIndex: 5,
          background: C.cream, borderBottom: `1px solid ${C.cream2}`,
          marginTop: 12,
        }}>
          <div style={{
            maxWidth: 720, margin: '0 auto', padding: '12px 20px',
            display: 'flex', gap: 8, overflowX: 'auto',
          }}>
            <button onClick={() => setCatFiltro(null)} style={chipStyle(!catFiltro)}>Todos</button>
            {categorias.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCatFiltro(catFiltro === cat.id ? null : cat.id)}
                style={chipStyle(catFiltro === cat.id)}
              >{cat.nombre}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── Carta ─────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '18px 20px 0' }}>
        {totalVisibles === 0 && (
          <p style={{ fontSize: 13.5, color: C.stone, textAlign: 'center', padding: '32px 0' }}>
            {busqueda ? 'No hay platos que coincidan con la búsqueda.' : 'Esta carta todavía no tiene platos.'}
          </p>
        )}

        {grupos.map(g => (
          <section key={g.id} style={{ marginBottom: 22 }}>
            <h2 style={{
              fontSize: 18, fontWeight: 800, color: C.ink,
              margin: '0 0 12px', letterSpacing: '-0.01em',
            }}>{g.nombre}</h2>
            {g.items.map(p => (
              <Plato
                key={p.id}
                producto={p}
                tamanos={tamanosPorProducto[p.id] || []}
                grupos={extrasPorProducto[p.id] || []}
              />
            ))}
          </section>
        ))}
      </main>

      {/* ── Pie ───────────────────────────────────────────────────────── */}
      <footer style={{
        maxWidth: 720, margin: '0 auto',
        padding: '6px 20px calc(28px + env(safe-area-inset-bottom, 0px))',
      }}>
        <Link
          to={'/' + est.slug}
          style={{
            display: 'block', textAlign: 'center',
            fontSize: 13.5, fontWeight: 700, color: C.terracotta, textDecoration: 'none',
          }}
        >
          Ver la tienda online y pedir a domicilio
        </Link>
        <p style={{
          fontSize: 11.5, color: C.stone, textAlign: 'center',
          marginTop: 16, lineHeight: 1.5,
        }}>
          Carta digital de {est.nombre}.<br />
          Precios para consumo en el local, IGIC incluido.
        </p>
      </footer>
    </div>
  )
}

function chipStyle(activo) {
  return {
    padding: '8px 14px', borderRadius: 999, border: 'none',
    background: activo ? C.ink : 'transparent',
    color: activo ? C.cream : C.stone,
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
  }
}

/* ── Una línea de la carta: misma card que la tienda, sin botón de añadir ── */
function Plato({ producto, tamanos, grupos }) {
  const conTamanos = tamanos.length > 0
  const opcionesExtra = grupos.flatMap(g => (g.extras_opciones || []).filter(o => Number(o.precio) > 0))
  // Con tamaños, el precio del producto no pinta nada: manda el del tamaño
  // (igual que en la tienda).
  const desde = conTamanos ? Math.min(...tamanos.map(precioLocal)) : precioLocal(producto)

  return (
    <div style={{
      display: 'flex', gap: 14, alignItems: 'stretch',
      padding: 12, marginBottom: 10,
      background: C.cream2, borderRadius: 14,
    }}>
      <div style={{
        width: 86, height: 86, borderRadius: 10, background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, overflow: 'hidden',
      }}>
        {producto.imagen_url
          ? <img src={producto.imagen_url} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <FoodIcon kw={producto.nombre} size={70} />}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 3, lineHeight: 1.25 }}>
            {producto.nombre}
          </div>
          {producto.descripcion && (
            <div style={{
              fontSize: 12, color: C.stone, lineHeight: 1.4,
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            }}>{producto.descripcion}</div>
          )}

          {conTamanos && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', marginTop: 6 }}>
              {tamanos.map((t, i) => (
                <span key={i} style={{ fontSize: 12, color: C.stone }}>
                  {t.nombre} <b style={{ color: C.ink, fontWeight: 700 }}>{fmt(precioLocal(t))}</b>
                </span>
              ))}
            </div>
          )}

          {opcionesExtra.length > 0 && (
            <details style={{ marginTop: 6 }}>
              <summary style={{ fontSize: 11.5, color: C.stone2, cursor: 'pointer', listStyle: 'none', fontWeight: 600 }}>
                {opcionesExtra.length} extra{opcionesExtra.length === 1 ? '' : 's'} disponible{opcionesExtra.length === 1 ? '' : 's'}
              </summary>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 12px', marginTop: 4 }}>
                {opcionesExtra.map((o, i) => (
                  <span key={i} style={{ fontSize: 11.5, color: C.stone2 }}>{o.nombre} +{fmt(o.precio)}</span>
                ))}
              </div>
            </details>
          )}
        </div>

        <div style={{ marginTop: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 17, color: C.terracotta }}>
            {conTamanos ? `Desde ${fmt(desde)}` : fmt(desde)}
          </span>
        </div>
      </div>
    </div>
  )
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#F7F3EC;margin:0}
.cl-chips div::-webkit-scrollbar{display:none}
.cl-chips div{scrollbar-width:none}
details>summary::-webkit-details-marker{display:none}
input[type=search]::-webkit-search-cancel-button{display:none}
@media(min-width:900px){
  .cl-lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:12px}
  .cl-lista>*{margin-bottom:0!important}
}
`
