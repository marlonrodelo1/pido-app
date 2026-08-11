import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Video, X, Check, Copy } from 'lucide-react'
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
// responsable último es el ANUNCIANTE, es decir el restaurante. Por eso la
// casilla es obligatoria y el texto a copiar va aquí mismo: cerrarlo cuesta
// cero y no cerrarlo es un problema de otro.

const C = {
  paper: '#FBF8F2', cream2: '#EFE9DD', ink: '#1A1815', stone: '#6B6356', stone2: '#8A8174',
  terracotta: '#C5562C', burnt: '#E4671F', burntText: '#A85018', border: '#E8E1D3',
  sage2: '#6F8460', sageSoft: '#DDE3D3', danger: '#B5564A', dangerSoft: '#F1D0CB',
}

const fmtNum = (n) => Number(n || 0).toLocaleString('es-ES')

export default function CreadoresCTA({ pedido, establecimientoNombre, compacto = false, onRegistrado }) {
  const [programa, setPrograma] = useState(null)   // { admite_altas, escalera }
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

  // Nada que ofrecer: ni una línea de más en la pantalla.
  if (!programa?.admite_altas || yaRegistrado) return null

  const escalera = programa.escalera || []
  const primero = escalera[0]

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
          establecimientoNombre={establecimientoNombre}
          escalera={escalera}
          onClose={() => setAbierto(false)}
          onHecho={() => { setYaRegistrado(true); setAbierto(false); onRegistrado?.() }}
        />,
        document.body
      )}
    </>
  )
}

// Versión del texto de condiciones que el cliente acepta. Se guarda con la
// participación: si el texto cambia, hay que subir esto, o dentro de un año no
// se podrá saber qué aceptó exactamente cada uno.
export const CONDICIONES_VERSION = 'creadores-2026-08-11'

function ModalRegistrar({ pedido, establecimientoNombre, escalera, onClose, onHecho }) {
  const [url, setUrl] = useState('')
  const [aceptaPubli, setAceptaPubli] = useState(false)
  const [aceptaCond, setAceptaCond] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [copiado, setCopiado] = useState(false)

  const analisis = url.trim() ? analizarUrlVideo(url) : null
  const puedeEnviar = analisis?.ok && aceptaPubli && aceptaCond && !enviando
  const textoPubli = `#publi · en colaboración con ${establecimientoNombre || 'este restaurante'}`

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

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(26,24,21,0.55)', zIndex: 4000,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.paper, width: '100%', maxWidth: 480,
        borderRadius: '20px 20px 0 0', padding: 20,
        maxHeight: '92vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.ink }}>Registra tu vídeo</div>
            <div style={{ fontSize: 12.5, color: C.stone, marginTop: 3, lineHeight: 1.45 }}>
              Súbelo a TikTok o Instagram y pega aquí el enlace. Nosotros miramos las
              visualizaciones y te avisamos cuando ganes.
            </div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{
            width: 30, height: 30, borderRadius: 9, border: 'none', cursor: 'pointer',
            background: C.cream2, display: 'grid', placeItems: 'center', flexShrink: 0,
          }}><X size={16} color={C.stone} /></button>
        </div>

        {escalera.length > 0 && (
          <div style={{ background: C.cream2, borderRadius: 12, padding: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: C.stone, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>
              Lo que puedes ganar
            </div>
            {escalera.map(e => (
              <div key={e.nivel} style={{ display: 'flex', gap: 10, fontSize: 12.5, padding: '3px 0', color: C.ink }}>
                <span style={{ width: 66, flexShrink: 0, color: C.stone, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtNum(e.views_necesarias)}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>{e.descripcion}</span>
              </div>
            ))}
            <div style={{ fontSize: 11, color: C.stone, marginTop: 8, lineHeight: 1.4 }}>
              Te llevas un solo premio: el más alto que alcance el vídeo en 30 días.
            </div>
          </div>
        )}

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

        {/* Identificación publicitaria — obligatoria */}
        <div style={{
          marginTop: 14, padding: 12, borderRadius: 12,
          background: '#fff', border: `1px solid ${C.border}`,
        }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              type="checkbox" checked={aceptaPubli}
              onChange={e => setAceptaPubli(e.target.checked)}
              style={{ width: 18, height: 18, marginTop: 1, accentColor: C.burnt, flexShrink: 0 }}
            />
            <span style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.45 }}>
              He marcado el vídeo como <strong>contenido publicitario</strong>. Es obligatorio por
              ley cuando se recibe algo a cambio de publicar.
            </span>
          </label>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 10,
            padding: '8px 10px', borderRadius: 9, background: C.cream2,
          }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: C.stone, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {textoPubli}
            </span>
            <button
              onClick={() => { navigator.clipboard?.writeText(textoPubli); setCopiado(true); setTimeout(() => setCopiado(false), 1600) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 8,
                border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer',
                fontSize: 11.5, fontWeight: 700, color: C.ink, fontFamily: 'inherit', flexShrink: 0,
              }}>
              {copiado ? <Check size={12} /> : <Copy size={12} />} {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <div style={{ fontSize: 11, color: C.stone2, marginTop: 7, lineHeight: 1.4 }}>
            Pégalo en la descripción, o usa la etiqueta de colaboración pagada de la propia red.
          </div>
        </div>

        {/* Segunda casilla: lo que el cliente DECLARA y AUTORIZA. Separada de la
            anterior a propósito: son dos actos distintos —una obligación legal
            suya y una autorización a Pidoo— y mezclarlas en una sola casilla
            debilita las dos. Ambas quedan registradas con fecha y versión. */}
        <div style={{
          marginTop: 10, padding: 12, borderRadius: 12,
          background: '#fff', border: `1px solid ${C.border}`,
        }}>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              type="checkbox" checked={aceptaCond}
              onChange={e => setAceptaCond(e.target.checked)}
              style={{ width: 18, height: 18, marginTop: 1, accentColor: C.burnt, flexShrink: 0 }}
            />
            <span style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.45 }}>
              Declaro que el vídeo es <strong>mío</strong> y acepto las condiciones del programa.
            </span>
          </label>

          <ul style={{
            margin: '9px 0 0 28px', padding: 0, listStyle: 'disc',
            fontSize: 11.5, color: C.stone, lineHeight: 1.55,
          }}>
            <li>Lo he grabado y publicado yo, y sale mi pedido de {establecimientoNombre || 'este restaurante'}.</li>
            <li>Autorizo a Pidoo y al restaurante a <strong>ver el vídeo y su número de visualizaciones</strong> para comprobar el premio.</li>
            <li>Autorizo a que <strong>lo compartan en sus redes</strong> citando mi cuenta, mientras el vídeo esté público.</li>
            <li>Tengo <strong>14 años o más</strong>.</li>
            <li>
              Acepto los{' '}
              <a href="/terminos" target="_blank" rel="noopener noreferrer" style={{ color: C.terracotta, fontWeight: 700 }}>términos</a>
              {' '}y la{' '}
              <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: C.terracotta, fontWeight: 700 }}>política de privacidad</a>.
            </li>
          </ul>
        </div>

        {error && (
          <div style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 10,
            background: C.dangerSoft, color: C.danger, fontSize: 12.5, lineHeight: 1.45,
          }}>{error}</div>
        )}

        <button
          onClick={enviar} disabled={!puedeEnviar}
          style={{
            width: '100%', marginTop: 16, padding: '14px 0', borderRadius: 13, border: 'none',
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
  return msg || 'No se ha podido registrar. Inténtalo de nuevo.'
}
