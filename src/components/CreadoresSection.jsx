import { useState, useEffect, useCallback } from 'react'
import { Video, Gift, ExternalLink, Check, Clock, Copy, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { analizarUrlVideo, NOMBRE_RED } from '../lib/videoUrl'
import { CreadoresComoGanar } from './CreadoresEscalera'

// Pidoo Creadores — "Mis vídeos" y "Mis premios" del cliente.
//
// Vive como sub-sección de Perfil (igual que PromosSection) y NO como ruta:
// una ruta `/creadores` chocaría con el comodín `/:slug` de las tiendas
// públicas, y bastaría con que un restaurante se pusiera ese slug para que su
// tienda dejara de existir.
//
// La barra de progreso es la pantalla que engancha. Todo lo demás puede ser
// funcional y basta; esto tiene que apetecer volver a mirarlo.

const C = {
  cream: '#F7F3EC', cream2: '#EFE9DD', paper: '#FBF8F2',
  ink: '#1A1815', stone: '#6B6356', stone2: '#8A8174',
  terracotta: '#C5562C', terracottaSoft: '#F1D9CC', burnt: '#E4671F', burntText: '#A85018',
  sage: '#8B9D7A', sage2: '#6F8460', sageSoft: '#DDE3D3',
  warning: '#C99551', warningSoft: '#F0E1C8',
  danger: '#B5564A', dangerSoft: '#F1D0CB',
  border: '#E8E1D3',
}

const fmtNum = (n) => Number(n || 0).toLocaleString('es-ES')
const fmtFecha = (d) => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
const diasPara = (d) => Math.max(0, Math.ceil((new Date(d) - Date.now()) / 86400000))

export default function CreadoresSection() {
  const { user } = useAuth()
  const [tab, setTab] = useState(null)             // lo decide la carga: ver abajo
  const [parts, setParts] = useState([])
  const [cupones, setCupones] = useState([])
  const [escaleras, setEscaleras] = useState({})   // establecimiento_id → escalones
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    if (!user) return
    const [p, c] = await Promise.all([
      supabase.from('participaciones_creador')
        .select('id, estado, red, share_url, views_actual, nivel_alcanzado, created_at, caduca_at, motivo_rechazo, establecimiento_id, establecimientos(nombre, logo_url)')
        .order('created_at', { ascending: false }),
      supabase.from('cupones_creador')
        .select('id, codigo, tipo, valor, descripcion, caduca_at, usado_at, establecimiento_id, establecimientos(nombre, logo_url)')
        .order('created_at', { ascending: false }),
    ])
    const participaciones = p.data || []
    setParts(participaciones)
    setCupones(c.data || [])

    // Quien no ha grabado nunca entra directo a "Cómo ganar": era exactamente
    // el agujero: la pantalla no decía en ningún sitio qué se podía ganar.
    setTab(t => t || (participaciones.length ? 'videos' : 'como'))

    // La escalera hace falta para pintar "te faltan X para el siguiente premio".
    // Va por RPC porque `escalera_premios` no es legible por el cliente: expone
    // el coste interno de cada premio.
    const ids = [...new Set(participaciones.map(x => x.establecimiento_id))]
    const mapa = {}
    await Promise.all(ids.map(async (id) => {
      const { data } = await supabase.rpc('creadores_escalera_publica', { p_establecimiento_id: id })
      mapa[id] = data || []
    }))
    setEscaleras(mapa)
    setLoading(false)
  }, [user])

  useEffect(() => { cargar() }, [cargar])

  const enJuego = parts.filter(p => p.estado === 'activa' || p.estado === 'en_espera_tope')
  const disponibles = cupones.filter(c => !c.usado_at && new Date(c.caduca_at) > new Date())

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: C.stone, fontSize: 14 }}>Cargando…</div>
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, color: C.ink }}>Pidoo Creadores</h2>
      <p style={{ fontSize: 13, color: C.stone, marginTop: 0, marginBottom: 16, lineHeight: 1.5 }}>
        Graba un vídeo de tu pedido y gana descuentos según las visualizaciones que consiga.
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { id: 'como', label: 'Cómo ganar', Icon: Sparkles },
          { id: 'videos', label: `Mis vídeos${enJuego.length ? ` (${enJuego.length})` : ''}`, Icon: Video },
          { id: 'premios', label: `Premios${disponibles.length ? ` (${disponibles.length})` : ''}`, Icon: Gift },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '10px 2px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
            border: tab === t.id ? `1.5px solid ${C.burnt}` : `1px solid ${C.border}`,
            background: tab === t.id ? 'linear-gradient(180deg,#FDE8D6 0%,#F7CFB2 100%)' : C.paper,
            color: tab === t.id ? C.burntText : C.ink,
            fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}>
            <t.Icon size={14} style={{ flexShrink: 0 }} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'como' && <CreadoresComoGanar />}

      {tab === 'videos' && (
        parts.length === 0
          ? <Vacio
              Icon={Video}
              titulo="Todavía no has grabado ninguno"
              texto="Cuando recibas un pedido te saldrá la opción de registrar tu vídeo y empezar a sumar."
            />
          : parts.map(p => <TarjetaVideo key={p.id} p={p} escalera={escaleras[p.establecimiento_id] || []} />)
      )}

      {tab === 'premios' && (
        cupones.length === 0
          ? <Vacio
              Icon={Gift}
              titulo="Aún no tienes premios"
              texto="En cuanto uno de tus vídeos alcance el primer escalón, tu descuento aparecerá aquí."
            />
          : cupones.map(c => <TarjetaCupon key={c.id} c={c} />)
      )}
    </div>
  )
}

