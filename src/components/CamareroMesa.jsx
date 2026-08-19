/* ──────────────────────────────────────────────────────────────────────────
 * CamareroMesa — el camarero de voz de la carta de mesa.
 *
 * ⚠️ AQUÍ NO HAY WIDGET DE ELEVENLABS, Y NO ES UN OLVIDO. Antes se plantaba
 * el custom element `<elevenlabs-convai>`, que dibuja su propia interfaz
 * —transcripción, botones y el banner "Powered by ElevenAgents"— dentro de un
 * shadow DOM y se coloca él solo en la pantalla. No hay CSS que le quite el
 * texto de forma fiable. Como lo que se quiere es que se vea SOLO el orbe
 * encima de la carta, se habla con el agente por el SDK sin interfaz
 * (`@elevenlabs/client`), que no pinta absolutamente nada: la pantalla la
 * ponemos nosotros. De regalo desaparece el banner de ElevenLabs, que con el
 * widget no se podía quitar en este plan.
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
 *
 * ⚠️ EL SDK ENTRA POR `import()` DINÁMICO Y DEBE SEGUIR ASÍ. Este componente
 * ya se carga con `lazy`, pero además el SDK se lleva su propio trozo: quien
 * solo viene a mirar la carta no se descarga el motor de audio.
 * ────────────────────────────────────────────────────────────────────────── */
import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const OrbeVoz = lazy(() => import('./OrbeVoz'))
const PanelCuenta = lazy(() => import('./PanelCuenta'))

const FUNCIONES = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

