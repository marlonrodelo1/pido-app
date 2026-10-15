import { useState } from 'react'
import { Check, Copy, ChevronDown, ExternalLink, AtSign } from 'lucide-react'
import { normalizarUsuarioRed } from '../lib/videoUrl'

// Pidoo Creadores con HISTORIAS (desde el 15 oct 2026).
//
// El cliente sube una historia de Instagram con su pedido, etiqueta al
// restaurante y a @pidooapp, y nos dice su @. Ya está: no hay enlace que pegar
// (una historia no deja uno que dure) ni visualizaciones que contar (solo las ve
// quien la sube).
//
// La prueba es la MENCIÓN: a la cuenta del restaurante le llega "te ha
// mencionado en su historia". El dueño la acepta en su panel y el premio sale en
// el acto; si no dice nada en 48 h, entra sola (`creadores_autoaprobar_pendientes`).
//
// Este formulario lo usan las DOS puertas —el pedido entregado (`CreadoresCTA`)
// y el QR de la mesa (`ParticiparMesa`)— para que el texto legal y los pasos
// sean exactamente los mismos en las dos. Cada una decide a qué RPC llama.

// Versión del texto que acepta el cliente. Si cambian las condiciones, se sube:
// se guarda con cada participación para poder saber qué aceptó cada uno.
export const CONDICIONES_VERSION_HISTORIA = 'creadores-historia-2026-10-15'

// Las horas que tiene el restaurante para revisarla antes de que entre sola.
// Las manda el servidor (`revision_horas`); esto es solo por si no llegan.
export const HORAS_REVISION_HISTORIA = 48

const C = {
  paper: '#FBF8F2', cream2: '#EFE9DD', ink: '#1A1815', stone: '#6B6356', stone2: '#8A8174',
  terracotta: '#C5562C', burnt: '#E4671F', burntText: '#A85018', border: '#E8E1D3',
  sage2: '#6F8460', danger: '#B5564A', dangerSoft: '#F1D0CB',
}

// A quién hay que etiquetar, sacado SIEMPRE de la base de datos. Si el
// restaurante no tiene su @ puesto, se le nombra (y el cliente lo buscará al
// mencionar); si Pidoo no tuviera cuenta, no se menciona.
export function mencionesHistoria(programa, nombreRest) {
  const rest = programa?.instagram ? `@${programa.instagram}` : null
  const pidoo = programa?.pidoo_instagram ? `@${programa.pidoo_instagram}` : null
  return {
    rest,
    pidoo,
    texto: [rest || nombreRest, pidoo].filter(Boolean).join(' y '),
    // Lo que se copia para pegar en la historia. "#publi" es la identificación
    // publicitaria: obligatoria cuando se publica a cambio de algo.
    paraCopiar: ['#publi', rest, pidoo].filter(Boolean).join(' '),
  }
}

