import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthProvider } from '../context/AuthContext'
import { CartProvider } from '../context/CartContext'
import TiendaPublica from './TiendaPublica'

const fallback = (
  <div style={{
    minHeight: '100vh',
    background: '#F7F3EC',
    color: '#6B6356',
    fontFamily: "'DM Sans', sans-serif",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    Cargando...
  </div>
)

export default function TiendaPublicaRoute() {
  const { slug } = useParams()
  const slugValido = !!slug && /^[a-z0-9-]+$/i.test(slug)
  const [estado, setEstado] = useState(slugValido ? 'loading' : 'notfound')
  const [tienda, setTienda] = useState(null)

  // Pedido por la tienda directa del restaurante (no marketplace del socio):
  // limpiar el contexto socio para no etiquetar el pedido como marketplace.
  useEffect(() => {
    try { sessionStorage.removeItem('pidoo_socio_id'); sessionStorage.removeItem('pidoo_socio_slug') } catch (_) {}
  }, [])

  useEffect(() => {
    if (!slugValido) return
    let cancelled = false
    supabase
      .from('establecimientos')
      // `exige_registro_cliente` decide si en esta tienda se puede pedir sin
      // cuenta: si falta en el select, permiteInvitado() lo daría por permitido.
      .select('id, nombre, logo_url, banner_url, slug, activo, horario, rating, total_resenas, descripcion, direccion, latitud, longitud, radio_cobertura_km, tiene_delivery, tarifa_envio_fija, plan_pro, categoria_padre, exige_registro_cliente')
      .eq('slug', slug)
      // Sin filtro por 'activo': el enlace del flyer/QR de un restaurante CERRADO tiene que
      // enseñar su tienda con el cartel de cerrado, no mandar al cliente a la home genérica
      // (que es lo que hacía el <Navigate to="/"> de abajo). 'activo' viaja en el select y
      // TiendaPublica ya lo interpreta con estaAbierto(): pinta "Cerrado" y no deja pedir.
      .eq('estado', 'activo')
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (data) {
          setTienda(data)
          setEstado('found')
        } else {
          setEstado('notfound')
        }
      })
    return () => { cancelled = true }
  }, [slug, slugValido])

  if (estado === 'loading') return fallback
  if (estado === 'notfound' || !tienda) return <Navigate to="/" replace />

  return (
    <AuthProvider>
      <CartProvider>
        <TiendaPublica establecimiento={tienda} />
      </CartProvider>
    </AuthProvider>
  )
}