// ── Una participación, con su barra de progreso ─────────────────────────────
function TarjetaVideo({ p, escalera }) {
  const views = p.views_actual || 0
  const siguiente = escalera.find(e => e.views_necesarias > views)
  const ganado = [...escalera].reverse().find(e => e.views_necesarias <= views)
  const anterior = ganado?.views_necesarias || 0
  const pct = siguiente
    ? Math.min(100, Math.round(((views - anterior) / (siguiente.views_necesarias - anterior)) * 100))
    : 100

  const terminado = ['premiada', 'caducada', 'rechazada'].includes(p.estado)

  return (
    <div style={{
      background: C.paper, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: 14, marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.establecimientos?.nombre || 'Tu pedido'}
          </div>
          <a href={p.share_url} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2,
            fontSize: 11.5, color: C.terracotta, textDecoration: 'none', fontWeight: 600,
          }}>
            Ver en {NOMBRE_RED[p.red] || 'la app'} <ExternalLink size={10} />
          </a>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.ink, lineHeight: 1 }}>{fmtNum(views)}</div>
          <div style={{ fontSize: 10, color: C.stone, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
            visualizaciones
          </div>
        </div>
      </div>

      {!terminado && (
        <>
          <div style={{ height: 8, borderRadius: 999, background: C.cream2, overflow: 'hidden' }}>
            <div style={{
              width: `${pct}%`, height: '100%', borderRadius: 999,
              background: `linear-gradient(90deg, ${C.burnt} 0%, ${C.terracotta} 100%)`,
              transition: 'width 0.6s ease',
            }} />
          </div>
          <div style={{ fontSize: 12, color: C.stone, marginTop: 7, lineHeight: 1.45 }}>
            {siguiente
              ? <>Te faltan <strong style={{ color: C.ink }}>{fmtNum(siguiente.views_necesarias - views)}</strong> visualizaciones
                  para <strong style={{ color: C.ink }}>{siguiente.descripcion}</strong></>
              : ganado
                ? <>Has llegado al último escalón. Tu premio está en camino.</>
                : <>Aún no hemos contado tus visualizaciones. Las revisamos a diario.</>}
          </div>
        </>
      )}

      {/* Estados que hay que explicar, no solo etiquetar */}
      {p.estado === 'en_espera_tope' && (
        <Nota tono="warning">
          El restaurante ha llegado a su límite de premios de este mes. <strong>No lo pierdes</strong>:
          te lo entrega en cuanto empiece el mes que viene.
        </Nota>
      )}
      {p.estado === 'premiada' && (
        <Nota tono="sage"><Check size={13} style={{ verticalAlign: -2 }} /> Premio conseguido. Lo tienes en “Mis premios”.</Nota>
      )}
      {p.estado === 'caducada' && (
        <Nota tono="gris">Este vídeo ya no suma: pasaron los 30 días. Graba otro con tu próximo pedido.</Nota>
      )}
      {p.estado === 'rechazada' && (
        <Nota tono="danger">
          El restaurante no ha aceptado este vídeo{p.motivo_rechazo ? `: ${p.motivo_rechazo}` : '.'}
        </Nota>
      )}

      {!terminado && (
        <div style={{ fontSize: 11, color: C.stone2, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={11} /> Suma durante {diasPara(p.caduca_at)} días más · registrado el {fmtFecha(p.created_at)}
        </div>
      )}
    </div>
  )
}

// ── Un cupón ────────────────────────────────────────────────────────────────
function TarjetaCupon({ c }) {
  const [copiado, setCopiado] = useState(false)
  const caducado = new Date(c.caduca_at) <= new Date()
  const gastado = !!c.usado_at
  const muerto = caducado || gastado

  return (
    <div style={{
      background: muerto ? C.cream2 : 'linear-gradient(135deg, #FDE8D6 0%, #F7CFB2 100%)',
      border: `1px solid ${muerto ? C.border : C.burnt}`,
      borderRadius: 14, padding: 14, marginBottom: 10, opacity: muerto ? 0.65 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: muerto ? C.stone : C.burntText }}>
            {c.descripcion}
          </div>
          <div style={{ fontSize: 12, color: C.stone, marginTop: 2 }}>
            En {c.establecimientos?.nombre || 'tu restaurante'}
          </div>
        </div>
        {!muerto && (
          <button
            onClick={() => { navigator.clipboard?.writeText(c.codigo); setCopiado(true); setTimeout(() => setCopiado(false), 1600) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 9px', borderRadius: 9,
              border: `1px solid ${C.burnt}`, background: 'rgba(255,255,255,0.6)',
              fontSize: 11.5, fontWeight: 800, color: C.burntText, cursor: 'pointer',
              fontFamily: 'inherit', letterSpacing: '0.04em', flexShrink: 0,
            }}>
            {copiado ? <Check size={12} /> : <Copy size={12} />} {c.codigo}
          </button>
        )}
      </div>

      <div style={{ fontSize: 11.5, color: C.stone, marginTop: 10 }}>
        {gastado
          ? 'Ya lo usaste. ¡Gracias!'
          : caducado
            ? 'Caducado'
            : <>Se aplica solo al pagar. Caduca en <strong style={{ color: C.ink }}>{diasPara(c.caduca_at)} días</strong>.</>}
      </div>
    </div>
  )
}

function Nota({ tono, children }) {
  const paleta = {
    warning: { bg: C.warningSoft, fg: '#7A5A22' },
    sage:    { bg: C.sageSoft,    fg: C.sage2 },
    danger:  { bg: C.dangerSoft,  fg: C.danger },
    gris:    { bg: C.cream2,      fg: C.stone },
  }[tono] || { bg: C.cream2, fg: C.stone }
  return (
    <div style={{
      marginTop: 10, padding: '8px 10px', borderRadius: 10,
      background: paleta.bg, color: paleta.fg, fontSize: 12, lineHeight: 1.45,
    }}>{children}</div>
  )
}

function Vacio({ Icon, titulo, texto }) {
  return (
    <div style={{
      background: C.paper, border: `1px solid ${C.border}`, borderRadius: 14,
      padding: '34px 20px', textAlign: 'center',
    }}>
      <Icon size={30} color={C.stone2} style={{ marginBottom: 10 }} />
      <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{titulo}</div>
      <div style={{ fontSize: 12.5, color: C.stone, marginTop: 5, lineHeight: 1.5, maxWidth: 300, margin: '5px auto 0' }}>{texto}</div>
    </div>
  )
}
