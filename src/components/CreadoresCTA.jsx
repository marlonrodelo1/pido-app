import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Video, X, Check, Copy, ChevronDown, Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { analizarUrlVideo, NOMBRE_RED } from '../lib/videoUrl'

// Tarjeta "graba un vídeo y gana premios" + el modal para registrarlo.
//
// Se pinta en Tracking (tras la entrega) y en cada pedido entregado de
// MisPedidos. Si el restaurante no tiene el programa abierto, NO se pinta nada:
// para quien no participa la app queda exactamente igual que antes.
//
// ⚠️ EL AVISO DE PUBLICIDAD NO ES DECORACIÓN. Un vídeo publicado a cambio de un
// descuento es comunicación comercial con contraprestación, y la Ley de
// Competencia Desleal (art. 26) y la LSSI (art. 20) obligan a identificarla. El
// responsable último es el ANUNCIANTE, es decir el restaurante.
//
// EL MODAL ES DELIBERADAMENTE CORTO. La primera versión era un muro de texto
// que en un móvil no cabía ni scrolleaba bien. Ahora solo se ve lo que hace
// falta para actuar; lo demás vive detrás de desplegables cerrados. El
// consentimiento sigue siendo explícito y registrado: lo que se recorta es el
// ruido, no la cobertura.

// Versión del texto de condiciones que el cliente acepta. Se guarda con la
// participación: si el texto cambia, hay que subir esto, o dentro de un año no
// se podrá saber qué aceptó exactamente cada uno.
export const CONDICIONES_VERSION = 'creadores-2026-08-11b'

const C = {
  paper: '#FBF8F2', cream2: '#EFE9DD', ink: '#1A1815', stone: '#6B6356', stone2: '#8A8174',
  terracotta: '#C5562C', burnt: '#E4671F', burntText: '#A85018', border: '#E8E1D3',
  sage2: '#6F8460', danger: '#B5564A', dangerSoft: '#F1D0CB',
}

const fmtNum = (n) => Number(n || 0).toLocaleString('es-ES')

export default function CreadoresCTA({ pedido, establecimientoNombre, compacto = false, onRegistrado }) {
  const [programa, setPrograma] = useState(null)
  const [yaRegistrado, setYaRegistrado] = useState(false)
  const [abierto, setAbierto] = useState(false)

  const estId = pedido?.establecimiento_id

  useEffect(() => {
    let vivo = true
    async function mirar() {
      if (!estId || pedido?.estado !== 'entregado') return
      const [prog, part] = await Promise.all([
        supabase.rpc('creadores_programa_publico', { p_establecimiento_id: estId }),
        supabase.from('participaciones_creador').select('id').eq('pedido_id', pedido.id).maybeSingle(),
      ])
      if (!vivo) return
      setPrograma(prog.data || null)
      setYaRegistrado(!!part.data)
    }
    mirar()
    return () => { vivo = false }
  }, [estId, pedido?.id, pedido?.estado])

  if (!programa?.admite_altas || yaRegistrado) return null

  const escalera = programa.escalera || []
  const primero = escalera[0]
  // El nombre lo trae el propio RPC: Tracking.jsx hace `select('*')` sin join y
  // ahí `pedido.establecimientos` no existe. Antes salía "este restaurante".
  const nombreRest = programa.nombre || establecimientoNombre || 'este restaurante'

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
          background: 'linear-gradient(135deg, #FDE8D6 0%, #F7CFB2 100%)',
          border: `1px solid ${C.burnt}`, borderRadius: 14,
          padding: compacto ? '11px 13px' : '15px 16px', marginTop: compacto ? 10 : 14,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: 'rgba(255,255,255,0.65)', display: 'grid', placeItems: 'center',
        }}>
          <Video size={19} color={C.burntText} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: compacto ? 13 : 14.5, fontWeight: 800, color: C.burntText }}>
            Graba un vídeo y gana premios
          </div>
          <div style={{ fontSize: compacto ? 11.5 : 12.5, color: '#8A5A33', marginTop: 2, lineHeight: 1.4 }}>
            {primero
              ? `Desde ${fmtNum(primero.views_necesarias)} visualizaciones: ${primero.descripcion.toLowerCase()}`
              : 'Consigue descuentos para tu próximo pedido'}
          </div>
        </div>
      </button>

      {abierto && createPortal(
        <ModalRegistrar
          pedido={pedido}
          nombreRest={nombreRest}
          escalera={escalera}
          onClose={() => setAbierto(false)}
          onHecho={() => { setYaRegistrado(true); setAbierto(false); onRegistrado?.() }}
        />,
        document.body
      )}
    </>
  )
}

