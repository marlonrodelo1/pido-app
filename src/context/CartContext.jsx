import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'

const CartContext = createContext({})

export function CartProvider({ children }) {
  const [carrito, setCarrito] = useState(() => {
    try { const saved = localStorage.getItem('pido_cart'); return saved ? JSON.parse(saved) : [] } catch { return [] }
  })
  const [propina, setPropina] = useState(0)
  const [metodoPago, setMetodoPago] = useState('tarjeta')
  const [modoEntrega, setModoEntrega] = useState('delivery') // 'delivery' o 'recogida'
  // entregaManual = el usuario eligió el modo explícitamente. Si es false, el modo
  // lo gestiona el sistema (p. ej. forzar recogida cuando el socio está offline) y
  // se puede revertir a delivery automáticamente cuando el reparto vuelve a estar
  // disponible. Evita que el carrito quede "atrapado" en recogida.
  const [entregaManual, setEntregaManual] = useState(false)
  const [envio, setEnvio] = useState(0)
  const [distanciaKm, setDistanciaKm] = useState(null)
  const [envioLoading, setEnvioLoading] = useState(false)
  const [envioError, setEnvioError] = useState(false)
  const [origenPedido, setOrigenPedido] = useState(() => {
    try { return localStorage.getItem('pido_origen_pedido') || 'pido' } catch { return 'pido' }
  })
  const carritoRef = useRef(carrito)
  carritoRef.current = carrito

  // Persist cart to localStorage
  useEffect(() => {
    try { localStorage.setItem('pido_cart', JSON.stringify(carrito)) } catch (e) { console.warn('Error guardando carrito:', e) }
  }, [carrito])

  // Persist origenPedido
  useEffect(() => {
    try { localStorage.setItem('pido_origen_pedido', origenPedido) } catch (e) { /* noop */ }
  }, [origenPedido])

  function extrasSignature(extras) {
    if (!extras || extras.length === 0) return ''
    try {
      // Si es estructura rica [{grupo_id, opciones:[{id}]}]
      if (typeof extras[0] === 'object' && extras[0] !== null && 'opciones' in extras[0]) {
        return extras
          .map(g => `${g.grupo_id}:${(g.opciones || []).map(o => o.id).sort().join(',')}`)
          .sort().join('|')
      }
      // Estructura antigua (array de strings)
      return [...extras].sort().join(',')
    } catch { return '' }
  }

  function addItem(item) {
    if (carrito.length > 0 && carrito[0].establecimiento_id !== item.establecimiento_id) {
      if (!window.confirm('Tienes productos de otro restaurante. ¿Quieres vaciar el carrito y añadir este?')) return
      setCarrito([item])
      setEnvio(0)
      setDistanciaKm(null)
      return
    }
    const sig = extrasSignature(item.extras)
    const idx = carrito.findIndex(i =>
      i.producto_id === item.producto_id &&
      (i.tamano || null) === (item.tamano || null) &&
      extrasSignature(i.extras) === sig &&
      Math.abs((i.precio_unitario || 0) - (item.precio_unitario || 0)) < 0.001
    )
    if (idx >= 0) {
      setCarrito(prev => prev.map((it, i) => i === idx ? { ...it, cantidad: it.cantidad + (item.cantidad || 1) } : it))
    } else {
      setCarrito(prev => [...prev, item])
    }
  }

  function removeItem(index) {
    setCarrito(prev => prev.filter((_, i) => i !== index))
  }

  function updateCantidad(index, nuevaCantidad) {
    if (nuevaCantidad <= 0) {
      setCarrito(prev => prev.filter((_, i) => i !== index))
      return
    }
    setCarrito(prev => prev.map((item, i) => i === index ? { ...item, cantidad: nuevaCantidad } : item))
  }

  function clearCart() {
    setCarrito([])
    setPropina(0)
    setModoEntrega('delivery')
    setEntregaManual(false)
    setEnvio(0)
    setDistanciaKm(null)
  }

  // Setter para cuando el USUARIO elige el modo de entrega (marca elección manual,
  // así el sistema no la sobrescribe revirtiendo a delivery).
  const elegirEntrega = useCallback((modo) => {
    setEntregaManual(true)
    setModoEntrega(modo)
  }, [])

  const calcularEnvio = useCallback(async (latCliente, lngCliente, socioId = null) => {
    const cart = carritoRef.current
    if (cart.length === 0 || modoEntrega === 'recogida') {
      setEnvio(0)
      setEnvioError(false)
      return
    }
    if (!latCliente || !lngCliente) return

    setEnvioLoading(true)
    setEnvioError(false)

    // Un intento contra la edge. Devuelve un resultado "definitivo" (recogida /
    // fuera_radio / ok) que NO se reintenta, o lanza un error TRANSITORIO (red)
    // que sí se reintenta. Así evitamos caer al envío inventado de 2,50 € por un
    // simple fallo de red puntual.
    const intentar = async () => {
      const { data, error } = await supabase.functions.invoke('calcular_envio', {
        body: {
          canal: 'pido',
          establecimiento_id: cart[0].establecimiento_id,
          socio_id: socioId || null,
          lat_cliente: latCliente,
          lng_cliente: lngCliente,
        },
      })
      if (error) {
        const msg = error?.context ? await error.context.json().catch(() => null) : null
        if (msg?.delivery_disabled) return { tipo: 'recogida' }
        if (msg?.fuera_de_radio) return { tipo: 'fuera_radio', error: msg?.error || error.message }
        // error transitorio → lanzar para reintentar
        throw new Error(msg?.error || error.message || 'envio_error')
      }
      if (data?.delivery_disabled) return { tipo: 'recogida' }
      if (data?.fuera_de_radio) return { tipo: 'fuera_radio', error: data.error }
      if (typeof data?.envio === 'number') return { tipo: 'ok', envio: data.envio, distancia: data.distancia_km ?? null }
      return { tipo: 'desconocido' }
    }

    try {
      let res = null, lastErr = null
      for (let i = 0; i < 3; i++) {
        try { res = await intentar(); lastErr = null; break }
        catch (e) { lastErr = e; if (i < 2) await new Promise(r => setTimeout(r, 600 * (i + 1))) }
      }
      if (lastErr) throw lastErr // reintentos agotados → fallback

      if (res.tipo === 'recogida') { setEnvio(0); setEnvioError(false); return }
      if (res.tipo === 'fuera_radio') { throw { message: res.error, fuera_de_radio: true } }
      if (res.tipo === 'ok') { setEnvio(res.envio); setDistanciaKm(res.distancia) }
      else console.warn('[calcularEnvio] respuesta inesperada')
    } catch (err) {
      if (err?.fuera_de_radio) throw err
      setEnvio(2.50)
      setEnvioError(true)
    } finally {
      setEnvioLoading(false)
    }
  }, [modoEntrega])

  // Resetear envío cuando cambia a recogida
  useEffect(() => {
    if (modoEntrega === 'recogida') {
      setEnvio(0)
    }
  }, [modoEntrega])

  const envioFinal = modoEntrega === 'recogida' ? 0 : envio
  const totalItems = carrito.reduce((s, i) => s + i.cantidad, 0)
  const subtotal = carrito.reduce((s, i) => s + i.precio_unitario * i.cantidad, 0)
  const total = subtotal + envioFinal + propina

  const contextValue = useMemo(() => ({
    carrito, addItem, removeItem, updateCantidad, clearCart,
    propina, setPropina, metodoPago, setMetodoPago,
    modoEntrega, setModoEntrega, entregaManual, elegirEntrega,
    totalItems, subtotal, envio: envioFinal, total,
    calcularEnvio, envioLoading, envioError, distanciaKm,
    origenPedido, setOrigenPedido, setEnvio,
  }), [carrito, propina, metodoPago, modoEntrega, entregaManual, elegirEntrega, totalItems, subtotal, envioFinal, total, envioLoading, envioError, distanciaKm, calcularEnvio, origenPedido])

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
