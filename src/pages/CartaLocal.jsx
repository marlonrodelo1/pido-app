/* ──────────────────────────────────────────────────────────────────────────
 * CartaLocal — pidoo.es/<slug>/carta
 *
 * La carta que el cliente ve al escanear el QR de la mesa, con los precios de
 * CONSUMO EN EL LOCAL (`productos.precio_local`, que suelen ser distintos de
 * los de reparto).
 *
 * ES DE SOLO LECTURA A PROPÓSITO, y eso no es una decisión de UI: es la que
 * mantiene el precio de local fuera del dinero. Esta página NO monta
 * CartProvider ni AuthProvider, así que no existe ningún camino por el que un
 * `precio_local` pueda acabar en `pedido_items` — ni por error ni manipulando
 * el navegador. Comisión, liquidación de los lunes, pedido mínimo y promos
 * siguen viendo un único precio, el de siempre (`productos.precio`).
 *
 * Si alguna vez se quisiera pedir desde la mesa, NO basta con añadir botones
 * aquí: habría que tocar enforce_pedido_item_precio(), crear_pedido_invitado,
 * el CHECK de pedidos.origen_pedido y calcular_liquidacion_restaurante.
 * ────────────────────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { Search, MapPin, Clock, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { horarioHoyTexto } from '../lib/horario'
import AppDownloadBanner from '../components/AppDownloadBanner'

const C = {
  bg: '#F7F3EC', paper: '#FBF8F2', ink: '#1A1815', stone: '#6B6356',
  border: '#E8E1D3', primary: '#C5562C',
}

// Columnas explícitas (nada de `*`): no traer PII ni configuración interna a
// una página pública que abre cualquiera sin identificarse.
const COLS_EST =
  'id, nombre, descripcion, direccion, logo_url, banner_url, slug, activo, horario, carta_local_activa'

/** Precio a mostrar: el de local si lo han puesto, si no el normal. */
function precioLocal(fila) {
  if (!fila) return 0
  const local = fila.precio_local
  if (local !== null && local !== undefined && local !== '') return Number(local)
  return Number(fila.precio) || 0
}

function eur(n) {
  return (Number(n) || 0).toFixed(2).replace('.', ',') + ' €'
}

