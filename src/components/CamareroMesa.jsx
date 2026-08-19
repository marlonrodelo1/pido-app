/* ──────────────────────────────────────────────────────────────────────────
 * CamareroMesa — el camarero de voz de la carta de mesa.
 *
 * ⚠️ ESTE COMPONENTE SE CARGA CON `lazy` Y NO DEBE DEJAR DE HACERLO. Arrastra
 * el SDK de ElevenLabs desde unpkg; quien solo viene a mirar la carta no tiene
 * por qué descargarse nada de eso.
 *
 * ⚠️ NO monta `CartProvider` NI `AuthProvider`, igual que el resto de
 * `/[slug]/carta`. No es un descuido:
 *   - Sin `CartProvider` no existe ningún camino por el que un `precio_local`
 *     pueda acabar en `pedido_items` desde el navegador. El pedido lo crea la
 *     edge `ia-mesa` en el servidor, con `service_role`, y el navegador nunca
 *     ve ni toca un precio.
 *   - Sin `AuthProvider` no salta el diálogo de permiso de notificaciones a
 *     quien tenga sesión iniciada. Una denegación se guarda POR ORIGEN y
 *     dejaría a pidoo.es sin push para siempre.
 *
 * LA SESIÓN SE ABRE AQUÍ DENTRO, no en CartaLocal: si viviera fuera, cada
 * escaneo de un QR abriría una fila en `mesa_sesiones` aunque nadie hablara.
 * Al durar 180 minutos, la tabla se llenaría de basura.
 *
 * El token de mesa (`?m=`) es una PISTA, nunca una credencial: quien manda es
 * el servidor, que lo valida contra `mesas` junto con el restaurante, el
 * horario y si el camarero está encendido.
 * ────────────────────────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Mic } from 'lucide-react'

const SDK = 'https://unpkg.com/@elevenlabs/convai-widget-embed'
const FUNCIONES = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

const C = {
  ink: '#1A1815', stone: '#6B6560', paper: '#FFFDF9',
  cream: '#F7F2EA', border: '#E8E0D5', naranja: '#FF6B2C',
}

// El servidor devuelve el motivo en seco. Aquí se traduce a algo que una
// persona sentada en un bar pueda entender y actuar en consecuencia.
const MOTIVOS = {
  fuera_de_horario:        'Ahora mismo la cocina está cerrada. Si necesitas algo, avisa a un camarero.',
  camarero_no_activo:      'Este restaurante todavía no tiene camarero virtual.',
  camarero_pausado:        'El camarero está en pausa ahora mismo. Avisa a un camarero del local.',
  mesa_desconocida:        'Este código de mesa no vale. Prueba a escanear otra vez el QR de tu mesa.',
  mesa_inactiva:           'Esta mesa está desactivada. Avisa a un camarero.',
  restaurante_no_disponible: 'El restaurante no está disponible en este momento.',
  faltan_datos:            'Falta el código de la mesa. Escanea el QR que hay en tu mesa.',
}

// El SDK se carga una sola vez por pestaña, aunque el panel se abra y se
// cierre varias veces.
let cargaSdk = null
function cargarSdk() {
  if (cargaSdk) return cargaSdk
  cargaSdk = new Promise((resolve, reject) => {
    if (window.customElements?.get('elevenlabs-convai')) return resolve()
    const s = document.createElement('script')
    s.src = SDK
    s.async = true
    s.type = 'text/javascript'
    s.onload = () => {
      // El script define el custom element de forma asíncrona.
      if (window.customElements?.whenDefined) {
        window.customElements.whenDefined('elevenlabs-convai').then(resolve, resolve)
      } else resolve()
    }
    s.onerror = () => { cargaSdk = null; reject(new Error('no se pudo cargar el camarero')) }
    document.head.appendChild(s)
  })
  return cargaSdk
}

export default function CamareroMesa({ slug, tokenMesa, onClose }) {
  const [estado, setEstado] = useState('abriendo')   // abriendo | listo | error
  const [error, setError] = useState(null)
  const [sesion, setSesion] = useState(null)
  const hueco = useRef(null)

  // 1. Abrir sesión de mesa contra el servidor.
  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const r = await fetch(`${FUNCIONES}/ia-mesa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sesion_mesa', slug, m: tokenMesa }),
        })
        const d = await r.json()
        if (!vivo) return
        if (!r.ok || !d?.session_token) {
          setError(MOTIVOS[d?.error] || 'No se ha podido abrir el camarero. Avisa a un camarero del local.')
          setEstado('error')
          return
        }
        if (!d.agent_id) {
          setError('Este restaurante aún no tiene el camarero configurado.')
          setEstado('error')
          return
        }
        setSesion(d)
      } catch (_) {
        if (vivo) { setError('Sin conexión. Comprueba el wifi o los datos.'); setEstado('error') }
      }
    })()
    return () => { vivo = false }
  }, [slug, tokenMesa])

  // 2. Con la sesión abierta, cargar el SDK y plantar el widget.
  useEffect(() => {
    if (!sesion || !hueco.current) return
    let vivo = true
    cargarSdk().then(() => {
      if (!vivo || !hueco.current) return
      const el = document.createElement('elevenlabs-convai')
      el.setAttribute('agent-id', sesion.agent_id)
      // El token de sesión viaja como variable dinámica: es lo que las
      // herramientas del agente mandan al servidor en cada llamada. El modelo
      // no lo ve ni lo puede recitar.
      el.setAttribute('dynamic-variables', JSON.stringify({
        session_token: sesion.session_token,
        mesa: String(sesion.mesa ?? ''),
        restaurante: sesion.restaurante?.nombre ?? '',
      }))
      hueco.current.appendChild(el)
      setEstado('listo')
    }).catch(() => {
      if (vivo) { setError('No se ha podido cargar el camarero. Comprueba tu conexión.'); setEstado('error') }
    })
    return () => {
      vivo = false
      // Quitar el widget al cerrar corta la conversación y suelta el micro.
      if (hueco.current) hueco.current.innerHTML = ''
    }
  }, [sesion])

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 4000, background: C.paper,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Cabecera */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: `calc(12px + env(safe-area-inset-top, 0px)) 16px 12px`,
        borderBottom: `1px solid ${C.border}`, background: C.paper,
      }}>
        <Mic size={17} color={C.naranja} strokeWidth={2.2} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, letterSpacing: '-0.01em' }}>
            {sesion?.nombre_agente || 'Camarero'}
          </div>
          {sesion?.mesa && (
            <div style={{ fontSize: 11.5, color: C.stone, marginTop: 1 }}>
              Mesa {sesion.mesa}
              {sesion.restaurante?.nombre ? ` · ${sesion.restaurante.nombre}` : ''}
            </div>
          )}
        </div>
        <button onClick={onClose} aria-label="Cerrar" style={{
          width: 34, height: 34, borderRadius: 999, border: `1px solid ${C.border}`,
          background: C.cream, display: 'grid', placeItems: 'center', cursor: 'pointer',
          flexShrink: 0,
        }}>
          <X size={16} color={C.stone} strokeWidth={2.2} />
        </button>
      </div>

      {/* El aviso va justo bajo la cabecera y NO al pie: el widget de
          ElevenLabs se posiciona solo, ocupa la mitad inferior de la pantalla y
          taparía cualquier cosa que se ponga ahí abajo. Lo de que es una IA y
          de que se graba lo dice además el propio camarero al saludar. */}
      {estado === 'listo' && (
        <div style={{
          padding: '9px 22px', background: C.cream,
          borderBottom: `1px solid ${C.border}`,
          fontSize: 11, color: C.stone, lineHeight: 1.45, textAlign: 'center',
        }}>
          Hablas con un camarero de inteligencia artificial y la conversación se graba.
          Si necesitas algo que no sepa resolver, avisa a un camarero del local.
        </div>
      )}

      {/* Cuerpo */}
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 22, textAlign: 'center',
      }}>
        {estado === 'abriendo' && (
          <div style={{ fontSize: 13.5, color: C.stone }}>Abriendo el camarero…</div>
        )}

        {estado === 'error' && (
          <>
            <div style={{ fontSize: 14, color: C.ink, fontWeight: 600, marginBottom: 8, maxWidth: 320, lineHeight: 1.5 }}>
              {error}
            </div>
            <button onClick={onClose} style={{
              marginTop: 10, padding: '10px 18px', borderRadius: 11, border: 'none',
              background: C.naranja, color: '#fff', fontSize: 13.5, fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer',
            }}>Volver a la carta</button>
          </>
        )}

        {/* El widget se planta aquí y se queda montado aunque cambie el estado:
            desmontarlo cortaría la conversación en curso. Nada de texto propio
            dentro de este hueco — el widget se dibuja encima y lo taparía. */}
        <div ref={hueco} style={{ width: '100%' }} />
      </div>

    </div>,
    document.body
  )
}
