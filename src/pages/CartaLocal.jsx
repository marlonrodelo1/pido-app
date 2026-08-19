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
 * CartProvider —ni aquí ni en ninguno de sus hijos—, así que no existe ningún
 * camino por el que un `precio_local` pueda acabar en `pedido_items`, ni por
 * error ni manipulando el navegador. Comisión, liquidación de los lunes, pedido
 * mínimo y promos siguen viendo un único precio, el de siempre
 * (`productos.precio`).
 *
 * `AuthProvider` tampoco cuelga de esta ruta. Lo monta, dentro de sí mismo y
 * solo cuando el cliente dice que quiere participar en Pidoo Creadores, el
 * componente `ParticiparMesa`. Si colgara de aquí, a un cliente con la sesión
 * iniciada le saltaría el diálogo de permiso de notificaciones del navegador
 * NADA MÁS ESCANEAR EL QR DE LA MESA. Quien solo mira la carta no paga sesión,
 * ni consultas, ni permisos.
 *
 * Por eso el aspecto está REPLICADO y no importado de RestDetalle: compartir
 * ese componente traería consigo el carrito y se perdería la garantía.
 *
 * Si alguna vez se quisiera pedir desde la mesa, NO basta con añadir botones
 * aquí: habría que tocar enforce_pedido_item_precio(), crear_pedido_invitado,
 * el CHECK de pedidos.origen_pedido y calcular_liquidacion_restaurante.
 * ────────────────────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useState, lazy, Suspense } from 'react'
import { useParams, useLocation, useNavigate, Navigate, Link } from 'react-router-dom'
import { Search, X, Clock, Video, ChevronRight, Mic } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { horarioHoyTexto } from '../lib/horario'
import { FoodIcon } from '../lib/food'
import AppDownloadBanner from '../components/AppDownloadBanner'
import CreadoresBloqueRest from '../components/CreadoresBloqueRest'

// Perezoso a propósito: arrastra AuthContext -> webPush -> pushNotifications ->
// @capacitor/*. Quien solo viene a mirar la carta no se descarga nada de eso.
const ParticiparMesa = lazy(() => import('../components/ParticiparMesa'))
// Igual de perezoso, y por el mismo motivo: arrastra el SDK de voz de
// ElevenLabs. Quien solo mira la carta no se lo descarga.
const CamareroMesa = lazy(() => import('../components/CamareroMesa'))
const CLAVE_VOLVER = 'pidoo_carta_participar'

// Marca en el móvil del cliente de que YA participó en este restaurante. Vive en
// `localStorage` y no en la base de datos a propósito: saberlo por servidor
// exigiría sesión en cada carga de la carta, y eso es justo el acoplamiento que
// esta página evita. Aquí no hay nada sensible: solo una fecha.
const clavePart = (estId) => 'pidoo_carta_part_' + estId

