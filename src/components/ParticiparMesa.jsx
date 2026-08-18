/* ──────────────────────────────────────────────────────────────────────────
 * ParticiparMesa — Pidoo Creadores desde la carta del QR de la mesa.
 *
 * El cliente está SENTADO en el restaurante: escaneó el QR, ve la carta con los
 * precios del local y aquí graba su vídeo. No hay pedido de Pidoo detrás, así
 * que el alta va por `crear_participacion_creador_mesa` y nace
 * `pendiente_validacion`: el dueño la acepta (o, si no dice nada en unos días,
 * se aprueba sola).
 *
 * ⚠️ ESTE COMPONENTE ES EL ÚNICO SITIO DE LA CARTA QUE MONTA `AuthProvider`, y
 * lo monta DENTRO de sí mismo, no en la ruta. El motivo no es de estilo:
 * `AuthContext.fetchPerfil` llama a `registerWebPush`, que dispara
 * `Notification.requestPermission()`. Si el provider colgara de la ruta, a un
 * cliente con sesión iniciada le saltaría el diálogo de notificaciones del
 * navegador NADA MÁS ESCANEAR UN QR EN UNA MESA, sin haber pedido nada. Aquí
 * solo lo paga quien ha dicho que quiere participar.
 *
 * `CartProvider` NO se monta ni aquí ni en ninguna parte de la carta: es lo que
 * garantiza que un `precio_local` no pueda llegar nunca a `pedido_items`.
 * ────────────────────────────────────────────────────────────────────────── */
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Camera, Copy, Check, ChevronDown, Video } from 'lucide-react'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { analizarUrlVideo } from '../lib/videoUrl'
import CreadoresEscalera, { fmtEur, mejorPremioEuros } from './CreadoresEscalera'
import AppDownloadBanner from './AppDownloadBanner'
import Login from '../pages/Login'

const C = {
  cream: '#F7F3EC', cream2: '#EFE9DD', paper: '#FBF8F2',
  ink: '#1A1815', stone: '#6B6356', stone2: '#8A8174',
  terracotta: '#C5562C', burnt: '#E4671F', burntText: '#A85018',
  border: '#E8E1D3', sage2: '#6F8460', danger: '#B5564A',
}

// Marca para reabrir esto solo al volver del rodeo de Google, que recarga la
// página entera pasando por /auth/callback. Sin esto, el cliente vuelve a la
// carta ya identificado pero con el panel cerrado, sin entender qué pasó.
export const CLAVE_VOLVER = 'pidoo_carta_participar'

// Versión del texto de condiciones que se acepta AQUÍ. Es propia y no la de
// `CreadoresCTA`: el texto de mesa dice cosas que el de pedido no (que el
// restaurante revisa el vídeo, y que el premio se gasta a domicilio). Si se
// compartiera la constante, cambiar este texto obligaría a subir la versión de
// un fichero que va dentro de la app de las tiendas. Así el consentimiento de
// mesa queda auditable por separado.
export const CONDICIONES_VERSION_MESA = 'creadores-mesa-2026-08-18'

export default function ParticiparMesa({ establecimiento, programa, onClose, onEnviado }) {
  return createPortal(
    // `sinPerfil`: carga la sesión, no el perfil. Evita que abrir este panel
    // dispare el diálogo de permiso de notificaciones del navegador (ver el
    // comentario de AuthContext). Aquí no hace falta el perfil para nada.
    <AuthProvider sinPerfil>
      <Panel establecimiento={establecimiento} programa={programa} onClose={onClose} onEnviado={onEnviado} />
    </AuthProvider>,
    document.body
  )
}

function Panel({ establecimiento, programa, onClose, onEnviado }) {
  const { user, loading } = useAuth()
  const [enviado, setEnviado] = useState(false)

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
          borderRadius: '20px 20px 0 0', padding: '18px 18px 24px',
          maxHeight: '92dvh', overflowY: 'auto',
          fontFamily: "'DM Sans', sans-serif", color: C.ink,
        }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>
              {enviado ? '¡Vídeo enviado!' : 'Graba un vídeo y gana premios'}
            </div>
            <div style={{ fontSize: 12.5, color: C.stone, marginTop: 2 }}>
              {establecimiento?.nombre}
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: C.stone,
          }}><X size={20} /></button>
        </div>

        {enviado
          ? <Enviado establecimiento={establecimiento} programa={programa} />
          : loading
            ? <div style={{ padding: '30px 0', textAlign: 'center', fontSize: 13, color: C.stone }}>Un momento…</div>
            : user
              ? <FormularioVideo
                  establecimiento={establecimiento}
                  programa={programa}
                  onHecho={() => { setEnviado(true); onEnviado?.() }} />
              : <Identificarse establecimiento={establecimiento} programa={programa} />}
      </div>
    </div>
  )
}