function Paso({ n, titulo, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{
          width: 21, height: 21, borderRadius: '50%', background: C.burnt, color: '#fff',
          fontSize: 11.5, fontWeight: 800, display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>{n}</span>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>{titulo}</span>
      </div>
      <div style={{ paddingLeft: 29 }}>{children}</div>
    </div>
  )
}

/**
 * Los pasos + el @ + la casilla + el botón. `onEnviar(usuario)` hace la llamada
 * al servidor y devuelve `{ error }` (texto ya legible) o `{}` si fue bien.
 */
export function FormularioHistoria({ programa, nombreRest, onEnviar, desdeMesa = false }) {
  const [usuario, setUsuario] = useState('')
  const [acepta, setAcepta] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [copiado, setCopiado] = useState(false)
  const [verCond, setVerCond] = useState(false)

  const m = mencionesHistoria(programa, nombreRest)
  const u = normalizarUsuarioRed(usuario)
  const puedeEnviar = u.ok && acepta && !enviando
  const horas = programa?.revision_horas || HORAS_REVISION_HISTORIA

  function copiar() {
    navigator.clipboard?.writeText(m.paraCopiar)
    setCopiado(true); setTimeout(() => setCopiado(false), 1600)
  }

  async function enviar() {
    if (!puedeEnviar) return
    setEnviando(true); setError(null)
    const r = await onEnviar(u.usuario)
    setEnviando(false)
    if (r?.error) setError(r.error)
  }

  return (
    <div>
      <Paso n={1} titulo={desdeMesa ? 'Sube una historia de lo que estás comiendo' : 'Sube una historia con tu pedido'}>
        <div style={{ fontSize: 12.5, color: C.stone, lineHeight: 1.5 }}>
          Una foto o un vídeo, en tu historia de Instagram. Que se vea la comida.
        </div>
        <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8,
          padding: '8px 12px', borderRadius: 10, border: `1px solid ${C.burnt}`,
          background: '#fff', color: C.burntText, fontSize: 12.5, fontWeight: 800, textDecoration: 'none',
        }}>
          Abrir Instagram <ExternalLink size={12} />
        </a>
      </Paso>

      <Paso n={2} titulo={`Etiqueta a ${m.texto}`}>
        <div style={{ fontSize: 12.5, color: C.stone, lineHeight: 1.5 }}>
          Con el sticker de mención, y marca la historia como publicidad. Este texto lleva todo:
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 8,
          padding: '8px 10px', borderRadius: 10, background: C.cream2,
        }}>
          {/* Se ve entero (puede partir línea): es lo que el cliente tiene que
              reconocer luego en su historia. */}
          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: C.ink, overflowWrap: 'anywhere', lineHeight: 1.4 }}>
            {m.paraCopiar}
          </span>
          <button onClick={copiar} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 8,
            border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer',
            fontSize: 11.5, fontWeight: 700, color: C.ink, fontFamily: 'inherit', flexShrink: 0,
          }}>
            {copiado ? <Check size={12} /> : <Copy size={12} />} {copiado ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        {/* La mención de una cuenta privada solo le llega al restaurante si esa
            cuenta le sigue. Sin esto, el dueño no ve nada y la rechaza. */}
        <div style={{ fontSize: 11.5, color: C.stone2, marginTop: 6, lineHeight: 1.45 }}>
          Si tu cuenta es privada, sigue a {m.rest || nombreRest}: si no, no le llega la mención.
        </div>
      </Paso>

      <Paso n={3} titulo="Dinos tu usuario de Instagram">
        <div style={{ position: 'relative' }}>
          <AtSign size={15} color={C.stone2} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={usuario}
            onChange={e => { setUsuario(e.target.value); setError(null) }}
            placeholder="tu_usuario"
            autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            style={{
              width: '100%', padding: '12px 14px 12px 34px', borderRadius: 11, boxSizing: 'border-box',
              border: `1px solid ${usuario && !u.ok && !u.vacio ? C.danger : C.border}`,
              background: '#fff', fontSize: 14, color: C.ink, fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>
        {usuario && !u.ok && !u.vacio && (
          <div style={{ fontSize: 12, color: C.danger, marginTop: 6 }}>
            Ese usuario no parece de Instagram: solo letras, números, punto y guion bajo.
          </div>
        )}
        <div style={{ fontSize: 11.5, color: C.stone2, marginTop: 6, lineHeight: 1.45 }}>
          Es lo que usa {nombreRest} para encontrar tu historia entre sus menciones.
        </div>
      </Paso>

      {/* Casilla obligatoria. NO es decoración: publicar a cambio de un descuento
          es comunicación comercial y hay que identificarla (Ley de Competencia
          Desleal art. 26 y LSSI art. 20). El responsable último es el anunciante,
          el restaurante. El servidor guarda la versión aceptada (PD157). */}
      <label style={{
        display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer',
        padding: 12, borderRadius: 12, background: '#fff',
        border: `1px solid ${acepta ? C.burnt : C.border}`,
      }}>
        <input
          type="checkbox" checked={acepta}
          onChange={e => setAcepta(e.target.checked)}
          style={{ width: 18, height: 18, marginTop: 1, accentColor: C.burnt, flexShrink: 0 }}
        />
        <span style={{ fontSize: 12.5, color: C.ink, lineHeight: 1.45 }}>
          La historia es <strong>mía</strong>, la he marcado como <strong>publicidad</strong>,
          he etiquetado a <strong>{m.texto}</strong> y acepto las condiciones.
        </span>
      </label>

      <button onClick={() => setVerCond(v => !v)} style={{
        background: 'none', border: 'none', padding: '8px 0 2px', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: C.stone,
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        Ver condiciones
        <ChevronDown size={14} style={{ transform: verCond ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
      </button>
      {verCond && (
        <ul style={{ fontSize: 11.5, color: C.stone, lineHeight: 1.6, paddingLeft: 18, margin: '4px 0 6px' }}>
          <li>La he subido yo y sale {desdeMesa ? 'lo que he comido en' : 'mi pedido de'} {nombreRest}.</li>
          <li>La he marcado como publicidad (#publi o la etiqueta de colaboración). Es obligatorio por ley cuando se recibe algo a cambio de publicar.</li>
          <li><strong>He etiquetado a {m.texto}.</strong> Sin la mención, al restaurante no le llega y no hay premio.</li>
          <li>{nombreRest} la revisa. Si no lo hace en {horas} horas, el premio te llega igual. Puede rechazarla, indicando el motivo, si no ve tu mención.</li>
          <li>Autorizo a Pidoo y a {nombreRest} a ver la historia para comprobarla y a <strong>compartirla</strong> citando mi cuenta.</li>
          <li>El premio vale para mi próximo pedido <strong>a domicilio</strong> en {nombreRest}, se aplica solo al pagar y caduca a los 60 días.</li>
          <li>Tengo <strong>14 años o más</strong>.</li>
          <li>
            Acepto los{' '}
            <a href="/terminos" target="_blank" rel="noopener noreferrer" style={{ color: C.terracotta, fontWeight: 700 }}>términos</a>
            {' '}y la{' '}
            <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: C.terracotta, fontWeight: 700 }}>política de privacidad</a>.
          </li>
        </ul>
      )}

      {error && (
        <div style={{
          marginTop: 10, padding: '10px 12px', borderRadius: 10,
          background: C.dangerSoft, color: C.danger, fontSize: 12.5, lineHeight: 1.45,
        }}>{error}</div>
      )}

      <button
        onClick={enviar} disabled={!puedeEnviar}
        style={{
          width: '100%', marginTop: 12, padding: '14px 0', borderRadius: 13, border: 'none',
          background: puedeEnviar ? 'linear-gradient(180deg,#E4671F 0%,#C85417 100%)' : C.cream2,
          color: puedeEnviar ? '#fff' : C.stone2,
          fontSize: 15, fontWeight: 800, fontFamily: 'inherit',
          cursor: puedeEnviar ? 'pointer' : 'not-allowed',
        }}>
        {enviando ? 'Enviando…' : 'Ya la he subido'}
      </button>

      <div style={{ fontSize: 10.5, color: C.stone2, marginTop: 10, textAlign: 'center', lineHeight: 1.45 }}>
        Pidoo nunca publica nada en tu nombre.
      </div>
    </div>
  )
}

// Lo que se ve justo después de enviarla. El cliente tiene que salir sabiendo
// QUIÉN tiene que hacer algo ahora (el restaurante, no él) y CUÁNDO le llega.
export function HistoriaEnviada({ nombreRest, programa }) {
  const horas = programa?.revision_horas || HORAS_REVISION_HISTORIA
  return (
    <div style={{
      background: 'linear-gradient(135deg, #FDE8D6 0%, #F7CFB2 100%)',
      border: `1px solid ${C.burnt}`, borderRadius: 14, padding: 15,
    }}>
      <div style={{ fontSize: 14.5, fontWeight: 800, color: '#8C420C', marginBottom: 6 }}>
        {nombreRest} la confirmará
      </div>
      <div style={{ fontSize: 12.5, color: '#7A4C28', lineHeight: 1.55 }}>
        En cuanto vea tu mención, te damos el premio y te avisamos. Si no la revisa en{' '}
        {horas} horas, te llega igual. <strong>No borres la historia</strong> antes de 24 horas.
      </div>
    </div>
  )
}

// Los códigos PDxxx del servidor, en cristiano.
export function traducirErrorHistoria(msg = '') {
  const s = String(msg)
  if (s.includes('PD148') || s.includes('con este pedido')) return 'Ya enviaste una historia con este pedido.'
  if (s.includes('PD164')) return 'Ya tienes una historia de este restaurante esperando a que la revise.'
  if (s.includes('PD167')) return 'Ya has enviado varias historias de este restaurante este mes. Prueba dentro de unos días.'
  if (s.includes('PD169')) return 'Has enviado demasiadas historias desde mesas hoy. Prueba mañana.'
  if (s.includes('PD176') || s.includes('PD161')) return 'Revisa tu usuario de Instagram: solo letras, números, punto y guion bajo.'
  if (s.includes('PD175')) return 'Este restaurante ha cambiado su programa. Recarga la página.'
  if (s.includes('PD146') || s.includes('14 d')) return 'Han pasado más de 14 días desde este pedido.'
  if (s.includes('PD147') || s.includes('programa activo')) return 'Este restaurante no tiene el programa activo ahora mismo.'
  if (s.includes('PD145')) return 'Solo puedes participar con un pedido ya entregado.'
  if (s.includes('PD144')) return 'Ese pedido no es tuyo.'
  if (s.includes('PD142')) return 'Inicia sesión para participar.'
  if (s.includes('PD157')) return 'Tienes que aceptar las condiciones.'
  return 'No se ha podido enviar. Inténtalo otra vez.'
}