function leerParticipacion(estId) {
  try { return localStorage.getItem(clavePart(estId)) } catch { return null }
}

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
  const location = useLocation()
  const navigate = useNavigate()
  const slugOk = !!slug && /^[a-z0-9-]+$/i.test(slug)

  const [estado, setEstado] = useState(slugOk ? 'loading' : 'notfound')
  const [est, setEst] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [tamanosPorProducto, setTamanosPorProducto] = useState({})
  const [extrasPorProducto, setExtrasPorProducto] = useState({})
  const [busqueda, setBusqueda] = useState('')
  const [catFiltro, setCatFiltro] = useState(null)
  const [plato, setPlato] = useState(null)          // ficha abierta (solo lectura)
  // `undefined` = todavía no se sabe si hay programa. Son TRES estados, no dos:
  // pintar algo mientras no se sabe produce el parpadeo de barra que aparece y
  // desaparece. Con `undefined` no se pinta nada, ni esqueleto.
  const [programa, setPrograma] = useState(undefined)
  const [participar, setParticipar] = useState(false)
  const [yaParticipo, setYaParticipo] = useState(null)   // fecha ISO o null
  const [camarero, setCamarero] = useState(false)

  // Qué mesa es. Lo pone el QR que el restaurante imprime desde su panel
  // (`urlCarta(slug, token)`). Es una PISTA, no una credencial: quien decide
  // si vale es el servidor, que lo valida contra `mesas` junto con el
  // restaurante y el horario. Sin `?m=` no hay camarero: la carta se puede
  // abrir desde cualquier sitio, pero hablar solo se habla desde una mesa.
  const tokenMesa = useMemo(
    () => new URLSearchParams(location.search).get('m') || null,
    [location.search])

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
        // SIN filtro `activa`: las categorías que el restaurante usa solo en el
        // local (Café, Tapas, Zumos…) están inactivas a propósito, para que la
        // tienda y la app —que sí filtran por activa— no enseñen chips vacíos.
        // Así la carta online se queda EXACTAMENTE como estaba, sin tocar su
        // código. Abajo solo se pintan las categorías que tienen algún plato.
        supabase.from('categorias')
          .select('id, nombre, orden')
          .eq('establecimiento_id', est.id).order('orden'),
        // Entran los que están a la venta Y los `solo_carta_local` (platos que
        // el restaurante sirve en el local pero no manda a domicilio: nacen con
        // disponible=false para que la app y la tienda ni los vean).
        // Un producto normal agotado (disponible=false, solo_carta_local=false)
        // SÍ desaparece de aquí, que es lo que espera el dueño al apagarlo.
        supabase.from('productos')
          .select('id, nombre, descripcion, precio, precio_local, imagen_url, categoria_id, orden')
          .eq('establecimiento_id', est.id)
          .or('disponible.eq.true,solo_carta_local.eq.true')
          .order('orden'),
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

  /* ── 2b. ¿Este restaurante tiene Pidoo Creadores abierto? ────────────── */
  // Efecto aparte del de la carta: los platos no esperan a esta consulta. La RPC
  // tiene permiso para `anon`, así que responde sin sesión y sin providers.
  useEffect(() => {
    if (estado !== 'ok' || !est?.id) return
    let cancelado = false
    supabase.rpc('creadores_programa_publico', { p_establecimiento_id: est.id })
      .then(({ data }) => { if (!cancelado) setPrograma(data || null) })
    setYaParticipo(leerParticipacion(est.id))
    return () => { cancelado = true }
  }, [estado, est?.id])

  /* ── 2c. Volver del rodeo de Google ──────────────────────────────────── */
  // Identificarse con Google recarga la página entera (pasa por /auth/callback),
  // así que el panel de participación se pierde por el camino. Sin esto el
  // cliente vuelve a la carta ya identificado, sin entender qué ha pasado y
  // teniendo que empezar otra vez.
  //
  // Van dos marcas por si una falla: el `?participar=1` que viaja en el `next`
  // del OAuth (verificado: ni Login ni AuthCallback tocan el query string) y una
  // marca en `sessionStorage`, que es por pestaña y sobrevive el salto. Se
  // limpian las dos y se quita el parámetro de la URL, para que un refresco o un
  // enlace compartido no reabran el panel.
  useEffect(() => {
    if (estado !== 'ok') return
    const params = new URLSearchParams(location.search)
    const porUrl = params.get('participar') === '1'
    const porSesion = sessionStorage.getItem(CLAVE_VOLVER) === slug
    if (!porUrl && !porSesion) return

    sessionStorage.removeItem(CLAVE_VOLVER)
    setParticipar(true)
    if (porUrl) {
      params.delete('participar')
      const q = params.toString()
      navigate({ pathname: location.pathname, search: q ? `?${q}` : '' }, { replace: true })
    }
  }, [estado, slug, location.search, location.pathname, navigate])

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
  // Un solo booleano manda sobre la barra Y sobre el hueco que deja al final.
  // Si fueran dos condiciones distintas acabarían separándose.
  const barraVisible = programa?.admite_altas === true

  // La marca se pone al ABRIR, no al pulsar "entrar con Google": desde aquí no
  // se ve ese momento, y el salto a Google recarga la página entera.
  function abrirParticipar() {
    try { sessionStorage.setItem(CLAVE_VOLVER, slug) } catch { /* modo privado */ }
    setParticipar(true)
  }
  function cerrarParticipar() {
    try { sessionStorage.removeItem(CLAVE_VOLVER) } catch { /* modo privado */ }
    setParticipar(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.cream, color: C.ink,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{css}</style>

      {/* El ancho vive en el CSS (`.cl-wrap`) y NO como `maxWidth` inline: un
          estilo inline no lo vence ninguna media query, y por eso la regla de
          escritorio de esta página llevaba desde el primer día sin hacer nada. */}
      <div className="cl-wrap">
        {/* El banner de la app NO va aquí arriba, y es deliberado.
            Los precios de domicilio son otros —en algunos platos, el doble— así
            que ponerle la app delante nada más escanear es invitarle a comparar
            justo cuando la comparación juega en contra, y antes de darle ningún
            motivo. Va al final de la carta, y sobre todo en la pantalla de
            "vídeo enviado", cuando ya tiene un premio esperándole. */}

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

        {/* ── Pidoo Creadores ─────────────────────────────────────────── */}
        {/* El mismo bloque que la ficha del restaurante y la tienda pública: es
            el mismo programa y tiene que reconocerse de un vistazo. No depende
            del carrito ni de la sesión, así que se puede montar aquí tal cual.
            Si el restaurante no lo tiene abierto, no pinta nada. */}
        {/* Textos propios de la mesa: aquí NO se pide, así que el copy de la
            tienda ("Pide aquí…") sería mentira, y hay que decir con todas las
            letras que el premio se gasta a domicilio — es el gancho de todo esto:
            convierte a quien está comiendo en el bar en cliente de reparto. */}
        <CreadoresBloqueRest
          programa={programa || null}
          margenSuperior={14}
          intro="Graba lo que estás comiendo en TikTok o Instagram y, según las visualizaciones que consiga, te llevas esto:"
          nota={`El premio se aplica solo en tu próximo pedido A DOMICILIO de ${est.nombre}. Necesitas una cuenta de Pidoo para participar.`} />

        {/* Aquí había un botón "Quiero participar" que hacía exactamente lo
            mismo que la barra fija de abajo (las dos llaman a `abrirParticipar`
            y las dos dependen de `admite_altas`). Sobraba: la barra se ve
            siempre, es naranja pleno y además sabe cambiar a "Ya grabaste aquí"
            cuando el cliente ya participó, cosa que este botón no hacía. */}

        {/* ── Camarero de voz ─────────────────────────────────────────────
            Solo si se ha entrado por el QR de una mesa. Si el restaurante no
            tiene el camarero encendido, el propio panel lo explica al abrirse:
            averiguarlo aquí exigiría leer `mesa_config` desde el navegador, y
            esta página no lee configuración interna a propósito. */}
        {tokenMesa && (
          <button
            onClick={() => setCamarero(true)}
            style={{
              width: '100%', marginTop: 12, padding: '14px 16px', borderRadius: 16,
              border: '1px solid #FFD2B8', cursor: 'pointer', fontFamily: 'inherit',
              textAlign: 'left', display: 'flex', alignItems: 'center', gap: 13,
              // Naranja muy suave: tiene que cantar sobre las tarjetas blancas
              // de la carta sin gritar. Es la puerta al camarero y hoy es la
              // única cosa de esta página con la que se puede interactuar.
              background: 'linear-gradient(135deg, #FFF6F0 0%, #FFEFE4 100%)',
              boxShadow: '0 2px 10px rgba(255,107,44,0.10)',
            }}>
            {/* El orbe, latiendo. Es el mismo lenguaje visual que se va a
                encontrar dentro al abrir el camarero, así el botón anticipa lo
                que hay detrás en vez de parecer un enlace más. */}
            <span style={{ position: 'relative', width: 42, height: 42, flexShrink: 0, display: 'grid', placeItems: 'center' }}>
              <span className="cl-onda" />
              <span className="cl-onda cl-onda2" />
              <span className="cl-orbe">
                <Mic size={17} color="#fff" strokeWidth={2.4} />
              </span>
            </span>

            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: '#8A3D10', letterSpacing: '-0.01em' }}>
                Habla con el camarero
              </span>
              <span style={{ display: 'block', fontSize: 11.5, color: '#A8724F', marginTop: 2, lineHeight: 1.35 }}>
                Pregúntale por la carta, sin esperar
              </span>
            </span>
            <ChevronRight size={17} color="#C98B62" style={{ flexShrink: 0 }} />
          </button>
        )}

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
          <div className="cl-wrap-plano" style={{
            padding: '12px 20px', display: 'flex', gap: 8, overflowX: 'auto',
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
      <main className="cl-wrap-plano" style={{ padding: '18px 20px 0' }}>
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
            {/* `.cl-lista` es la que reparte los platos en varias columnas a
                partir de 900px. Antes estaba escrita en el CSS pero no puesta en
                ningún elemento, así que en un portátil la carta se quedaba en
                una columna estrecha con medio monitor vacío. */}
            <div className="cl-lista">
              {g.items.map(p => (
                <Plato
                  key={p.id}
                  producto={p}
                  tamanos={tamanosPorProducto[p.id] || []}
                  grupos={extrasPorProducto[p.id] || []}
                  onAbrir={() => setPlato({
                    producto: p,
                    tamanos: tamanosPorProducto[p.id] || [],
                    grupos: extrasPorProducto[p.id] || [],
                  })}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* ── Pie ───────────────────────────────────────────────────────── */}
      {/* El hueco de abajo crece cuando hay barra fija, con el MISMO booleano
          que la pinta: así no puede pasar que aparezca la barra y tape el último
          plato, ni que quede un hueco muerto sin barra. */}
      <footer className="cl-wrap-plano" style={{
        padding: `6px 20px calc(${barraVisible ? 96 : 28}px + env(safe-area-inset-bottom, 0px))`,
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

        {/* Aquí sí: al final, después de haber visto la carta, y con el precio de
            domicilio explicado en la propia línea del banner. */}
        <div style={{ marginTop: 18 }}>
          <AppDownloadBanner
            slug={est.slug}
            titulo="¿Prefieres que te lo llevemos a casa?"
            subtitulo="Los precios a domicilio incluyen el reparto, así que no son los de esta carta."
          />
        </div>
        <p style={{
          fontSize: 11.5, color: C.stone, textAlign: 'center',
          marginTop: 16, lineHeight: 1.5,
        }}>
          Carta digital de {est.nombre}.<br />
          Precios para consumo en el local, IGIC incluido.
        </p>
      </footer>

      {/* ── Barra fija de Creadores ───────────────────────────────────── */}
      {/* Va abajo y fija porque el cliente se pasa la visita bajando por la
          carta: el bloque de arriba desaparece en cuanto empieza a mirar platos. */}
      {barraVisible && (
        <div style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20,
          padding: '10px 16px calc(10px + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(247,243,236,0.92)',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          borderTop: `1px solid ${C.border}`,
        }}>
          {/* Si ya participó, la barra deja de pedirle lo que ya hizo y pasa a
              llevarle donde está su premio. Es el momento con más sentido para
              recordárselo: está otra vez comiendo aquí. */}
          {yaParticipo ? (
            <Link
              to={'/' + est.slug}
              style={{
                width: '100%', maxWidth: 480, margin: '0 auto',
                padding: '13px 16px', borderRadius: 13,
                background: '#fff', border: `1.5px solid ${C.terracotta}`,
                color: C.terracotta, textDecoration: 'none', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                fontSize: 14, fontWeight: 800, boxShadow: SH.md,
              }}>
              <Video size={16} />
              Ya grabaste aquí · Mira tu premio
            </Link>
          ) : (
            <button
              onClick={abrirParticipar}
              style={{
                width: '100%', maxWidth: 480, margin: '0 auto',
                padding: '13px 16px', borderRadius: 13, border: 'none',
                background: 'linear-gradient(135deg, #E4671F 0%, #C5562C 100%)',
                color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                fontSize: 14.5, fontWeight: 800, boxShadow: SH.md,
              }}>
              <Video size={17} />
              Graba un vídeo y gana premios
            </button>
          )}
        </div>
      )}

      {/* ── Ficha del plato (solo lectura) ────────────────────────────── */}
      {plato && (
        <FichaPlato
          producto={plato.producto}
          tamanos={plato.tamanos}
          grupos={plato.grupos}
          onClose={() => setPlato(null)}
        />
      )}

      {/* ── Participar en Creadores ───────────────────────────────────── */}
      {participar && (
        <Suspense fallback={null}>
          <ParticiparMesa
            establecimiento={est}
            programa={programa}
            onEnviado={() => {
              const ahora = new Date().toISOString()
              try { localStorage.setItem(clavePart(est.id), ahora) } catch { /* modo privado */ }
              setYaParticipo(ahora)
            }}
            onClose={cerrarParticipar}
          />
        </Suspense>
      )}

      {/* ── Camarero de voz ───────────────────────────────────────────── */}
      {camarero && (
        <Suspense fallback={null}>
          <CamareroMesa
            slug={slug}
            tokenMesa={tokenMesa}
            onClose={() => setCamarero(false)}
          />
        </Suspense>
      )}
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
function Plato({ producto, tamanos, grupos, onAbrir }) {
  const conTamanos = tamanos.length > 0
  const opcionesExtra = grupos.flatMap(g => (g.extras_opciones || []).filter(o => Number(o.precio) > 0))
  // Con tamaños, el precio del producto no pinta nada: manda el del tamaño
  // (igual que en la tienda).
  const desde = conTamanos ? Math.min(...tamanos.map(precioLocal)) : precioLocal(producto)
  // Solo se abre ficha si hay algo más que enseñar. Un refresco sin descripción,
  // sin tamaños y sin extras no tiene ficha: abrir una hoja medio vacía es peor
  // que no poder abrirla.
  const hayFicha = !!(producto.descripcion || conTamanos || grupos.length > 0)

  return (
    <div
      onClick={hayFicha ? onAbrir : undefined}
      role={hayFicha ? 'button' : undefined}
      tabIndex={hayFicha ? 0 : undefined}
      onKeyDown={hayFicha ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrir() } } : undefined}
      style={{
        display: 'flex', gap: 14, alignItems: 'stretch',
        padding: 12, marginBottom: 10,
        background: C.cream2, borderRadius: 14,
        cursor: hayFicha ? 'pointer' : 'default',
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

          {/* El detalle de los extras se fue a la ficha: desplegarlos aquí
              empujaba los platos de abajo y dejaba la carta a saltos. */}
          {opcionesExtra.length > 0 && (
            <div style={{ fontSize: 11.5, color: C.stone2, fontWeight: 600, marginTop: 6 }}>
              {opcionesExtra.length} extra{opcionesExtra.length === 1 ? '' : 's'} disponible{opcionesExtra.length === 1 ? '' : 's'}
            </div>
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

/* ── Ficha de un plato ─────────────────────────────────────────────────────
 * Hoja de SOLO LECTURA: foto grande, descripción entera, tamaños con su precio
 * de local y los extras con el suyo. Ni cantidad, ni botón de añadir, ni pie de
 * acción — desde la mesa no se pide, y la hoja no debe insinuar lo contrario.
 * ────────────────────────────────────────────────────────────────────────── */
function FichaPlato({ producto, tamanos, grupos, onClose }) {
  useEffect(() => {
    const alPulsar = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', alPulsar)
    // Con la hoja abierta el fondo no se mueve: en móvil, si no, se scrollea la
    // carta de debajo y al cerrar has perdido el sitio donde estabas.
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alPulsar)
      document.body.style.overflow = previo
    }
  }, [onClose])

  const conTamanos = tamanos.length > 0

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(26,24,21,0.55)', zIndex: 4000,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.paper, width: '100%', maxWidth: 480,
          borderRadius: '20px 20px 0 0',
          // `dvh` y no `vh`: con `vh` el final de la hoja se queda debajo de la
          // barra del navegador en el móvil y no hay forma de llegar a él.
          maxHeight: '86dvh', overflowY: 'auto', overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            height: 190, background: C.cream2,
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}>
            {producto.imagen_url
              ? <img src={producto.imagen_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <FoodIcon kw={producto.nombre} size={90} />}
          </div>
          <button
            onClick={onClose} aria-label="Cerrar"
            style={{
              position: 'absolute', top: 12, right: 12,
              width: 32, height: 32, borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,0.94)', cursor: 'pointer',
              display: 'grid', placeItems: 'center', boxShadow: SH.sm, color: C.ink,
            }}><X size={17} strokeWidth={2.4} /></button>
        </div>

        <div style={{ padding: '16px 18px calc(22px + env(safe-area-inset-bottom, 0px))' }}>
          <h2 style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            {producto.nombre}
          </h2>
          {producto.descripcion && (
            <p style={{ fontSize: 13.5, color: C.stone, lineHeight: 1.55, marginTop: 7 }}>
              {producto.descripcion}
            </p>
          )}

          {!conTamanos && (
            <div style={{ fontSize: 21, fontWeight: 800, color: C.terracotta, marginTop: 12 }}>
              {fmt(precioLocal(producto))}
            </div>
          )}

          {conTamanos && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 7 }}>Tamaños</div>
              {tamanos.map((t, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
                }}>
                  <span style={{ flex: 1, fontSize: 13.5, color: C.ink }}>{t.nombre}</span>
                  <span style={{ fontSize: 14.5, fontWeight: 800, color: C.terracotta }}>
                    {fmt(precioLocal(t))}
                  </span>
                </div>
              ))}
            </div>
          )}

          {grupos.map((g, gi) => {
            const opciones = (g.extras_opciones || [])
              .slice()
              .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
            if (!opciones.length) return null
            return (
              <div key={gi} style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 7 }}>{g.nombre}</div>
                {opciones.map((o, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 0', borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
                  }}>
                    <span style={{ flex: 1, fontSize: 13, color: C.stone }}>{o.nombre}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: Number(o.precio) > 0 ? C.ink : C.stone2 }}>
                      {Number(o.precio) > 0 ? `+ ${fmt(o.precio)}` : 'Incluido'}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}

          <div style={{
            marginTop: 18, padding: '10px 12px', borderRadius: 11,
            background: C.cream2, fontSize: 11.5, color: C.stone, lineHeight: 1.5,
          }}>
            Precios para consumo en el establecimiento, IGIC incluido.
            Para pedir a domicilio, entra en la tienda online.
          </div>
        </div>
      </div>
    </div>
  )
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#F7F3EC;margin:0}
.cl-wrap{max-width:720px;margin:0 auto;padding:calc(14px + env(safe-area-inset-top,0px)) 20px 0}
.cl-wrap-plano{max-width:720px;margin:0 auto}
.cl-chips div::-webkit-scrollbar{display:none}
.cl-chips div{scrollbar-width:none}
input[type=search]::-webkit-search-cancel-button{display:none}