/* ── Sin cuenta ──────────────────────────────────────────────────────────── */
function Identificarse({ establecimiento, programa }) {
  const escalera = programa?.escalera || []

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, #FDE8D6 0%, #F7CFB2 100%)',
        border: `1px solid ${C.burnt}`, borderRadius: 14, padding: 14, marginBottom: 14,
      }}>
        <div style={{ fontSize: 13.5, color: '#7A4C28', lineHeight: 1.55 }}>
          Sube un vídeo de lo que estás comiendo a TikTok o Instagram y, según las
          visualizaciones que consiga, {establecimiento?.nombre} te regala un descuento.
        </div>
      </div>

      {escalera.length > 0 && (
        <div style={{
          background: '#fff', border: `1px solid ${C.border}`,
          borderRadius: 13, padding: 13, marginBottom: 14,
        }}>
          <CreadoresEscalera
            escalera={escalera}
            titulo="Lo que puedes ganar"
            compacto
            nota={`El premio se aplica solo en tu próximo pedido A DOMICILIO de ${establecimiento?.nombre || 'este restaurante'}. Aquí en la mesa la carta es solo para consultar.`} />
        </div>
      )}

      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
        Necesitas una cuenta de Pidoo
      </div>
      <div style={{ fontSize: 12.5, color: C.stone, lineHeight: 1.5, marginBottom: 10 }}>
        Es gratis y es donde se guarda tu premio.
      </div>
      {/* El alta por correo NO se termina de una sentada: la confirmación es
          obligatoria y el enlace del email devuelve a la portada de Pidoo, no
          aquí (`AuthContext.registro` fija `emailRedirectTo` al origen). Por eso
          se dice de antemano qué hacer. Es el único sitio del producto donde
          "vuelve a escanear" es una buena instrucción: el QR lo tiene delante,
          pegado en la mesa. Con Google no hay rodeo: vuelve solo. */}
      <div style={{ fontSize: 12.5, color: C.stone, lineHeight: 1.5, marginBottom: 12 }}>
        Con <strong>Google</strong> entras de un toque. Si te creas la cuenta con tu{' '}
        <strong>correo</strong>, tendrás que confirmarlo desde el email que te enviamos y
        volver a escanear el QR de la mesa para terminar.
      </div>

      {/* El formulario de siempre. Se le pasa la ruta de vuelta para que el rodeo
          de Google devuelva al cliente a esta misma carta y no a la portada. */}
      <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <Login nextPath={establecimiento?.slug ? `/${establecimiento.slug}/carta` : null} />
      </div>
    </div>
  )
}

