import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

const P = {
  orange: '#FF6B2C',
  bg: '#FAFAF7',
  ink: '#1F1F1E',
  green: '#16A34A',
  pillBg: '#FFFFFF',
  pillBorder: '#E8E6E0',
  dotPending: '#D4D2CC',
}

// Hitos posicionados sobre la imagen del mapa 3D (mismas zonas que el demo de referencia)
const MILESTONES = [
  { id: 1, name: 'Pide',       status: 'complete',    pos: { top: '72%', left: '4%' } },
  { id: 2, name: 'Preparamos', status: 'complete',    pos: { top: '20%', left: '18%' } },
  { id: 3, name: 'Llevamos',   status: 'in-progress', pos: { top: '48%', left: '54%' } },
  { id: 4, name: 'Entregado',  status: 'pending',     pos: { top: '14%', right: '8%' } },
]

function Milestone({ m, appear }) {
  const color = m.status === 'complete' ? P.green
             : m.status === 'in-progress' ? P.orange
             : P.dotPending

  return (
    <div style={{
      position: 'absolute',
      display: 'flex', alignItems: 'center', gap: 10,
      opacity: appear ? 1 : 0,
      transform: appear ? 'scale(1)' : 'scale(0.6)',
      transition: 'opacity .5s ease, transform .55s cubic-bezier(0.34, 1.56, 0.64, 1)',
      ...m.pos,
    }}>
      {/* Dot con pulse si está in-progress */}
      <div style={{ position: 'relative', width: 16, height: 16, flexShrink: 0 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: color,
          animation: m.status === 'in-progress' ? 'splashDotPulse 1.3s ease-in-out infinite' : undefined,
          boxShadow: m.status !== 'pending' ? `0 0 12px ${color}` : undefined,
        }} />
      </div>
      {/* Pill label */}
      <div style={{
        background: P.pillBg,
        border: `1px solid ${P.pillBorder}`,
        borderRadius: 999,
        padding: '8px 14px',
        fontSize: 13, fontWeight: 600, color: P.ink,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        boxShadow: '0 4px 12px rgba(15,15,15,0.10)',
        whiteSpace: 'nowrap',
      }}>
        {m.name}
      </div>
    </div>
  )
}

export default function AnimatedSplash({ onComplete }) {
  const [exiting, setExiting] = useState(false)
  const [appearIdx, setAppearIdx] = useState(-1)
  const isNative = Capacitor.isNativePlatform()

  // Exit total ~3s
  useEffect(() => {
    const exitAt = isNative ? 2200 : 2600
    const completeAt = isNative ? 2600 : 3000
    const t1 = setTimeout(() => setExiting(true), exitAt)
    const t2 = setTimeout(() => onComplete(), completeAt)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [isNative, onComplete])

  // Aparecer hitos en secuencia
  useEffect(() => {
    const timers = MILESTONES.map((_, i) =>
      setTimeout(() => setAppearIdx(i), 300 + i * 260)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <>
      <style>{`
        @keyframes splashOut { to { opacity: 0; } }
        @keyframes splashMapIn {
          0%   { opacity: 0; transform: translateY(30px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes splashDotPulse {
          0%, 100% { transform: scale(1);   box-shadow: 0 0 0 0 ${P.orange}66; }
          50%      { transform: scale(1.3); box-shadow: 0 0 0 10px ${P.orange}00; }
        }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: `radial-gradient(ellipse at 50% 40%, #FFFFFF 0%, ${P.bg} 60%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: exiting ? 'splashOut 0.4s ease forwards' : undefined,
        overflow: 'hidden',
        padding: 20,
      }}>
        {/* Contenedor del mapa + pines */}
        <div style={{
          position: 'relative',
          width: '100%', maxWidth: 640,
          aspectRatio: '800 / 520',
        }}>
          {/* Imagen mapa 3D */}
          <img
            src="/splash-map-3d.png"
            alt=""
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'contain',
              animation: 'splashMapIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              filter: 'drop-shadow(0 20px 40px rgba(15,15,15,0.15))',
            }}
          />

          {/* Hitos */}
          {MILESTONES.map((m, i) => (
            <Milestone key={m.id} m={m} appear={appearIdx >= i} />
          ))}
        </div>
      </div>
    </>
  )
}
