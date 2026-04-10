import { useState, useEffect } from 'react'
import { Home, ClipboardList, ShoppingCart, User, Search, X, ArrowLeft, Mail, Lock, Phone, Eye, EyeOff } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { crearPagoStripe } from '../lib/stripe'
import Stars from '../components/Stars'
import AddressInput from '../components/AddressInput'
import Tracking from './Tracking'
import { estaAbierto, horarioHoyTexto } from '../lib/horario'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

// ===================== COMPONENTES AUXILIARES =====================

function TiendaBottomNav({ active, onChange, carritoCount }) {
  const items = [
    { id: 'inicio', l: 'Inicio', Icon: Home },
    { id: 'pedidos', l: 'Pedidos', Icon: ClipboardList },
    { id: 'carrito', l: 'Carrito', Icon: ShoppingCart, badge: carritoCount },
    { id: 'perfil', l: 'Perfil', Icon: User },
  ]
  return (
    <div style={{
      position: 'fixed', bottom: 10, left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)', maxWidth: 388,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderRadius: 22, display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '8px 6px', zIndex: 40, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      {items.map(n => {
        const isActive = active === n.id
        return (
          <button key={n.id} onClick={() => onChange(n.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit', position: 'relative',
            color: isActive ? '#FF6B2C' : 'rgba(255,255,255,0.5)',
            fontSize: 9, fontWeight: 600, padding: '8px 12px', borderRadius: 14, transition: 'all 0.2s ease',
          }}>
            <n.Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            {n.l}
            {n.badge > 0 && <span style={{ position: 'absolute', top: 2, right: 4, background: '#FF6B2C', color: '#fff', fontSize: 8, fontWeight: 800, width: 16, height: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n.badge}</span>}
          </button>
        )
      })}
    </div>
  )
}

function EstadoBadge({ estado }) {
  const c = { entregado: '#4ADE80', cancelado: '#EF4444', fallido: '#FBBF24', nuevo: '#60A5FA', aceptado: '#60A5FA', preparando: '#FBBF24', listo: '#A855F7', en_camino: '#FF6B2C', recogido: '#FF6B2C' }
  return <span style={{ background: `${c[estado] || '#666'}20`, color: c[estado] || '#666', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, textTransform: 'capitalize' }}>{estado?.replace('_', ' ')}</span>
}

function PagoBadge({ pago }) {
  const t = pago === 'tarjeta'
  return <span style={{ fontSize: 10, fontWeight: 700, color: t ? '#60A5FA' : '#4ADE80' }}>{t ? '💳' : '💵'}</span>
}

// Haversine
function calcDistanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ===================== FORMULARIO PAGO STRIPE =====================

const cardStyle = { style: { base: { fontSize: '16px', fontFamily: "'DM Sans', sans-serif", color: '#F5F5F5', '::placeholder': { color: 'rgba(255,255,255,0.3)' } }, invalid: { color: '#EF4444' } } }

function FormularioPago({ clientSecret, total, onSuccess, onCancel }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handlePagar = async () => {
    if (!stripe || !elements) return
    setLoading(true); setError(null)
    const { error: err, paymentIntent } = await stripe.confirmCardPayment(clientSecret, { payment_method: { card: elements.getElement(CardElement) } })
    if (err) { setError(err.message); setLoading(false) }
    else if (paymentIntent.status === 'succeeded') onSuccess(paymentIntent.id)
    else { setError('El pago no se pudo completar'); setLoading(false) }
  }

  return (
    <div>
      <button onClick={onCancel} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#FF6B2C', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16, padding: 0 }}><ArrowLeft size={16} /> Volver</button>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', padding: '16px 14px', marginBottom: 16 }}><CardElement options={cardStyle} /></div>
      {error && <div style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontSize: 12, padding: '10px 14px', borderRadius: 10, marginBottom: 12, textAlign: 'center', fontWeight: 600 }}>{error}</div>}
      <button onClick={handlePagar} disabled={loading || !stripe} style={{ width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', background: loading ? 'rgba(255,255,255,0.2)' : '#FF6B2C', color: '#fff', fontSize: 16, fontWeight: 800, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit' }}>
        {loading ? 'Procesando...' : `Pagar ${total.toFixed(2)} €`}
      </button>
    </div>
  )
}

// ===================== PAGINA: INICIO =====================