/* ── El botón del camarero ──────────────────────────────────────────────
   Late despacio y suelta dos ondas, como un walkie o un timbre: es lo que
   hace que se lea como "aquí se habla" y no como un enlace más. Las ondas
   van con transform y opacity, que el móvil compone en la GPU sin repintar;
   animar width/height daría tirones en un teléfono modesto.
   OJO: nada de acentos graves en estos comentarios — todo este CSS vive
   dentro de un template string de JavaScript y un acento grave lo cierra. */
.cl-orbe{
  width:34px;height:34px;border-radius:999px;display:grid;place-items:center;
  background:linear-gradient(135deg,#FF6B2C 0%,#FF9A5C 100%);
  box-shadow:0 2px 8px rgba(255,107,44,.35);
  animation:clLatido 2.6s ease-in-out infinite;position:relative;z-index:1;
}
.cl-onda{
  position:absolute;width:34px;height:34px;border-radius:999px;
  border:2px solid #FF6B2C;opacity:0;
  animation:clOnda 2.6s ease-out infinite;
}
.cl-onda2{animation-delay:1.3s}
@keyframes clLatido{
  0%,100%{transform:scale(1)}
  50%{transform:scale(1.07)}
}
@keyframes clOnda{
  0%{transform:scale(1);opacity:.55}
  70%{transform:scale(1.75);opacity:0}
  100%{transform:scale(1.75);opacity:0}
}
/* Quien pide menos movimiento, no lo tiene. Y de paso se ahorra batería en
   una página que va a estar abierta encima de una mesa un buen rato. */
@media(prefers-reduced-motion:reduce){
  .cl-orbe,.cl-onda{animation:none}
  .cl-onda{opacity:0}
}

@media(min-width:900px){
  /* El ancho tiene que subir junto con la rejilla: con la página clavada en
     720px, repartir los platos en columnas solo los hace más estrechos. */
  .cl-wrap,.cl-wrap-plano{max-width:1120px}
  .cl-lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px}
  .cl-lista>*{margin-bottom:0!important}
}
`
