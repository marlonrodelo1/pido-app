/* ──────────────────────────────────────────────────────────────────────────
 * GanaHistoria — pidoo.es/<slug>/gana
 *
 * Adonde lleva el QR de la PEGATINA que cierra la bolsa del pedido: "escanea y
 * gana". El cliente acaba de recibir la comida; aquí se le explica el premio
 * por subir una historia y se abre el mismo panel de participación que usa la
 * carta de la mesa (`ParticiparMesa`, contexto 'pedido').
 *
 * ES UNA URL IMPRESA: no se puede corregir una vez pegada en mil bolsas. Por eso
 * existe esta ruta propia y no se apuntó a `/carta` ni a la tienda: si mañana
 * cambia el premio o la forma de participar, se cambia esta página y las
 * pegatinas siguen valiendo. Y por lo mismo NUNCA lleva a una página muerta: si
 * el restaurante no tiene el programa abierto, se dice y se manda a su tienda.
 *
 * Igual que la carta de mesa, no monta `AuthProvider` en la ruta (lo monta el
 * panel al abrirse): quien solo mira no paga sesión ni el diálogo de
 * notificaciones del navegador.
 * ────────────────────────────────────────────────────────────────────────── */
import { useEffect, useState, lazy, Suspense } from 'react'
import { useParams, useLocation, useNavigate, Navigate, Link } from 'react-router-dom'
import { Video, AtSign, Gift, ShoppingBag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { fmtEur, mejorPremioEuros } from '../components/CreadoresEscalera'
import { mencionesHistoria, HORAS_REVISION_HISTORIA } from '../components/CreadoresHistoria'

const ParticiparMesa = lazy(() => import('../components/ParticiparMesa'))
const CLAVE_VOLVER = 'pidoo_gana_participar'

const C = {
  cream: '#F7F3EC', cream2: '#EFE9DD', paper: '#FBF8F2',
  ink: '#1A1815', stone: '#6B6356', stone2: '#8A8174',
  terracotta: '#C5562C', burnt: '#E4671F', burntText: '#A85018',
  border: '#E8E1D3',
}

// Columnas explícitas: página pública que abre cualquiera sin identificarse.
const COLS_EST = 'id, nombre, logo_url, slug, solo_carta'

const pantalla = (texto) => (
  <div style={{
    minHeight: '100vh', background: C.cream, color: C.stone,
    fontFamily: "'DM Sans', sans-serif",
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
  }}>{texto}</div>
)

export default function GanaHistoria() {
  const { slug } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const slugOk = !!slug && /^[a-z0-9-]+$/i.test(slug)

  const [estado, setEstado] = useState(slugOk ? 'loading' : 'notfound')
  const [est, setEst] = useState(null)
  const [programa, setPrograma] = useState(undefined)   // undefined = aún no se sabe
  const [participar, setParticipar] = useState(false)
  const [enviada, setEnviada] = useState(false)

  useEffect(() => {
    if (!slugOk) return
    let cancelado = false
    supabase.from('establecimientos').select(COLS_EST)
      .eq('slug', slug).eq('estado', 'activo').maybeSingle()
      .then(({ data }) => {
        if (cancelado) return
        if (!data) { setEstado('notfound'); return }
        setEst(data)
        setEstado('ok')
      })
    return () => { cancelado = true }
  }, [slug, slugOk])

  useEffect(() => {
    if (estado !== 'ok' || !est?.id) return
    // Un "solo carta" no reparte: el premio (solo a domicilio) no se podría gastar.
    if (est.solo_carta) { setPrograma(null); return }
    let cancelado = false
    supabase.rpc('creadores_programa_publico_v2', { p_establecimiento_id: est.id })
      .then(({ data }) => { if (!cancelado) setPrograma(data || null) })
    return () => { cancelado = true }
  }, [estado, est?.id, est?.solo_carta])

  // Volver del rodeo de Google con el panel abierto (mismo patrón que la carta).
  useEffect(() => {
    if (estado !== 'ok' || !programa?.admite_altas) return
    const params = new URLSearchParams(location.search)
    const porUrl = params.get('participar') === '1'
    let porSesion = false
    try { porSesion = sessionStorage.getItem(CLAVE_VOLVER) === slug } catch { /* modo privado */ }
    if (!porUrl && !porSesion) return
    try { sessionStorage.removeItem(CLAVE_VOLVER) } catch { /* modo privado */ }
    setParticipar(true)
    if (porUrl) {
      params.delete('participar')
      const q = params.toString()
      navigate({ pathname: location.pathname, search: q ? `?${q}` : '' }, { replace: true })
    }
  }, [estado, programa?.admite_altas, slug, location.search, location.pathname, navigate])

  useEffect(() => {
    if (estado !== 'ok' || !est) return
    const previo = document.title
    document.title = `Gana tu descuento · ${est.nombre}`
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, follow'
    document.head.appendChild(meta)
    return () => {
      document.title = previo
      if (meta.parentNode) meta.parentNode.removeChild(meta)
    }
  }, [estado, est?.id, est?.nombre])

  if (estado === 'notfound') return <Navigate to="/" replace />
  if (estado === 'loading' || programa === undefined) return pantalla('Cargando…')

  function abrir() {
    try { sessionStorage.setItem(CLAVE_VOLVER, slug) } catch { /* modo privado */ }
    setParticipar(true)
  }
  function cerrar() {
    try { sessionStorage.removeItem(CLAVE_VOLVER) } catch { /* modo privado */ }
    setParticipar(false)
  }

  const abierto = programa?.admite_altas === true
  const historia = programa?.formato === 'historia'
  const euros = mejorPremioEuros(programa?.escalera || [])
  const m = mencionesHistoria(programa, est.nombre)
  const horas = programa?.revision_horas || HORAS_REVISION_HISTORIA

  return (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: "'DM Sans', sans-serif", color: C.ink }}>
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '28px 18px 40px' }}>

        {/* Quién te lo da */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          {est.logo_url && (
            <img src={est.logo_url} alt="" style={{
              width: 52, height: 52, borderRadius: 14, objectFit: 'cover',
              border: `1px solid ${C.border}`, background: '#fff', flexShrink: 0,
            }} />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.terracotta, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Pidoo Creadores
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>{est.nombre}</div>
          </div>
        </div>

        {!abierto ? (
          // Una pegatina ya impresa nunca debe llevar a una página muerta.
          <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
              Ahora mismo {est.nombre} no tiene premios activos
            </div>
            <div style={{ fontSize: 13.5, color: C.stone, lineHeight: 1.55 }}>
              Vuelve a escanear la pegatina con tu próximo pedido. Mientras tanto, puedes pedir
              desde aquí.
            </div>
            <BotonTienda slug={est.slug} nombre={est.nombre} principal />
          </div>
        ) : enviada ? (
          <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>¡Listo, ya está apuntada!</div>
            <div style={{ fontSize: 13.5, color: C.stone, lineHeight: 1.55 }}>
              {est.nombre} la confirmará al ver tu mención y te avisamos con el premio. Si no la revisa en{' '}
              {horas} horas, te llega igual.
            </div>
            <BotonTienda slug={est.slug} nombre={est.nombre} />
          </div>
        ) : (
          <>
            {/* El premio. "de descuento" no se quita nunca: sin eso se lee como
                dinero en metálico y sería publicidad engañosa. */}
            <div style={{
              background: 'linear-gradient(135deg, #FDE8D6 0%, #F7CFB2 100%)',
              border: `1px solid ${C.burnt}`, borderRadius: 18, padding: '20px 18px', marginBottom: 16,
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#8C420C', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                {euros > 0 ? `Gana ${fmtEur(euros)} € de descuento` : 'Gana un descuento'}
              </div>
              <div style={{ fontSize: 14.5, color: '#7A4C28', marginTop: 6, lineHeight: 1.45 }}>
                {historia
                  ? 'por subir tu pedido a una historia de Instagram. Para tu próximo pedido a domicilio.'
                  : 'por tu vídeo, según sus visualizaciones. Para tu próximo pedido a domicilio.'}
              </div>
            </div>

            {historia && (
              <div style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 16, padding: '6px 16px', marginBottom: 16 }}>
                {[
                  { Icon: Video, t: 'Sube una historia con tu pedido', d: 'Una foto o un vídeo de la comida, en tu historia de Instagram.' },
                  { Icon: AtSign, t: `Etiqueta a ${m.texto}`, d: 'Con el sticker de mención. Si tu cuenta es privada, síguele para que le llegue.' },
                  { Icon: Gift, t: 'Apúntala aquí y listo', d: `${est.nombre} la confirma y tu descuento se aplica solo en tu próximo pedido a domicilio.` },
                ].map(({ Icon, t, d }, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: i ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, #FDE8D6 0%, #F7CFB2 100%)',
                      display: 'grid', placeItems: 'center',
                    }}><Icon size={16} color={C.burntText} /></div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>{t}</div>
                      <div style={{ fontSize: 12.5, color: C.stone, marginTop: 2, lineHeight: 1.45 }}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button onClick={abrir} style={{
              width: '100%', padding: '15px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #E4671F 0%, #C5562C 100%)', color: '#fff',
              fontFamily: 'inherit', fontSize: 15.5, fontWeight: 800,
              boxShadow: '0 4px 14px rgba(26,24,21,0.12)',
            }}>
              Quiero mi descuento
            </button>

            <BotonTienda slug={est.slug} nombre={est.nombre} />

            <div style={{ fontSize: 11.5, color: C.stone2, marginTop: 14, lineHeight: 1.5, textAlign: 'center' }}>
              Necesitas una cuenta de Pidoo (es gratis). Un premio por historia, válido 60 días y
              solo en pedidos a domicilio de {est.nombre}.
            </div>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 28, fontSize: 12, color: C.stone2 }}>
          Pedidos a domicilio con <Link to="/" style={{ color: C.terracotta, fontWeight: 800, textDecoration: 'none' }}>Pidoo</Link>
        </div>
      </div>

      {participar && abierto && (
        <Suspense fallback={null}>
          <ParticiparMesa
            establecimiento={est}
            programa={programa}
            contexto="pedido"
            volverA={`/${est.slug}/gana?participar=1`}
            onEnviado={() => setEnviada(true)}
            onClose={cerrar}
          />
        </Suspense>
      )}
    </div>
  )
}

function BotonTienda({ slug, nombre, principal = false }) {
  return (
    <Link to={'/' + slug} style={{
      marginTop: 12, width: '100%', boxSizing: 'border-box',
      padding: '13px 16px', borderRadius: 14, textDecoration: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      fontSize: 14, fontWeight: 800,
      background: principal ? C.ink : '#fff',
      color: principal ? '#fff' : C.ink,
      border: principal ? 'none' : `1px solid ${C.border}`,
    }}>
      <ShoppingBag size={16} /> Pedir en {nombre}
    </Link>
  )
}