const C = {
  ink: '#1A1815', stone: '#6B6560', paper: '#FFFDF9',
  cream: '#F7F3EC', border: '#E8E0D5', naranja: '#FF6B2C',
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

function rms(datos) {
  if (!datos || !datos.length) return 0
  let suma = 0
  for (let i = 0; i < datos.length; i++) {
    const v = datos[i] / 255
    suma += v * v
  }
  return Math.sqrt(suma / datos.length)
}

export default function CamareroMesa({ slug, tokenMesa, onClose }) {
  // abriendo → conectando → hablando · error en cualquier punto
  const [estado, setEstado] = useState('abriendo')
  const [error, setError] = useState(null)
  const [sesion, setSesion] = useState(null)
  const [intento, setIntento] = useState(0)
  // La cuenta que se pinta en pantalla. Viene ENTERA del servidor (`ver_ticket`)
  // y jamás de lo que diga el modelo: ver la cabecera de PanelCuenta.
  const [cuenta, setCuenta] = useState(null)

  const convRef = useRef(null)
  // El nivel de voz va por ref y NO por estado: es un valor que cambia 60
  // veces por segundo y como estado re-renderizaría el árbol entero (y
  // remontaría el WebGL) en cada fotograma.
  const nivelRef = useRef(0)

  // ⚠️ `onClose` TAMBIÉN va por ref, y esto no es manía: quien lo pasa es
  // `CartaLocal` con una flecha inline, que es una función NUEVA en cada
  // render suyo. Si estuviera en las dependencias del efecto de abajo,
  // cualquier re-render de la carta —una tecla en el buscador, un estado
  // cualquiera— cerraría la sesión de voz y abriría otra: la conversación se
  // cortaría a media frase y se pagaría dos veces.
  const cerrarRef = useRef(onClose)
  useEffect(() => { cerrarRef.current = onClose }, [onClose])

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
      } catch {
        if (vivo) { setError('Sin conexión. Comprueba el wifi o los datos.'); setEstado('error') }
      }
    })()
    return () => { vivo = false }
  }, [slug, tokenMesa])

  // 2. Con la sesión abierta, arrancar la conversación y leer el audio.
  useEffect(() => {
    if (!sesion) return
    let vivo = true
    let raf = 0
    setEstado('conectando')

    ;(async () => {
      try {
        const { Conversation } = await import('@elevenlabs/client')
        if (!vivo) return

        const conv = await Conversation.startSession({
          agentId: sesion.agent_id,
          // Websocket a pelo, no WebRTC, A PROPÓSITO: la CSP de pidoo.es solo
          // abre `wss://api.elevenlabs.io`. WebRTC negocia contra servidores
          // de LiveKit que habría que añadir a `connect-src` uno a uno, y el
          // día que la CSP deje de ser Report-Only el camarero moriría en
          // silencio.
          connectionType: 'websocket',
          // El token de sesión viaja como variable dinámica: es lo que las
          // herramientas del agente mandan al servidor en cada llamada. El
          // modelo no lo ve ni lo puede recitar.
          dynamicVariables: {
            session_token: sesion.session_token,
            mesa: String(sesion.mesa ?? ''),
            restaurante: sesion.restaurante?.nombre ?? '',
          },
          onDisconnect: () => {
            // Si se corta la conversación (el agente cuelga, se cae el wifi),
            // no se deja al cliente mirando un orbe que ya no escucha.
            if (vivo) cerrarRef.current?.()
          },
          onError: () => {
            if (!vivo) return
            setError('Se ha cortado la conversación. Vuelve a intentarlo.')
            setEstado('error')
          },
        })
        if (!vivo) { try { await conv.endSession() } catch { /* ya cerrada */ } return }

        convRef.current = conv
        setEstado('hablando')

        // El nivel sale de los analizadores DEL PROPIO SDK, que ya tiene el
        // micro abierto. Abrir aquí un segundo `getUserMedia` solo para medir
        // sería dos streams peleándose en el mismo teléfono.
        const leer = () => {
          raf = requestAnimationFrame(leer)
          try {
            const entrada = rms(conv.getInputByteFrequencyData?.())
            const salida = rms(conv.getOutputByteFrequencyData?.())
            // Se queda con el más fuerte de los dos: así el orbe se mueve
            // cuando habla el cliente Y cuando contesta el camarero.
            nivelRef.current = Math.min(1, Math.max(entrada * 4.5, salida * 3.2))
          } catch {
            // Conversación de solo texto o analizador aún no listo: el orbe
            // sigue girando en reposo, que es exactamente lo que toca.
            nivelRef.current = 0
          }
        }
        raf = requestAnimationFrame(leer)
      } catch (e) {
        if (!vivo) return
        const nombre = e?.name || ''
        const permiso = nombre === 'NotAllowedError' || nombre === 'SecurityError' ||
          /permission|denied/i.test(e?.message || '')
        setError(permiso
          ? 'Necesito el micrófono para escucharte. Dale a permitir cuando el navegador lo pida.'
          : 'No se ha podido abrir el camarero. Comprueba tu conexión y vuelve a intentarlo.')
        setEstado('error')
      }
    })()

    return () => {
      vivo = false
      cancelAnimationFrame(raf)
      nivelRef.current = 0
      // Cerrar la sesión es lo que suelta el micrófono. Si esto no corre, el
      // punto rojo del navegador se queda encendido con la carta delante.
      const conv = convRef.current
      convRef.current = null
      if (conv) { try { conv.endSession() } catch { /* ya cerrada */ } }
    }
  }, [sesion, intento])

  // 3. Sondear la cuenta para pintarla mientras se habla.
  //
  // ⚠️ EFECTO APARTE, Y TIENE QUE SEGUIR SIÉNDOLO. Meter esto dentro del efecto
  // de `startSession` (deps `[sesion, intento]`) haría que cada cambio de aquí
  // reabriese la conversación.
  //
  // Es sondeo y no Realtime por una razón comprobada, no por pereza:
  // `mesa_tickets` no está en la publicación de Realtime, tiene RLS activa con
  // CERO políticas y `anon` no tiene ni GRANT SELECT. Para que Realtime llegara
  // harían falta las tres cosas, y la política no se puede escribir: el cliente
  // de mesa es un anónimo sin sesión de Postgres, así que cualquier política que
  // él cumpla la cumple TODO anónimo — o sea, `select * from mesa_tickets` desde
  // el navegador de cualquiera, viendo lo que pide cada mesa de cada
  // restaurante. Es el mismo agujero de la app del socio del 14 ago.
  useEffect(() => {
    if (estado !== 'hablando' || !sesion?.session_token) return
    let vivo = true
    let temporizador = 0
    let version = null
    const aborto = new AbortController()

    const tirar = async () => {
      if (!vivo) return
      // Con la pantalla apagada o la pestaña de fondo no hay nadie mirando: no
      // se gasta ni una llamada. La carta se queda abierta encima de una mesa
      // un buen rato.
      if (!document.hidden) {
        try {
          const r = await fetch(`${FUNCIONES}/ia-mesa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'ver_ticket', session: sesion.session_token }),
            signal: aborto.signal,
          })
          const d = await r.json()
          if (!vivo) return
          if (r.ok && d?.ok) {
            // Solo se repinta si el servidor dice que algo cambió. Sin esto
            // serían treinta renders por minuto con el WebGL del orbe corriendo
            // al lado.
            const v = d.hay_cuenta ? d.version : 'vacia'
            if (v !== version) { version = v; setCuenta(d) }
          }
        } catch {
          // Un fallo de red no puede tumbar la conversación ni ensuciar la
          // pantalla: se calla y se reintenta en la siguiente vuelta.
        }
      }
      // Encadenado con setTimeout y no con setInterval: si una petición tarda,
      // no se solapan.
      if (vivo) temporizador = setTimeout(tirar, 2000)
    }
    tirar()

    return () => {
      vivo = false
      clearTimeout(temporizador)
      aborto.abort()
    }
  }, [estado, sesion?.session_token])

  const cerrar = () => {
    const conv = convRef.current
    convRef.current = null
    if (conv) { try { conv.endSession() } catch { /* ya cerrada */ } }
    onClose?.()
  }

  const hablando = estado === 'hablando'
  const hayCuenta = !!cuenta?.hay_cuenta && !!cuenta.lineas?.length

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Camarero de voz"
      style={{
        position: 'fixed', inset: 0, zIndex: 4000,
        // Glaseado CLARO y transparente: la carta se sigue leyendo detrás, solo
        // desenfocada. El velo es el crema de la carta a baja opacidad — no
        // está para tapar, sino para calmar el fondo lo justo y que el orbe se
        // recorte encima.
        // ⚠️ No subir la opacidad "para que se vea mejor el orbe": Marlon lo
        // quiere transparente a propósito, tiene que verse que sigues en la
        // carta y que la X te devuelve a ella.
        // ⚠️ Sin `backdrop-filter` (navegadores viejos) queda solo el velo
        // liso: por eso el color de respaldo es crema y no un gris cualquiera.
        background: 'rgba(247,243,236,0.40)',
        backdropFilter: 'blur(14px) saturate(1.1)',
        WebkitBackdropFilter: 'blur(14px) saturate(1.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        // Con una cuenta larga (una mesa pide varias rondas) el contenido puede
        // no caber en un móvil: que ruede por dentro. El aire de arriba deja
        // libre la X, que está en posición absoluta.
        overflowY: 'auto',
        padding: `calc(72px + env(safe-area-inset-top, 0px)) 24px calc(28px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      {/* La X flota arriba a la derecha y está SIEMPRE, en todos los estados:
          es la única salida y tiene que poder pulsarse aunque la conversación
          se haya quedado a medias. */}
      <button
        onClick={cerrar}
        aria-label="Cerrar y volver a la carta"
        style={{
          position: 'absolute',
          top: `calc(14px + env(safe-area-inset-top, 0px))`, right: 16,
          width: 42, height: 42, borderRadius: 999,
          border: `1px solid ${C.border}`,
          background: 'rgba(255,253,249,0.82)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          display: 'grid', placeItems: 'center', cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(26,24,21,0.10)',
        }}
      >
        <X size={19} color={C.ink} strokeWidth={2.2} />
      </button>

      {estado === 'error' ? (
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontSize: 14.5, color: C.ink, fontWeight: 600, lineHeight: 1.5 }}>
            {error}
          </div>
          <div style={{ display: 'flex', gap: 9, justifyContent: 'center', marginTop: 16 }}>
            {/* Reintentar es un clic de verdad, y eso importa: en iOS el audio
                solo arranca dentro de un gesto del usuario. Si el primer
                intento falló por eso, este botón lo arregla. */}
            {sesion && (
              <button
                onClick={() => { setError(null); setEstado('conectando'); setIntento(n => n + 1) }}
                style={{
                  padding: '10px 18px', borderRadius: 11, border: `1px solid ${C.border}`,
                  background: C.paper, color: C.ink, fontSize: 13.5, fontWeight: 700,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}>Reintentar</button>
            )}
            <button
              onClick={cerrar}
              style={{
                padding: '10px 18px', borderRadius: 11, border: 'none',
                background: C.naranja, color: '#fff', fontSize: 13.5, fontWeight: 700,
                fontFamily: 'inherit', cursor: 'pointer',
              }}>Volver a la carta</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          {/* El orbe, que es el protagonista. Lo único que puede acompañarlo es
              la cuenta: ni transcripción, ni botones, ni nombre del agente. Lo
              que se diga, se oye.
              ⚠️ El orbe NO va envuelto en nada que cambie de identidad al
              aparecer la cuenta: remontarlo tiraría el contexto WebGL y el orbe
              parpadearía cada vez que Nico hace un cálculo. Solo se le encoge
              la caja, que OrbeVoz reabsorbe con su ResizeObserver. */}
          <div style={{
            width: hayCuenta ? 'min(46vw, 190px)' : 'min(78vw, 340px)',
            height: hayCuenta ? 'min(46vw, 190px)' : 'min(78vw, 340px)',
            flexShrink: 0,
            // Sin conversación todavía, el orbe se atenúa: se ve que aún no
            // escucha sin tener que escribirlo.
            opacity: hablando ? 1 : 0.45,
            transition: 'opacity .45s ease, width .45s ease, height .45s ease',
          }}>
            <Suspense fallback={null}>
              <OrbeVoz nivelRef={nivelRef} />
            </Suspense>
          </div>

          {/* La cuenta. Aparece sola cuando Nico calcula y se va sola cuando no
              hay nada. El cliente no la pide ni la cierra: no hay nada que
              tocar. */}
          {hayCuenta && (
            <div style={{ width: '100%', marginTop: 20, display: 'flex', justifyContent: 'center' }}>
              <Suspense fallback={null}>
                <PanelCuenta cuenta={cuenta} />
              </Suspense>
            </div>
          )}

          {/* Todo lo que hay debajo desaparece en cuanto se conecta. El aviso
              legal se enseña ANTES de hablar, que es cuando sirve de algo, y
              además el propio camarero lo repite al saludar. Mientras se
              conversa la pantalla se queda limpia, que es la gracia. */}
          {!hablando && (
            <div style={{ textAlign: 'center', marginTop: 26, maxWidth: 300 }}>
              <div style={{ fontSize: 13.5, color: C.ink, fontWeight: 600 }}>
                {estado === 'abriendo' ? 'Abriendo el camarero…' : 'Conectando…'}
              </div>
              <div style={{ fontSize: 11, color: C.stone, lineHeight: 1.5, marginTop: 10 }}>
                Hablas con un camarero de inteligencia artificial y la conversación se graba.
                Si necesitas algo que no sepa resolver, avisa a un camarero del local.
              </div>
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  )
}
