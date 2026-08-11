import { useState } from 'react'

/**
 * Logo animado de Pidoo: la moto entra, frena y sus dos ruedas se convierten en la
 * "oo" de Pidoo. WebP con alfa, se reproduce UNA sola vez y se queda fijo en el
 * último fotograma (el clip original terminaba fundiendo a blanco; ese final se cortó).
 *
 * Por qué WebP con alfa y no un vídeo: el mismo clip en MP4 pesa 39 KB en vez de 274,
 * pero su fondo es blanco y para hacerlo desaparecer haría falta mix-blend-mode:multiply,
 * que SOLO es correcto sobre fondos claros. El Login se abre sobre un velo gris
 * translúcido (rgba(15,15,15,0.55) + blur) y ahí el logo saldría marrón sucio. El alfa
 * real es el único que vale igual sobre crema que sobre ese velo.
 *
 * Geometría: el lienzo (580x290) lleva el logo EN REPOSO exactamente centrado y mide
 * 2,0337 veces el ancho que tenía `logo-cliente-t.png`. Por eso este componente ocupa
 * en layout justo lo mismo que ocupaba aquel PNG y la animación DESBORDA a los lados
 * (es la pista por la que entra la moto). Quien lo use necesita sitio de sobra o
 * recortar con overflow:hidden; no captura toques, así que no tapa nada pulsable.
 */

const FACTOR_LIENZO = 2.0337   // ancho del lienzo ÷ ancho equivalente del PNG
const RATIO_PNG = 172 / 374    // alto ÷ ancho del PNG original

export default function LogoAnimado({ ancho = 190, style }) {
  // Si el usuario pide menos movimiento (o el WebP no carga) se sirve el PNG fijo,
  // que cae exactamente en el mismo sitio y con el mismo tamaño.
  const [fijo, setFijo] = useState(() =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

  return (
    <div style={{ position: 'relative', width: ancho, height: Math.round(ancho * RATIO_PNG), ...style }}>
      <img
        src={fijo ? '/logo-cliente-t.png' : '/pidoo-logo-anim.webp'}
        alt="Pidoo"
        onError={() => setFijo(true)}
        style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: fijo ? ancho : Math.round(ancho * FACTOR_LIENZO),
          maxWidth: 'none', height: 'auto', display: 'block', pointerEvents: 'none',
        }}
      />
    </div>
  )
}