/* ── Con cuenta: registrar el vídeo ──────────────────────────────────────── */
function FormularioVideo({ establecimiento, programa, onHecho }) {
  const [url, setUrl] = useState('')
  const [acepta, setAcepta] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [copiado, setCopiado] = useState(null)
  const [verCond, setVerCond] = useState(false)

  const analisis = url.trim() ? analizarUrlVideo(url) : null
  const puedeEnviar = analisis?.ok && acepta && !enviando

  // Los @ salen SIEMPRE de la base de datos (del restaurante y de Pidoo), nunca
  // escritos aquí: si un restaurante cambia de cuenta, esto se entera solo. Si
  // no tiene @, se cae a su nombre; mejor eso que mandar a una cuenta que no
  // existe.
  function textoPubli(red) {
    const rest = red === 'tiktok' ? programa?.tiktok : programa?.instagram
    const pidoo = red === 'tiktok' ? programa?.pidoo_tiktok : programa?.pidoo_instagram
    const quien = rest ? `@${rest}` : (programa?.nombre || establecimiento?.nombre || '')
    return `#publi · en colaboración con ${quien}${pidoo ? ` y @${pidoo}` : ''}`
  }

  const menciones = (() => {
    const rest = programa?.instagram || programa?.tiktok
    const pid = programa?.pidoo_instagram || programa?.pidoo_tiktok
    const a = rest ? `@${rest}` : (programa?.nombre || establecimiento?.nombre || 'el restaurante')
    return pid ? `${a} y @${pid}` : a
  })()

  function copiar(red) {
    navigator.clipboard?.writeText(textoPubli(red))
    setCopiado(red); setTimeout(() => setCopiado(null), 1600)
  }

  async function enviar() {
    if (!puedeEnviar) return
    setEnviando(true); setError(null)
    const { error: err } = await supabase.rpc('crear_participacion_creador_mesa', {
      p_establecimiento_id: establecimiento.id,
      p_share_url: url.trim(),
      p_red: analisis.red,
      p_video_id: analisis.videoId,
      p_usuario_red: analisis.usuario,
      p_condiciones_version: CONDICIONES_VERSION_MESA,
    })
    setEnviando(false)
    if (err) { setError(traducir(err.message)); return }
    onHecho()
  }

  return (
    <div>
      <Paso n={1} titulo="Graba tu pedido y súbelo" />
      <div style={{ fontSize: 12.5, color: C.stone, lineHeight: 1.5, marginBottom: 8 }}>
        Etiqueta a <strong>{menciones}</strong> y marca el vídeo como publicidad.
        Copia este texto y pégalo en la descripción:
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {['tiktok', 'instagram'].map(red => (
          <button key={red} onClick={() => copiar(red)} style={{
            flex: 1, padding: '10px 12px', borderRadius: 11, cursor: 'pointer',
            border: `1px solid ${C.border}`, background: '#fff', fontFamily: 'inherit',
            fontSize: 12.5, fontWeight: 700, color: C.ink,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {copiado === red ? <Check size={14} color={C.sage2} /> : <Copy size={14} color={C.stone} />}
            {copiado === red ? 'Copiado' : (red === 'tiktok' ? 'TikTok' : 'Instagram')}
          </button>
        ))}
      </div>

      <Paso n={2} titulo="Pega aquí el enlace del vídeo" />
      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://www.tiktok.com/@tucuenta/video/…"
        inputMode="url"
        autoCapitalize="off"
        autoCorrect="off"
        style={{
          width: '100%', padding: '12px 13px', borderRadius: 12,
          border: `1px solid ${url && !analisis?.ok ? C.danger : C.border}`,
          background: '#fff', fontSize: 13.5, fontFamily: 'inherit', color: C.ink,
          marginBottom: 6,
        }} />
      {url && !analisis?.ok && (
        <div style={{ fontSize: 11.5, color: C.danger, marginBottom: 8 }}>
          Ese enlace no parece de TikTok ni de Instagram.
        </div>
      )}

      {/* Casilla obligatoria. NO es decoración: un vídeo publicado a cambio de un
          descuento es comunicación comercial y hay que identificarla (Ley de
          Competencia Desleal art. 26 y LSSI art. 20). El responsable último es el
          anunciante, que es el restaurante. El servidor lo corrobora guardando la
          versión del texto aceptado (PD157). */}
      <label style={{
        display: 'flex', gap: 9, alignItems: 'flex-start', cursor: 'pointer',
        marginTop: 10, marginBottom: 4,
      }}>
        <input type="checkbox" checked={acepta} onChange={e => setAcepta(e.target.checked)}
          style={{ width: 17, height: 17, marginTop: 1, flexShrink: 0, accentColor: C.burnt }} />
        <span style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.45 }}>
          El vídeo es <strong>mío</strong>, lo he marcado como <strong>publicidad</strong>,
          he etiquetado a <strong>{menciones}</strong> y acepto las condiciones.
        </span>
      </label>

      <button onClick={() => setVerCond(v => !v)} style={{
        background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: C.stone,
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        Ver condiciones
        <ChevronDown size={14} style={{ transform: verCond ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
      </button>
      {verCond && (
        <ul style={{ fontSize: 11.5, color: C.stone, lineHeight: 1.6, paddingLeft: 18, margin: '2px 0 10px' }}>
          <li>El vídeo tiene que ser tuyo y estar publicado en abierto.</li>
          <li>Tienes que etiquetar a {menciones} e identificarlo como publicidad.</li>
          <li>Nos autorizas a ver el vídeo y sus visualizaciones para contarlas.</li>
          <li>El restaurante revisa el vídeo antes de que empiece a contar.</li>
          <li>El premio se aplica en tu próximo pedido <strong>a domicilio</strong> de este restaurante.</li>
          <li>Tienes que tener 14 años o más.</li>
          <li>
            Más detalle en <a href="/terminos" target="_blank" rel="noreferrer" style={{ color: C.terracotta }}>términos</a>
            {' '}y <a href="/privacidad" target="_blank" rel="noreferrer" style={{ color: C.terracotta }}>privacidad</a>.
          </li>
        </ul>
      )}

      {error && (
        <div style={{
          background: '#F7E4E1', border: `1px solid ${C.danger}`, borderRadius: 11,
          padding: '10px 12px', fontSize: 12.5, color: '#8C3B31', margin: '8px 0',
        }}>{error}</div>
      )}

      <button
        onClick={enviar}
        disabled={!puedeEnviar}
        style={{
          width: '100%', marginTop: 10, padding: '14px 16px', borderRadius: 13,
          border: 'none', cursor: puedeEnviar ? 'pointer' : 'default',
          background: puedeEnviar ? C.burnt : C.cream2,
          color: puedeEnviar ? '#fff' : C.stone2,
          fontFamily: 'inherit', fontSize: 14.5, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
        <Camera size={17} /> {enviando ? 'Enviando…' : 'Enviar mi vídeo'}
      </button>
    </div>
  )
}

function Paso({ n, titulo }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 7px' }}>
      <span style={{
        width: 21, height: 21, borderRadius: '50%', background: C.burnt, color: '#fff',
        fontSize: 11.5, fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>{n}</span>
      <span style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>{titulo}</span>
    </div>
  )
}

/* ── Enviado ─────────────────────────────────────────────────────────────── */
// Aquí es donde SÍ toca hablar de la app, y no antes: el cliente ya ha grabado y
// tiene un premio esperándole. Y se le vende el PREMIO, no la descarga — porque
// lo que va a encontrar en la app son los precios de domicilio, que son otros
// (en algunos platos, el doble). El descuento es justo lo que amortigua ese
// salto, así que es lo que tiene que ir por delante.
function Enviado({ establecimiento, programa }) {
  const tope = mejorPremioEuros(programa?.escalera || [])
  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, #FDE8D6 0%, #F7CFB2 100%)',
        border: `1px solid ${C.burnt}`, borderRadius: 14, padding: 15, marginBottom: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'rgba(255,255,255,0.7)', display: 'grid', placeItems: 'center',
          }}><Video size={17} color={C.burntText} /></div>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: '#8C420C' }}>
            {establecimiento?.nombre} lo revisará
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: '#7A4C28', lineHeight: 1.55 }}>
          En cuanto le dé el visto bueno, tu vídeo empieza a contar visualizaciones.
          Te avisamos cuando ganes tu premio.
        </div>
      </div>

      {/* La regla del domicilio, con todas las letras y en su propia caja. Es la
          condición que más disgusto puede dar si se descubre tarde: alguien que
          creyera que el descuento le vale en la mesa se sentiría engañado. */}
      <div style={{
        border: `1.5px solid ${C.burnt}`, borderRadius: 13, padding: 13, marginBottom: 14,
        background: '#fff',
      }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 4 }}>
          {tope > 0
            ? `Hasta ${fmtEur(tope)} € para tu próximo pedido a casa`
            : 'Tu descuento, para tu próximo pedido a casa'}
        </div>
        <div style={{ fontSize: 12.5, color: C.stone, lineHeight: 1.55 }}>
          El descuento <strong>solo se puede usar pidiendo a domicilio</strong> en{' '}
          {establecimiento?.nombre}, desde la app o desde pidoo.es. Aquí, en el
          local, no se aplica. Se te pondrá solo al pagar, sin códigos.
        </div>
      </div>

      <AppDownloadBanner
        slug={establecimiento?.slug}
        titulo="Ahí es donde te espera tu descuento"
        subtitulo="Y podrás ver las visualizaciones que lleva tu vídeo." />
    </div>
  )
}

/* ── Errores del servidor, en cristiano ──────────────────────────────────── */
function traducir(msg = '') {
  const m = String(msg)
  if (m.includes('PD142') || m.includes('iniciar sesion')) return 'Inicia sesión para participar.'
  if (m.includes('PD164') || m.includes('en revision')) return 'Ya tienes un vídeo de este restaurante esperando revisión.'
  if (m.includes('PD167')) return 'Ya has enviado varios vídeos de este restaurante este mes. Prueba dentro de unos días.'
  if (m.includes('PD169')) return 'Has enviado demasiados vídeos desde mesas hoy. Prueba mañana.'
  if (m.includes('PD149') || m.includes('ya esta registrado')) return 'Ese vídeo ya estaba registrado.'
  if (m.includes('PD147')) return 'Este restaurante no tiene el programa activo ahora mismo.'
  if (m.includes('PD143')) return 'El enlace del vídeo no es válido.'
  if (m.includes('PD157')) return 'Tienes que aceptar las condiciones.'
  return 'No se ha podido enviar. Inténtalo otra vez.'
}