const pantallaCentrada = (texto) => (
  <div style={{
    minHeight: '100vh', background: C.bg, color: C.stone,
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
  const refsCategoria = useRef({})

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
      const items = visibles.filter(p => p.categoria_id === cat.id)
      if (items.length) salida.push({ id: cat.id, nombre: cat.nombre, items })
    }
    const sueltos = visibles.filter(p => !p.categoria_id || !categorias.some(c => c.id === p.categoria_id))
    if (sueltos.length) salida.push({ id: '_otros', nombre: 'Otros', items: sueltos })
    return salida
  }, [productos, categorias, busqueda])

  if (estado === 'loading') return pantallaCentrada('Cargando carta...')
  if (estado === 'notfound') return <Navigate to="/" replace />
  if (estado === 'sin-carta') return <Navigate to={'/' + slug} replace />

  const horarioHoy = horarioHoyTexto(est.horario)
  const totalVisibles = grupos.reduce((s, g) => s + g.items.length, 0)

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, color: C.ink,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{css}</style>

      {/* ── Cabecera ──────────────────────────────────────────────────── */}
      <header style={{ position: 'relative' }}>
        {est.banner_url ? (
          <div style={{ height: 130, overflow: 'hidden', background: C.border }}>
            <img
              src={est.banner_url} alt=""
              loading="eager" decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        ) : (
          <div style={{ height: 'calc(18px + env(safe-area-inset-top, 0px))' }} />
        )}

        <div style={{
          maxWidth: 720, margin: '0 auto', padding: '0 20px',
          marginTop: est.banner_url ? -34 : 0, position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 13 }}>
            {est.logo_url && (
              <img
                src={est.logo_url} alt={est.nombre}
                loading="eager" decoding="async"
                style={{
                  width: 68, height: 68, borderRadius: 18, objectFit: 'cover',
                  border: `2px solid ${C.paper}`, background: C.paper, flexShrink: 0,
                  boxShadow: '0 4px 14px rgba(26,24,21,0.12)',
                }}
              />
            )}
            <div style={{ minWidth: 0, paddingBottom: 4 }}>
              <h1 style={{
                fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em',
                lineHeight: 1.15, margin: 0,
              }}>{est.nombre}</h1>
              {/* Solo el horario, NUNCA un "Abierto / Cerrado".
                  Quien mira esta carta está SENTADO en el bar, así que un cartel
                  de "Cerrado ahora" sería absurdo — y llegaría solo: `activo` se
                  apaga cuando el panel del restaurante pierde la conexión
                  (motor de presencia), no cuando el local echa el cierre. */}
              {horarioHoy && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
                  fontSize: 12.5, color: C.stone, flexWrap: 'wrap',
                }}>
                  <Clock size={13} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                  <span>Hoy: {horarioHoy}</span>
                </div>
              )}
            </div>
          </div>

          {est.direccion && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 6,
              fontSize: 12.5, color: C.stone, marginTop: 10,
            }}>
              <MapPin size={13} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{est.direccion}</span>
            </div>
          )}

          {/* Aviso de precios. Es la pieza que evita el "en la carta ponía otro
              precio" si alguien comparte este enlace por WhatsApp. */}
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
        </div>
      </header>

      {/* ── Buscador ──────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 20px 0' }}>
        <div style={{ position: 'relative' }}>
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
            >
              <X size={15} strokeWidth={2.4} />
            </button>
          )}
        </div>
      </div>

      {/* ── Índice de categorías ──────────────────────────────────────── */}
      {grupos.length > 1 && (
        <nav
          aria-label="Categorías"
          className="cl-chips"
          style={{
            position: 'sticky', top: 0, zIndex: 20,
            background: C.bg, borderBottom: `1px solid ${C.border}`,
            marginTop: 14, padding: '10px 0',
          }}
        >
          <div style={{
            maxWidth: 720, margin: '0 auto', padding: '0 20px',
            display: 'flex', gap: 8, overflowX: 'auto',
          }}>
            {grupos.map(g => (
              <button
                key={g.id}
                onClick={() => refsCategoria.current[g.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                style={{
                  flexShrink: 0, padding: '7px 13px', borderRadius: 999,
                  border: `1px solid ${C.border}`, background: C.paper,
                  color: C.ink, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
              >
                {g.nombre}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* ── Carta ─────────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '18px 20px 0' }}>
        {totalVisibles === 0 && (
          <p style={{ fontSize: 13.5, color: C.stone, textAlign: 'center', padding: '32px 0' }}>
            {busqueda ? 'No hay platos que coincidan con la búsqueda.' : 'Esta carta todavía no tiene platos.'}
          </p>
        )}

        {grupos.map(g => (
          <section
            key={g.id}
            ref={(el) => { refsCategoria.current[g.id] = el }}
            style={{ scrollMarginTop: 64, marginBottom: 26 }}
          >
            <h2 style={{
              fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em',
              margin: '0 0 10px',
            }}>
              {g.nombre}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {g.items.map(p => (
                <Plato
                  key={p.id}
                  producto={p}
                  tamanos={tamanosPorProducto[p.id] || []}
                  grupos={extrasPorProducto[p.id] || []}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* ── Pie: la app y el enlace a domicilio ───────────────────────── */}
      <footer style={{
        maxWidth: 720, margin: '0 auto',
        padding: '10px 20px calc(28px + env(safe-area-inset-bottom, 0px))',
      }}>
        <AppDownloadBanner
          slug={est.slug}
          titulo="¿Prefieres que te lo llevemos a casa?"
          subtitulo="Pide a domicilio con Pidoo. El precio a domicilio es el de la tienda online."
        />

        <Link
          to={'/' + est.slug}
          style={{
            display: 'block', textAlign: 'center', marginTop: 14,
            fontSize: 13.5, fontWeight: 700, color: C.primary,
            textDecoration: 'none',
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

/* ── Una línea de la carta ──────────────────────────────────────────────── */
function Plato({ producto, tamanos, grupos }) {
  const conTamanos = tamanos.length > 0
  const opcionesExtra = grupos.flatMap(g => (g.extras_opciones || []).filter(o => Number(o.precio) > 0))

  return (
    <article style={{
      display: 'flex', gap: 12, alignItems: 'flex-start',
      background: C.paper, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: 12,
    }}>
      {producto.imagen_url && (
        <img
          src={producto.imagen_url} alt=""
          loading="lazy" decoding="async"
          style={{
            width: 68, height: 68, borderRadius: 12, objectFit: 'cover',
            flexShrink: 0, background: C.border,
          }}
        />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h3 style={{
            fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em',
            lineHeight: 1.25, margin: 0, minWidth: 0,
          }}>{producto.nombre}</h3>

          {/* Con tamaños, el precio suelto del producto no se muestra: el precio
              real es el del tamaño (así funciona también en la tienda). */}
          {!conTamanos && (
            <span style={{ fontSize: 14.5, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {eur(precioLocal(producto))}
            </span>
          )}
        </div>

        {producto.descripcion && (
          <p style={{ fontSize: 12.5, color: C.stone, lineHeight: 1.4, margin: '3px 0 0' }}>
            {producto.descripcion}
          </p>
        )}

        {conTamanos && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 7,
          }}>
            {tamanos.map((t, i) => (
              <span key={i} style={{ fontSize: 13, color: C.ink }}>
                {t.nombre} <b style={{ fontWeight: 800 }}>{eur(precioLocal(t))}</b>
              </span>
            ))}
          </div>
        )}

        {opcionesExtra.length > 0 && (
          <details style={{ marginTop: 7 }}>
            <summary style={{
              fontSize: 12, color: C.stone, cursor: 'pointer',
              listStyle: 'none', fontWeight: 600,
            }}>
              {opcionesExtra.length} extra{opcionesExtra.length === 1 ? '' : 's'} disponible{opcionesExtra.length === 1 ? '' : 's'}
            </summary>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 12px', marginTop: 5 }}>
              {opcionesExtra.map((o, i) => (
                <span key={i} style={{ fontSize: 12, color: C.stone }}>
                  {o.nombre} +{eur(o.precio)}
                </span>
              ))}
            </div>
          </details>
        )}
      </div>
    </article>
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
`
