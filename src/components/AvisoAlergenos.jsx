import { useState } from 'react'
import { TriangleAlert, ChevronDown, Wheat, Shrimp, Egg, Fish, Bean, Milk, Nut, Wine, Flower, Shell } from 'lucide-react'

// Misma paleta que RestDetalle, CartaLocal y HorarioSemana.
const C = {
  ink: '#1A1815', stone: '#6B6356', stone2: '#8A8174',
  paper: '#FBF8F2', border: '#E8E1D3',
}

/* Lucide no trae cacahuete, apio, mostaza ni sésamo. Estos cuatro se dibujan
   con su misma rejilla (24×24, trazo 2, puntas redondas) para que no se note
   cuáles son de la librería y cuáles no. */
function Svg({ size, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}
const Cacahuete = ({ size }) => (
  <Svg size={size}>
    <path d="M12 2.5a4.5 4.5 0 0 0-4.5 4.5c0 1.7 1 2.6 1 4s-1 2.3-1 4a4.5 4.5 0 0 0 9 0c0-1.7-1-2.6-1-4s1-2.3 1-4A4.5 4.5 0 0 0 12 2.5z" />
    <path d="M10.5 7h.01M13.5 8.5h.01M10.5 15.5h.01M13.5 17h.01" />
  </Svg>
)
const Apio = ({ size }) => (
  <Svg size={size}>
    <path d="M9 22V11M12 22V9M15 22V11" />
    <path d="M9 11c-3 0-4.5-2-4.5-4.5C7 6.5 9 8 9 11zM15 11c3 0 4.5-2 4.5-4.5C17 6.5 15 8 15 11zM12 9c0-3 1-5.5 0-7-1 1.5 0 4 0 7z" />
  </Svg>
)
/* Mostaza como bote de apretar con la boquilla en punta y la gota: la botella
   recta a secas se confundía con la de Lácteos. */
const Mostaza = ({ size }) => (
  <Svg size={size}>
    <path d="M9.5 2.5 8 6h4l-1.5-3.5z" />
    <path d="M6 6h8v13a2.5 2.5 0 0 1-2.5 2.5h-3A2.5 2.5 0 0 1 6 19z" />
    <path d="M18.5 10.5c-1 1.4-1.5 2.3-1.5 3a1.5 1.5 0 0 0 3 0c0-.7-.5-1.6-1.5-3z" />
  </Svg>
)
/* Sésamo como semillas sueltas (gotas pequeñas): con tres grandes parecía un brote. */
const Sesamo = ({ size }) => (
  <Svg size={size}>
    <path d="M7 4.5c1.6 1.6 1.6 4 0 5.5-1.6-1.5-1.6-3.9 0-5.5z" />
    <path d="M16.5 5.5c1.6 1.6 1.6 4 0 5.5-1.6-1.5-1.6-3.9 0-5.5z" />
    <path d="M11.5 12.5c1.6 1.6 1.6 4 0 5.5-1.6-1.5-1.6-3.9 0-5.5z" />
    <path d="M5 15c1.6 1.6 1.6 4 0 5.5-1.6-1.5-1.6-3.9 0-5.5z" />
    <path d="M18.5 15.5c1.6 1.6 1.6 4 0 5.5-1.6-1.5-1.6-3.9 0-5.5z" />
  </Svg>
)

/* Los 14 alérgenos de declaración obligatoria (Reglamento UE 1169/2011,
   anexo II), en el orden del anexo. Colores distintos entre sí y lo bastante
   oscuros para que el dibujo blanco se lea a 16 px. */
const ALERGENOS = [
  { nombre: 'Gluten', color: '#C27A12', Icono: Wheat },
  { nombre: 'Crustáceos', color: '#2F7FB5', Icono: Shrimp },
  { nombre: 'Huevos', color: '#D08300', Icono: Egg },
  { nombre: 'Pescado', color: '#1D4F86', Icono: Fish },
  { nombre: 'Cacahuetes', color: '#8C5A2E', Icono: Cacahuete },
  { nombre: 'Soja', color: '#3F7F2F', Icono: Bean },
  { nombre: 'Lácteos', color: '#2393A8', Icono: Milk },
  { nombre: 'Frutos de cáscara', color: '#9A3F27', Icono: Nut },
  { nombre: 'Apio', color: '#5C9A2E', Icono: Apio },
  { nombre: 'Mostaza', color: '#9C7A00', Icono: Mostaza },
  { nombre: 'Sésamo', color: '#A0703F', Icono: Sesamo },
  { nombre: 'Sulfitos', color: '#76358A', Icono: Wine },
  { nombre: 'Altramuces', color: '#B8456E', Icono: Flower },
  { nombre: 'Moluscos', color: '#15807E', Icono: Shell },
]

function Circulo({ a, size }) {
  const { Icono } = a
  return (
    <span title={a.nombre} style={{
      width: size, height: size, borderRadius: '50%', background: a.color, color: '#fff',
      display: 'inline-grid', placeItems: 'center', flexShrink: 0,
    }}>
      <Icono size={Math.round(size * 0.6)} strokeWidth={2.2} />
    </span>
  )
}

/* ─── AvisoAlergenos ──────────────────────────────────────────
   La carta no guarda qué alérgenos lleva cada plato, así que NO se pintan por
   plato: inventarlos es peor que no decir nada. Lo que sí se hace es lo que la
   norma exige como mínimo cuando la información se da de palabra: decir, en un
   sitio visible, dónde pedirla. Plegado para no empujar la carta hacia abajo;
   la tira de iconos se ve igualmente, que es lo que se reconoce de un vistazo. */
export default function AvisoAlergenos() {
  const [abierto, setAbierto] = useState(false)

  return (
    <div style={{
      marginTop: 14, borderRadius: 12, background: C.paper,
      border: `1px solid ${C.border}`, overflow: 'hidden',
    }}>
      <button
        onClick={() => setAbierto(v => !v)}
        aria-expanded={abierto}
        style={{
          width: '100%', display: 'block', padding: '11px 13px',
          background: 'none', border: 'none', font: 'inherit', textAlign: 'left',
          cursor: 'pointer', color: C.ink,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <TriangleAlert size={15} style={{ color: C.stone, flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Alérgenos</span>
          <span style={{
            flex: 1, minWidth: 0, fontSize: 12, color: C.stone,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            Pregunta al personal
          </span>
          <ChevronDown
            size={15}
            style={{
              color: C.stone2, flexShrink: 0,
              transform: abierto ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.18s ease',
            }}
          />
        </span>
        {!abierto && (
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 9 }}>
            {ALERGENOS.map(a => <Circulo key={a.nombre} a={a} size={18} />)}
          </span>
        )}
      </button>

      {abierto && (
        <div style={{ padding: '10px 13px 14px', borderTop: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 12.5, color: C.stone, lineHeight: 1.45, margin: 0 }}>
            Si tienes alguna alergia o intolerancia, pregunta al personal antes de
            pedir: te decimos qué alérgenos lleva cada plato.
          </p>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))',
            gap: '12px 4px', marginTop: 13,
          }}>
            {ALERGENOS.map(a => (
              <div key={a.nombre} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                textAlign: 'center',
              }}>
                <Circulo a={a} size={34} />
                <span style={{ fontSize: 10.5, lineHeight: 1.15, color: C.ink, fontWeight: 600 }}>
                  {a.nombre}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
