import { useState, useEffect, useRef } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { crearPagoStripe, listarTarjetas, pagarConTarjetaGuardada } from '../lib/stripe'
import { sendPush } from '../lib/webPush'
import { estaAbierto } from '../lib/horario'
import { getCurrentPosition } from '../lib/geolocation'
import { CreditCard, Lock, X, ArrowLeft, Check, Navigation, MapPin } from 'lucide-react'
import AddressInput from '../components/AddressInput'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

const cardStyle = {
  style: {
    base: { fontSize: '16px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#F5F5F5', '::placeholder': { color: '#767575' } },
    invalid: { color: '#EF4444' },
  },
}

/* ─── Estilos reutilizables ──────────────────────────────── */
const S = {
  label: { fontSize: 11, fontWeight: 700, color: 'var(--c-text)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 },
  selBtn: (active) => ({
    flex: 1, padding: '12px 0', borderRadius: 14,
    border: active ? '1.5px solid var(--c-primary)' : '1px solid rgba(255,255,255,0.1)',
    background: active ? 'rgba(255,107,44,0.08)' : 'rgba(255,255,255,0.08)',
    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    color: active ? 'var(--c-primary-light)' : 'var(--c-text)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    transition: 'all 0.15s ease',
  }),
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
    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    })
    if (stripeError) {
      setError(stripeError.message === 'Your card number is incomplete.' ? 'Completa los datos de tu tarjeta' : stripeError.message)
      setLoading(false)
    } else if (paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent.id)
    } else { setError('El pago no se pudo completar'); setLoading(false) }
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <button onClick={onCancel} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', color: 'var(--c-primary-light)',
        fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        marginBottom: 20, padding: 0,
      }}>
        <ArrowLeft size={16} strokeWidth={2.5} /> Volver al carrito
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12,
          background: 'var(--c-primary-glow)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CreditCard size={20} strokeWidth={1.8} color="var(--c-primary)" />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text)' }}>Nueva tarjeta</div>
          <div style={{ fontSize: 12, color: 'var(--c-muted)' }}>Se guardará para próximos pedidos</div>
        </div>
      </div>

      <div style={{
        background: '#262626', borderRadius: 14,
        border: 'none',
        padding: '16px 14px', marginBottom: 16,
      }}>
        <CardElement options={cardStyle} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, justifyContent: 'center' }}>
        <Lock size={12} strokeWidth={2} color="var(--c-muted)" />
        <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>Pago seguro · Tu tarjeta se guardará</span>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', color: '#EF4444',
          fontSize: 12, padding: '10px 14px', borderRadius: 10,
          marginBottom: 14, textAlign: 'center', fontWeight: 600,
        }}>{error}</div>
      )}

      <button onClick={handlePagar} disabled={loading || !stripe} style={{
        width: '100%', padding: '16px 0', borderRadius: 12, border: 'none',
        background: loading ? '#484847' : 'var(--c-btn-gradient)', color: '#fff',
        fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
        fontFamily: 'inherit', letterSpacing: '0.01em',
      }}>
        {loading ? 'Procesando pago...' : `Pagar ${total.toFixed(2)} €`}
      </button>
    </div>
  )
}

const brandIcon = { visa: '💳', mastercard: '💳', amex: '💳' }