function PaginaInicio({ socio, establecimientos, categorias, catActiva, setCatActiva, busqueda, setBusqueda, onOpenRest, promociones = [] }) {
  const destacados = establecimientos.filter(e => e.destacado)
  const filtered = busqueda
    ? establecimientos.filter(e => e.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : catActiva ? establecimientos.filter(e => (e._catIds || []).includes(catActiva)) : establecimientos

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Buscador */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={16} strokeWidth={2} style={{ position: 'absolute', left: 14, top: 13, color: 'rgba(255,255,255,0.3)' }} />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar restaurante o plato..." style={{ width: '100%', padding: '12px 14px 12px 40px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', fontSize: 13, fontFamily: 'inherit', background: 'rgba(255,255,255,0.06)', color: '#F5F5F5', outline: 'none', boxSizing: 'border-box' }} />
        {busqueda && <button onClick={() => setBusqueda('')} style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}><X size={16} /></button>}
      </div>

      {/* Categorías con emojis (nivel 2) */}
      {categorias.length > 0 && (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
          <button onClick={() => setCatActiva(null)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', minWidth: 60, background: !catActiva ? 'rgba(255,107,44,0.15)' : 'rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: 22 }}>🍽️</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: !catActiva ? '#FF6B2C' : 'rgba(255,255,255,0.5)' }}>Todos</span>
          </button>
          {categorias.map(cat => (
            <button key={cat.id} onClick={() => setCatActiva(catActiva === cat.id ? null : cat.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'inherit', minWidth: 60, opacity: catActiva && catActiva !== cat.id ? 0.4 : 1, background: catActiva === cat.id ? 'rgba(255,107,44,0.15)' : 'rgba(255,255,255,0.08)', transition: 'opacity 0.2s' }}>
              <span style={{ fontSize: 22 }}>{cat.emoji || '🍽️'}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: catActiva === cat.id ? '#FF6B2C' : 'rgba(255,255,255,0.5)' }}>{cat.nombre}</span>
            </button>
          ))}
        </div>
      )}

      {/* Destacados */}
      {destacados.length > 0 && !busqueda && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Destacados</h3>
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
            {destacados.map(r => <div key={r.id} style={{ minWidth: 240, flexShrink: 0 }}><RestCard r={r} onOpen={onOpenRest} socio={socio} /></div>)}
          </div>
        </div>
      )}

      {/* Promociones slider */}
      {promociones.length > 0 && !busqueda && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Ofertas</h3>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}>
            {promociones.map(promo => {
              const est = promo.establecimientos
              if (!est) return null
              const estadoP = estaAbierto(est)
              return (
                <div key={promo.id} onClick={() => onOpenRest(est)} style={{
                  minWidth: 250, flexShrink: 0, background: 'rgba(255,255,255,0.08)', borderRadius: 16,
                  overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
                  opacity: estadoP.abierto ? 1 : 0.65,
                }}>
                  <div style={{
                    height: 90, background: est.banner_url ? `url(${est.banner_url}) center/cover` : 'linear-gradient(135deg, rgba(255,107,44,0.15), rgba(255,107,44,0.25))',
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(0deg, rgba(220,38,38,0.95) 0%, rgba(220,38,38,0.7) 70%, transparent 100%)',
                      padding: '18px 12px 8px',
                    }}>
                      <div style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>{promo.titulo}</div>
                      {promo.minimo_compra > 0 && (
                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>Min. {promo.minimo_compra}€</div>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, overflow: 'hidden', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                        {est.logo_url ? <img src={est.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🍽️'}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 12 }}>{est.nombre}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Todos */}
      <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Todos los restaurantes</h3>
      {filtered.map(r => <RestCard key={r.id} r={r} onOpen={onOpenRest} socio={socio} />)}
      {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No se encontraron resultados</div>}
    </div>
  )
}

function RestCard({ r, onOpen, socio }) {
  const tieneDelivery = socio.en_servicio && socio.modo_entrega !== 'recogida'
  const estado = estaAbierto(r)
  const horarioTxt = horarioHoyTexto(r.horario)
  return (
    <div onClick={() => onOpen(r)} style={{
      background: 'rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden',
      marginBottom: 14, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      opacity: estado.abierto ? 1 : 0.65,
    }}>
      <div style={{
        height: 130,
        background: r.banner_url ? `url(${r.banner_url}) center/cover` : 'linear-gradient(135deg, rgba(255,107,44,0.15), rgba(255,107,44,0.25))',
        position: 'relative',
      }}>
        {/* Badge abierto/cerrado */}
        <span style={{
          position: 'absolute', top: 8, left: 8, fontSize: 9, fontWeight: 700,
          padding: '4px 10px', borderRadius: 8, backdropFilter: 'blur(6px)',
          background: estado.abierto ? 'rgba(22,163,74,0.85)' : 'rgba(239,68,68,0.85)',
          color: '#fff',
        }}>
          {estado.abierto ? 'Abierto' : 'Cerrado'}
        </span>
        {r.radio_cobertura_km && (
          <div style={{ position: 'absolute', bottom: 8, right: 10, display: 'flex', gap: 6 }}>
            <span style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 8, backdropFilter: 'blur(4px)' }}>
              {r.radio_cobertura_km} km
            </span>
          </div>
        )}
      </div>
      <div style={{ position: 'relative', padding: '0 16px' }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, border: '3px solid #fff',
          boxShadow: '0 2px 10px rgba(0,0,0,0.12)', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.12)', fontSize: 24,
          position: 'absolute', top: -26, left: 16,
        }}>
          {r.logo_url ? <img src={r.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🍽️'}
        </div>
      </div>
      <div style={{ padding: '32px 16px 12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <span style={{ fontWeight: 800, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nombre}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <Stars rating={r.rating} size={12} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>{r.rating?.toFixed(1)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          <span>
            {!estado.abierto && estado.proximaApertura
              ? estado.proximaApertura
              : horarioTxt || `${r.total_resenas} resenas`
            }
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {tieneDelivery && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 50, background: 'rgba(255,107,44,0.15)', color: '#FF6B2C' }}>Delivery</span>}
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 50, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>Recogida</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===================== PAGINA: DETALLE RESTAURANTE =====================

function PaginaRestDetalle({ est, onBack, carrito, setCarrito, socio }) {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [catFiltro, setCatFiltro] = useState(null)
  const [modal, setModal] = useState(null)
  const [gruposExtras, setGruposExtras] = useState([])
  const [tamanos, setTamanos] = useState([])
  const [tamSel, setTamSel] = useState(null)
  const [exSel, setExSel] = useState([])
  const [cant, setCant] = useState(1)

  useEffect(() => { fetchCarta() }, [est.id])

  async function fetchCarta() {
    setLoading(true)
    const [catRes, prodRes] = await Promise.all([
      supabase.from('categorias').select('*').eq('establecimiento_id', est.id).eq('activa', true).order('orden'),
      supabase.from('productos').select('*').eq('establecimiento_id', est.id).eq('disponible', true).order('orden'),
    ])
    setCategorias(catRes.data || [])
    setProductos(prodRes.data || [])
    setLoading(false)
  }

  async function abrirProducto(p) {
    setModal(p); setCant(1); setExSel([]); setTamSel(null)
    const { data: tams } = await supabase.from('producto_tamanos').select('*').eq('producto_id', p.id).order('orden')
    setTamanos(tams || [])
    if (tams && tams.length > 0) setTamSel(0)
    const { data: pe } = await supabase.from('producto_extras').select('grupo_id').eq('producto_id', p.id)
    if (pe && pe.length > 0) {
      const { data: g } = await supabase.from('grupos_extras').select('*, extras_opciones(*)').in('id', pe.map(x => x.grupo_id))
      setGruposExtras(g || [])
    } else setGruposExtras([])
  }

  function precioTotal() {
    if (!modal) return 0
    const base = tamSel !== null && tamanos[tamSel] ? tamanos[tamSel].precio : modal.precio
    return (base + exSel.reduce((s, e) => s + e.precio, 0)) * cant
  }

  function toggleExtra(op, max) {
    setExSel(prev => prev.find(e => e.id === op.id) ? prev.filter(e => e.id !== op.id) : prev.length >= max ? prev : [...prev, op])
  }

  function confirmarItem() {
    setCarrito(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      producto_id: modal.id, nombre: modal.nombre,
      tamano: tamSel !== null && tamanos[tamSel] ? tamanos[tamSel].nombre : null,
      extras: exSel.map(e => e.nombre), cantidad: cant,
      precio: precioTotal() / cant, establecimiento_id: est.id, establecimiento_nombre: est.nombre,
    }])
    setModal(null)
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#FF6B2C', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16, padding: 0, fontFamily: 'inherit' }}>← Volver</button>

      <div style={{ height: 150, borderRadius: 16, marginBottom: 16, background: est.banner_url ? `url(${est.banner_url}) center/cover` : 'linear-gradient(135deg, rgba(255,107,44,0.15), rgba(255,107,44,0.25))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52 }}>
        {est.logo_url ? <img src={est.logo_url} alt="" style={{ width: 70, height: 70, borderRadius: 18, objectFit: 'cover' }} /> : '🍽️'}
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>{est.nombre}</h2>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>
        <Stars rating={est.rating} /> <span>({est.total_resenas})</span>
      </div>
      {est.direccion && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 16 }}>📍 {est.direccion}</div>}

      <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Carta</h3>

      {loading ? <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.4)' }}>Cargando carta...</div> : (
        <>
          {categorias.length > 1 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
              <button onClick={() => setCatFiltro(null)} style={{ padding: '7px 14px', borderRadius: 50, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', background: !catFiltro ? '#FF6B2C' : 'rgba(255,255,255,0.08)', color: !catFiltro ? '#fff' : 'rgba(255,255,255,0.5)' }}>Todos</button>
              {categorias.map(cat => (
                <button key={cat.id} onClick={() => setCatFiltro(catFiltro === cat.id ? null : cat.id)} style={{ padding: '7px 14px', borderRadius: 50, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', background: catFiltro === cat.id ? '#FF6B2C' : 'rgba(255,255,255,0.08)', color: catFiltro === cat.id ? '#fff' : 'rgba(255,255,255,0.5)' }}>{cat.nombre}</button>
              ))}
            </div>
          )}

          {categorias.filter(cat => !catFiltro || cat.id === catFiltro).map(cat => {
            const prods = productos.filter(p => p.categoria_id === cat.id)
            if (prods.length === 0) return null
            return (
              <div key={cat.id} style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{cat.nombre}</h4>
                {prods.map(p => <ProductCard key={p.id} p={p} carrito={carrito} onOpen={() => abrirProducto(p)} />)}
              </div>
            )
          })}
          {!catFiltro && productos.filter(p => !p.categoria_id).map(p => <ProductCard key={p.id} p={p} carrito={carrito} onOpen={() => abrirProducto(p)} />)}
        </>
      )}

      {/* Modal producto */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1A1A1A', borderRadius: '24px 24px 0 0', padding: '24px 20px 32px', width: '100%', maxWidth: 420, maxHeight: '85vh', overflowY: 'auto', animation: 'slideUp 0.3s ease', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div><h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>{modal.nombre}</h3>{modal.descripcion && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>{modal.descripcion}</p>}</div>
              {modal.imagen_url && <img src={modal.imagen_url} alt="" style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', marginLeft: 12 }} />}
            </div>
            {tamanos.length > 0 && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Tamaño</div>{tamanos.map((t, i) => (
              <button key={t.id} onClick={() => setTamSel(i)} style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 6, border: tamSel === i ? '2px solid #FF6B2C' : '1px solid rgba(255,255,255,0.1)', background: tamSel === i ? 'rgba(255,107,44,0.12)' : 'rgba(255,255,255,0.04)' }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: '#F5F5F5' }}>{t.nombre}</span><span style={{ fontWeight: 700, fontSize: 13, color: '#FF6B2C' }}>{t.precio.toFixed(2)} €</span>
              </button>
            ))}</div>}
            {gruposExtras.map(g => <div key={g.id} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 13, fontWeight: 700 }}>{g.nombre}</span><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{g.tipo === 'single' ? 'Elige 1' : `Máx. ${g.max_selecciones}`}</span></div>
              {(g.extras_opciones || []).map(op => { const sel = exSel.find(e => e.id === op.id); return (
                <button key={op.id} onClick={() => toggleExtra(op, g.tipo === 'single' ? 1 : g.max_selecciones)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 4, border: sel ? '2px solid #FF6B2C' : '1px solid rgba(255,255,255,0.08)', background: sel ? 'rgba(255,107,44,0.12)' : 'rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 18, height: 18, borderRadius: 5, border: sel ? 'none' : '2px solid rgba(255,255,255,0.2)', background: sel ? '#FF6B2C' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>{sel && '✓'}</div><span style={{ fontSize: 13 }}>{op.nombre}</span></div>
                  <span style={{ fontSize: 12, color: '#FF6B2C', fontWeight: 600 }}>+{op.precio.toFixed(2)} €</span>
                </button>
              )})}
            </div>)}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 20, marginTop: 8 }}>
              <button onClick={() => setCant(Math.max(1, cant - 1))} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', fontSize: 18, color: '#F5F5F5', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span style={{ fontSize: 18, fontWeight: 800, minWidth: 24, textAlign: 'center' }}>{cant}</span>
              <button onClick={() => setCant(cant + 1)} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', fontSize: 18, color: '#F5F5F5', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
            <button onClick={confirmarItem} style={{ width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', background: '#FF6B2C', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Añadir — {precioTotal().toFixed(2)} €</button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProductCard({ p, carrito, onOpen }) {
  const enCarrito = carrito.find(i => i.producto_id === p.id)
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'rgba(255,255,255,0.06)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{p.nombre}</div>
        {p.descripcion && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>{p.descripcion}</div>}
        <div style={{ fontWeight: 700, fontSize: 14, color: '#FF6B2C' }}>{p.precio.toFixed(2)} €</div>
      </div>
      {p.imagen_url && <img src={p.imagen_url} alt="" style={{ width: 50, height: 50, borderRadius: 10, objectFit: 'cover', marginRight: 10 }} />}
      <button onClick={onOpen} style={{ width: 38, height: 38, borderRadius: 10, border: 'none', background: enCarrito ? '#FF6B2C' : 'rgba(255,255,255,0.08)', color: enCarrito ? '#fff' : '#FF6B2C', fontSize: 20, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {enCarrito ? enCarrito.cantidad : '+'}
      </button>
    </div>
  )
}

// ===================== PAGINA: MIS PEDIDOS =====================

function PaginaPedidos({ user, socioId, pedidoTracking, onTrack, onCloseTrack }) {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) fetchPedidos() }, [user?.id])

  async function fetchPedidos() {
    const { data } = await supabase.from('pedidos').select('*, establecimientos(nombre)').eq('usuario_id', user.id).eq('socio_id', socioId).order('created_at', { ascending: false })
    setPedidos(data || [])
    setLoading(false)
  }

  // Realtime: actualizar pedidos en vivo cuando cambian de estado
  useEffect(() => {
    if (!user) return
    const channel = supabase.channel(`tienda-pedidos-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'pedidos',
        filter: `usuario_id=eq.${user.id}`,
      }, payload => {
        setPedidos(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p))
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'pedidos',
        filter: `usuario_id=eq.${user.id}`,
      }, () => { fetchPedidos() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  if (!user) return <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Inicia sesión para ver tus pedidos</div>

  // Mostrar tracking si hay pedido activo
  if (pedidoTracking) {
    return <Tracking pedido={pedidoTracking} onClose={onCloseTrack} />
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>Mis pedidos</h2>
      {loading && <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.4)' }}>Cargando...</div>}
      {!loading && pedidos.length === 0 && <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Aún no has hecho pedidos aquí</div>}
      {pedidos.map(p => (
        <div key={p.id} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{p.codigo}</span>
                <EstadoBadge estado={p.estado} />
                <PagoBadge pago={p.metodo_pago} />
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{p.establecimientos?.nombre}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                {new Date(p.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{p.total?.toFixed(2)} €</div>
          </div>
          {['nuevo', 'aceptado', 'preparando', 'listo', 'en_camino', 'recogido'].includes(p.estado) && (
            <button onClick={() => onTrack(p)} style={{
              width: '100%', marginTop: 10, padding: '9px 0', borderRadius: 8,
              border: 'none', background: '#FF6B2C', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', color: '#fff',
            }}>Seguir pedido</button>
          )}
        </div>
      ))}
    </div>
  )
}

// ===================== PAGINA: CARRITO + CHECKOUT =====================

function PaginaCarrito({ carrito, setCarrito, socio, user, onPedidoCreado, onLogin }) {
  const [metodoPago, setMetodoPago] = useState('tarjeta')
  const [tipoEntrega, setTipoEntrega] = useState(socio.en_servicio && socio.modo_entrega !== 'recogida' ? 'delivery' : 'recogida')
  const [envioCalculado, setEnvioCalculado] = useState(socio.tarifa_base || 3)
  const [distanciaKm, setDistanciaKm] = useState(null)
  const [envioLoading, setEnvioLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pasoTarjeta, setPasoTarjeta] = useState(false)
  const [clientSecret, setClientSecret] = useState(null)
  const [codigoPedido, setCodigoPedido] = useState(null)
  const [restCerrado, setRestCerrado] = useState(false)
  const [restCerradoMsg, setRestCerradoMsg] = useState('')
  const [promoActiva, setPromoActiva] = useState(null)
  const [descuento, setDescuento] = useState(0)
  const [notas, setNotas] = useState('')
  const [propina, setPropina] = useState(0)

  const tieneDelivery = socio.en_servicio && socio.modo_entrega !== 'recogida'
  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)

  // Verificar si el restaurante está abierto + cargar promos
  useEffect(() => {
    if (carrito.length > 0) {
      const estId = carrito[0].establecimiento_id
      supabase.from('establecimientos').select('activo, horario, nombre').eq('id', estId).single()
        .then(({ data }) => {
          if (data) {
            const estado = estaAbierto(data)
            setRestCerrado(!estado.abierto)
            setRestCerradoMsg(
              estado.razon === 'sin_horario'
                ? `${data.nombre} no tiene horario configurado.`
                : estado.proximaApertura
                  ? `${data.nombre} esta cerrado. ${estado.proximaApertura}.`
                  : `${data.nombre} esta cerrado ahora mismo.`
            )
          }
        })
      // Cargar promos
      supabase.from('promociones').select('*').eq('establecimiento_id', estId).eq('activa', true)
        .or('fecha_fin.is.null,fecha_fin.gt.' + new Date().toISOString())
        .then(({ data: promos }) => {
          if (promos && promos.length > 0) {
            const aplicables = promos.filter(p => total >= (p.minimo_compra || 0))
            if (aplicables.length > 0) {
              let mejor = null, mejorDesc = 0
              for (const p of aplicables) {
                let d = 0
                if (p.tipo === 'descuento_porcentaje') d = total * (p.valor / 100)
                else if (p.tipo === 'descuento_fijo') d = p.valor
                else if (p.tipo === '2x1') {
                  const item = carrito.find(i => i.producto_id === p.producto_id)
                  if (item && item.cantidad >= 2) d = item.precio * Math.floor(item.cantidad / 2)
                }
                else if (p.tipo === 'producto_gratis') {
                  const item = carrito.find(i => i.producto_id === p.producto_id)
                  if (item) d = item.precio
                }
                if (d > mejorDesc) { mejor = p; mejorDesc = d }
              }
              setPromoActiva(mejor)
              setDescuento(Math.round(mejorDesc * 100) / 100)
            } else {
              const menorMinimo = promos.sort((a, b) => (a.minimo_compra || 0) - (b.minimo_compra || 0))[0]
              setPromoActiva(menorMinimo)
              setDescuento(0)
            }
          } else { setPromoActiva(null); setDescuento(0) }
        })
    }
  }, [carrito.length, total])
  const envioFinal = tipoEntrega === 'recogida' ? 0 : envioCalculado
  const totalFinal = total + envioFinal - descuento + propina

  useEffect(() => {
    if (tipoEntrega === 'delivery' && carrito.length > 0 && !distanciaKm) calcularEnvio()
  }, [tipoEntrega])

  async function calcularEnvio() {
    setEnvioLoading(true)
    try {
      const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }), reject, { enableHighAccuracy: true, timeout: 10000 }))
      const estId = carrito[0].establecimiento_id
      const { data: est } = await supabase.from('establecimientos').select('latitud, longitud').eq('id', estId).single()
      if (!est) { setEnvioCalculado(socio.tarifa_base || 3); setEnvioLoading(false); return }
      const dist = calcDistanciaKm(est.latitud, est.longitud, pos.lat, pos.lng)
      setDistanciaKm(Math.round(dist * 10) / 10)
      const radioBase = socio.radio_tarifa_base_km || 3
      setEnvioCalculado(Math.round((dist <= radioBase ? (socio.tarifa_base || 3) : (socio.tarifa_base || 3) + ((dist - radioBase) * (socio.precio_km_adicional || 0.5))) * 100) / 100)
    } catch { setEnvioCalculado(socio.tarifa_base || 3) }
    finally { setEnvioLoading(false) }
  }

  if (carrito.length === 0) return (
    <div style={{ textAlign: 'center', padding: '80px 0', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Tu carrito está vacío</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Añade productos para hacer tu pedido</div>
    </div>
  )

  async function iniciarPago() {
    if (!user) { onLogin(); return }
    if (metodoPago === 'tarjeta') {
      setLoading(true)
      try {
        const codigo = `PG-${Date.now()}`; setCodigoPedido(codigo)
        const result = await crearPagoStripe({ amount: Math.max(0, totalFinal), pedidoCodigo: codigo, customerEmail: user?.email, userId: user?.id })
        setClientSecret(result.clientSecret); setPasoTarjeta(true)
      } catch (e) { alert('Error: ' + e.message) }
      finally { setLoading(false) }
    } else await crearPedido(null)
  }

  async function crearPedido(stripePaymentId) {
    if (!user) { onLogin(); return }
    setLoading(true)
    try {
      const codigo = codigoPedido || `PG-${Date.now()}`
      const { data: pedido, error } = await supabase.from('pedidos').insert({
        codigo, establecimiento_id: carrito[0].establecimiento_id, socio_id: socio.id,
        usuario_id: user.id, canal: 'pidogo', estado: 'nuevo', metodo_pago: metodoPago,
        modo_entrega: tipoEntrega === 'recogida' ? 'recogida' : 'delivery',
        stripe_payment_id: stripePaymentId, subtotal: total, coste_envio: envioFinal, propina,
        total: Math.max(0, totalFinal),
        notas: notas.trim() || null,
        descuento: descuento > 0 ? descuento : null,
        promo_titulo: descuento > 0 && promoActiva ? promoActiva.titulo : null,
      }).select().single()
      if (error) throw error
      await supabase.from('pedido_items').insert(carrito.map(item => ({
        pedido_id: pedido.id, producto_id: item.producto_id, nombre_producto: item.nombre,
        tamano: item.tamano, extras: item.extras, precio_unitario: item.precio, cantidad: item.cantidad,
      })))
      // Notificar al restaurante y al socio del nuevo pedido
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
      const { data: { session: pushSession } } = await supabase.auth.getSession()
      const pushToken = pushSession?.access_token || SUPABASE_ANON_KEY
      const pushFn = (targetType, targetId, title, body) =>
        fetch(`${SUPABASE_URL}/functions/v1/enviar_push`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${pushToken}`, 'apikey': SUPABASE_ANON_KEY },
          body: JSON.stringify({ target_type: targetType, target_id: targetId, title, body }),
        }).catch(() => {})
      pushFn('restaurante', carrito[0].establecimiento_id, 'Nuevo pedido', `Nuevo pedido ${codigo} desde la tienda de ${socio.nombre_comercial} — ${Math.max(0, totalFinal).toFixed(2)} €`)
      if (tipoEntrega === 'delivery') {
        pushFn('socio', socio.id, 'Nuevo pedido para entregar', `Pedido ${codigo} — ${Math.max(0, totalFinal).toFixed(2)} €`)
      }
      setCarrito([]); setPasoTarjeta(false); setClientSecret(null); setNotas(''); setPropina(0)
      onPedidoCreado(pedido)
    } catch (err) { alert('Error: ' + err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>Tu pedido</h2>

      {pasoTarjeta && clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <FormularioPago clientSecret={clientSecret} total={totalFinal} onSuccess={id => crearPedido(id)} onCancel={() => setPasoTarjeta(false)} />
        </Elements>
      ) : (
        <>
          {/* Items */}
          {carrito.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{item.cantidad}x {item.nombre}</div>
                {item.tamano && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{item.tamano}</div>}
                {item.extras?.length > 0 && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{item.extras.join(', ')}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{(item.precio * item.cantidad).toFixed(2)} €</span>
                <button onClick={() => setCarrito(prev => prev.filter((_, i) => i !== idx))} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', fontSize: 10, color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            </div>
          ))}

          {/* Tipo entrega */}
          <div style={{ marginTop: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Tipo de entrega</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {tieneDelivery && <button onClick={() => setTipoEntrega('delivery')} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: tipoEntrega === 'delivery' ? '2px solid #FF6B2C' : '1px solid rgba(255,255,255,0.1)', background: tipoEntrega === 'delivery' ? 'rgba(255,107,44,0.12)' : 'rgba(255,255,255,0.04)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: tipoEntrega === 'delivery' ? '#FF6B2C' : '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>🛵 Delivery</button>}
              <button onClick={() => setTipoEntrega('recogida')} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: tipoEntrega === 'recogida' ? '2px solid #FF6B2C' : '1px solid rgba(255,255,255,0.1)', background: tipoEntrega === 'recogida' ? 'rgba(255,107,44,0.12)' : 'rgba(255,255,255,0.04)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: tipoEntrega === 'recogida' ? '#FF6B2C' : '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>🏪 Recogida</button>
            </div>
          </div>

          {/* Método pago */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Método de pago</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ id: 'tarjeta', l: '💳 Tarjeta' }, { id: 'efectivo', l: '💵 Efectivo' }].map(m => (
                <button key={m.id} onClick={() => setMetodoPago(m.id)} style={{ flex: 1, padding: '12px 0', borderRadius: 10, border: metodoPago === m.id ? '2px solid #FF6B2C' : '1px solid rgba(255,255,255,0.1)', background: metodoPago === m.id ? 'rgba(255,107,44,0.12)' : 'rgba(255,255,255,0.04)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: metodoPago === m.id ? '#FF6B2C' : '#F5F5F5' }}>{m.l}</button>
              ))}
            </div>
          </div>

          {/* Notas del pedido */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Notas del pedido</div>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder="Instrucciones especiales, alergias, piso/puerta..." rows={2} style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', fontSize: 13, fontFamily: 'inherit', background: 'rgba(255,255,255,0.04)', color: '#F5F5F5', outline: 'none', boxSizing: 'border-box', resize: 'none' }} />
          </div>

          {/* Propina */}
          {tipoEntrega === 'delivery' && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Propina para el repartidor</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[0, 1, 2, 3].map(p => (
                  <button key={p} onClick={() => setPropina(p)} style={{
                    flex: 1, padding: '10px 0', borderRadius: 10,
                    border: propina === p ? '2px solid #FF6B2C' : '1px solid rgba(255,255,255,0.1)',
                    background: propina === p ? 'rgba(255,107,44,0.12)' : 'rgba(255,255,255,0.04)',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    color: propina === p ? '#FF6B2C' : '#F5F5F5',
                  }}>
                    {p === 0 ? 'Sin' : `${p} €`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Promo banner */}
          {promoActiva && (
            <div style={{
              marginBottom: 12, padding: '10px 14px', borderRadius: 10,
              background: descuento > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(255,107,44,0.08)',
              border: descuento > 0 ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,107,44,0.15)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>{descuento > 0 ? '🎉' : '🏷️'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: descuento > 0 ? '#4ADE80' : '#FF6B2C' }}>{promoActiva.titulo}</div>
                {descuento > 0 ? (
                  <div style={{ fontSize: 11, color: '#4ADE80' }}>-{descuento.toFixed(2)} € aplicado</div>
                ) : (
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Min. {promoActiva.minimo_compra}€ — te faltan {((promoActiva.minimo_compra || 0) - total).toFixed(2)}€</div>
                )}
              </div>
            </div>
          )}

          {/* Desglose */}
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Subtotal</span><span>{total.toFixed(2)} €</span></div>
            {descuento > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#4ADE80' }}>
                <span>Descuento</span><span>-{descuento.toFixed(2)} €</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Envío {distanciaKm && tipoEntrega === 'delivery' ? <span style={{ fontSize: 10 }}>({distanciaKm} km)</span> : null}</span>
              <span style={{ color: tipoEntrega === 'recogida' ? '#22C55E' : 'inherit' }}>{tipoEntrega === 'recogida' ? 'Gratis' : envioLoading ? 'Calculando...' : `${envioFinal.toFixed(2)} €`}</span>
            </div>
            {propina > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: '#FF6B2C' }}>
                <span>Propina</span><span>{propina.toFixed(2)} €</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 17, marginTop: 10, paddingTop: 10, borderTop: '2px solid rgba(255,255,255,0.08)' }}>
            <span>Total</span><span>{Math.max(0, totalFinal).toFixed(2)} €</span>
          </div>

          {/* Alerta restaurante cerrado */}
          {restCerrado && (
            <div style={{
              marginTop: 14, padding: '14px 16px', borderRadius: 12,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 22 }}>🔒</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#EF4444', marginBottom: 2 }}>Restaurante cerrado</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{restCerradoMsg}</div>
              </div>
            </div>
          )}

          <button onClick={iniciarPago} disabled={loading || envioLoading || restCerrado} style={{ width: '100%', marginTop: 16, padding: '16px 0', borderRadius: 14, border: 'none', background: (loading || envioLoading || restCerrado) ? 'rgba(255,255,255,0.2)' : '#FF6B2C', color: '#fff', fontSize: 16, fontWeight: 800, cursor: (loading || envioLoading || restCerrado) ? 'default' : 'pointer', fontFamily: 'inherit', opacity: restCerrado ? 0.5 : 1 }}>
            {restCerrado ? 'No disponible — restaurante cerrado' : !user ? 'Iniciar sesión para pedir' : loading ? 'Procesando...' : metodoPago === 'tarjeta' ? `Pagar — ${totalFinal.toFixed(2)} €` : `Pedir — ${totalFinal.toFixed(2)} €`}
          </button>
        </>
      )}
    </div>
  )
}

// ===================== PAGINA: PERFIL =====================

function PaginaPerfil({ user, perfil, onLogin, onLogout, updatePerfil }) {
  const [editando, setEditando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [telefono, setTelefono] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [subSeccion, setSubSeccion] = useState(null)
  const [direccion, setDireccion] = useState(perfil?.direccion || '')
  const [savingDir, setSavingDir] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)

  if (!user) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Inicia sesión</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 20 }}>Para hacer pedidos y ver tu historial</div>
      <button onClick={onLogin} style={{ padding: '14px 40px', borderRadius: 14, border: 'none', background: '#FF6B2C', color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>Iniciar sesión</button>
    </div>
  )

  const handleGuardar = async () => {
    setSaving(true); setMsg(null)
    try {
      await updatePerfil({ nombre: nombre.trim(), apellido: apellido.trim(), telefono: telefono.trim() })
      setMsg('Perfil actualizado')
      setTimeout(() => { setEditando(false); setMsg(null) }, 1200)
    } catch { setMsg('Error al guardar') }
    finally { setSaving(false) }
  }

  const handleGuardarDir = async () => {
    setSavingDir(true)
    try {
      await updatePerfil({ direccion: direccion.trim() })
      setMsg('Dirección guardada')
      setTimeout(() => setMsg(null), 1500)
    } catch { setMsg('Error al guardar') }
    finally { setSavingDir(false) }
  }

  const handleGeo = async () => {
    setGeoLoading(true)
    try {
      const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(p => resolve(p.coords), reject, { enableHighAccuracy: true, timeout: 10000 }))
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.latitude}&lon=${pos.longitude}&format=json`)
      const data = await res.json()
      const addr = data.display_name || `${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`
      setDireccion(addr)
      await updatePerfil({ direccion: addr, latitud: pos.latitude, longitud: pos.longitude })
      setMsg('Ubicación actualizada')
      setTimeout(() => setMsg(null), 1500)
    } catch { setMsg('No se pudo obtener la ubicación') }
    finally { setGeoLoading(false) }
  }

  const glass = { background: 'rgba(255,255,255,0.06)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }
  const inp = { width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)', fontSize: 14, fontFamily: 'inherit', background: 'rgba(255,255,255,0.08)', color: '#F5F5F5', outline: 'none', boxSizing: 'border-box' }
  const lbl = { fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 6, display: 'block' }

  // Sub-sección dirección
  if (subSeccion === 'direccion') {
    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        <button onClick={() => { setSubSeccion(null); setMsg(null) }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#FF6B2C', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20, padding: 0 }}>← Volver</button>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Mi dirección</h2>
        <button onClick={handleGeo} disabled={geoLoading} style={{ width: '100%', padding: '14px 16px', borderRadius: 14, marginBottom: 12, background: 'rgba(255,107,44,0.1)', border: '1px solid rgba(255,107,44,0.2)', color: '#FF6B2C', fontSize: 13, fontWeight: 700, cursor: geoLoading ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          📍 {geoLoading ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
        </button>
        <div style={{ ...glass, padding: 16 }}>
          <label style={lbl}>Dirección de entrega</label>
          <AddressInput
            value={direccion}
            onChange={setDireccion}
            onSelect={async (place) => {
              setDireccion(place.direccion)
              if (place.lat && place.lng) {
                await updatePerfil({ direccion: place.direccion, latitud: place.lat, longitud: place.lng })
                setMsg('Dirección guardada')
                setTimeout(() => setMsg(null), 1500)
              }
            }}
            placeholder="Buscar dirección..."
            style={inp}
          />
          <button onClick={handleGuardarDir} disabled={savingDir} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: savingDir ? 'rgba(255,255,255,0.2)' : '#FF6B2C', color: '#fff', fontSize: 14, fontWeight: 700, cursor: savingDir ? 'default' : 'pointer', fontFamily: 'inherit', marginTop: 12 }}>
            {savingDir ? 'Guardando...' : 'Guardar dirección'}
          </button>
          {msg && <div style={{ textAlign: 'center', fontSize: 12, color: '#FF6B2C', marginTop: 10, fontWeight: 600 }}>{msg}</div>}
        </div>
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Avatar y datos */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ width: 80, height: 80, borderRadius: 22, background: '#FF6B2C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800, color: '#fff', marginBottom: 12, overflow: 'hidden' }}>
          {perfil?.avatar_url ? <img src={perfil.avatar_url} alt="" style={{ width: 80, height: 80, objectFit: 'cover' }} /> : (perfil?.nombre?.[0] || 'U').toUpperCase()}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{perfil?.nombre} {perfil?.apellido || ''}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{perfil?.email || user?.email}</div>
        {perfil?.telefono && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{perfil.telefono}</div>}
        <button onClick={() => { setNombre(perfil?.nombre || ''); setApellido(perfil?.apellido || ''); setTelefono(perfil?.telefono || ''); setEditando(true) }} style={{ marginTop: 10, padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#FF6B2C' }}>
          Editar perfil
        </button>
      </div>

      {/* Menú */}
      <div style={glass}>
        <button onClick={() => setSubSeccion('direccion')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '14px 16px', border: 'none', background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#F5F5F5', textAlign: 'left' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>📍 Mi dirección</span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>›</span>
        </button>
        <button onClick={onLogout} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '14px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#EF4444', textAlign: 'left' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>↪ Cerrar sesión</span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>›</span>
        </button>
      </div>

      {/* Modal Editar Perfil */}
      {editando && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setEditando(false)}>
          <div style={{ width: '100%', maxWidth: 420, background: '#1A1A1A', borderRadius: '20px 20px 0 0', padding: 24, animation: 'slideUp 0.3s ease', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#F5F5F5', margin: 0 }}>Editar perfil</h3>
              <button onClick={() => setEditando(false)} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5F5F5', fontSize: 16 }}>×</button>
            </div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Nombre</label><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre" style={inp} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Apellido</label><input value={apellido} onChange={e => setApellido(e.target.value)} placeholder="Apellido" style={inp} /></div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Teléfono</label><input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Teléfono" style={inp} /></div>
            <div style={{ marginBottom: 20 }}><label style={lbl}>Email</label><input value={perfil?.email || ''} disabled style={{ ...inp, opacity: 0.4, cursor: 'not-allowed' }} /></div>
            {msg && <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, marginBottom: 14, color: msg.includes('Error') ? '#EF4444' : '#22C55E' }}>{msg}</div>}
            <button onClick={handleGuardar} disabled={saving} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: saving ? 'rgba(255,255,255,0.2)' : '#FF6B2C', color: '#fff', fontSize: 15, fontWeight: 800, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ===================== LOGIN INLINE =====================

function LoginInline({ onSuccess }) {
  const { login, registro } = useAuth()
  const [modo, setModo] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errores, setErrores] = useState({})

  function validar() {
    const e = {}
    if (!email.trim()) e.email = 'El email es obligatorio'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email no válido'
    if (!password) e.password = 'La contraseña es obligatoria'
    else if (password.length < 6) e.password = 'Mínimo 6 caracteres'
    if (modo === 'registro') {
      if (!nombre.trim()) e.nombre = 'El nombre es obligatorio'
      if (telefono && !/^\+?\d{7,15}$/.test(telefono.replace(/\s/g, ''))) e.telefono = 'Teléfono no válido'
      if (!aceptaTerminos) e.terminos = 'Debes aceptar los términos y condiciones'
    }
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validar()) return
    setError(null); setLoading(true)
    try {
      if (modo === 'login') await login(email, password)
      else await registro(email, password, nombre.trim(), telefono.replace(/\s/g, ''))
      onSuccess()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit() }
  const inputWrap = { position: 'relative', marginBottom: 12 }
  const iconStyle = { position: 'absolute', left: 14, top: 14, color: 'rgba(255,255,255,0.4)' }
  const inputStyle = { width: '100%', padding: '14px 16px 14px 44px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', fontSize: 14, fontFamily: 'inherit', background: 'rgba(255,255,255,0.08)', color: '#F5F5F5', outline: 'none', boxSizing: 'border-box' }
  const inputError = { ...inputStyle, borderColor: '#EF4444' }

  return (
    <div style={{ padding: '40px 0', animation: 'fadeIn 0.3s ease', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: 48, fontWeight: 800, color: '#FF6B2C', marginBottom: 8, letterSpacing: -2 }}>pidoo</div>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 32, textAlign: 'center' }}>Tu comida favorita, al alcance de un toque</p>

      <div style={{ width: '100%', maxWidth: 340 }}>
        {/* Tabs login/registro */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 3, marginBottom: 20 }}>
          {['login', 'registro'].map(m => (
            <button key={m} onClick={() => { setModo(m); setError(null); setErrores({}) }} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
              background: modo === m ? '#FF6B2C' : 'transparent',
              color: modo === m ? '#fff' : 'rgba(255,255,255,0.45)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        {modo === 'registro' && (
          <div style={inputWrap}>
            <User size={16} strokeWidth={1.8} style={iconStyle} />
            <input placeholder="Nombre completo" value={nombre} onChange={e => setNombre(e.target.value)} onKeyDown={handleKeyDown} style={errores.nombre ? inputError : inputStyle} />
            {errores.nombre && <div style={{ color: '#EF4444', fontSize: 11, marginTop: 2, marginLeft: 4 }}>{errores.nombre}</div>}
          </div>
        )}

        <div style={inputWrap}>
          <Mail size={16} strokeWidth={1.8} style={iconStyle} />
          <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKeyDown} style={errores.email ? inputError : inputStyle} />
          {errores.email && <div style={{ color: '#EF4444', fontSize: 11, marginTop: 2, marginLeft: 4 }}>{errores.email}</div>}
        </div>

        <div style={inputWrap}>
          <Lock size={16} strokeWidth={1.8} style={iconStyle} />
          <input placeholder="Contraseña" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown} style={errores.password ? inputError : inputStyle} />
          <button onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}>
            {showPassword ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
          </button>
          {errores.password && <div style={{ color: '#EF4444', fontSize: 11, marginTop: 2, marginLeft: 4 }}>{errores.password}</div>}
        </div>

        {modo === 'registro' && (
          <>
            <div style={inputWrap}>
              <Phone size={16} strokeWidth={1.8} style={iconStyle} />
              <input placeholder="Teléfono (opcional)" value={telefono} onChange={e => setTelefono(e.target.value)} onKeyDown={handleKeyDown} style={errores.telefono ? inputError : inputStyle} />
              {errores.telefono && <div style={{ color: '#EF4444', fontSize: 11, marginTop: 2, marginLeft: 4 }}>{errores.telefono}</div>}
            </div>

            <div style={{ marginTop: 4, marginBottom: 8 }}>
              <button onClick={() => setAceptaTerminos(!aceptaTerminos)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: 0 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                  border: aceptaTerminos ? 'none' : errores.terminos ? '2px solid #EF4444' : '2px solid rgba(255,255,255,0.2)',
                  background: aceptaTerminos ? '#FF6B2C' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', transition: 'all 0.2s',
                }}>{aceptaTerminos && '✓'}</div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
                  Acepto los <a href="/terminos" target="_blank" rel="noopener noreferrer" style={{ color: '#FF6B2C', fontWeight: 600, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>términos y condiciones</a> y la <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: '#FF6B2C', fontWeight: 600, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>política de privacidad</a>
                </span>
              </button>
              {errores.terminos && <div style={{ color: '#EF4444', fontSize: 11, marginTop: 4, marginLeft: 30 }}>{errores.terminos}</div>}
            </div>
          </>
        )}

        {error && <div style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontSize: 12, padding: '10px 14px', borderRadius: 10, marginBottom: 12, textAlign: 'center', fontWeight: 600 }}>{error}</div>}

        <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', background: loading ? 'rgba(255,255,255,0.2)' : '#FF6B2C', color: '#fff', fontSize: 16, fontWeight: 800, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', marginTop: 6 }}>
          {loading ? 'Cargando...' : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>o</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } })} style={{
          width: '100%', padding: '14px 0', borderRadius: 14, border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.06)', color: '#F5F5F5',
          fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continuar con Google
        </button>
      </div>
    </div>
  )
}

// ===================== APP PRINCIPAL TIENDA SOCIO =====================

export default function TiendaSocio({ slug: slugProp }) {
  const { user, perfil, logout, updatePerfil } = useAuth()
  const [socio, setSocio] = useState(null)
  const [establecimientos, setEstablecimientos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [carrito, setCarrito] = useState([])
  const [seccion, setSeccion] = useState('inicio')
  const [restOpen, setRestOpen] = useState(null)
  const [catActiva, setCatActiva] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [pedidoActivo, setPedidoActivo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [promociones, setPromociones] = useState([])

  useEffect(() => { fetchSocio() }, [])

  async function fetchSocio() {
    const slug = slugProp || window.location.pathname.replace(/^\//, '') || 'demo'
    const { data: socioData, error: err } = await supabase.from('socios').select('*').eq('slug', slug).single()
    if (err || !socioData) { setError('Tienda no encontrada'); setLoading(false); return }
    setSocio(socioData)

    const { data: rels } = await supabase.from('socio_establecimiento').select('establecimiento_id, destacado').eq('socio_id', socioData.id).eq('estado', 'aceptado')
    if (rels && rels.length > 0) {
      const estIds = rels.map(r => r.establecimiento_id)
      const { data: ests } = await supabase.from('establecimientos').select('*').in('id', estIds).eq('activo', true)
      // Cargar categorías generales (nivel 2) asignadas a estos establecimientos
      const { data: estCats } = await supabase.from('establecimiento_categorias').select('establecimiento_id, categoria_id').in('establecimiento_id', estIds)
      const { data: allCatsGen } = await supabase.from('categorias_generales').select('*').eq('activa', true).order('orden')
      const catMap = {}
      for (const ec of (estCats || [])) {
        if (!catMap[ec.establecimiento_id]) catMap[ec.establecimiento_id] = []
        catMap[ec.establecimiento_id].push(ec.categoria_id)
      }
      setEstablecimientos((ests || []).map(e => ({ ...e, destacado: rels.find(r => r.establecimiento_id === e.id)?.destacado || false, _catIds: catMap[e.id] || [] })))
      // Solo mostrar categorías que tienen al menos un restaurante del socio
      const usedCatIds = new Set((estCats || []).map(ec => ec.categoria_id))
      setCategorias((allCatsGen || []).filter(c => usedCatIds.has(c.id)))
      // Cargar promos activas de estos establecimientos
      const { data: promosData } = await supabase.from('promociones').select('*, establecimientos(id, nombre, logo_url, banner_url, rating, total_resenas, radio_cobertura_km, activo, horario)')
        .in('establecimiento_id', estIds).eq('activa', true)
        .or('fecha_fin.is.null,fecha_fin.gt.' + new Date().toISOString())
      setPromociones(promosData || [])
    }
    setLoading(false)
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><div style={{ fontSize: 28, fontWeight: 800, color: '#FF6B2C' }}>Cargando...</div></div>
  if (error) return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 8 }}><div style={{ fontSize: 48 }}>🔍</div><div style={{ fontSize: 18, fontWeight: 800 }}>{error}</div></div>
  if (!socio) return null

  const carritoCount = carrito.reduce((s, i) => s + i.cantidad, 0)

  // Login inline
  if (showLogin) return (
    <div style={{ padding: '0 20px' }}>
      <button onClick={() => setShowLogin(false)} style={{ background: 'none', border: 'none', color: '#FF6B2C', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '16px 0', fontFamily: 'inherit' }}>← Volver</button>
      <LoginInline onSuccess={() => setShowLogin(false)} />
    </div>
  )

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header: Banner + info socio */}
      {seccion === 'inicio' && !restOpen && (
        <>
          <div style={{ height: 160, background: socio.banner_url ? `url(${socio.banner_url}) center/cover` : 'linear-gradient(135deg, #FF6B2C 0%, #FF8F73 100%)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, rgba(13,13,13,0.9))' }} />
          </div>
          <div style={{ padding: '0 20px', marginTop: -50, position: 'relative', zIndex: 10, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
              <div style={{ width: 72, height: 72, borderRadius: 18, border: '3px solid #0D0D0D', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', overflow: 'hidden', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#FF6B2C', flexShrink: 0 }}>
                {socio.logo_url ? <img src={socio.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : socio.nombre_comercial?.[0]?.toUpperCase()}
              </div>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{socio.nombre_comercial}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Stars rating={socio.rating} size={11} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>({socio.total_resenas})</span>
                  {socio.en_servicio && <span style={{ width: 6, height: 6, borderRadius: 3, background: '#16A34A', marginLeft: 4 }} />}
                </div>
              </div>
            </div>
            {/* Redes sociales del socio */}
            {(socio.redes?.whatsapp || socio.redes?.instagram || socio.redes?.tiktok || socio.telefono) && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {socio.redes?.whatsapp && (
                  <a href={`https://wa.me/${socio.redes.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(37,211,102,0.15)', color: '#25D366', fontSize: 11, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    💬 WhatsApp
                  </a>
                )}
                {socio.telefono && !socio.redes?.whatsapp && (
                  <a href={`https://wa.me/${socio.telefono.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(37,211,102,0.15)', color: '#25D366', fontSize: 11, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    💬 WhatsApp
                  </a>
                )}
                {socio.redes?.instagram && (
                  <a href={`https://instagram.com/${socio.redes.instagram}`} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(225,48,108,0.15)', color: '#E1306C', fontSize: 11, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    📸 @{socio.redes.instagram}
                  </a>
                )}
                {socio.redes?.tiktok && (
                  <a href={`https://tiktok.com/@${socio.redes.tiktok}`} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                    🎵 @{socio.redes.tiktok}
                  </a>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Contenido */}
      <div style={{ padding: '0 20px' }}>
        {seccion === 'inicio' && !restOpen && (
          <PaginaInicio socio={socio} establecimientos={establecimientos} categorias={categorias} catActiva={catActiva} setCatActiva={setCatActiva} busqueda={busqueda} setBusqueda={setBusqueda} onOpenRest={r => setRestOpen(r)} promociones={promociones} />
        )}
        {seccion === 'inicio' && restOpen && (
          <PaginaRestDetalle est={restOpen} onBack={() => setRestOpen(null)} carrito={carrito} setCarrito={setCarrito} socio={socio} />
        )}
        {seccion === 'pedidos' && (
          <PaginaPedidos user={user} socioId={socio.id}
            pedidoTracking={pedidoActivo}
            onTrack={p => setPedidoActivo(p)}
            onCloseTrack={() => setPedidoActivo(null)} />
        )}
        {seccion === 'carrito' && (
          <PaginaCarrito carrito={carrito} setCarrito={setCarrito} socio={socio} user={user}
            onPedidoCreado={p => { setPedidoActivo(p); setSeccion('pedidos') }}
            onLogin={() => setShowLogin(true)} />
        )}
        {seccion === 'perfil' && <PaginaPerfil user={user} perfil={perfil} onLogin={() => setShowLogin(true)} onLogout={logout} updatePerfil={updatePerfil} />}
      </div>

      {/* Bottom Nav */}
      <TiendaBottomNav active={seccion} onChange={s => { setSeccion(s); setRestOpen(null) }} carritoCount={carritoCount} />
    </div>
  )
}
