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
  const [envio, setEnvio] = useState(0)
  const [distanciaKm, setDistanciaKm] = useState(null)
  const [envioLoading, setEnvioLoading] = useState(false)
  const [envioError, setEnvioError] = useState(false)
  const carritoRef = useRef(carrito)
  carritoRef.current = carrito

  // Persist cart to localStorage
  useEffect(() => {
    try { localStorage.setItem('pido_cart', JSON.stringify(carrito)) } catch (e) { console.warn('Error guardando carrito:', e) }
  }, [carrito])

  function addItem(item) {
    if (carrito.length > 0 && carrito[0].establecimiento_id !== item.establecimiento_id) {
      if (!window.confirm('Tienes productos de otro restaurante. ¿Quieres vaciar el carrito y añadir este?')) return
      setCarrito([item])
      setEnvio(0)
      setDistanciaKm(null)
      return
    }
    setCarrito(prev => [...prev, item])
  }

  function removeItem(index) {
    setCarrito(prev => prev.filter((_, i) => i !== index))
  }

  function clearCart() {
    setCarrito([])
    setPropina(0)
    setModoEntrega('delivery')
    setEnvio(0)
    setDistanciaKm(null)
  }

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
    try {
      const { data, error } = await supabase.functions.invoke('calcular_envio', {
        body: {
          canal: socioId ? 'pidogo' : 'pido',
          establecimiento_id: cart[0].establecimiento_id,
          socio_id: socioId || null,
          lat_cliente: latCliente,
          lng_cliente: lngCliente,
        },
      })
      if (error) {
        const msg = error?.context ? await error.context.json().catch(() => null) : null
        const fuera = msg?.fuera_de_radio
        throw { message: msg?.error || error.message, fuera_de_radio: fuera }
      }
      if (data?.fuera_de_radio) {
        throw { message: data.error, fuera_de_radio: true }
      }
      if (data?.success) {
        setEnvio(data.envio)
        setDistanciaKm(data.distancia_km)
      }
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
    carrito, addItem, removeItem, clearCart,
    propina, setPropina, metodoPago, setMetodoPago,
    modoEntrega, setModoEntrega,
    totalItems, subtotal, envio: envioFinal, total,
    calcularEnvio, envioLoading, envioError, distanciaKm,
  }), [carrito, propina, metodoPago, modoEntrega, totalItems, subtotal, envioFinal, total, envioLoading, envioError, distanciaKm, calcularEnvio])

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
