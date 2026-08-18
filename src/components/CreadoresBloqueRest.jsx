import { useState, useEffect } from 'react'
import { Video, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import CreadoresEscalera, { fmtEur, mejorPremioEuros } from './CreadoresEscalera'

// El bloque de Pidoo Creadores dentro de la ficha de un restaurante.
//
// Va ANTES de pedir, no después: la tarjeta de "graba un vídeo" solo aparecía
// con el pedido ya entregado, así que el cliente no sabía que esto existía hasta
// que había pedido. Si el restaurante no tiene el programa abierto, no pinta
// nada y la ficha queda exactamente como antes.
//
// VIVE AQUÍ Y NO EN CADA PANTALLA porque son TRES las que lo enseñan: la ficha
// dentro de la app, la tienda pública en móvil (las dos son `RestDetalle`) y la
// tienda pública en escritorio (`TiendaDesktop`, otro componente). Duplicarlo
// era garantizar que en unas semanas dijeran cosas distintas — es exactamente el
// fallo que ya mordió con el texto y el importe de los premios, y con el
// distintivo de las promociones (`lib/promo.js`).
//
// El programa se puede pasar ya cargado (`programa`) o dejar que lo pida él con
// `establecimientoId`: `RestDetalle` ya lo tiene de antes y no vale la pena
// pedirlo dos veces.
// `intro` y `nota` son opcionales y solo las usa la carta del QR de la mesa: allí
// el texto de siempre ("Pide aquí...") es FALSO, porque desde la mesa no se puede
// pedir, y además hay que decir que el premio se gasta A DOMICILIO. Sin ellas, el
// componente dice exactamente lo mismo que decía antes en la ficha, la tienda y
// la app, que es donde sí se pide.
export default function CreadoresBloqueRest({
  programa = null,
  establecimientoId = null,
  onOpenCreadores = null,
  margenSuperior = 18,
  intro = null,
  nota = null,
}) {
  const [prog, setProg] = useState(programa)
  const [abierto, setAbierto] = useState(false)

  useEffect(() => { setProg(programa) }, [programa])

  useEffect(() => {
    if (programa || !establecimientoId) return
    let vivo = true
    supabase.rpc('creadores_programa_publico', { p_establecimiento_id: establecimientoId })
      .then(({ data }) => { if (vivo) setProg(data || null) })
    return () => { vivo = false }
  }, [programa, establecimientoId])

  if (!prog?.admite_altas || !(prog.escalera?.length > 0)) return null

  const tope = mejorPremioEuros(prog.escalera)

  return (
    <div style={{ marginTop: margenSuperior }}>
      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #FDE8D6 0%, #F7CFB2 100%)',
        border: '1px solid #E4671F', borderRadius: 16, overflow: 'hidden',
      }}>
        {/* Mismo aspecto que el banner de la Home: es el mismo programa y tiene
            que reconocerse de un vistazo. Destaca sin gritar — no compite con la
            carta, que es a lo que se viene.

            Nace PLEGADO: desplegado ocupa media pantalla y empuja los platos
            fuera de la vista. La cabecera ya lleva el gancho (el premio más
            alto), así que lo abre quien tiene interés.

            Los @keyframes `pidooCamGuino` y `pidooRecPulso` viven en index.css:
            la misma cámara sale también en el menú del perfil. */}

        {/* La foto entra por el borde derecho y se disuelve antes de llegar al
            texto. Los 118 px y la opacidad NO son a ojo: con ellos el texto
            conserva 4,7:1 de contraste, medido contra los píxeles reales de la
            imagen. Si se tocan, hay que volver a medirlo. */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: 118,
          backgroundImage: 'url(/creadores-fondo.webp)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.34, pointerEvents: 'none',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.10) 62%, #000 100%)',
          maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.10) 62%, #000 100%)',
        }} />

        <button
          onClick={() => setAbierto(v => !v)}
          aria-expanded={abierto}
          style={{
            position: 'relative', zIndex: 1,
            width: '100%', display: 'flex', alignItems: 'center', gap: 11,
            padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', textAlign: 'left',
          }}>
          <div style={{
            position: 'relative', flexShrink: 0,
            width: 34, height: 34, borderRadius: 10,
            background: 'rgba(255,255,255,0.7)', display: 'grid', placeItems: 'center',
          }}>
            <Video size={17} color="#A85018" className="pidoo-cam"
              style={{ animation: 'pidooCamGuino 4.5s ease-in-out infinite' }} />
            {/* El punto rojo de "grabando". Es lo que hace que se lea como una
                cámara en marcha y no como un icono más. */}
            <span className="pidoo-rec" aria-hidden="true" style={{
              position: 'absolute', top: 5, right: 5,
              width: 6, height: 6, borderRadius: '50%', background: '#E03B3B',
              animation: 'pidooRecPulso 1.6s ease-in-out infinite',
            }} />
          </div>
          {/* Titular CORTO para que quepa en una línea: con dos, el bloque se
              comía 100 px de la ficha. La cifra va delante porque es el gancho,
              y "de descuento" no se puede quitar — sin eso se lee como dinero en
              metálico y sería publicidad engañosa. */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: '#8C420C', lineHeight: 1.2 }}>
              {tope > 0 ? `Hasta ${fmtEur(tope)} € de descuento` : 'Descuentos por tu vídeo'}
            </div>
            {!abierto && (
              <div style={{ fontSize: 12, color: '#7A4C28', marginTop: 1, lineHeight: 1.3 }}>
                por tu vídeo, según sus visualizaciones
              </div>
            )}
          </div>
          <ChevronDown size={17} color="#A85018" style={{
            flexShrink: 0,
            transform: abierto ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.18s',
          }} />
        </button>

        {abierto && (
          <div style={{ padding: '0 15px 15px' }}>
            <div style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 13, padding: 13 }}>
              <p style={{ fontSize: 12.5, color: '#7A4C28', marginTop: 0, marginBottom: 10, lineHeight: 1.5 }}>
                {intro || 'Pide aquí, graba tu pedido en TikTok o Instagram y, según las visualizaciones que consiga, te llevas esto para la próxima:'}
              </p>
              <CreadoresEscalera escalera={prog.escalera} compacto
                // Desde el 18 ago el premio SOLO vale a domicilio (el servidor lo
                // impone), así que hay que decirlo aquí, antes de grabar. Que se
                // descubra al ir a pagar una recogida sería el peor momento.
                nota={nota || 'El descuento se aplica solo al pagar tu siguiente pedido A DOMICILIO en este restaurante. Necesitas una cuenta de Pidoo para participar.'} />
            </div>

            {/* Aquí no cabe explicar el programa entero (qué hay que etiquetar,
                cuánto duran los premios, las condiciones). El botón lleva a la
                pantalla que sí lo cuenta, y si no hay sesión pide login primero:
                sin cuenta no se puede participar (el servidor lo rechaza con
                PD142).
                En la tienda pública NO se pasa `onOpenCreadores` y el botón no
                se pinta: ahí no hay sección de perfil y llevaría a ninguna parte. */}
            {onOpenCreadores && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenCreadores() }}
                style={{
                  width: '100%', marginTop: 10, padding: '11px 14px',
                  borderRadius: 12, border: '1px solid #E4671F',
                  background: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 13, fontWeight: 800, color: '#A85018',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}>
                <Video size={14} /> Cómo funciona y mis premios
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
