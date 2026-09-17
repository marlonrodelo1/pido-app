import { useState } from 'react'
import { Clock, ChevronDown } from 'lucide-react'
import { DIAS_ORDEN, DIAS_LABEL, getDiaActual } from '../lib/horario'

// Misma paleta que RestDetalle y CartaLocal.
const C = {
  ink: '#1A1815', stone: '#6B6356', stone2: '#8A8174',
  terracotta: '#C5562C', paper: '#FBF8F2', border: '#E8E1D3',
}

/* ─── HorarioSemana ───────────────────────────────────────────
   El horario de servicio es información pública del restaurante: se ve esté
   abierto o cerrado. La versión de escritorio (TiendaDesktop) ya lo pintaba;
   en la ficha de móvil no había forma de saber a qué hora abren, y quien
   entraba un lunes solo veía el cartel rojo de "cerrado".
   Vive aparte (y no dentro de RestDetalle) para que la carta de mesa
   (CartaLocal) lo use sin importar nada de la tienda: no toca carrito ni sesión.
   Formato de BD: { lunes: [{ abre, cierra }], ... } — [] = cerrado ese día. */
export default function HorarioSemana({ horario }) {
  const [abierto, setAbierto] = useState(false)
  if (!horario || typeof horario !== 'object') return null

  const hoy = getDiaActual()
  const txtTurnos = (slots) => {
    if (!Array.isArray(slots) || slots.length === 0) return null
    const t = slots.filter(s => s?.abre && s?.cierra).map(s => `${s.abre}–${s.cierra}`).join(' · ')
    return t || null
  }
  const hoyTxt = txtTurnos(horario[hoy])
  // Si no hay ni un solo turno en toda la semana, no hay horario que enseñar.
  if (!DIAS_ORDEN.some(d => txtTurnos(horario[d]))) return null

  return (
    <div style={{
      marginTop: 14, borderRadius: 12, background: C.paper,
      border: `1px solid ${C.border}`, overflow: 'hidden',
    }}>
      <button
        onClick={() => setAbierto(v => !v)}
        aria-expanded={abierto}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 9,
          padding: '11px 13px', background: 'none', border: 'none',
          font: 'inherit', textAlign: 'left', cursor: 'pointer', color: C.ink,
        }}
      >
        <Clock size={15} style={{ color: C.stone, flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, fontWeight: 700 }}>Horario</span>
        <span style={{
          flex: 1, minWidth: 0, fontSize: 12, color: C.stone,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          Hoy · {hoyTxt || 'Cerrado'}
        </span>
        <ChevronDown
          size={15}
          style={{
            color: C.stone2, flexShrink: 0,
            transform: abierto ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.18s ease',
          }}
        />
      </button>
      {abierto && (
        <div style={{ padding: '2px 13px 12px', borderTop: `1px solid ${C.border}` }}>
          {DIAS_ORDEN.map((d) => {
            const txt = txtTurnos(horario[d])
            const esHoy = d === hoy
            return (
              <div key={d} style={{
                display: 'flex', justifyContent: 'space-between', gap: 12,
                padding: '6px 0', fontSize: 12.5, lineHeight: 1.35,
                color: esHoy ? C.terracotta : C.ink,
                fontWeight: esHoy ? 700 : 500,
              }}>
                <span>{DIAS_LABEL[d]}</span>
                <span style={{ textAlign: 'right', color: txt ? 'inherit' : C.stone2 }}>
                  {txt || 'Cerrado'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
