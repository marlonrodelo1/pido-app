import { useState, useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'

const P = {
  orange: '#FF6B2C',
  orangeDim: 'rgba(255,107,44,0.35)',
  bg: '#0D0D0D',
  bg2: '#1A1A1D',
  ink: '#EDEDED',
  inkDim: 'rgba(237,237,237,0.4)',
}

// Carretera serpenteante con perspectiva (parte desde horizonte y llega al front)
const ROAD_D = 'M 200 180 C 180 260 260 340 220 420 C 180 500 300 580 250 660 C 210 720 280 780 230 840'

export default function AnimatedSplash({ onComplete }) {
  const [exiting, setExiting] = useState(false)
  const [motoPos, setMotoPos] = useState({ x: 200, y: 180, a: 0 })
  const [progress, setProgress] = useState(0)
  const pathRef = useRef(null)
  const isNative = Capacitor.isNativePlatform()

  // Exit timer (~3s total)
  useEffect(() => {
    const exitAt = isNative ? 2200 : 2600
    const completeAt = isNative ? 2600 : 3000
    const t1 = setTimeout(() => setExiting(true), exitAt)
    const t2 = setTimeout(() => onComplete(), completeAt)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [isNative, onComplete])

  // Loop animación: la moto recorre la carretera
  useEffect(() => {
    let raf, start
    const DURATION = isNative ? 2000 : 2400
    const loop = t => {
      if (!start) start = t
      const elapsed = t - start
      const p = Math.min(1, elapsed / DURATION)
      setProgress(p)
      if (pathRef.current) {
        const L = pathRef.current.getTotalLength()
        const pt = pathRef.current.getPointAtLength(L * p)
        const pt2 = pathRef.current.getPointAtLength(Math.min(L, L * p + 1))
        const a = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI
        setMotoPos({ x: pt.x, y: pt.y, a })
      }
      if (p < 1) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [isNative])

  return (
    <>
      <style>{`
        @keyframes splashOut { to { opacity: 0; } }
        @keyframes floatSlow { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: `radial-gradient(ellipse at 50% 20%, #1a1113 0%, ${P.bg} 55%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: exiting ? 'splashOut 0.4s ease forwards' : undefined,
        overflow: 'hidden',
      }}>
        <svg
          viewBox="0 0 400 900"
          preserveAspectRatio="xMidYMid slice"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <defs>
            {/* Grid floor 3D */}
            <linearGradient id="floorFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={P.orange} stopOpacity="0" />
              <stop offset="30%" stopColor={P.orange} stopOpacity="0.18" />
              <stop offset="100%" stopColor={P.orange} stopOpacity="0.32" />
            </linearGradient>
            <linearGradient id="skyFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E0F14" stopOpacity="0.8" />
              <stop offset="100%" stopColor={P.bg} stopOpacity="0" />
            </linearGradient>
            <radialGradient id="sun" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={P.orange} stopOpacity="0.9" />
              <stop offset="60%" stopColor={P.orange} stopOpacity="0.12" />
              <stop offset="100%" stopColor={P.orange} stopOpacity="0" />
            </radialGradient>
            <filter id="glow"><feGaussianBlur stdDeviation="4" /></filter>
          </defs>

          {/* Cielo degradado */}
          <rect width="400" height="400" fill="url(#skyFade)" />

          {/* Sol distante detrás del horizonte */}
          <circle cx="200" cy="170" r="120" fill="url(#sun)" style={{ animation: 'floatSlow 3s ease-in-out infinite' }} />

          {/* Montañas sutiles en el horizonte */}
          <path d="M 0 200 L 60 165 L 110 180 L 170 145 L 230 175 L 290 155 L 350 180 L 400 165 L 400 210 L 0 210 Z"
            fill="#0a0708" opacity="0.9" />
          <path d="M 0 210 L 80 190 L 140 205 L 210 185 L 280 200 L 360 192 L 400 205 L 400 235 L 0 235 Z"
            fill="#050304" opacity="0.95" />

          {/* Horizonte line glow */}
          <line x1="0" y1="210" x2="400" y2="210" stroke={P.orange} strokeOpacity="0.5" strokeWidth="0.8" filter="url(#glow)" />
          <line x1="0" y1="210" x2="400" y2="210" stroke={P.orange} strokeOpacity="0.8" strokeWidth="0.4" />

          {/* Grid floor 3D — líneas que convergen */}
          <g opacity="0.7">
            {[...Array(19)].map((_, i) => {
              const offset = (i - 9) * 0.5
              const x1 = 200 + offset * 20
              const x2 = 200 + offset * 420
              return (
                <line key={'v' + i}
                  x1={x1} y1="210" x2={x2} y2="900"
                  stroke="url(#floorFade)" strokeWidth="0.8" />
              )
            })}
            {/* Líneas horizontales con espaciado de perspectiva */}
            {[...Array(12)].map((_, i) => {
              const progress = (i + 1) / 12
              const y = 210 + Math.pow(progress, 1.6) * 700
              const opacity = 0.08 + progress * 0.22
              return (
                <line key={'h' + i}
                  x1="0" y1={y} x2="400" y2={y}
                  stroke={P.orange} strokeOpacity={opacity} strokeWidth="0.6" />
              )
            })}
          </g>

          {/* Edificios pequeños a los lados (isométricos sutiles) */}
          {[
            { x: 40, y: 380, w: 28, h: 42, side: 'left' },
            { x: 20, y: 480, w: 36, h: 60, side: 'left' },
            { x: 50, y: 600, w: 42, h: 78, side: 'left' },
            { x: 20, y: 740, w: 50, h: 96, side: 'left' },
            { x: 340, y: 380, w: 28, h: 42, side: 'right' },
            { x: 348, y: 480, w: 36, h: 60, side: 'right' },
            { x: 320, y: 600, w: 42, h: 78, side: 'right' },
            { x: 340, y: 740, w: 50, h: 96, side: 'right' },
          ].map((b, i) => (
            <g key={'b' + i}>
              {/* sombra lateral */}
              <polygon
                points={`${b.x},${b.y} ${b.x + b.w},${b.y} ${b.x + b.w + 4},${b.y - 4} ${b.x + 4},${b.y - 4}`}
                fill="#0a0708" opacity="0.6"
              />
              {/* frontal */}
              <rect x={b.x} y={b.y} width={b.w} height={b.h}
                fill={P.bg2} stroke={P.orange} strokeOpacity="0.4" strokeWidth="0.7" />
              {/* ventanas con luz naranja */}
              {[...Array(Math.floor(b.h / 14))].map((_, j) => (
                <rect key={j}
                  x={b.x + 4} y={b.y + 6 + j * 14}
                  width={b.w - 8} height={6}
                  fill={P.orange} opacity={j % 2 === 0 ? 0.6 : 0.2} />
              ))}
            </g>
          ))}

          {/* Palmeras sencillas (decoración canaria) */}
          {[
            { x: 80, y: 450, s: 0.9 },
            { x: 320, y: 520, s: 1.0 },
            { x: 100, y: 680, s: 1.3 },
            { x: 310, y: 740, s: 1.4 },
          ].map((t, i) => (
            <g key={'t' + i} transform={`translate(${t.x} ${t.y}) scale(${t.s})`} opacity="0.8">
              <line x1="0" y1="0" x2="1" y2="-28" stroke="#5a3a1a" strokeWidth="2" strokeLinecap="round" />
              <path d="M 0 -28 Q -12 -34 -18 -26 M 0 -28 Q 12 -34 18 -26 M 0 -28 Q -6 -40 -4 -46 M 0 -28 Q 6 -40 4 -46"
                stroke="#2d6b2d" strokeWidth="2" strokeLinecap="round" fill="none" />
            </g>
          ))}

          {/* Carretera — shadow */}
          <path d={ROAD_D}
            fill="none" stroke="#000" strokeWidth="34" strokeLinecap="round" opacity="0.6" />
          {/* Carretera — base oscura */}
          <path d={ROAD_D}
            fill="none" stroke="#1a1a1c" strokeWidth="28" strokeLinecap="round" />
          {/* Carretera — borde naranja glow */}
          <path ref={pathRef} d={ROAD_D}
            fill="none" stroke={P.orange} strokeOpacity="0.5" strokeWidth="30"
            strokeLinecap="round" filter="url(#glow)" />
          {/* Líneas discontinuas centrales */}
          <path d={ROAD_D}
            fill="none" stroke={P.orange} strokeOpacity="0.85"
            strokeWidth="1.6" strokeLinecap="round"
            strokeDasharray="8 14" />

          {/* Moto recorriendo la carretera */}
          <g transform={`translate(${motoPos.x} ${motoPos.y}) rotate(${motoPos.a + 90})`}>
            {/* halo */}
            <circle r="18" fill={P.orange} opacity="0.25">
              <animate attributeName="r" values="14;22;14" dur="0.9s" repeatCount="indefinite" />
            </circle>
            <circle r="10" fill={P.orange} opacity="0.5" />
            {/* emoji moto */}
            <g transform={`rotate(${-motoPos.a - 90})`}>
              <text textAnchor="middle" y="7" fontSize="26">🛵</text>
            </g>
          </g>

          {/* Partículas progresando */}
          {[0.15, 0.35, 0.55, 0.75].map((delay, i) => {
            const p = Math.max(0, progress - delay)
            if (p <= 0 || !pathRef.current) return null
            const L = pathRef.current.getTotalLength?.() || 0
            if (!L) return null
            const pt = pathRef.current.getPointAtLength(Math.min(L, L * p))
            return (
              <circle key={i} cx={pt.x} cy={pt.y} r="2"
                fill={P.orange} opacity={1 - p * 0.8} />
            )
          })}
        </svg>
      </div>
    </>
  )
}
