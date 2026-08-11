import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Capacitor } from '@capacitor/core'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { crearPagoStripe, listarTarjetas, pagarConTarjetaGuardada, TARJETAS_GUARDADAS_HABILITADO } from '../lib/stripe'
import { sendPush } from '../lib/webPush'
import { estaAbierto } from '../lib/horario'
import { getCurrentPosition } from '../lib/geolocation'
import { CreditCard, Lock, X, ArrowLeft, Check, Navigation, MapPin, Trash2 } from 'lucide-react'
import AddressInput from '../components/AddressInput'
import { FoodIcon } from '../lib/food'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

/* ─── Estilos reutilizables ──────────────────────────────── */
// Paleta directa (cream/terracotta/sage)
const C = {
  cream: '#F7F3EC', cream2: '#EFE9DD', paper: '#FBF8F2',
  ink: '#1A1815', ink2: '#2B2823', stone: '#6B6356',
  terracotta: '#C5562C', terracotta2: '#A8451F', terracottaSoft: '#F1D9CC',
  burnt: '#E4671F', burntText: '#A85018', burntGlaze: 'linear-gradient(180deg,#FDE8D6 0%,#F7CFB2 100%)',
  sage: '#8B9D7A', sage2: '#6F8460', sageSoft: '#DDE3D3',
  warning: '#C99551', warningSoft: '#F0E1C8',
  danger: '#B5564A', dangerSoft: '#F1D0CB',
  border: '#E8E1D3',
}
const SH = {
  sm: '0 1px 2px rgba(26,24,21,0.06)',
  glossy: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 10px rgba(0,0,0,0.18)',
}
const fmt = (n) => `${(n || 0).toFixed(2).replace('.', ',')} €`

const S = {
  label: { fontSize: 11, fontWeight: 700, color: C.stone, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 },
  selBtn: (active) => ({
    flex: 1, padding: '12px 0', borderRadius: 12,
    border: active ? `1.5px solid ${C.burnt}` : `1px solid ${C.border}`,
    background: active ? C.burntGlaze : C.paper,
    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    color: active ? C.burntText : C.ink,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    transition: 'all 0.15s ease',
  }),
  input: {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: `1px solid ${C.border}`, background: '#fff',
    fontSize: 14, color: C.ink, fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  },
}

/* ─── FormularioPago ─────────────────────────────────────── */
function FormularioPago({ clientSecret, total, onSuccess, onCancel }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handlePagar = async () => {
    if (!stripe || !elements) return
    setLoading(true); setError(null)
    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message || 'Completa los datos del método de pago')
      setLoading(false)
      return
    }
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      redirect: 'if_required',
    })
    if (stripeError) {
      setError(stripeError.message || 'Error al procesar el pago')
      setLoading(false)
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent.id)
    } else {
      setError('El pago no se pudo completar')
      setLoading(false)
    }
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <button onClick={onCancel} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', color: 'var(--c-text)',
        fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        marginBottom: 20, padding: 0,
      }}>
        <ArrowLeft size={16} strokeWidth={2.5} /> Volver al carrito
      </button>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--c-text)', marginBottom: 4 }}>Elige cómo pagar</div>
        <div style={{ fontSize: 12, color: 'var(--c-muted)' }}>Tarjeta, Apple Pay, Google Pay o Link</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <PaymentElement options={{
          layout: { type: 'accordion', defaultCollapsed: false, radios: 'always', spacedAccordionItems: true },
          wallets: { applePay: 'auto', googlePay: 'auto' },
        }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, justifyContent: 'center' }}>
        <Lock size={12} strokeWidth={2} color="var(--c-muted)" />
        <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>Pago seguro con cifrado SSL</span>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', color: 'var(--c-danger)',
          fontSize: 12, padding: '10px 14px', borderRadius: 10,
          marginBottom: 14, textAlign: 'center', fontWeight: 600,
        }}>{error}</div>
      )}

      <button onClick={handlePagar} disabled={loading || !stripe} style={{
        width: '100%', padding: '16px 0', borderRadius: 12, border: 'none',
        background: loading ? '#E8E1D3' : 'var(--c-btn-gradient)', color: '#fff',
        fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
        fontFamily: 'inherit', letterSpacing: '0.01em',
      }}>
        {loading ? 'Procesando pago...' : `Pagar ${fmt(total)}`}
      </button>
    </div>
  )
}

const brandIcon = { visa: '💳', mastercard: '💳', amex: '💳' }

function ResLine({ label, value, tone }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '3px 0' }}>
      <span style={{ color: C.stone }}>{label}</span>
      <span style={{
        color: tone === 'sage' ? C.sage2 : C.ink,
        fontWeight: 600,
      }}>{value}</span>
    </div>
  )
}