export default function Carrito({ onPedidoCreado }) {
  const { user, perfil, updatePerfil } = useAuth()
  const { carrito, removeItem, clearCart, propina, setPropina, metodoPago, setMetodoPago, modoEntrega, setModoEntrega, totalItems, subtotal, envio, total, calcularEnvio, envioLoading, envioError, distanciaKm } = useCart()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pasoTarjeta, setPasoTarjeta] = useState(false)
  const [clientSecret, setClientSecret] = useState(null)
  const [codigoPedido, setCodigoPedido] = useState(null)
  const [tarjetasGuardadas, setTarjetasGuardadas] = useState([])
  const [tarjetaSel, setTarjetaSel] = useState(null)
  const [loadingCards, setLoadingCards] = useState(false)
  const [pedidoPendiente, setPedidoPendiente] = useState(null)
  const isPaying = useRef(false)
  const [restCerrado, setRestCerrado] = useState(false)
  const [restCerradoMsg, setRestCerradoMsg] = useState('')
  const [promoActiva, setPromoActiva] = useState(null)
  const [descuento, setDescuento] = useState(0)
  const [notas, setNotas] = useState('')
  const tieneDireccion = () => !!(perfil?.latitud && perfil?.longitud && perfil?.direccion)
  const [sinDireccion, setSinDireccion] = useState(() => !tieneDireccion())
  const [fueraDeRadio, setFueraDeRadio] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [mostrarAddDir, setMostrarAddDir] = useState(false)
  const [nuevaDir, setNuevaDir] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [dirMsg, setDirMsg] = useState(null)

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
                ? `${data.nombre} esta cerrado. ${estado.proximaApertura}.`
                : `${data.nombre} esta cerrado ahora mismo.`
          )
        })
      supabase.from('promociones').select('*').eq('establecimiento_id', estId).eq('activa', true)
        .or('fecha_fin.is.null,fecha_fin.gt.' + new Date().toISOString())
        .then(({ data: promos }) => {
          if (cancelled) return
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
      if (hayDir) calcularEnvio(lat, lng, 'pido').catch(err => { if (err?.fuera_de_radio) setFueraDeRadio(true) })
    }
  }, [open, modoEntrega, carrito.length, perfil?.latitud, perfil?.longitud, perfil?.direccion])

  useEffect(() => {
    if (open && user?.id && metodoPago === 'tarjeta') {
      setLoadingCards(true)
      listarTarjetas(user.id).then(cards => {
        setTarjetasGuardadas(cards)
        if (cards.length > 0) setTarjetaSel(cards[0].id)
        setLoadingCards(false)
      }).catch(() => setLoadingCards(false))
    }
  }, [open, metodoPago])

  if (totalItems === 0) return null

  async function generarCodigo() {
    try { const { data } = await supabase.functions.invoke('generar_codigo_pedido', { body: {} }); if (data?.codigo) return data.codigo } catch {}
    const n = Date.now() % 100000
    return `PD-${n.toString().padStart(5, '0')}`
  }

  async function insertarPedidoEnBD(estado) {
    if (carrito.length === 0) { setErrorMsg('El carrito está vacío'); return null }
    if (modoEntrega === 'delivery' && !(perfil?.latitud && perfil?.longitud && perfil?.direccion)) {
      setSinDireccion(true); setMostrarAddDir(true)
      setErrorMsg('Añade una direccion de entrega antes de confirmar el pedido')
      return null
    }
    const codigo = codigoPedido || await generarCodigo()
    setCodigoPedido(codigo)
    const totalFinal = Math.max(0, total - descuento)
    let dirEntrega = null
    if (modoEntrega === 'delivery') {
      dirEntrega = perfil?.direccion || ''
      if (!dirEntrega && perfil?.latitud && perfil?.longitud) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${perfil.latitud}&lon=${perfil.longitud}&format=json&addressdetails=1`)
          const geo = await res.json()
          dirEntrega = geo.display_name || ''
        } catch {}
      }
    }
    const { data: pedido, error: pedidoError } = await supabase.from('pedidos').insert({
      codigo, usuario_id: user?.id || null, establecimiento_id: carrito[0].establecimiento_id,
      socio_id: null, canal: 'pido', estado, metodo_pago: metodoPago, modo_entrega: modoEntrega,
      stripe_payment_id: null, subtotal, coste_envio: envio, propina, total: totalFinal,
      descuento: descuento > 0 ? descuento : null,
      promo_titulo: descuento > 0 && promoActiva ? promoActiva.titulo : null, notas,
      lat_entrega: modoEntrega === 'delivery' ? (perfil?.latitud || null) : null,
      lng_entrega: modoEntrega === 'delivery' ? (perfil?.longitud || null) : null,
      direccion_entrega: dirEntrega,
    }).select().single()
    if (pedidoError) throw pedidoError
    const items = carrito.map(item => ({
      pedido_id: pedido.id, producto_id: item.producto_id, nombre_producto: item.nombre,
      tamano: item.tamano, extras: item.extras, precio_unitario: item.precio_unitario, cantidad: item.cantidad,
    }))
    await supabase.from('pedido_items').insert(items)
    return pedido
  }

  async function confirmarPago(pedido, stripePaymentId) {
    await supabase.from('pedidos').update({ estado: 'nuevo', stripe_payment_id: stripePaymentId }).eq('id', pedido.id)
    finalizarPedido(pedido)
  }

  function finalizarPedido(pedido) {
    clearCart(); setOpen(false); setPasoTarjeta(false); setClientSecret(null); setCodigoPedido(null)
    setPedidoPendiente(null); setDescuento(0); setPromoActiva(null); setNotas('')
    setSinDireccion(false); setRestCerrado(false); setErrorMsg(null)
    sendPush({
      targetType: 'restaurante', targetId: pedido.establecimiento_id,
      title: 'Nuevo pedido', body: `Pedido ${pedido.codigo} - ${(Math.max(0, total - descuento)).toFixed(2)} €`,
      data: { pedido_id: pedido.id },
    })
    onPedidoCreado(pedido)
  }

  async function iniciarPago() {
    if (isPaying.current) return
    if (modoEntrega === 'delivery' && !(perfil?.latitud && perfil?.longitud && perfil?.direccion)) {
      setSinDireccion(true); setMostrarAddDir(true); return
    }
    isPaying.current = true; setLoading(true); setErrorMsg(null)
    try {
      const totalConDescuento = Math.max(0, total - descuento)
      if (metodoPago === 'tarjeta') {
        const pedido = await insertarPedidoEnBD('pendiente_pago')
        if (!pedido) { setLoading(false); return }
        if (tarjetaSel && tarjetasGuardadas.length > 0) {
          try {
            const result = await pagarConTarjetaGuardada({
              paymentMethodId: tarjetaSel, amount: totalConDescuento,
              pedidoCodigo: pedido.codigo, customerEmail: user?.email, userId: user?.id,
            })
            if (result.status === 'succeeded') { await confirmarPago(pedido, result.paymentIntentId); return }
          } catch (e) {
            await supabase.from('pedidos').update({ estado: 'fallido' }).eq('id', pedido.id)
            setCodigoPedido(null)
            throw e
          }
        }
        try {
          const result = await crearPagoStripe({
            amount: totalConDescuento, pedidoCodigo: pedido.codigo,
            customerEmail: user?.email, userId: user?.id,
          })
          setPedidoPendiente(pedido); setClientSecret(result.clientSecret); setPasoTarjeta(true)
        } catch (e) {
          await supabase.from('pedidos').update({ estado: 'fallido' }).eq('id', pedido.id)
          setCodigoPedido(null)
          throw e
        }
      } else {
        const pedido = await insertarPedidoEnBD('nuevo')
        if (!pedido) { setLoading(false); return }
        finalizarPedido(pedido)
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al procesar el pago')
      setCodigoPedido(null)
      setClientSecret(null)
      setPedidoPendiente(null)
    }
    finally { isPaying.current = false; setLoading(false) }
  }

  const isDisabled = loading || envioLoading || restCerrado || ((sinDireccion || fueraDeRadio) && modoEntrega === 'delivery')

  return (
    <>
      {/* ── Floating cart icon (Stitch style) ── */}
      <button onClick={() => setOpen(true)} style={{
        position: 'fixed',
        bottom: 'calc(20px + 64px + 14px + env(safe-area-inset-bottom, 0px))',
        right: 16,
        width: 52, height: 52, borderRadius: 16,
        background: 'var(--c-btn-gradient)',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(255,107,44,0.25)',
        zIndex: 50,
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        {/* Badge */}
        <span style={{
          position: 'absolute', top: -4, right: -4,
          background: '#fff', color: '#FF6B2C',
          fontSize: 10, fontWeight: 800,
          width: 20, height: 20, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {totalItems}
        </span>
      </button>

      {/* ── Modal carrito ── */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => {
            if (pedidoPendiente) supabase.from('pedidos').update({ estado: 'fallido' }).eq('id', pedidoPendiente.id)
            setOpen(false); setPasoTarjeta(false); setPedidoPendiente(null)
            setCodigoPedido(null); setClientSecret(null)
          }}
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
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', margin: '0 auto 16px' }} />

            {pasoTarjeta && clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <FormularioPago
                  clientSecret={clientSecret}
                  total={Math.max(0, total - descuento)}
                  onSuccess={(paymentId) => confirmarPago(pedidoPendiente, paymentId)}
                  onCancel={() => {
                    if (pedidoPendiente) supabase.from('pedidos').update({ estado: 'fallido' }).eq('id', pedidoPendiente.id)
                    setPasoTarjeta(false); setPedidoPendiente(null)
                    setCodigoPedido(null); setClientSecret(null)
                  }}
                />
              </Elements>
            ) : (
              <>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--c-text)', letterSpacing: '-0.02em' }}>Tu pedido</h3>
                  <button onClick={() => setOpen(false)} style={{
                    width: 30, height: 30, borderRadius: 12, background: 'rgba(255,255,255,0.08)',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <X size={14} strokeWidth={2.5} color="var(--c-muted)" />
                  </button>
                </div>

                <div style={{ fontSize: 12, color: 'var(--c-muted)', marginBottom: 16 }}>{carrito[0]?.establecimiento_nombre}</div>

                {/* Items */}
                <div style={{ marginBottom: 16 }}>
                  {carrito.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 14px', marginBottom: 6,
                      background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-text)' }}>{item.cantidad}x {item.nombre}</div>
                        {item.tamano && <div style={{ fontSize: 10, color: 'var(--c-muted)', marginTop: 2 }}>{item.tamano}</div>}
                        {item.extras?.length > 0 && <div style={{ fontSize: 10, color: 'var(--c-muted)' }}>{item.extras.join(', ')}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--c-primary-light)' }}>{(item.precio_unitario * item.cantidad).toFixed(2)} €</span>
                        <button onClick={() => removeItem(idx)} style={{
                          width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.08)', cursor: 'pointer', fontSize: 10,
                          color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>×</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tipo de entrega */}
                <div style={{ marginBottom: 16 }}>
                  <div style={S.label}>Tipo de entrega</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['delivery', 'recogida'].map(m => (
                      <button key={m} onClick={() => setModoEntrega(m)} style={S.selBtn(modoEntrega === m)}>
                        <span style={{ fontSize: 16 }}>{m === 'delivery' ? '🛵' : '🏪'}</span>
                        {m === 'delivery' ? 'Delivery' : 'Recogida'}
                      </button>
                    ))}
                  </div>
                  {modoEntrega === 'recogida' && <div style={{ fontSize: 11, color: '#22C55E', fontWeight: 600, marginTop: 6 }}>Sin coste de envío</div>}
                </div>

                {/* Propina */}
                <div style={{ marginBottom: 16 }}>
                  <div style={S.label}>Propina</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[0, 1, 2, 3].map(p => (
                      <button key={p} onClick={() => setPropina(p)} style={{
                        ...S.selBtn(propina === p),
                        padding: '10px 0',
                      }}>
                        {p === 0 ? 'No' : `${p} €`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Método pago */}
                <div style={{ marginBottom: 16 }}>
                  <div style={S.label}>Método de pago</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{ id: 'tarjeta', l: '💳 Tarjeta' }, { id: 'efectivo', l: '💵 Efectivo' }].map(m => (
                      <button key={m.id} onClick={() => setMetodoPago(m.id)} style={S.selBtn(metodoPago === m.id)}>
                        {m.l}
                      </button>
                    ))}
                  </div>

                  {/* Tarjetas guardadas */}
                  {metodoPago === 'tarjeta' && tarjetasGuardadas.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 11, color: 'var(--c-muted)', marginBottom: 6 }}>Tarjetas guardadas</div>
                      {tarjetasGuardadas.map(c => (
                        <button key={c.id} onClick={() => setTarjetaSel(c.id)} style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 14px', borderRadius: 14, marginBottom: 6,
                          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                          border: tarjetaSel === c.id ? '1.5px solid var(--c-primary)' : '1px solid rgba(255,255,255,0.1)',
                          background: tarjetaSel === c.id ? 'rgba(255,107,44,0.08)' : 'rgba(255,255,255,0.08)',
                        }}>
                          <span style={{ fontSize: 20 }}>💳</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--c-text)', textTransform: 'capitalize' }}>{c.brand} </span>
                            <span style={{ fontSize: 13, color: 'var(--c-muted)' }}>•••• {c.last4}</span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>{c.exp_month}/{c.exp_year}</span>
                          {tarjetaSel === c.id && <Check size={16} color="var(--c-primary)" />}
                        </button>
                      ))}
                      <button onClick={() => setTarjetaSel(null)} style={{
                        width: '100%', padding: '8px', borderRadius: 12,
                        border: '1px dashed rgba(255,255,255,0.1)',
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
                    background: descuento > 0 ? 'rgba(34,197,94,0.08)' : 'rgba(255,107,44,0.06)',
                    border: descuento > 0 ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,107,44,0.15)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{ fontSize: 20 }}>{descuento > 0 ? '🎉' : '🏷️'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: descuento > 0 ? '#4ADE80' : 'var(--c-primary-light)' }}>
                        {promoActiva.titulo}
                      </div>
                      {descuento > 0 ? (
                        <div style={{ fontSize: 11, color: '#4ADE80' }}>-{descuento.toFixed(2)} € aplicado</div>
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--c-muted)' }}>
                          Compra min. {promoActiva.minimo_compra}€ — te faltan {((promoActiva.minimo_compra || 0) - subtotal).toFixed(2)}€
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Desglose */}
                <div style={{ fontSize: 13, color: 'var(--c-muted)', padding: '14px 0', marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Subtotal</span><span style={{ color: 'var(--c-text)', fontWeight: 600 }}>{subtotal.toFixed(2)} €</span></div>
                  {descuento > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#4ADE80' }}>
                      <span>Descuento</span><span style={{ fontWeight: 600 }}>-{descuento.toFixed(2)} €</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span>Envío {distanciaKm && modoEntrega === 'delivery' ? <span style={{ fontSize: 10 }}>({distanciaKm} km)</span> : null}</span>
                    <span style={{ color: modoEntrega === 'recogida' ? '#22C55E' : 'var(--c-text)', fontWeight: 600 }}>
                      {modoEntrega === 'recogida' ? 'Gratis' : envioLoading ? 'Calculando...' : `${envio.toFixed(2)} €`}
                    </span>
                  </div>
                  {propina > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#FBBF24' }}><span>Propina</span><span style={{ fontWeight: 600 }}>{propina} €</span></div>}
                </div>

                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontWeight: 700, fontSize: 18, paddingTop: 14, marginTop: 4, marginBottom: 4,
                  color: 'var(--c-text)',
                  letterSpacing: '-0.01em',
                }}>
                  <span>Total</span><span>{(total - descuento).toFixed(2)} €</span>
                </div>

                {/* Notas */}
                <div style={{ marginTop: 16, marginBottom: 12 }}>
                  <div style={S.label}>Notas del pedido</div>
                  <input
                    value={notas} onChange={e => setNotas(e.target.value)}
                    placeholder="Ej: sin cebolla, piso 3.º izquierda..."
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 14,
                      border: 'none', background: '#262626',
                      fontSize: 13, fontFamily: 'inherit', color: 'var(--c-text)',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Avisos envío */}
                {envioError && modoEntrega === 'delivery' && (
                  <div style={{ marginBottom: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)', fontSize: 12, color: '#FBBF24', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>⚠️</span> Envío estimado (2.50€). El coste final puede variar.
                  </div>
                )}

                {/* Error general */}
                {errorMsg && (
                  <div style={{ marginBottom: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>❌</span>
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#EF4444' }}>{errorMsg}</div>
                    <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 14, padding: 0 }}>×</button>
                  </div>
                )}

                {/* Fuera de radio */}
                {fueraDeRadio && modoEntrega === 'delivery' && !sinDireccion && (
                  <div style={{ marginBottom: 10, padding: '14px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 22 }}>🚫</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#EF4444', marginBottom: 2 }}>Fuera de la zona de entrega</div>
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
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#EF4444', marginBottom: 2 }}>Añade tu dirección de entrega</div>
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
                            if (modoEntrega === 'delivery') calcularEnvio(pos.lat, pos.lng, 'pido').catch(() => {})
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
                                if (modoEntrega === 'delivery') calcularEnvio(place.lat, place.lng, 'pido').catch(() => {})
                              }
                            }}
                            placeholder="Buscar dirección..."
                            style={{
                              width: '100%', padding: '10px 10px 10px 32px', borderRadius: 14,
                              border: 'none', fontSize: 13, fontFamily: 'inherit',
                              background: '#262626', color: 'var(--c-text)', outline: 'none', boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        {dirMsg && <div style={{ fontSize: 11, color: '#EF4444', textAlign: 'center', marginBottom: 4 }}>{dirMsg}</div>}

                        <button onClick={() => { setMostrarAddDir(false); setDirMsg(null) }} style={{
                          width: '100%', padding: '8px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
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
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#EF4444', marginBottom: 2 }}>Restaurante cerrado</div>
                      <div style={{ fontSize: 11, color: 'var(--c-muted)' }}>{restCerradoMsg}</div>
                    </div>
                  </div>
                )}

                {/* CTA */}
                <button onClick={iniciarPago} disabled={isDisabled} style={{
                  width: '100%', marginTop: 14, padding: '16px 0', borderRadius: 12, border: 'none',
                  background: isDisabled ? '#484847' : 'var(--c-btn-gradient)',
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: isDisabled ? 'default' : 'pointer',
                  fontFamily: 'inherit', letterSpacing: '0.01em',
                  opacity: isDisabled ? 0.55 : 1,
                }}>
                  {restCerrado ? 'No disponible — restaurante cerrado'
                    : (fueraDeRadio && modoEntrega === 'delivery') ? 'Fuera de zona — prueba recogida'
                    : (sinDireccion && modoEntrega === 'delivery') ? 'Añade tu dirección para pedir'
                    : loading ? 'Procesando...'
                    : metodoPago === 'tarjeta' && tarjetaSel
                      ? `Pagar con •••• ${tarjetasGuardadas.find(c => c.id === tarjetaSel)?.last4} — ${(total - descuento).toFixed(2)} €`
                      : metodoPago === 'tarjeta'
                        ? `Continuar al pago — ${(total - descuento).toFixed(2)} €`
                        : `Pedir ahora — ${(total - descuento).toFixed(2)} €`
                  }
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