// ── Desplegable ─────────────────────────────────────────────────────────────
function Desplegable({ titulo, children, abiertoPorDefecto = false }) {
  const [ab, setAb] = useState(abiertoPorDefecto)
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: '#fff', marginTop: 10 }}>
      <button
        onClick={() => setAb(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '11px 13px', background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: C.ink, textAlign: 'left',
        }}>
        <span style={{ flex: 1 }}>{titulo}</span>
        <ChevronDown size={15} color={C.stone} style={{ transform: ab ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
      </button>
      {ab && <div style={{ padding: '0 13px 13px' }}>{children}</div>}
    </div>
  )
}

function ModalRegistrar({ pedido, nombreRest, escalera, onClose, onHecho }) {
  const [url, setUrl] = useState('')
  const [acepta, setAcepta] = useState(false)
  const [grabado, setGrabado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const inputCamara = useRef(null)

  const analisis = url.trim() ? analizarUrlVideo(url) : null
  const puedeEnviar = analisis?.ok && acepta && !enviando
  const textoPubli = `#publi · en colaboración con ${nombreRest}`

  async function enviar() {
    if (!puedeEnviar) return
    setEnviando(true); setError(null)
    const { error: err } = await supabase.rpc('crear_participacion_creador', {
      p_pedido_id: pedido.id,
      p_share_url: url.trim(),
      p_red: analisis.red,
      p_video_id: analisis.videoId,
      p_usuario_red: analisis.usuario,
      p_condiciones_version: CONDICIONES_VERSION,
    })
    setEnviando(false)
    if (err) { setError(traducir(err.message)); return }
    onHecho()
  }

  function copiar() {
    navigator.clipboard?.writeText(textoPubli)
    setCopiado(true); setTimeout(() => setCopiado(false), 1600)
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(26,24,21,0.55)', zIndex: 4000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.paper, width: '100%', maxWidth: 480,
          borderRadius: '20px 20px 0 0', padding: '18px 18px 24px',
          // `dvh` respeta la barra del navegador en móvil; con `vh` el contenido
          // quedaba por debajo del borde y no se llegaba al botón.
          maxHeight: '86dvh', overflowY: 'auto',
          overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch',
        }}>

        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.ink }}>Gana premios con tu vídeo</div>
            <div style={{ fontSize: 12.5, color: C.stone, marginTop: 2 }}>
              Publícalo en TikTok o Instagram y pega el enlace aquí.
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{
            width: 30, height: 30, borderRadius: 9, border: 'none', cursor: 'pointer',
            background: C.cream2, display: 'grid', placeItems: 'center', flexShrink: 0,
          }}><X size={16} color={C.stone} /></button>
        </div>

        {/* Escalera — lo único que de verdad motiva */}
        {escalera.length > 0 && (
          <div style={{ background: C.cream2, borderRadius: 12, padding: '10px 12px', marginBottom: 12 }}>
            {escalera.map(e => (
              <div key={e.nivel} style={{ display: 'flex', gap: 10, fontSize: 12.5, padding: '3px 0', color: C.ink }}>
                <span style={{ width: 62, flexShrink: 0, color: C.stone, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtNum(e.views_necesarias)}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>{e.descripcion}</span>
              </div>
            ))}
          </div>
        )}

        {/* Grabar. El móvil devuelve el vídeo a la galería, no lo publica: por eso
            justo después aparece el paso que de verdad da el premio. */}
        <input
          ref={inputCamara} type="file" accept="video/*" capture="environment"
          onChange={() => setGrabado(true)}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => inputCamara.current?.click()}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 12, cursor: 'pointer',
            border: `1.5px solid ${C.burnt}`, background: '#fff', fontFamily: 'inherit',
            fontSize: 14, fontWeight: 800, color: C.burntText,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          <Camera size={17} /> Grabar mi vídeo
        </button>

        {grabado && (
          <div style={{
            marginTop: 10, padding: 12, borderRadius: 12,
            background: 'linear-gradient(135deg, #FDE8D6 0%, #F7CFB2 100%)',
            border: `1px solid ${C.burnt}`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.burntText }}>Ya lo tienes grabado. Ahora súbelo</div>
            <div style={{ fontSize: 11.5, color: '#8A5A33', marginTop: 2, lineHeight: 1.4 }}>
              El premio va por visualizaciones, así que tiene que estar publicado.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <a href="https://www.tiktok.com/upload" target="_blank" rel="noopener noreferrer"
                 style={btnRed}>TikTok</a>
              <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer"
                 style={btnRed}>Instagram</a>
            </div>
            <button onClick={copiar} style={{
              width: '100%', marginTop: 8, padding: '9px 10px', borderRadius: 9,
              border: `1px solid ${C.burnt}`, background: 'rgba(255,255,255,0.7)', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, color: C.burntText,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {copiado ? <Check size={13} /> : <Copy size={13} />}
              {copiado ? 'Copiado' : 'Copiar el texto de publicidad'}
            </button>
          </div>
        )}

        {/* Enlace */}
        <div style={{ marginTop: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.stone, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Enlace del vídeo
          </label>
          <input
            value={url}
            onChange={e => { setUrl(e.target.value); setError(null) }}
            placeholder="Pega aquí el enlace de tu TikTok o Reel"
            autoComplete="off" autoCapitalize="none" spellCheck={false}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 11, marginTop: 6,
              border: `1px solid ${analisis && !analisis.ok ? C.danger : C.border}`,
              background: '#fff', fontSize: 14, color: C.ink, fontFamily: 'inherit',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          {analisis && !analisis.ok && (
            <div style={{ fontSize: 12, color: C.danger, marginTop: 6, lineHeight: 1.4 }}>{analisis.motivo}</div>
          )}
          {analisis?.ok && (
            <div style={{ fontSize: 12, color: C.sage2, marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Check size={13} /> Vídeo de {NOMBRE_RED[analisis.red]} reconocido
            </div>
          )}
        </div>

        {/* Consentimiento: una línea corta, el detalle detrás del desplegable.
            Sigue siendo un acto afirmativo y queda registrado con fecha y versión. */}
        <label style={{
          display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer',
          marginTop: 14, padding: 12, borderRadius: 12, background: '#fff',
          border: `1px solid ${acepta ? C.burnt : C.border}`,
        }}>
          <input
            type="checkbox" checked={acepta}
            onChange={e => setAcepta(e.target.checked)}
            style={{ width: 18, height: 18, marginTop: 1, accentColor: C.burnt, flexShrink: 0 }}
          />
          <span style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.45 }}>
            El vídeo es <strong>mío</strong>, lo he marcado como <strong>publicidad</strong> y acepto
            las condiciones.
          </span>
        </label>

        <Desplegable titulo="Ver condiciones">
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: C.stone, lineHeight: 1.6 }}>
            <li>Lo he grabado y publicado yo, y sale mi pedido de {nombreRest}.</li>
            <li>He identificado el vídeo como publicidad. Es obligatorio por ley cuando se recibe algo a cambio de publicar.</li>
            <li>Autorizo a Pidoo y a {nombreRest} a <strong>ver el vídeo y sus visualizaciones</strong> para comprobar el premio.</li>
            <li>Autorizo a que <strong>lo compartan en sus redes</strong> citando mi cuenta, mientras el vídeo esté público.</li>
            <li>Tengo <strong>14 años o más</strong>.</li>
            <li>
              Acepto los{' '}
              <a href="/terminos" target="_blank" rel="noopener noreferrer" style={{ color: C.terracotta, fontWeight: 700 }}>términos</a>
              {' '}y la{' '}
              <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: C.terracotta, fontWeight: 700 }}>política de privacidad</a>.
            </li>
          </ul>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 10,
            padding: '8px 10px', borderRadius: 9, background: C.cream2,
          }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: C.stone, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {textoPubli}
            </span>
            <button onClick={copiar} style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 8,
              border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer',
              fontSize: 11, fontWeight: 700, color: C.ink, fontFamily: 'inherit', flexShrink: 0,
            }}>
              {copiado ? <Check size={12} /> : <Copy size={12} />} {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </Desplegable>

        <Desplegable titulo="Cómo tiene que ser tu vídeo">
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: C.stone, lineHeight: 1.6 }}>
            <li>Que se vea <strong>la comida de tu pedido</strong>. Es lo que hace que cuente.</li>
            <li><strong>Etiqueta a {nombreRest}</strong> en el vídeo o en la descripción.</li>
            <li>Que el vídeo esté <strong>público</strong>: si tu cuenta es privada no podemos ver las visualizaciones y no hay premio.</li>
            <li>Pega el texto de publicidad en la descripción.</li>
            <li>Dura lo que tú quieras. Cuenta el vídeo, no su duración.</li>
            <li>Si sale el repartidor o alguien más, pídele permiso antes.</li>
          </ul>
          <div style={{ fontSize: 11, color: C.stone2, marginTop: 8, lineHeight: 1.5 }}>
            {nombreRest} puede rechazar un vídeo que no tenga que ver con su local, indicando el motivo.
          </div>
        </Desplegable>

        {error && (
          <div style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 10,
            background: C.dangerSoft, color: C.danger, fontSize: 12.5, lineHeight: 1.45,
          }}>{error}</div>
        )}

        <button
          onClick={enviar} disabled={!puedeEnviar}
          style={{
            width: '100%', marginTop: 14, padding: '14px 0', borderRadius: 13, border: 'none',
            background: puedeEnviar ? 'linear-gradient(180deg,#E4671F 0%,#C85417 100%)' : C.cream2,
            color: puedeEnviar ? '#fff' : C.stone2,
            fontSize: 15, fontWeight: 800, fontFamily: 'inherit',
            cursor: puedeEnviar ? 'pointer' : 'not-allowed',
          }}>
          {enviando ? 'Registrando…' : 'Registrar mi vídeo'}
        </button>

        <div style={{ fontSize: 10.5, color: C.stone2, marginTop: 10, textAlign: 'center', lineHeight: 1.45 }}>
          Solo leemos el número de visualizaciones. Pidoo nunca publica nada en tu nombre.
        </div>
      </div>
    </div>
  )
}