export default function Carrito({ onPedidoCreado, canal = 'pido', open: openProp, setOpen: setOpenProp, onRequireLogin, socioData = null }) {
  const { user, perfil, updatePerfil } = useAuth()
  const { carrito, removeItem, updateCantidad, clearCart, propina, setPropina, metodoPago, setMetodoPago, modoEntrega, setModoEntrega, entregaManual, elegirEntrega, totalItems, subtotal, envio, total, calcularEnvio, envioLoading, envioError, distanciaKm, origenPedido, setEnvio } = useCart()
  const [tarifaEnvioFija, setTarifaEnvioFija] = useState(null)
  const [pedidoMinimo, setPedidoMinimo] = useState(0)
  const [openInternal, setOpenInternal] = useState(false)
  const open = openProp !== undefined ? openProp : openInternal
  const setOpen = setOpenProp || setOpenInternal
  const [loading, setLoading] = useState(false)
  const [pasoTarjeta, setPasoTarjeta] = useState(false)
  const [clientSecret, setClientSecret] = useState(null)
  const [codigoPedido, setCodigoPedido] = useState(null)
  const [tarjetasGuardadas, setTarjetasGuardadas] = useState([])
  const [tarjetaSel, setTarjetaSel] = useState(null)
  const [loadingCards, setLoadingCards] = useState(false)
  const [pedidoPendiente, setPedidoPendiente] = useState(null)
  const isPaying = useRef(false)
  const pagoEnviado = useRef(false)
  const [restCerrado, setRestCerrado] = useState(false)
  const [restCerradoMsg, setRestCerradoMsg] = useState('')
  const [promoActiva, setPromoActiva] = useState(null)
  const [descuento, setDescuento] = useState(0)
  // Pidoo Creadores. `cuponSel` es solo la INTENCIÓN del cliente: el descuento
  // de verdad lo fija el servidor en el BEFORE INSERT de `pedidos`, con la misma
  // fórmula que alimenta esta lista. Cupón y promo compiten y gana el mayor; si
  // gana la promo, el servidor suelta el cupón y NO se consume.
  const [cupones, setCupones] = useState([])
  const [cuponSel, setCuponSel] = useState(null)
  const descuentoCupon = Number(cuponSel?.descuento || 0)
  // Compiten y gana el mayor: EXACTAMENTE lo que hace   // en el servidor. Si aquí y allí no se calculara igual, el cliente vería un
  // precio y pagaría otro.
  const cuponGana = descuentoCupon > descuento
  const descuentoEfectivo = cuponGana ? descuentoCupon : descuento
  // Regalo por cantidad ("2 pizzas = refresco gratis"). Va aparte del descuento
  // porque NO descuenta nada: el regalo entra como línea a 0 €. Ver el bloque
  // que lo calcula, más abajo.
  const [regalo, setRegalo] = useState(null)
  const [notas, setNotas] = useState('')
  // Teléfono de contacto del cliente. Si el perfil ya tiene teléfono se usa ese; si no,
  // se pide aquí (obligatorio) y se guarda en el perfil + en el pedido para que el
  // socio/rider pueda llamar al cliente. Resuelve el bug "no aparece el teléfono".
  const [telefonoInput, setTelefonoInput] = useState('')
  const tieneDireccion = () => !!(perfil?.latitud && perfil?.longitud && perfil?.direccion)
  // Optimista: arranca en false (no mostrar aviso) hasta que perfil cargue
  // y confirme. Si arrancase en true cuando perfil aun es null, mostraria
  // el aviso "Anade tu direccion" durante el render inicial aunque el usuario
  // si tenga direccion guardada — bug que solo se "arreglaba" saliendo y
  // volviendo a la pagina.
  const [sinDireccion, setSinDireccion] = useState(false)
  const [fueraDeRadio, setFueraDeRadio] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [mostrarAddDir, setMostrarAddDir] = useState(false)
  const [nuevaDir, setNuevaDir] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [dirMsg, setDirMsg] = useState(null)
  const [tieneDelivery, setTieneDelivery] = useState(true)
  const establecimientoCarritoId = carrito.length > 0 ? carrito[0].establecimiento_id : null
  // deliveryDisponible = tiene_delivery del establecimiento Y, si venimos del
  // marketplace de un socio, que ESE socio (= rider) esté online. El flag global
  // del establecimiento es compartido entre socios y no decide por-socio.
  const socioOnline = socioData ? !!socioData.rider_online : true
  const deliveryDisponible = tieneDelivery && socioOnline

  // Comprobar tiene_delivery + tarifa fija. Reactiva cuando el cron actualiza
  // tiene_delivery (Realtime sobre la fila concreta del establecimiento).
  useEffect(() => {
    if (!open || carrito.length === 0) return
    const estId = carrito[0].establecimiento_id
    let cancel = false
    function refetch() {
      supabase.from('establecimientos').select('tiene_delivery, tarifa_envio_fija, plan_pro, pedido_minimo').eq('id', estId).single()
        .then(({ data }) => {
          if (cancel) return
          setPedidoMinimo(Number(data?.pedido_minimo) || 0)
          const td = data?.tiene_delivery ?? true
          setTieneDelivery(td)
          if (!td) setModoEntrega('recogida')
          if (origenPedido === 'tienda_publica' && data?.tarifa_envio_fija != null) {
            setTarifaEnvioFija(Number(data.tarifa_envio_fija))
          } else {
            setTarifaEnvioFija(null)
          }
        })
    }
    refetch()
    const ch = supabase
      .channel(`carrito-est-${estId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'establecimientos',
        filter: `id=eq.${estId}`,
      }, () => refetch())
      .subscribe()
    return () => { cancel = true; try { supabase.removeChannel(ch) } catch (_) {} }
  }, [open, carrito.length > 0 ? carrito[0]?.establecimiento_id : null, origenPedido])

  // Forzar recogida si se pierde el reparto mientras el carrito esta abierto
  // (socio se desconecto, restaurante quito delivery, o socio del marketplace offline).
  useEffect(() => {
    if (!deliveryDisponible && modoEntrega === 'delivery') {
      setModoEntrega('recogida')
    }
  }, [deliveryDisponible, modoEntrega])

  // Revertir a delivery si el reparto vuelve a estar disponible y el usuario NO
  // eligio recogida manualmente. Sin esto, el carrito quedaba ATRAPADO en recogida
  // tras un rato con el socio offline (recogida era un latch de una sola via),
  // aunque el socio se reconectara — provocando pedidos en recogida no deseados.
  useEffect(() => {
    if (deliveryDisponible && modoEntrega === 'recogida' && !entregaManual) {
      setModoEntrega('delivery')
    }
  }, [deliveryDisponible, modoEntrega, entregaManual])

  // Sincronizar sinDireccion con el perfil real cada vez que cambian sus campos
  // de direccion. Independiente de si el modal esta abierto, asi cuando el
  // perfil termina de cargar (AuthContext lo carga async tras login) el flag
  // se actualiza correctamente y NO aparece el aviso falso "Anade tu direccion"
  // mientras perfil aun era null.
  useEffect(() => {
    if (!perfil) return // perfil no cargado todavia → no decidir
    setSinDireccion(!tieneDireccion())
  }, [perfil?.latitud, perfil?.longitud, perfil?.direccion])

  useEffect(() => {
    if (!open || carrito.length === 0) return
    let cancelled = false
    const run = () => {
      const estId = carrito[0].establecimiento_id
      supabase.from('establecimientos').select('activo, horario, nombre').eq('id', estId).single()
        .then(({ data }) => {
          if (cancelled || !data) return
          const estado = estaAbierto(data)
          setRestCerrado(!estado.abierto)
          setRestCerradoMsg(
            estado.razon === 'sin_horario'
              ? `${data.nombre} no tiene horario configurado y no acepta pedidos en este momento.`
              : estado.proximaApertura
                ? `${data.nombre} está cerrado. ${estado.proximaApertura}.`
                : `${data.nombre} está cerrado ahora mismo.`
          )
        })
      supabase.from('promociones').select('*').eq('establecimiento_id', estId).eq('activa', true)
        .or('fecha_fin.is.null,fecha_fin.gt.' + new Date().toISOString())
        .then(async ({ data: promos }) => {
          if (cancelled) return
          // ── Regalo por cantidad ────────────────────────────────────────────
          // Quien REGALA de verdad es el servidor: el trigger trg_zz_regalo_por_cantidad
          // mete la línea a 0 € al crear el pedido, en cualquier canal. Esto de aquí NO
          // regala, solo lo ENSEÑA antes de pagar — hasta ahora el cliente pagaba sin
          // saber que se lo llevaba y el refresco le aparecía después, ya en el pedido.
          // Por eso el cálculo replica el del trigger: unidades del carrito cuya
          // CATEGORÍA está en condicion_categoria_ids, contra condicion_cantidad.
          // No toca el total ni `descuento`: el regalo vale 0.
          const promoRegalo = (promos || []).find(p =>
            p.tipo === 'regalo_por_cantidad' && p.producto_id &&
            Array.isArray(p.condicion_categoria_ids) && p.condicion_categoria_ids.length > 0)
          if (!promoRegalo) {
            setRegalo(null)
          } else {
            // El carrito guarda nombres, no categorías: hay que preguntarlas.
            const ids = [...new Set(carrito.map(i => i.producto_id).filter(Boolean))]
            const { data: prods } = await supabase.from('productos').select('id, categoria_id').in('id', ids)
            if (cancelled) return
            const catDe = new Map((prods || []).map(p => [p.id, p.categoria_id]))
            const unidades = carrito.reduce((n, i) =>
              promoRegalo.condicion_categoria_ids.includes(catDe.get(i.producto_id)) ? n + i.cantidad : n, 0)
            const objetivo = promoRegalo.condicion_cantidad || 2
            setRegalo({
              nombre: promoRegalo.producto_nombre || 'Regalo',
              titulo: promoRegalo.titulo,
              cumplido: unidades >= objetivo,
              faltan: Math.max(0, objetivo - unidades),
            })
          }
          if (promos && promos.length > 0) {
            const aplicables = promos.filter(p => subtotal >= (p.minimo_compra || 0))
            if (aplicables.length > 0) {
              let mejor = null, mejorDesc = 0
              for (const p of aplicables) {
                let d = 0
                if (p.tipo === 'descuento_porcentaje') d = subtotal * (p.valor / 100)
                else if (p.tipo === 'descuento_fijo') d = p.valor
                else if (p.tipo === '2x1') {
                  const item2x1 = carrito.find(i => i.producto_id === p.producto_id)
                  if (item2x1 && item2x1.cantidad >= 2) d = item2x1.precio_unitario * Math.floor(item2x1.cantidad / 2)
                }
                else if (p.tipo === 'producto_gratis') {
                  const itemGratis = carrito.find(i => i.producto_id === p.producto_id)
                  if (itemGratis) d = itemGratis.precio_unitario
                }
                if (d > mejorDesc) { mejor = p; mejorDesc = d }
              }
              setPromoActiva(mejor); setDescuento(Math.round(mejorDesc * 100) / 100)
            } else {
              const menorMinimo = promos.sort((a, b) => (a.minimo_compra || 0) - (b.minimo_compra || 0))[0]
              setPromoActiva(menorMinimo); setDescuento(0)
            }
          } else { setPromoActiva(null); setDescuento(0) }

        })
    }
    run()
    return () => { cancelled = true }
  }, [open, carrito, subtotal])

  useEffect(() => {
    if (open && carrito.length > 0 && modoEntrega === 'delivery') {
      const lat = perfil?.latitud, lng = perfil?.longitud
      const hayDir = !!(lat && lng && perfil?.direccion)
      setSinDireccion(!hayDir); setFueraDeRadio(false)
      // Si es tienda pública y hay tarifa fija, saltar calcularEnvio
      if (tarifaEnvioFija != null) {
        if (typeof setEnvio === 'function') setEnvio(tarifaEnvioFija)
        return
      }
      if (hayDir) calcularEnvio(lat, lng).catch(err => { if (err?.fuera_de_radio) setFueraDeRadio(true) })
    }
  }, [open, modoEntrega, carrito.length, perfil?.latitud, perfil?.longitud, perfil?.direccion, tarifaEnvioFija])

  useEffect(() => {
    // Tarjetas guardadas deshabilitadas (backend no implementado). No llamar
    // a listarTarjetas para no mostrar un flujo que siempre devuelve [].
    if (!TARJETAS_GUARDADAS_HABILITADO) return
    if (open && user?.id && metodoPago === 'tarjeta') {
      setLoadingCards(true)
      listarTarjetas(user.id).then(cards => {
        setTarjetasGuardadas(cards)
        if (cards.length > 0) setTarjetaSel(cards[0].id)
        setLoadingCards(false)
      }).catch(() => setLoadingCards(false))
    }
  }, [open, metodoPago])

  // Cargar configuración del restaurante: métodos de pago aceptados + flag de registro.
  // Por defecto los 3 activos hasta que llegue la respuesta.
  const [restConfig, setRestConfig] = useState({
    acepta_efectivo: true,
    acepta_tarjeta_online: true,
    acepta_datafono: false,
    exige_registro_cliente: false,
  })
  // Hasta que no sabemos qué quiere el restaurante no se decide si se puede
  // pedir sin cuenta: si no, al abrir el carrito parpadearía el formulario de
  // invitado en un restaurante que sí exige registro.
  const [restConfigLista, setRestConfigLista] = useState(false)
  useEffect(() => {
    if (!open || carrito.length === 0) return
    const estId = carrito[0].establecimiento_id
    if (!estId) return
    let cancel = false
    setRestConfigLista(false)
    ;(async () => {
      const { data } = await supabase
        .from('establecimientos')
        .select('acepta_efectivo, acepta_tarjeta_online, acepta_datafono, exige_registro_cliente')
        .eq('id', estId)
        .maybeSingle()
      if (cancel) return
      if (data) {
        setRestConfig({
          acepta_efectivo: data.acepta_efectivo ?? true,
          acepta_tarjeta_online: data.acepta_tarjeta_online ?? true,
          acepta_datafono: data.acepta_datafono ?? false,
          exige_registro_cliente: data.exige_registro_cliente ?? false,
        })
      }
      // Si la lectura falla se sigue con los valores por defecto: el servidor
      // vuelve a comprobarlo (PD112), así que no se cuela nada.
      setRestConfigLista(true)
    })()
    return () => { cancel = true }
  }, [open, carrito[0]?.establecimiento_id])

  // Métodos disponibles según config del restaurante:
  //  · tarjeta  → Stripe en el checkout. Se oculta a los invitados: el flujo
  //               necesita cuenta para el SCA 3DS y para los reembolsos.
  //  · datáfono → tarjeta en mano, con el TPV del repartidor o del local.
  //  · efectivo → en mano al entregar o al recoger.
  const metodosDisponibles = useMemo(() => {
    const list = []
    if (restConfig.acepta_tarjeta_online && user) list.push({ id: 'tarjeta',  label: 'Tarjeta',  icon: 'card' })
    if (restConfig.acepta_datafono)               list.push({ id: 'datafono', label: 'Datáfono', icon: 'card' })
    if (restConfig.acepta_efectivo)               list.push({ id: 'efectivo', label: 'Efectivo', icon: null })
    return list
  }, [restConfig, user])

  // Si el método actual ya no está activo, cambiar al primero disponible
  useEffect(() => {
    if (metodosDisponibles.length === 0) return
    const stillValid = metodosDisponibles.some(m => m.id === metodoPago)
    if (!stillValid) setMetodoPago(metodosDisponibles[0].id)
  }, [metodosDisponibles, metodoPago, setMetodoPago])

  // Al abrir el carrito, pre-seleccionar el método de pago PREFERIDO del perfil
  // (Perfil → Método de pago) si está disponible en este restaurante. Se aplica
  // una sola vez por apertura; el usuario puede cambiarlo para este pedido.
  const prefMetodoAplicadaRef = useRef(false)
  useEffect(() => {
    if (!open) { prefMetodoAplicadaRef.current = false; return }
    if (prefMetodoAplicadaRef.current) return
    if (metodosDisponibles.length === 0) return
    const pref = perfil?.metodo_pago_preferido
    if (!pref) { prefMetodoAplicadaRef.current = true; return }
    if (metodosDisponibles.some(m => m.id === pref)) {
      setMetodoPago(pref)
      prefMetodoAplicadaRef.current = true
    }
  }, [open, metodosDisponibles, perfil?.metodo_pago_preferido, setMetodoPago])

  // Pedir SIN CUENTA. Solo en la tienda pública del restaurante abierta en el
  // navegador (el enlace del flyer y el QR): ahí crear cuenta es la fricción que
  // tira la venta. Dentro de la app instalada se sigue pidiendo cuenta.
  // El pedido no entra por la RLS normal sino por el RPC `crear_pedido_invitado`,
  // que vuelve a comprobar TODO en servidor — esto de aquí solo decide qué se
  // enseña. Sin cuenta no hay Stripe: el invitado paga en efectivo o datáfono.
  const guestPermitido = (
    !user &&
    !Capacitor.isNativePlatform() &&
    origenPedido === 'tienda_publica' &&
    restConfigLista &&
    !restConfig.exige_registro_cliente
  )
  const [guestNombre, setGuestNombre] = useState('')
  const [guestTelefono, setGuestTelefono] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestDireccion, setGuestDireccion] = useState('')
  const [guestLat, setGuestLat] = useState(null)
  const [guestLng, setGuestLng] = useState(null)
  // Persist guest data en localStorage para no perderla entre recargas
  useEffect(() => {
    if (!guestPermitido) return
    try {
      const raw = localStorage.getItem('pidoo_guest_data')
      if (raw) {
        const d = JSON.parse(raw)
        if (d.nombre && !guestNombre) setGuestNombre(d.nombre)
        if (d.telefono && !guestTelefono) setGuestTelefono(d.telefono)
        if (d.email && !guestEmail) setGuestEmail(d.email)
        if (d.direccion && !guestDireccion) setGuestDireccion(d.direccion)
        if (d.lat && !guestLat) setGuestLat(d.lat)
        if (d.lng && !guestLng) setGuestLng(d.lng)
      }
    } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestPermitido])
  useEffect(() => {
    if (!guestPermitido) return
    try {
      localStorage.setItem('pidoo_guest_data', JSON.stringify({
        nombre: guestNombre, telefono: guestTelefono, email: guestEmail,
        direccion: guestDireccion, lat: guestLat, lng: guestLng,
      }))
    } catch (_) {}
  }, [guestPermitido, guestNombre, guestTelefono, guestEmail, guestDireccion, guestLat, guestLng])

  // Cupones de Pidoo Creadores que valen en este carrito. El importe del
  // descuento lo calcula el SERVIDOR con la misma función que usa el trigger al
  // cobrar (`creadores_valor_cupon`), no se replica aquí: si las dos cuentas no
  // dieran lo mismo, el cliente vería un precio y pagaría otro.
  //
  // ⚠️ ESTE HOOK TIENE QUE ESTAR AQUÍ, ANTES DEL `return null` DE ABAJO.
  // Estuvo colocado más abajo y tumbó el carrito en producción con React #300
  // ("se han renderizado menos hooks de los esperados"): con el carrito vacío el
  // componente sale por ese return y el hook no se ejecuta; al añadir el primer
  // producto aparecía un hook de más y React abortaba el árbol entero.
  useEffect(() => {
    let vivo = true
    const estId = carrito[0]?.establecimiento_id
    if (!user || !estId || subtotal <= 0) { setCupones([]); setCuponSel(null); return }
    supabase.rpc('creadores_cupones_para_carrito', {
      p_establecimiento_id: estId,
      p_subtotal: subtotal,
      p_coste_envio: modoEntrega === 'recogida' ? 0 : envio,
      p_modo_entrega: modoEntrega,
    }).then(({ data }) => {
      if (!vivo) return
      const lista = data || []
      setCupones(lista)
      // Si el que estaba elegido ya no vale (cambió el carrito), se actualiza
      // su importe o se suelta.
      setCuponSel(prev => prev ? (lista.find(c => c.id === prev.id) || null) : null)
    })
    return () => { vivo = false }
  }, [user, carrito, subtotal, envio, modoEntrega])

  function guestValido() {
    if (!guestPermitido) return true
    if (!guestNombre.trim() || guestNombre.trim().length < 2) return false
    if (!guestTelefono.trim() || guestTelefono.trim().length < 6) return false
    if (modoEntrega === 'delivery' && (!guestDireccion.trim() || guestLat == null || guestLng == null)) return false
    return true
  }

  if (totalItems === 0) return null

  async function generarCodigo() {
    try { const { data } = await supabase.functions.invoke('generar_codigo_pedido', { body: {} }); if (data?.codigo) return data.codigo } catch (e) { console.error('[Carrito] generar_codigo_pedido', e) }
    const n = Date.now() % 100000
    return `PD-${n.toString().padStart(5, '0')}`
  }

  async function insertarPedidoEnBD(estado) {
    if (carrito.length === 0) { setErrorMsg('El carrito está vacío'); return null }
    // Validación dirección: usuario logueado o guest
    const tieneDireccionLogueado = !!(perfil?.latitud && perfil?.longitud && perfil?.direccion)
    const tieneDireccionGuest = !!(guestDireccion && guestLat != null && guestLng != null)
    if (modoEntrega === 'delivery' && !tieneDireccionLogueado && !tieneDireccionGuest) {
      if (user) {
        setSinDireccion(true); setMostrarAddDir(true)
      }
      setErrorMsg('Añade una direccion de entrega antes de confirmar el pedido')
      return null
    }
    const codigo = codigoPedido || await generarCodigo()
    setCodigoPedido(codigo)
    const totalFinal = Math.max(0, total - descuentoEfectivo)

    // Resolver datos de entrega y cliente (logueado o guest)
    let dirEntrega = null
    let latEntrega = null
    let lngEntrega = null
    if (modoEntrega === 'delivery') {
      if (user && tieneDireccionLogueado) {
        dirEntrega = perfil.direccion
        latEntrega = perfil.latitud
        lngEntrega = perfil.longitud
      } else if (guestPermitido && tieneDireccionGuest) {
        dirEntrega = guestDireccion
        latEntrega = guestLat
        lngEntrega = guestLng
      }
    }

    let socioIdTracking = null
    try {
      const raw = typeof window !== 'undefined' ? sessionStorage.getItem('pidoo_socio_id') : null
      if (raw) socioIdTracking = raw
    } catch (_) {}
    // Marketplace del socio: solo si hay pidoo_socio_id (lo setea TiendaSocio en
    // /s/:slug; /app y /:slug lo limpian). En ese caso el pedido va atado a ESE
    // socio: origen_pedido='marketplace_socio' → el dispatcher lo asigna solo a ese
    // socio y la factura le acredita la comision (incluso en recogida). Si no es
    // marketplace, socio_id=null y el dispatcher elige al socio mas cercano.
    const esMarketplaceSocio = !!socioIdTracking

    const insertPayload = {
      codigo, usuario_id: user?.id || null, establecimiento_id: carrito[0].establecimiento_id,
      canal, socio_id: esMarketplaceSocio ? socioIdTracking : null, estado, metodo_pago: metodoPago, modo_entrega: modoEntrega,
      stripe_payment_id: null, subtotal, coste_envio: envio, propina, total: totalFinal,
      descuento: descuentoEfectivo > 0 ? descuentoEfectivo : null,
      promo_titulo: cuponGana ? cuponSel.descripcion : (descuento > 0 && promoActiva ? promoActiva.titulo : null), notas,
      lat_entrega: latEntrega,
      lng_entrega: lngEntrega,
      direccion_entrega: dirEntrega,
      origen_pedido: esMarketplaceSocio ? 'marketplace_socio' : (origenPedido || 'pido'),
      // Solo la referencia: el importe lo calcula y lo impone el servidor.
      cupon_creador_id: cuponSel?.id || null,
      // Snapshot del teléfono de contacto EN el pedido → el socio lo lee sin tocar la RLS de usuarios.
      cliente_telefono: (perfil?.telefono || telefonoInput || '').trim() || null,
    }
    // Líneas del pedido (el pedido_id se añade después, cuando existe)
    const lineas = carrito.map(item => {
      let extrasFlat = null
      if (item.extras && item.extras.length > 0) {
        if (typeof item.extras[0] === 'object' && item.extras[0] !== null && 'opciones' in item.extras[0]) {
          extrasFlat = item.extras.flatMap(g =>
            (g.opciones || []).map(o => o.precio > 0 ? `${o.nombre} (+${o.precio.toFixed(2)}€)` : o.nombre)
          )
        } else {
          extrasFlat = item.extras
        }
      }
      return {
        producto_id: item.producto_id, nombre_producto: item.nombre,
        tamano: item.tamano, extras: extrasFlat,
        precio_unitario: item.precio_unitario, cantidad: item.cantidad,
      }
    })

    // ── Sin cuenta: una sola llamada al RPC, que crea pedido + líneas ───────
    // No pasa por la RLS de `pedidos` (que exige usuario_id = auth.uid()); el
    // RPC revalida el restaurante, el método de pago, y RECALCULA subtotal y
    // descuento en servidor, así que da igual lo que mande este navegador.
    if (!user && guestPermitido) {
      const { data: creado, error: rpcError } = await supabase.rpc('crear_pedido_invitado', {
        p_pedido: {
          ...insertPayload,
          guest_nombre: guestNombre.trim(),
          guest_telefono: guestTelefono.trim(),
          guest_email: guestEmail.trim() || null,
        },
        p_items: lineas,
      })
      if (rpcError) throw new Error(rpcError.message || 'No se ha podido crear el pedido')
      if (!creado?.id) throw new Error('No se ha podido crear el pedido')
      // Guardado para poder seguirlo sin cuenta (código + token)
      try {
        const previos = JSON.parse(localStorage.getItem('pidoo_guest_pedidos') || '[]')
        localStorage.setItem('pidoo_guest_pedidos', JSON.stringify(
          [{ codigo: creado.codigo, token: creado.tracking_token, fecha: Date.now() }, ...previos].slice(0, 10)
        ))
      } catch (_) {}
      return creado
    }

    const { data: pedido, error: pedidoError } = await supabase.from('pedidos').insert(insertPayload).select().single()
    if (pedidoError) throw pedidoError
    const items = lineas.map(l => ({ ...l, pedido_id: pedido.id }))
    const { error: itemsError } = await supabase.from('pedido_items').insert(items)
    if (itemsError) throw itemsError
    return pedido
  }

  async function confirmarPago(pedido, stripePaymentId) {
    // El pago YA está cobrado: este update es lo que hace visible el pedido al
    // restaurante (filtra estado='nuevo'). Si falla y no se avisa, el cliente
    // paga y el pedido queda invisible en 'pendiente_pago'.
    const marcarNuevo = () => supabase.from('pedidos')
      .update({ estado: 'nuevo', stripe_payment_id: stripePaymentId })
      .eq('id', pedido.id)
      .select('id')
    let { data: filas, error } = await marcarNuevo()
    if (error || !filas?.length) {
      ({ data: filas, error } = await marcarNuevo())
    }
    if (error || !filas?.length) {
      setErrorMsg(`El pago se procesó correctamente pero hubo un problema al registrar el pedido. Contacta con soporte indicando el código: ${pedido.codigo}`)
      setPasoTarjeta(false); setClientSecret(null)
      isPaying.current = false; pagoEnviado.current = false
      return
    }
    finalizarPedido(pedido)
  }

  function finalizarPedido(pedido) {
    clearCart(); setOpen(false); setPasoTarjeta(false); setClientSecret(null); setCodigoPedido(null)
    setPedidoPendiente(null); setDescuento(0); setPromoActiva(null); setCuponSel(null); setNotas('')
    setSinDireccion(false); setRestCerrado(false); setErrorMsg(null)
    sendPush({
      targetType: 'restaurante', targetId: pedido.establecimiento_id,
      title: 'Nuevo pedido', body: `Pedido ${pedido.codigo} - ${(Math.max(0, total - descuentoEfectivo)).toFixed(2)} €`,
      data: { pedido_id: pedido.id },
    })
    onPedidoCreado(pedido)
  }

  // Crea pedido con estado 'nuevo' + stripe_payment_id, luego finaliza
  async function crearPedidoYFinalizar(stripePaymentId) {
    const pedido = await insertarPedidoEnBD('nuevo')
    if (!pedido) return
    if (stripePaymentId) {
      // El pedido ya es visible ('nuevo'); si falla el guardado del payment id,
      // reintenta una vez y sigue (no bloquea al cliente, pero queda avisado en consola).
      let { error } = await supabase.from('pedidos').update({ stripe_payment_id: stripePaymentId }).eq('id', pedido.id)
      if (error) {
        ({ error } = await supabase.from('pedidos').update({ stripe_payment_id: stripePaymentId }).eq('id', pedido.id))
        if (error) console.warn('[Carrito] no se pudo guardar stripe_payment_id', error)
      }
    }
    finalizarPedido(pedido)
  }

  async function iniciarPago() {
    if (isPaying.current) return
    // Blindaje: nunca crear un pedido a un restaurante cerrado, aunque el botón
    // se haya quedado habilitado (carrera de carga o carrito persistido en localStorage).
    if (restCerrado) {
      setErrorMsg('Este restaurante está cerrado ahora mismo. No se pueden hacer pedidos.')
      return
    }
    // Blindaje pedido mínimo (por si el botón quedó habilitado por una carrera de carga).
    if (bajoMinimo) {
      setErrorMsg(`El pedido mínimo de este restaurante es ${fmt(pedidoMinimo)}. Te faltan ${fmt(faltaMinimo)}.`)
      return
    }
    // Sin cuenta solo se sigue si este restaurante lo permite y estamos en su
    // tienda pública; si no, a iniciar sesión.
    if (!user && !guestPermitido) {
      onRequireLogin?.()
      return
    }
    if (!user) {
      if (!guestValido()) {
        setErrorMsg(modoEntrega === 'delivery'
          ? 'Completa tu nombre, tu teléfono y la dirección de entrega.'
          : 'Completa tu nombre y tu teléfono.')
        return
      }
    } else {
      // Teléfono de contacto obligatorio: el socio/rider debe poder llamar al cliente.
      const telContacto = (perfil?.telefono || telefonoInput || '').trim()
      if (telContacto.replace(/\D/g, '').length < 6) {
        setErrorMsg('Añade un teléfono de contacto para que el repartidor pueda llamarte si hay algún problema.')
        return
      }
      if (!perfil?.telefono) {
        try { await updatePerfil({ telefono: telContacto }) } catch (_) {}
      }
    }
    if (user && modoEntrega === 'delivery' && !(perfil?.latitud && perfil?.longitud && perfil?.direccion)) {
      setSinDireccion(true); setMostrarAddDir(true); return
    }
    // Revalidar rider del socio antes de iniciar el pago
    try {
      const socioIdCheck = typeof window !== 'undefined' ? sessionStorage.getItem('pidoo_socio_id') : null
      const socioSlugCheck = typeof window !== 'undefined' ? sessionStorage.getItem('pidoo_socio_slug') : null
      if (socioIdCheck && socioSlugCheck && modoEntrega === 'delivery') {
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://rmrbxrabngdmpgpfmjbo.supabase.co'
        const res = await fetch(`${SUPABASE_URL}/functions/v1/get-socio-marketplace?slug=${encodeURIComponent(socioSlugCheck)}&live=1`)
        if (res.ok) {
          const data = await res.json()
          if (data?.socio?.rider_online === false) {
            setErrorMsg('Este repartidor ya no está disponible. El pedido no puede completarse en este momento. Puedes pedir directamente desde Pidoo.')
            return
          }
        }
      }
    } catch (e) {
      console.warn('[Carrito] revalidación rider socio falló', e)
    }

    // Verificacion en tiempo real del estado propio del socio: el socio del
    // establecimiento tiene riders online ahora mismo. Bloquea el pago si no.
    if (modoEntrega === 'delivery' && carrito[0]?.establecimiento_id) {
      try {
        // Contexto MARKETPLACE del socio: si el pedido sale de /s/<slug>, hay que preguntar
        // por ESE socio y por su fuente 'marketplace' (check v11). Sin esto, la edge evaluaba
        // acepta_app de TODOS los socios del restaurante: un socio que hubiera pausado este
        // restaurante o apagado su marketplace dejaba pagar al cliente un pedido que el
        // dispatcher no podía asignar → no_rider → cancelación + reembolso.
        const socioIdMkt = typeof window !== 'undefined' ? sessionStorage.getItem('pidoo_socio_id') : null
        const { data: avail, error: availErr } = await supabase.functions.invoke(
          'check-socio-availability-now',
          {
            body: socioIdMkt
              ? { establecimiento_id: carrito[0].establecimiento_id, socio_id: socioIdMkt, fuente: 'marketplace' }
              : { establecimiento_id: carrito[0].establecimiento_id, fuente: 'app' },
          },
        )
        if (!availErr && avail && avail.disponible === false) {
          setErrorMsg('No hay repartidores disponibles en este momento. Vuelve a intentarlo en unos minutos o elige Recogida.')
          return
        }
      } catch (e) {
        console.warn('[Carrito] check-socio-availability-now falló', e)
        // Si la edge falla, dejamos que siga (no queremos bloquear pagos por
        // un fallo transitorio — el dispatcher (create-shipday-order) ya
        // manejará el caso 'no rider' al aceptar el restaurante).
      }
    }
    isPaying.current = true; pagoEnviado.current = false; setLoading(true); setErrorMsg(null)
    try {
      const totalConDescuento = Math.max(0, total - descuentoEfectivo)
      if (metodoPago === 'tarjeta') {
        // Generar código sin insertar pedido en BD todavía
        const codigo = codigoPedido || await generarCodigo()
        setCodigoPedido(codigo)

        if (tarjetaSel && tarjetasGuardadas.length > 0) {
          // Tarjeta guardada: cobrar primero, crear pedido DESPUÉS
          const result = await pagarConTarjetaGuardada({
            paymentMethodId: tarjetaSel, amount: totalConDescuento,
            pedidoCodigo: codigo, customerEmail: user?.email, userId: user?.id,
          })
          if (result.status === 'succeeded') {
            pagoEnviado.current = true
            await crearPedidoYFinalizar(result.paymentIntentId)
            return
          }
        }

        // Tarjeta nueva: insertar pedido como 'pendiente_pago' (el panel
        // restaurante filtra solo 'nuevo' asi que NO lo ve), pedir clientSecret
        // y mostrar formulario. crear_pago_stripe v22 (HARDENED) requiere que
        // el pedido exista en BD para validar total/propietario/radio. Al
        // confirmarse el pago, onSuccess llama a confirmarPago() que pasa
        // el pedido a 'nuevo' + agrega stripe_payment_id.
        const pedidoTmp = await insertarPedidoEnBD('pendiente_pago')
        if (!pedidoTmp) { setLoading(false); isPaying.current = false; return }
        setPedidoPendiente(pedidoTmp)
        const result = await crearPagoStripe({
          amount: totalConDescuento, pedidoCodigo: pedidoTmp.codigo,
          customerEmail: user?.email, userId: user?.id,
        })
        pagoEnviado.current = true
        setClientSecret(result.clientSecret)
        setPasoTarjeta(true)
        // El pedido pasa a 'nuevo' en onSuccess del FormularioPago
      } else {
        // Efectivo: crear pedido directamente como 'nuevo'
        const pedido = await insertarPedidoEnBD('nuevo')
        if (!pedido) { setLoading(false); return }
        finalizarPedido(pedido)
      }
    } catch (err) {
      // Si el pago llegó a Stripe pero falló la creación del pedido en BD
      if (pagoEnviado.current && codigoPedido) {
        setErrorMsg(`El pago se procesó correctamente pero hubo un problema al guardar el pedido. Por favor contacta con soporte con el código: ${codigoPedido}`)
      } else {
        setErrorMsg(err.message || 'Error al procesar el pago')
      }
      setCodigoPedido(null)
      setClientSecret(null)
      setPedidoPendiente(null)
    }
    finally {
      // Solo resetear isPaying si el pago NO fue enviado a Stripe (errores previos)
      if (!pagoEnviado.current) {
        isPaying.current = false
      }
      setLoading(false)
    }
  }

  // Pedido mínimo del restaurante (0 = sin mínimo). Se compara con el subtotal de productos.
  const bajoMinimo = pedidoMinimo > 0 && subtotal < pedidoMinimo
  const faltaMinimo = Math.max(0, pedidoMinimo - subtotal)
  // Sin cuenta, el botón espera a que estén el nombre, el teléfono y (si es a
  // domicilio) la dirección. Si el invitado NO está permitido el botón sigue
  // vivo: al pulsarlo es cuando se abre el login.
  const isDisabled = loading || envioLoading || restCerrado || bajoMinimo
    || ((sinDireccion || fueraDeRadio) && modoEntrega === 'delivery')
    || (!user && guestPermitido && !guestValido())

  return (
    <>
      {/* ── Modal carrito (renderizado en portal a document.body para escapar stacking contexts) ── */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="modal-overlay"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,15,15,0.55)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => {
            setOpen(false); setPasoTarjeta(false); setPedidoPendiente(null)
            setCodigoPedido(null); setClientSecret(null)
            // Mismo reset que "Volver al carrito": sin esto, cerrar tocando el
            // fondo durante el paso de tarjeta dejaba isPaying=true para siempre
            // y el botón de pagar quedaba muerto hasta recargar.
            isPaying.current = false; pagoEnviado.current = false
          }}
        >
          <div
            className="modal-sheet"
            onClick={e => e.stopPropagation()}
            style={{
              background: C.cream,
              borderRadius: '20px 20px 0 0',
              padding: '18px 18px 32px',
              width: '100%', maxWidth: 420,
              maxHeight: '88vh', overflowY: 'auto',
              animation: 'slideUp 0.3s ease',
              boxShadow: '0 -8px 32px rgba(15,15,15,0.12)',
            }}
          >
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.10)', margin: '0 auto 14px' }} />

            {pasoTarjeta && clientSecret ? (
              <Elements stripe={stripePromise} options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#E4671F',
                    colorBackground: '#FFFFFF',
                    colorText: '#1A1815',
                    colorDanger: '#B5564A',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    borderRadius: '12px',
                  },
                },
              }}>
                <FormularioPago
                  clientSecret={clientSecret}
                  total={Math.max(0, total - descuentoEfectivo)}
                  onSuccess={async (paymentId) => {
                    // Pago confirmado por Stripe → confirmar el pedido pendiente
                    // (pasarlo de 'pendiente_pago' a 'nuevo' + stripe_payment_id).
                    // Fallback: si por algun motivo no hay pedidoPendiente,
                    // crearlo ahora con estado 'nuevo' (caso edge).
                    try {
                      if (pedidoPendiente) {
                        await confirmarPago(pedidoPendiente, paymentId)
                      } else {
                        await crearPedidoYFinalizar(paymentId)
                      }
                    } catch (err) {
                      // Si el pago fue enviado pero falla la creación del pedido
                      if (codigoPedido) {
                        setErrorMsg(`El pago se procesó correctamente pero hubo un problema al guardar el pedido. Por favor contacta con soporte con el código: ${codigoPedido}`)
                      } else {
                        setErrorMsg(err.message || 'Error al crear el pedido')
                      }
                    } finally {
                      isPaying.current = false
                    }
                  }}
                  onCancel={() => {
                    // No hay pedido en BD que marcar como fallido
                    setPasoTarjeta(false); setPedidoPendiente(null)
                    setCodigoPedido(null); setClientSecret(null)
                    isPaying.current = false; pagoEnviado.current = false
                  }}
                />
              </Elements>
            ) : (
              <>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.ink, letterSpacing: '-0.02em' }}>Tu pedido</h3>
                  <button onClick={() => setOpen(false)} style={{
                    width: 34, height: 34, borderRadius: '50%', background: C.cream2,
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <X size={16} strokeWidth={2.4} color={C.stone} />
                  </button>
                </div>

                <div style={{ fontSize: 12, color: C.stone, marginBottom: 18 }}>{carrito[0]?.establecimiento_nombre}</div>

                {/* Items */}
                <div style={{ marginBottom: 18 }}>
                  {/* Cabecera lista: contador + vaciar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={S.label}>{totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}</span>
                    <button
                      onClick={clearCart}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: 'none', border: 'none', color: C.stone,
                        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0,
                      }}
                    >
                      <Trash2 size={13} strokeWidth={2} /> Vaciar
                    </button>
                  </div>

                  {carrito.map((item, idx) => {
                    // Extras aplanados a texto con su sobreprecio: "Bacon extra (+1,00 €)"
                    const extrasList = item.extras?.length > 0
                      ? (typeof item.extras[0] === 'object' && item.extras[0] !== null && 'opciones' in item.extras[0]
                          ? item.extras.flatMap(g => (g.opciones || []).map(o => o.precio > 0 ? `${o.nombre} (+${fmt(o.precio)})` : o.nombre))
                          : item.extras)
                      : []
                    return (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: 10, marginBottom: 8,
                      background: C.paper, borderRadius: 16,
                      border: `1px solid ${C.border}`,
                    }}>
                      {/* Miniatura del producto (imagen o icono de comida) */}
                      <div style={{
                        width: 56, height: 56, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
                        background: C.cream2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {item.imagen_url
                          ? <img src={item.imagen_url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <FoodIcon kw={item.nombre} size={56} />}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, lineHeight: 1.25 }}>{item.nombre}</div>
                        {item.tamano && <div style={{ fontSize: 11, color: C.stone, marginTop: 2 }}>{item.tamano}</div>}
                        {extrasList.length > 0 && (
                          <div style={{ fontSize: 11, color: C.stone, marginTop: 2, lineHeight: 1.4 }}>
                            {extrasList.join(' · ')}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: C.burnt }}>
                            {fmt(item.precio_unitario * item.cantidad)}
                          </span>
                          {item.cantidad > 1 && (
                            <span style={{ fontSize: 11, color: C.stone }}>
                              {fmt(item.precio_unitario)} × {item.cantidad}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Acciones: eliminar + cantidad */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={() => removeItem(idx)}
                          aria-label="Eliminar"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                            color: C.stone, display: 'flex',
                          }}
                        >
                          <Trash2 size={16} strokeWidth={2} />
                        </button>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <button
                            onClick={() => updateCantidad(idx, item.cantidad - 1)}
                            aria-label="Restar"
                            style={{
                              width: 26, height: 26, borderRadius: '50%',
                              border: `1px solid ${C.border}`, background: '#fff',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: C.ink, fontFamily: 'inherit',
                            }}
                          >−</button>
                          <span style={{ minWidth: 14, textAlign: 'center', fontWeight: 700, fontSize: 14, color: C.ink }}>
                            {item.cantidad}
                          </span>
                          <button
                            onClick={() => updateCantidad(idx, item.cantidad + 1)}
                            aria-label="Sumar"
                            style={{
                              width: 26, height: 26, borderRadius: '50%',
                              border: 'none', background: C.burnt,
                              cursor: 'pointer', color: '#fff', fontFamily: 'inherit',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                          >+</button>
                        </div>
                      </div>
                    </div>
                  )})}
                </div>

                {/* Tipo de entrega */}
                <div style={{ marginBottom: 14 }}>
                  <div style={S.label}>Tipo de entrega</div>
                  {!tieneDelivery && (
                    <div style={{ fontSize: 11, color: C.stone, marginBottom: 8 }}>
                      Este restaurante solo ofrece recogida en local
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(deliveryDisponible ? ['delivery', 'recogida'] : ['recogida']).map(m => (
                      <button key={m} onClick={() => elegirEntrega(m)} style={S.selBtn(modoEntrega === m)}>
                        {m === 'delivery' ? 'Delivery' : 'Recogida'}
                      </button>
                    ))}
                  </div>
                  {modoEntrega === 'recogida' && (
                    <div style={{ fontSize: 11, color: C.sage2, fontWeight: 600, marginTop: 6 }}>
                      Sin coste de envío
                    </div>
                  )}
                </div>

                {/* Propina */}
                <div style={{ marginBottom: 14 }}>
                  <div style={S.label}>{modoEntrega === 'recogida' ? 'Propina' : 'Propina al rider'}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[0, 1, 2, 3].map(p => {
                      const active = propina === p
                      return (
                        <button key={p} onClick={() => setPropina(p)} style={{
                          flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                          border: active ? `1.5px solid ${C.burnt}` : `1px solid ${C.border}`,
                          background: active ? C.burntGlaze : C.paper,
                          color: active ? C.burntText : C.stone,
                          fontFamily: 'inherit', fontWeight: active ? 700 : 600, fontSize: 13,
                        }}>
                          {p === 0 ? '0 €' : `${p} €`}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Datos del invitado (guest checkout) */}
                {guestPermitido && (
                  <div style={{
                    marginBottom: 14, padding: 14, borderRadius: 14,
                    background: C.paper, border: `1px solid ${C.border}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>Tus datos</div>
                        <div style={{ fontSize: 11, color: C.stone, marginTop: 2 }}>
                          Pide sin crear cuenta. Te enviaremos el seguimiento del pedido.
                        </div>
                      </div>
                      <button
                        onClick={() => onRequireLogin?.()}
                        style={{
                          background: 'transparent', border: 'none', padding: 0,
                          color: C.burnt, fontSize: 11, fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                        }}
                      >
                        Iniciar sesión →
                      </button>
                    </div>

                    <input
                      value={guestNombre}
                      onChange={(e) => setGuestNombre(e.target.value)}
                      placeholder="Nombre y apellido *"
                      style={S.input}
                    />
                    <input
                      value={guestTelefono}
                      onChange={(e) => setGuestTelefono(e.target.value)}
                      placeholder="Teléfono *"
                      type="tel"
                      style={{ ...S.input, marginTop: 8 }}
                    />
                    <input
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="Email (opcional, para recibir tracking)"
                      type="email"
                      style={{ ...S.input, marginTop: 8 }}
                    />
                    {modoEntrega === 'delivery' && (
                      <div style={{ marginTop: 8 }}>
                        <AddressInput
                          value={guestDireccion}
                          onChange={(v) => { setGuestDireccion(v); if (!v) { setGuestLat(null); setGuestLng(null) } }}
                          onSelect={(addr) => {
                            setGuestDireccion(addr.direccion || addr.formatted || '')
                            setGuestLat(addr.latitud ?? addr.lat ?? null)
                            setGuestLng(addr.longitud ?? addr.lng ?? null)
                          }}
                          placeholder="Dirección de entrega *"
                          style={S.input}
                        />
                        {guestDireccion && guestLat == null && (
                          <div style={{ fontSize: 10, color: C.warning, marginTop: 4 }}>
                            Selecciona la dirección de las sugerencias para fijar la ubicación.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Bloque login si el restaurante exige cuenta y no hay user.
                    Se espera a saber qué quiere el restaurante: si no, al abrir
                    el carrito parpadearía "inicia sesión" y luego "tus datos". */}
                {!user && !guestPermitido && restConfigLista && (
                  <div style={{
                    marginBottom: 14, padding: 14, borderRadius: 14,
                    background: C.burntGlaze, border: `1px solid ${C.burnt}`,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
                      Inicia sesión para hacer tu pedido
                    </div>
                    <button
                      onClick={() => onRequireLogin?.()}
                      style={{
                        padding: '10px 22px', borderRadius: 999, border: 'none',
                        background: C.burnt, color: '#fff',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Iniciar sesión o registrarme
                    </button>
                  </div>
                )}

                {/* Teléfono de contacto — obligatorio si el perfil no lo tiene (para que el socio pueda llamar) */}
                {user && !perfil?.telefono && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={S.label}>Teléfono de contacto</div>
                    <input
                      value={telefonoInput}
                      onChange={(e) => setTelefonoInput(e.target.value)}
                      placeholder="Tu teléfono *"
                      type="tel"
                      style={S.input}
                    />
                    <div style={{ fontSize: 11, color: C.stone, marginTop: 6 }}>
                      {modoEntrega === 'recogida'
                        ? 'El restaurante lo usará para avisarte cuando tu pedido esté listo.'
                        : 'El repartidor lo usará para llamarte si hay algún problema con la entrega.'}
                    </div>
                  </div>
                )}

                {/* Método pago — dinámico según restaurante */}
                <div style={{ marginBottom: 14 }}>
                  <div style={S.label}>Método de pago</div>
                  {metodosDisponibles.length === 0 ? (
                    <div style={{
                      padding: '10px 12px', borderRadius: 10,
                      background: 'rgba(239,68,68,0.10)', color: '#B5564A',
                      fontSize: 12, fontWeight: 600,
                    }}>
                      Este restaurante no tiene métodos de pago activos. No puedes pedir.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {metodosDisponibles.map(m => (
                        <button key={m.id} onClick={() => setMetodoPago(m.id)} style={S.selBtn(metodoPago === m.id)}>
                          {m.icon === 'card' ? (
                            <span style={{display:'inline-flex',gap:6,alignItems:'center'}}>
                              <CreditCard size={14}/> {m.label}
                            </span>
                          ) : m.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tarjetas guardadas */}
                  {TARJETAS_GUARDADAS_HABILITADO && metodoPago === 'tarjeta' && tarjetasGuardadas.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 11, color: 'var(--c-muted)', marginBottom: 6 }}>Tarjetas guardadas</div>
                      {tarjetasGuardadas.map(c => (
                        <button key={c.id} onClick={() => setTarjetaSel(c.id)} style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '12px 14px', borderRadius: 14, marginBottom: 6,
                          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                          border: tarjetaSel === c.id ? '1.5px solid var(--c-primary)' : '1px solid rgba(0,0,0,0.06)',
                          background: tarjetaSel === c.id ? 'rgba(255,107,44,0.14)' : 'rgba(0,0,0,0.04)',
                        }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--c-text)', textTransform: 'capitalize' }}>{c.brand} </span>
                            <span style={{ fontSize: 13, color: 'var(--c-muted)' }}>•••• {c.last4}</span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>{c.exp_month}/{c.exp_year}</span>
                          {tarjetaSel === c.id && <Check size={16} color="var(--c-primary)" />}
                        </button>
                      ))}
                      <button onClick={() => setTarjetaSel(null)} style={{
                        width: '100%', padding: '8px', borderRadius: 12,
                        border: '1px dashed rgba(0,0,0,0.08)',
                        background: 'transparent', color: 'var(--c-muted)',
                        fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                        + Usar nueva tarjeta
                      </button>
                    </div>
                  )}
                </div>

                {/* Promo banner */}
                {promoActiva && (
                  <div style={{
                    marginBottom: 14, padding: '12px 14px', borderRadius: 10,
                    background: descuento > 0 ? 'var(--c-success-soft)' : 'var(--c-primary-soft)',
                    border: descuento > 0 ? '1px solid var(--c-success)' : '1px solid var(--c-primary)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 20 }}>{descuento > 0 ? '🎉' : '🏷️'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: descuento > 0 ? 'var(--c-success)' : 'var(--c-primary)' }}>
                        {promoActiva.titulo}
                      </div>
                      {descuento > 0 ? (
                        <div style={{ fontSize: 11, color: 'var(--c-success)' }}>-{descuento.toFixed(2)} € aplicado</div>
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--c-muted)' }}>
                          Compra min. {promoActiva.minimo_compra}€ — te faltan {((promoActiva.minimo_compra || 0) - subtotal).toFixed(2)}€
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Regalo por cantidad. Banner propio: no es un descuento (el total no
                    se mueve), es un producto que se añade solo al confirmar. */}
                {regalo && (
                  <div style={{
                    marginBottom: 14, padding: '12px 14px', borderRadius: 10,
                    background: regalo.cumplido ? 'var(--c-success-soft)' : 'var(--c-primary-soft)',
                    border: `1px solid ${regalo.cumplido ? 'var(--c-success)' : 'var(--c-primary)'}`,
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 20 }}>🎁</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: regalo.cumplido ? 'var(--c-success)' : 'var(--c-primary)' }}>
                        {regalo.titulo}
                      </div>
                      <div style={{ fontSize: 11, color: regalo.cumplido ? 'var(--c-success)' : 'var(--c-muted)' }}>
                        {regalo.cumplido
                          ? `Te llevas ${regalo.nombre} gratis`
                          : `Te falta${regalo.faltan === 1 ? '' : 'n'} ${regalo.faltan} para llevarte ${regalo.nombre} gratis`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Premios de Pidoo Creadores que valen aquí. Solo aparece si el
                    cliente tiene alguno: para quien no participa, esto no existe. */}
                {cupones.length > 0 && (
                  <div style={{
                    background: C.paper, border: `1px solid ${C.border}`,
                    borderRadius: 14, padding: 12, marginTop: 8,
                  }}>
                    <div style={{ ...S.label, marginBottom: 8 }}>Tus premios</div>
                    {cupones.map(c => {
                      const activo = cuponSel?.id === c.id
                      const pierde = activo && !cuponGana
                      return (
                        <button
                          key={c.id}
                          onClick={() => setCuponSel(activo ? null : c)}
                          style={{
                            width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
                            padding: '10px 12px', borderRadius: 11,
                            border: activo ? `1.5px solid ${C.burnt}` : `1px solid ${C.border}`,
                            background: activo ? C.burntGlaze : '#fff',
                          }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                            border: `1.5px solid ${activo ? C.burnt : C.border}`,
                            background: activo ? C.burnt : 'transparent',
                            display: 'grid', placeItems: 'center', color: '#fff', fontSize: 12, fontWeight: 900,
                          }}>{activo ? '✓' : ''}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: activo ? C.burntText : C.ink }}>
                              {c.descripcion}
                            </div>
                            <div style={{ fontSize: 11, color: C.stone, marginTop: 1 }}>{c.codigo}</div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: C.sage2, flexShrink: 0 }}>
                            −{fmt(c.descuento)}
                          </div>
                        </button>
                      )
                    })}
                    {/* Nunca se suman: si la promo del restaurante da más, se aplica
                        esa y el premio se queda sin gastar para otro día. */}
                    {cuponSel && !cuponGana && (
                      <div style={{ fontSize: 11.5, color: C.stone, marginTop: 4, lineHeight: 1.45 }}>
                        La promoción del restaurante te descuenta más, así que se aplica esa.
                        Tu premio <strong>no se gasta</strong>: lo guardas para otro pedido.
                      </div>
                    )}
                  </div>
                )}

                {/* Desglose (card paper) */}
                <div style={{
                  background: C.paper, border: `1px solid ${C.border}`,
                  borderRadius: 14, padding: 14, marginTop: 8,
                }}>
                  <ResLine label="Subtotal" value={fmt(subtotal)} />
                  {cuponGana && (
                    <ResLine label={`🎬 ${cuponSel.descripcion}`} value={'-' + fmt(descuentoCupon)} tone="sage" />
                  )}
                  {regalo?.cumplido && (
                    <ResLine label={`🎁 ${regalo.nombre}`} value="Gratis" tone="sage" />
                  )}
                  {descuento > 0 && (
                    <ResLine label="Descuento" value={'-' + fmt(descuento)} tone="sage" />
                  )}
                  <ResLine
                    label={`Envío${distanciaKm && modoEntrega === 'delivery' && tarifaEnvioFija == null ? ` (${Number(distanciaKm).toFixed(1).replace('.', ',')} km)` : ''}`}
                    value={modoEntrega === 'recogida' ? 'Gratis' : envioLoading ? 'Calculando...' : fmt(envio)}
                    tone={modoEntrega === 'recogida' ? 'sage' : undefined}
                  />
                  {tarifaEnvioFija != null && modoEntrega === 'delivery' && (
                    <div style={{ fontSize: 10, color: C.stone, marginTop: -2, marginBottom: 4, textAlign: 'right' }}>
                      Envío gestionado por el restaurante
                    </div>
                  )}
                  {propina > 0 && <ResLine label="Propina" value={fmt(propina)} />}
                  <div style={{ height: 1, background: C.border, margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontWeight: 700, color: C.ink, fontSize: 16 }}>Total</span>
                    <span style={{ fontSize: 24, color: C.ink, fontWeight: 800 }}>{fmt(total - descuentoEfectivo)}</span>
                  </div>
                </div>

                {/* Notas */}
                <div style={{ marginTop: 16, marginBottom: 12 }}>
                  <div style={S.label}>Notas del pedido</div>
                  <input
                    value={notas} onChange={e => setNotas(e.target.value)}
                    placeholder="Ej: sin cebolla, piso 3.º izquierda..."
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 14,
                      border: '1px solid var(--c-border)', background: 'var(--c-surface2)',
                      fontSize: 13, fontFamily: 'inherit', color: 'var(--c-text)',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Avisos envío */}
                {envioError && modoEntrega === 'delivery' && (
                  <div style={{ marginBottom: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--c-warning-soft)', border: '1px solid var(--c-warning)', fontSize: 12, color: 'var(--c-warning)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>⚠️</span> Envío estimado (2.50€). El coste final puede variar.
                  </div>
                )}

                {/* Error general */}
                {errorMsg && (
                  <div style={{ marginBottom: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>❌</span>
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--c-danger)' }}>{errorMsg}</div>
                    <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', color: 'var(--c-danger)', cursor: 'pointer', fontSize: 14, padding: 0 }}>×</button>
                  </div>
                )}

                {/* Fuera de radio */}
                {fueraDeRadio && modoEntrega === 'delivery' && !sinDireccion && (
                  <div style={{ marginBottom: 10, padding: '14px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 22 }}>🚫</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-danger)', marginBottom: 2 }}>Fuera de la zona de entrega</div>
                        <div style={{ fontSize: 11, color: 'var(--c-muted)' }}>Este restaurante no hace delivery a tu ubicación. Puedes cambiar a recogida.</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sin dirección */}
                {sinDireccion && modoEntrega === 'delivery' && !fueraDeRadio && (
                  <div style={{ marginBottom: 10, padding: '14px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: mostrarAddDir ? 12 : 0 }}>
                      <span style={{ fontSize: 22 }}>📍</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-danger)', marginBottom: 2 }}>Añade tu dirección de entrega</div>
                        <div style={{ fontSize: 11, color: 'var(--c-muted)' }}>Necesitas una ubicación guardada para pedir a domicilio</div>
                      </div>
                      {!mostrarAddDir && (
                        <button onClick={() => setMostrarAddDir(true)} style={{
                          padding: '8px 14px', borderRadius: 8, border: 'none',
                          background: 'var(--c-btn-gradient)', color: '#fff',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                        }}>Añadir</button>
                      )}
                    </div>

                    {mostrarAddDir && (
                      <div>
                        <button onClick={async () => {
                          setGeoLoading(true); setDirMsg(null)
                          try {
                            const pos = await getCurrentPosition()
                            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.lat}&lon=${pos.lng}&format=json&addressdetails=1`)
                            const data = await res.json()
                            const addr = data.display_name || `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`
                            await updatePerfil({ direccion: addr, latitud: pos.lat, longitud: pos.lng })
                            if (user?.id) {
                              const { data: existing } = await supabase.from('direcciones_usuario').select('id').eq('usuario_id', user.id)
                              await supabase.from('direcciones_usuario').insert({
                                usuario_id: user.id, etiqueta: 'Mi ubicacion', direccion: addr,
                                latitud: pos.lat, longitud: pos.lng, principal: !existing || existing.length === 0,
                              })
                            }
                            setSinDireccion(false); setMostrarAddDir(false); setDirMsg(null)
                            if (modoEntrega === 'delivery') calcularEnvio(pos.lat, pos.lng, null).catch(() => {})
                          } catch { setDirMsg('No se pudo obtener la ubicación') }
                          finally { setGeoLoading(false) }
                        }} disabled={geoLoading} style={{
                          width: '100%', padding: '12px', borderRadius: 10, marginBottom: 8,
                          background: 'rgba(255,107,44,0.08)', border: '1px solid rgba(255,107,44,0.15)',
                          color: 'var(--c-primary-light)', fontSize: 12, fontWeight: 700,
                          cursor: geoLoading ? 'default' : 'pointer', fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                          <Navigation size={14} strokeWidth={2} />
                          {geoLoading ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
                        </button>

                        <div style={{ position: 'relative', marginBottom: 8 }}>
                          <MapPin size={14} strokeWidth={1.8} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--c-muted)', zIndex: 1 }} />
                          <AddressInput
                            value={nuevaDir} onChange={setNuevaDir}
                            onSelect={async (place) => {
                              if (place.lat && place.lng) {
                                setDirMsg(null)
                                await updatePerfil({ direccion: place.direccion, latitud: place.lat, longitud: place.lng })
                                if (user?.id) {
                                  const { data: existing } = await supabase.from('direcciones_usuario').select('id').eq('usuario_id', user.id)
                                  await supabase.from('direcciones_usuario').insert({
                                    usuario_id: user.id, etiqueta: 'Entrega', direccion: place.direccion,
                                    latitud: place.lat, longitud: place.lng, principal: !existing || existing.length === 0,
                                  })
                                }
                                setSinDireccion(false); setMostrarAddDir(false)
                                if (modoEntrega === 'delivery') calcularEnvio(place.lat, place.lng, null).catch(() => {})
                              }
                            }}
                            placeholder="Buscar dirección..."
                            style={{
                              width: '100%', padding: '10px 10px 10px 32px', borderRadius: 14,
                              border: '1px solid var(--c-border)', fontSize: 13, fontFamily: 'inherit',
                              background: 'var(--c-surface2)', color: 'var(--c-text)', outline: 'none', boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        {dirMsg && <div style={{ fontSize: 11, color: 'var(--c-danger)', textAlign: 'center', marginBottom: 4 }}>{dirMsg}</div>}

                        <button onClick={() => { setMostrarAddDir(false); setDirMsg(null) }} style={{
                          width: '100%', padding: '8px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)',
                          background: 'transparent', color: 'var(--c-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                        }}>Cancelar</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Restaurante cerrado */}
                {restCerrado && (
                  <div style={{
                    marginBottom: 10, padding: '14px 16px', borderRadius: 12,
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 22 }}>🔒</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-danger)', marginBottom: 2 }}>Restaurante cerrado</div>
                      <div style={{ fontSize: 11, color: 'var(--c-muted)' }}>{restCerradoMsg}</div>
                    </div>
                  </div>
                )}

                {/* Pedido mínimo no alcanzado */}
                {bajoMinimo && (
                  <div style={{
                    marginBottom: 10, padding: '14px 16px', borderRadius: 12,
                    background: 'rgba(197,86,44,0.08)', border: '1px solid rgba(197,86,44,0.22)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 22 }}>🛒</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.burnt, marginBottom: 2 }}>
                        Pedido mínimo {fmt(pedidoMinimo)}
                      </div>
                      <div style={{ fontSize: 11, color: C.stone }}>
                        Te faltan {fmt(faltaMinimo)} para poder hacer el pedido.
                      </div>
                    </div>
                  </div>
                )}

                {/* CTA */}
                <button onClick={iniciarPago} disabled={isDisabled} style={{
                  width: '100%', marginTop: 14, padding: '16px 0', borderRadius: 14, border: 'none',
                  background: isDisabled ? C.cream2 : C.burnt,
                  color: isDisabled ? C.stone : '#fff', fontSize: 15, fontWeight: 700,
                  cursor: isDisabled ? 'default' : 'pointer',
                  fontFamily: 'inherit', letterSpacing: '0.01em',
                  boxShadow: isDisabled ? 'none' : SH.glossy,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  opacity: isDisabled ? 0.7 : 1,
                }}>
                  {restCerrado ? 'No disponible — restaurante cerrado'
                    : bajoMinimo ? `Te faltan ${fmt(faltaMinimo)} para el mínimo`
                    : (fueraDeRadio && modoEntrega === 'delivery') ? 'Fuera de zona — prueba recogida'
                    : (sinDireccion && modoEntrega === 'delivery') ? 'Añade tu dirección para pedir'
                    : loading ? 'Procesando...'
                    : (
                      <>
                        <Lock size={14} strokeWidth={2.4} />
                        {metodoPago === 'tarjeta' && tarjetaSel
                          ? `Pagar con •••• ${tarjetasGuardadas.find(c => c.id === tarjetaSel)?.last4} · ${fmt(total - descuentoEfectivo)}`
                          : metodoPago === 'tarjeta'
                            ? `Continuar al pago · ${fmt(total - descuentoEfectivo)}`
                            : `Pedir ahora · ${fmt(total - descuentoEfectivo)}`}
                      </>
                    )
                  }
                </button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
