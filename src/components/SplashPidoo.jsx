import { useState, useEffect } from 'react'

// El logo que se dibuja solo al abrir la app.
//
// POR QUÉ ASÍ Y NO EN EL SPLASH NATIVO: la pantalla que pinta iOS/Android antes
// de arrancar la app NO puede animarse — Apple solo admite un storyboard fijo, y
// Android una imagen. La animación tiene que vivir dentro de la app, justo
// después.
//
// ⚠️ Y POR ESO EL SPLASH NATIVO NO PUEDE LLEVAR EL LOGO. Esta animación EMPIEZA
// EN BLANCO y lo dibuja desde cero (comprobado fotograma a fotograma). Si el
// nativo enseña el logo ya hecho, se ve: logo entero -> desaparece -> se dibuja
// otra vez. Parece un fallo, no una animación. El nativo va con el fondo crema
// y NADA encima; este lo dibuja una sola vez.
//
// EL RECORTE A 3,1 s TAMPOCO ES ARBITRARIO: el fichero dura 6,1 s porque el
// último fotograma se queda congelado 3 s. Esos 3 s de espera muerta no se
// llegan a ver nunca — en cuanto el logo está dibujado, se sale.

const FONDO = '#FAF3EC'          // el MISMO del splash nativo (capacitor.config)
const DIBUJANDO_MS = 3125        // lo que tarda el logo en completarse
const FUNDIDO_MS = 320
const CLAVE = 'pidoo_splash_visto'

export default function SplashPidoo({ onDone }) {
  // ⚠️ LA DECISIÓN DE ENSEÑARLO SE TOMA AQUÍ, EN EL ESTADO INICIAL, NO EN EL
  // EFECTO. React monta los efectos DOS VECES en desarrollo: la primera vuelta
  // escribía la marca en sessionStorage y programaba los temporizadores, la
  // limpieza los cancelaba, y la segunda vuelta veía la marca ya puesta, salía
  // por el atajo y dejaba el splash colgado en pantalla PARA SIEMPRE, sin nadie
  // que lo quitara. Con el estado inicial perezoso las dos vueltas leen lo
  // mismo y la segunda vuelve a programar los temporizadores.
  const [fase, setFase] = useState(() => {
    let visto = false
    try { visto = sessionStorage.getItem(CLAVE) === '1' } catch (_) {}
    // Quien ha pedido menos animación no tiene por qué tragarse tres segundos.
    const menosMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    return (visto || menosMovimiento) ? 'oculto' : 'visible'
  })

  useEffect(() => {
    if (fase === 'oculto') { onDone?.(); return }
    try { sessionStorage.setItem(CLAVE, '1') } catch (_) {}
    const t1 = setTimeout(() => setFase('saliendo'), DIBUJANDO_MS)
    const t2 = setTimeout(() => { setFase('oculto'); onDone?.() }, DIBUJANDO_MS + FUNDIDO_MS)
    return () => { clearTimeout(t1); clearTimeout(t2) }
    // Solo al montar: si dependiera de `fase` se reprogramaría en cada cambio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (fase === 'oculto') return null

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: FONDO,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: fase === 'saliendo' ? 0 : 1,
        transition: `opacity ${FUNDIDO_MS}ms ease`,
        pointerEvents: fase === 'saliendo' ? 'none' : 'auto',
      }}
    >
      <img
        src="/pidoo-logo-anim.webp"
        alt=""
        style={{ width: 'min(62vw, 300px)', height: 'auto', display: 'block' }}
      />
    </div>
  )
}
