/* ──────────────────────────────────────────────────────────────────────────
 * PIDOO CREADORES — el diferencial, en la landing pública.
 *
 * Bloque de color sólido (el mismo naranja del hero) para que sea lo único
 * que rompe la sucesión de secciones crema: es lo que Pidoo tiene y los
 * portales no. Titular en tinta sobre naranja, igual que el hero.
 *
 * LA CIFRA SALE DE LA BASE DE DATOS, NUNCA DEL CÓDIGO.
 * `creadores_programas_abiertos()` (accesible sin cuenta) devuelve los
 * restaurantes con el programa encendido y su escalera real. Si un restaurante
 * cambia sus premios, esta sección se entera sola. Y si NO hay ninguno
 * encendido —hoy mismo es el caso— la sección explica el mecanismo pero no
 * enseña ni un euro ni un nombre: prometer un premio que nadie puede ganar es
 * exactamente el error que ya costó caro con "15 € gratis".
 *
 * Por eso tampoco se escribe "gratis" en ningún sitio: es un DESCUENTO sobre un
 * pedido futuro que hay que comprar, y el responsable de la promesa es el
 * restaurante que la paga (Ley de Competencia Desleal art. 5).
 * ────────────────────────────────────────────────────────────────────────── */
import { useState, useEffect } from 'react'
import { Video, ShoppingBag, Ticket, ArrowRight, Eye, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { fmtEur, mejorPremioEuros } from '../CreadoresEscalera'
import { SolidBtn } from './_ui'

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"
const ORANGE = '#FF6B2C'
const INK = '#1A1815'

const fmtNum = (n) => Number(n || 0).toLocaleString('es-ES')
/* Importes del recibo de ejemplo: siempre con dos decimales, como en el carrito
   de verdad. `fmtEur` es otra cosa (quita los decimales redondos) y se usa para
   el titular, donde "hasta 15 €" se lee mejor que "hasta 15,00 €". */
const eur = (n) =>
  `${Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

const PASOS = [
  {
    icon: ShoppingBag,
    title: 'Pide y recibe',
    desc: 'Haz tu pedido normal en cualquier restaurante con el programa abierto.',
  },
  {
    icon: Video,
    title: 'Grábalo y publícalo',
    desc: 'Sube tu vídeo a TikTok o Instagram etiquetando al restaurante y a Pidoo.',
  },
  {
    icon: Ticket,
    title: 'Se aplica solo',
    desc: 'Según las visualizaciones ganas un descuento, y salta solo en tu siguiente pedido.',
  },
]

/* Un paso: tarjeta blanca sobre el naranja (el texto no va nunca sobre el
   color, que a tamaño pequeño se lee peor). */
const Paso = ({ icon: Icon, title, desc, n }) => (
  <div
    style={{
      background: '#FFFFFF',
      borderRadius: 20,
      padding: '22px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      position: 'relative',
      boxShadow: '0 18px 34px -22px rgba(26,24,21,0.55)',
    }}
  >
    <span
      style={{
        position: 'absolute',
        top: 18,
        right: 20,
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: 30,
        color: '#EFE9DD',
        lineHeight: 1,
      }}
    >
      {n}
    </span>
    <div
      style={{
        width: 46,
        height: 46,
        borderRadius: 14,
        background: 'rgba(255,107,44,0.12)',
        color: '#E4671F',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={22} strokeWidth={2.3} />
    </div>
    <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 17.5, letterSpacing: -0.4, color: INK }}>
      {title}
    </div>
    <div style={{ fontFamily: FONT, fontSize: 14.5, color: '#5A5348', lineHeight: 1.5 }}>{desc}</div>
  </div>
)

/* La escalera por defecto con la que nace un programa (500/2.000/10.000 ->
   2/5/15 €). Se enseña SOLO como ejemplo, rotulada como tal, mientras no haya
   ningún restaurante con el programa abierto: asi la landing puede mostrar como
   funciona sin prometer un premio que hoy nadie puede cobrar. En cuanto haya un
   programa abierto, esto desaparece y manda la escalera real del servidor. */
const ESCALERA_EJEMPLO = [
  { views_necesarias: 500, valor: 2 },
  { views_necesarias: 2000, valor: 5 },
  { views_necesarias: 10000, valor: 15 },
]

/* Un peldaño de la escalera. La barra crece con el nivel: de un vistazo se ve
   que a más visualizaciones, más premio, sin tener que leer las cifras. */
const Peldano = ({ views, texto, ancho, destacado }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: FONT,
        fontSize: 13,
        fontWeight: 700,
        color: '#5A5348',
        width: 92,
        flexShrink: 0,
      }}
    >
      <Eye size={14} strokeWidth={2.3} color="#A85018" />
      {fmtNum(views)}
    </span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          height: 38,
          width: `${ancho}%`,
          // `fit-content` y no un número: con un mínimo en píxeles, en un móvil
          // de 375 la barra del primer peldaño se quedaba corta y el premio se
          // leía "2 € de des…". La barra puede ser más ancha de lo que dice el
          // porcentaje, pero el premio se lee entero siempre.
          minWidth: 'fit-content',
          borderRadius: 10,
          background: destacado
            ? 'linear-gradient(90deg, #FF6B2C 0%, #E4671F 100%)'
            : 'rgba(255,107,44,0.14)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 12,
          transition: 'width .3s ease',
        }}
      >
        <span
          style={{
            fontFamily: FONT,
            fontSize: 14,
            fontWeight: 800,
            color: destacado ? '#FFFFFF' : '#A85018',
            whiteSpace: 'nowrap',
            paddingRight: 12,
          }}
        >
          {texto}
        </span>
      </div>
    </div>
  </div>
)

/* Columna derecha: la escalera (lo que ganas) y el recibo (cómo te llega).
   Las dos cosas que la sección tiene que ENSEÑAR, no contar. */
const TarjetaEscalera = ({ escalera, restaurantes }) => {
  const real = escalera.length > 0
  const filas = real
    ? escalera.map((e) => ({
        views: e.views_necesarias,
        texto: e.descripcion,
        euros: Number(e.valor) || 0,
      }))
    : ESCALERA_EJEMPLO.map((e) => ({
        views: e.views_necesarias,
        texto: `${fmtEur(e.valor)} € de descuento`,
        euros: e.valor,
      }))

  const tope = Math.max(...filas.map((f) => f.euros), 0)
  // Lo que se enseña en el recibo es el premio más alto de la escalera pintada:
  // así el ejemplo del pedido y la escalera nunca se contradicen.
  const premio = tope > 0 ? tope : 5
  // El pedido del ejemplo se calcula, no se escribe: siempre al menos el doble
  // del premio. No es una regla del sistema —`creadores_valor_cupon` solo topa
  // el cupón al SUBTOTAL, así que 15 € sobre un pedido de 24,50 € se aplicaría
  // sin problema— es criterio comercial: quien paga el descuento es el
  // restaurante, y enseñarle en la portada un pedido con el 61 % descontado es
  // la mejor forma de que no quiera el programa.
  const base = Math.max(24.5, premio * 2 + 4.5)

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 26,
          padding: 24,
          boxShadow: '0 40px 80px -34px rgba(26,24,21,0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              background: 'rgba(255,107,44,0.12)',
              color: '#E4671F',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Sparkles size={17} strokeWidth={2.4} />
          </div>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 15.5, color: INK }}>
            Cuanto más se vea, mejor el premio
          </div>
        </div>

        <div style={{ fontFamily: FONT, fontSize: 12.5, color: '#5A5348', margin: '0 0 16px', lineHeight: 1.5 }}>
          {real
            ? `Abierto ahora en ${restaurantes.join(' · ')}`
            : 'Ejemplo. Cada restaurante pone sus visualizaciones y sus premios.'}
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          {filas.map((f, i) => (
            <Peldano
              key={f.views}
              views={f.views}
              texto={f.texto}
              ancho={40 + (i * 60) / Math.max(filas.length - 1, 1)}
              destacado={i === filas.length - 1}
            />
          ))}
        </div>
      </div>

      {/* El resultado, tal y como lo ve el cliente al pagar. Sin esto, "gana un
          descuento" es una idea; con esto es una línea en su cuenta. */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 22,
          padding: '18px 20px',
          boxShadow: '0 30px 60px -34px rgba(26,24,21,0.55)',
        }}
      >
        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 800, color: '#5A5348', letterSpacing: 0.3, marginBottom: 12 }}>
          ASÍ TE LLEGA EN EL SIGUIENTE PEDIDO
        </div>
        {[
          { l: 'Tu pedido', v: eur(base) },
          { l: 'Cupón creador', v: `−${eur(premio)}`, verde: true },
        ].map((r) => (
          <div
            key={r.l}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontFamily: FONT,
              fontSize: 14,
              color: r.verde ? '#2E7D52' : '#5A5348',
              fontWeight: r.verde ? 800 : 600,
              padding: '5px 0',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              {r.verde && <Ticket size={15} strokeWidth={2.4} />}
              {r.l}
            </span>
            <span>{r.v}</span>
          </div>
        ))}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #E8E1D3',
            marginTop: 8,
            paddingTop: 10,
            fontFamily: FONT,
            fontSize: 16,
            fontWeight: 800,
            color: INK,
          }}
        >
          <span>Total</span>
          <span>{eur(base - premio)}</span>
        </div>
      </div>
    </div>
  )
}

export default function CreadoresLanding() {
  // `escalera` y `maxEuros` solo se llenan si hay programas abiertos de verdad.
  const [escalera, setEscalera] = useState([])
  const [restaurantes, setRestaurantes] = useState([])
  const [maxEuros, setMaxEuros] = useState(0)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const { data } = await supabase.rpc('creadores_programas_abiertos')
        if (!vivo) return
        const progs = Array.isArray(data) ? data : []
        if (!progs.length) return

        // Se enseña la escalera del programa que más da: es la que sostiene el
        // titular. Las demás salen por nombre en la línea de abajo.
        const mejor = progs.reduce(
          (a, p) => (mejorPremioEuros(p.escalera) > mejorPremioEuros(a.escalera) ? p : a),
          progs[0],
        )
        setEscalera((mejor.escalera || []).slice().sort((a, b) => (a.views_necesarias || 0) - (b.views_necesarias || 0)))
        setRestaurantes(progs.map((p) => p.nombre).filter(Boolean))
        setMaxEuros(Math.max(0, ...progs.map((p) => mejorPremioEuros(p.escalera))))
      } catch (_) {
        /* La sección se queda en su versión sin cifras. Nunca revienta la landing. */
      }
    })()
    return () => {
      vivo = false
    }
  }, [])

  return (
    <section id="creadores" style={{ background: ORANGE, position: 'relative', overflow: 'hidden' }}>
      <style>{creadoresCss}</style>
      <div
        className="pd-cre-grid"
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '82px 20px 44px',
          display: 'grid',
          gridTemplateColumns: '1.12fr 0.88fr',
          gap: 48,
          alignItems: 'center',
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: 'rgba(26,24,21,0.10)',
              color: INK,
              borderRadius: 999,
              padding: '7px 14px',
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 0.2,
              marginBottom: 20,
            }}
          >
            <Video size={14} strokeWidth={2.8} /> Solo en Pidoo
          </span>

          <h2
            className="pd-cre-h2"
            style={{
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 'clamp(36px, 5vw, 60px)',
              lineHeight: 1,
              letterSpacing: -1.8,
              color: INK,
              margin: '0 0 16px',
            }}
          >
            Pidoo Creadores
          </h2>

          {/* El titular lleva cifra SOLO si hay un premio real detrás. Y las
              visualizaciones no son un matiz que se pueda quitar: sin ellas
              parece que basta con grabar, y no basta. */}
          <p
            style={{
              fontFamily: FONT,
              fontSize: 'clamp(16px, 1.9vw, 19px)',
              fontWeight: 600,
              color: INK,
              opacity: 0.86,
              lineHeight: 1.5,
              margin: '0 0 30px',
              maxWidth: 520,
            }}
          >
            {maxEuros > 0
              ? `Graba tu pedido, súbelo a TikTok o Instagram y llévate hasta ${fmtEur(maxEuros)} € de descuento en el siguiente, según las visualizaciones que consigas.`
              : 'Graba tu pedido, súbelo a TikTok o Instagram y gana descuento en tu siguiente pedido, según las visualizaciones que consigas. Ningún portal te paga por comer.'}
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <SolidBtn
              href="/app"
              size="lg"
              style={{ background: INK, borderColor: INK, boxShadow: '0 10px 24px -10px rgba(26,24,21,0.7)' }}
            >
              Empieza a grabar <ArrowRight size={17} strokeWidth={2.6} />
            </SolidBtn>
            <a
              href="/contacto"
              style={{
                fontFamily: FONT,
                fontSize: 15,
                fontWeight: 700,
                color: INK,
                textDecoration: 'underline',
                textUnderlineOffset: 4,
              }}
            >
              Lo quiero en mi restaurante
            </a>
          </div>

          {/* Lo que hace que esto lo venda un restaurante, dicho en una línea. */}
          <div
            style={{
              fontFamily: FONT,
              fontSize: 13.5,
              color: INK,
              // MEDIDO, no elegido a ojo: a 0,78 esta línea daba 4,45:1 sobre
              // el naranja y el mínimo para texto pequeño es 4,5. A 0,85 son
              // 5,0. Si alguien la aclara más, vuelve a caer por debajo.
              opacity: 0.85,
              marginTop: 18,
              lineHeight: 1.5,
              maxWidth: 520,
            }}
          >
            Para el restaurante va incluido en el alta, sin cuota: son sus propios clientes haciéndole el marketing.
            Cada uno decide sus premios y su tope de gasto al mes.
          </div>
        </div>

        <div className="pd-cre-card">
          <TarjetaEscalera escalera={escalera} restaurantes={restaurantes} />
        </div>
      </div>

      {/* Los tres pasos van a ancho completo, fuera de las dos columnas: dentro
          de la columna izquierda cada tarjeta se quedaba en 190 px y el título
          partía en dos líneas. */}
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px 82px' }}>
        <div className="pd-cre-pasos" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
          {PASOS.map((p, i) => (
            <Paso key={p.title} {...p} n={i + 1} />
          ))}
        </div>
      </div>
    </section>
  )
}

const creadoresCss = `
@media (max-width: 980px) {
  .pd-cre-grid  { grid-template-columns: 1fr !important; gap: 34px !important; padding: 64px 20px 30px !important; }
  .pd-cre-card  { max-width: 460px; width: 100%; margin: 0 auto; }
  .pd-cre-h2    { letter-spacing: -1.2px !important; }
}
@media (max-width: 720px) {
  .pd-cre-pasos { grid-template-columns: 1fr !important; }
}
`
