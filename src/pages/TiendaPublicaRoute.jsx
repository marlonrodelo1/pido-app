import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AuthProvider } from '../context/AuthContext'
import { CartProvider } from '../context/CartContext'
import TiendaPublica from './TiendaPublica'

const fallback = (
  <div style={{
    minHeight: '100vh',
    background: '#FAFAF7',
    color: '#6B6B68',
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

  useEffect(() => {
    if (!slugValido) return
    let cancelled = false
    supabase
      .from('establecimientos')
      .select('id, nombre, logo_url, banner_url, slug, activo, horario, rating, total_resenas, descripcion, direccion, latitud, longitud, radio_cobertura_km, tiene_delivery, tarifa_envio_fija, plan_pro, categoria_padre')
      .eq('slug', slug)
      .eq('activo', true)
      .eq('plan_pro', true)
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