const btnRed = {
  flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 9,
  background: '#fff', border: `1px solid ${C.burnt}`, color: C.burntText,
  fontSize: 12.5, fontWeight: 800, textDecoration: 'none',
}

// Los códigos PDxxx del servidor, en cristiano.
function traducir(msg = '') {
  if (msg.includes('PD148') || msg.includes('con este pedido')) return 'Ya has registrado un vídeo con este pedido.'
  if (msg.includes('PD149') || msg.includes('ya esta registrado')) return 'Ese vídeo ya está registrado.'
  if (msg.includes('PD146') || msg.includes('14 d')) return 'Han pasado más de 14 días desde este pedido.'
  if (msg.includes('PD147') || msg.includes('programa activo')) return 'Este restaurante ya no admite vídeos nuevos.'
  if (msg.includes('PD145') || msg.includes('entregado')) return 'Solo puedes participar con un pedido ya entregado.'
  if (msg.includes('PD144') || msg.includes('no es tuyo')) return 'Ese pedido no es tuyo.'
  if (msg.includes('PD143')) return 'Ese enlace no vale. Tiene que ser de TikTok o Instagram.'
  if (msg.includes('PD142')) return 'Inicia sesión para participar.'
  if (msg.includes('PD157')) return 'Tienes que aceptar las condiciones.'
  return msg || 'No se ha podido registrar. Inténtalo de nuevo.'
}
