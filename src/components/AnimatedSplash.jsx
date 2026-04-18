import { useState, useEffect, useRef, useMemo } from 'react'
import { Capacitor } from '@capacitor/core'

// ─── Paleta
const P = {
  orange: '#FF6B2C',
  bg: '#0D0D0D',
  bg2: '#181819',
  ink: '#EDEDED',
  inkDim: 'rgba(237,237,237,0.55)',
  stroke: 'rgba(237,237,237,0.2)',
}

// ─── Datos geográficos reales de Tenerife
const TF_PLACES_REAL = [
  { id: 'santa_ursula', name: 'Sta. Úrsula', lat: 28.4181, lon: -16.4972, icon: '🏠' },
  { id: 'la_laguna', name: 'La Laguna', lat: 28.4853, lon: -16.3201, icon: '🏛' },
  { id: 'santa_cruz', name: 'Sta. Cruz', lat: 28.4636, lon: -16.2518, icon: '⚓' },
  { id: 'puerto_cruz', name: 'Pto. Cruz', lat: 28.4152, lon: -16.5447, icon: '🏖' },
  { id: 'la_orotava', name: 'La Orotava', lat: 28.3902, lon: -16.5237, icon: '🌳' },
  { id: 'la_matanza', name: 'La Matanza', lat: 28.4501, lon: -16.4542, icon: '🍇' },
  { id: 'tacoronte', name: 'Tacoronte', lat: 28.4731, lon: -16.4126, icon: '🍷' },
  { id: 'la_esperanza', name: 'La Esperanza', lat: 28.4444, lon: -16.3719, icon: '🌲' },
  { id: 'icod', name: 'Icod', lat: 28.3717, lon: -16.7163, icon: '🌿' },
  { id: 'garachico', name: 'Garachico', lat: 28.3738, lon: -16.7612, icon: '🌊' },
  { id: 'buenavista', name: 'Buenavista', lat: 28.3747, lon: -16.8533, icon: '🌅' },
  { id: 'el_portillo', name: 'El Portillo', lat: 28.3058, lon: -16.5632, icon: '🏔' },
  { id: 'teide', name: 'Teide', lat: 28.2724, lon: -16.6425, icon: '🌋' },
  { id: 'vilaflor', name: 'Vilaflor', lat: 28.1572, lon: -16.6358, icon: '⛰' },
  { id: 'los_cristianos', name: 'Los Cristianos', lat: 28.0508, lon: -16.7186, icon: '🏝' },
  { id: 'adeje', name: 'Adeje', lat: 28.1222, lon: -16.7261, icon: '🏨' },
  { id: 'el_medano', name: 'El Médano', lat: 28.0453, lon: -16.5385, icon: '🏄' },
  { id: 'candelaria', name: 'Candelaria', lat: 28.3542, lon: -16.3708, icon: '⛪' },
  { id: 'guimar', name: 'Güímar', lat: 28.3194, lon: -16.4122, icon: '🔺' },
  { id: 'arico', name: 'Arico', lat: 28.1665, lon: -16.4836, icon: '🏜' },
]

const TF_BBOX = { latMin: 28.02, latMax: 28.60, lonMin: -16.93, lonMax: -16.10 }
const SVG_BOX = { xMin: 40, xMax: 275, yMin: 30, yMax: 380 }

function projectTF(lat, lon) {
  const latMid = (TF_BBOX.latMin + TF_BBOX.latMax) / 2
  const cosLat = Math.cos(latMid * Math.PI / 180)
  const lonW = (TF_BBOX.lonMax - TF_BBOX.lonMin) * cosLat
  const latH = TF_BBOX.latMax - TF_BBOX.latMin
  const svgW = SVG_BOX.xMax - SVG_BOX.xMin
  const svgH = SVG_BOX.yMax - SVG_BOX.yMin
  const scale = Math.min(svgW / lonW, svgH / latH)
  const usedW = lonW * scale, usedH = latH * scale
  const offsetX = SVG_BOX.xMin + (svgW - usedW) / 2
  const offsetY = SVG_BOX.yMin + (svgH - usedH) / 2
  const x = offsetX + (lon - TF_BBOX.lonMin) * cosLat * scale
  const y = offsetY + (TF_BBOX.latMax - lat) * scale
  return { x: Math.round(x), y: Math.round(y) }
}

function haversineKm(a, b) {
  const R = 6371
  const toRad = d => d * Math.PI / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const TF_PLACES = TF_PLACES_REAL.map(p => ({ ...p, ...projectTF(p.lat, p.lon) }))

function pickRoute() {
  const pool = TF_PLACES
  const rand = n => Math.floor(Math.random() * n)
  let o, d, tries = 0
  do {
    o = pool[rand(pool.length)]
    d = pool[rand(pool.length)]
    tries++
  } while (o.id === d.id && tries < 20)

  const others = pool.filter(p => p.id !== o.id && p.id !== d.id)
  others.forEach(p => {
    const dx = d.x - o.x, dy = d.y - o.y
    const L2 = dx * dx + dy * dy || 1
    const t = Math.max(0, Math.min(1, ((p.x - o.x) * dx + (p.y - o.y) * dy) / L2))
    const px = o.x + t * dx, py = o.y + t * dy
    p._score = Math.hypot(p.x - px, p.y - py) + Math.abs(0.5 - t) * 20
  })
  const near = others.sort((a, b) => a._score - b._score).slice(0, 2)
  near.sort((a, b) => Math.hypot(a.x - o.x, a.y - o.y) - Math.hypot(b.x - o.x, b.y - o.y))

  const stopsRaw = [o, ...near, d]
  const stops = stopsRaw.map((p, i) => {
    if (i === 0) return { ...p, meta: 'origen', t: 0 }
    const prevP = stopsRaw[i - 1]
    const segKm = Math.round(haversineKm(prevP, p) * 10) / 10
    const mins = Math.max(2, Math.round(segKm * 1.8))
    return { ...p, meta: `${segKm.toFixed(1)} km · ${mins} min`, t: 0 }
  })
  const cumKm = [0]
  for (let i = 1; i < stopsRaw.length; i++) {
    cumKm.push(cumKm[i - 1] + haversineKm(stopsRaw[i - 1], stopsRaw[i]))
  }
  const totalK = cumKm[cumKm.length - 1] || 1
  stops.forEach((s, i) => s.t = cumKm[i] / totalK)

  const totalMin = Math.max(5, Math.round(totalK * 1.8))
  return { origin: o, dest: d, stops, totalKm: Math.round(totalK * 10) / 10, totalMin }
}

function buildPath(points) {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1], p1 = points[i]
    const midx = (p0.x + p1.x) / 2, midy = (p0.y + p1.y) / 2
    const cx = p0.x + (midx - p0.x) * 0.8
    const cy = p0.y + (midy - p0.y) * 0.8
    d += ` Q ${cx} ${cy} ${midx} ${midy}`
    d += ` T ${p1.x} ${p1.y}`
  }
  return d
}

export default function AnimatedSplash({ onComplete }) {
  const [exiting, setExiting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [motoPos, setMotoPos] = useState({ x: 0, y: 0 })
  const pathRef = useRef(null)
  const isNative = Capacitor.isNativePlatform()

  const route = useMemo(() => pickRoute(), [])
  const pathD = useMemo(() => buildPath(route.stops), [route])

  // Exit timer (~3s total con fadeout)
  useEffect(() => {
    const exitAt = isNative ? 1800 : 2600
    const completeAt = isNative ? 2200 : 3000
    const t1 = setTimeout(() => setExiting(true), exitAt)
    const t2 = setTimeout(() => onComplete(), completeAt)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [isNative, onComplete])

  // Animación progreso de la ruta
  useEffect(() => {
    let raf, start
    const DURATION = isNative ? 1600 : 2200
    const loop = t => {
      if (!start) start = t
      const elapsed = t - start
      const p = Math.min(1, elapsed / DURATION)
      setProgress(p)
      if (p < 1) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [isNative])

  // Posición moto siguiendo path
  useEffect(() => {
    if (!pathRef.current) return
    const L = pathRef.current.getTotalLength()
    const pt = pathRef.current.getPointAtLength(L * progress)
    setMotoPos({ x: pt.x, y: pt.y })
  }, [progress])

  const { origin, dest, stops, totalKm, totalMin } = route

  return (
    <>
      <style>{`
        @keyframes splashOut { to { opacity: 0; } }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: P.bg,
        display: 'flex', flexDirection: 'column',
        animation: exiting ? 'splashOut 0.4s ease forwards' : undefined,
        overflow: 'hidden',
      }}>
        {/* Header compacto */}
        <div style={{ textAlign: 'center', padding: '80px 20px 6px' }}>
          <span style={{
            display: 'inline-block', padding: '3px 12px', borderRadius: 99,
            border: `1px dashed ${P.orange}`, color: P.orange,
            fontFamily: 'ui-monospace, monospace', fontSize: 10, letterSpacing: 1,
            textTransform: 'uppercase',
          }}>
            bienvenida
          </span>
          <div style={{
            color: P.inkDim, fontSize: 13, marginTop: 6,
            fontFamily: 'system-ui, sans-serif',
          }}>
            {origin.name} → <b style={{ color: P.orange }}>{dest.name}</b>
          </div>
        </div>

        {/* Mapa principal */}
        <div style={{ flex: 1, position: 'relative', padding: '0 12px', minHeight: 0 }}>
          {/* Silueta isla al fondo */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.16, pointerEvents: 'none' }}>
            <svg viewBox="0 0 400 260" style={{ width: '100%', height: '100%', transform: 'scale(1.05)' }}>
              <path
                d="M 60 180 Q 50 120 90 80 Q 140 45 210 55 Q 290 60 330 110 Q 360 150 340 195 Q 300 225 220 220 Q 130 215 60 180 Z"
                fill="none" stroke={P.orange} strokeWidth="1.5" strokeDasharray="3 4"
              />
            </svg>
          </div>

          <svg viewBox="0 0 300 400" style={{ width: '100%', height: '100%' }}>
            <defs>
              <filter id="splashGlow"><feGaussianBlur stdDeviation="2.5" /></filter>
            </defs>

            {/* Path dim */}
            <path d={pathD} fill="none" stroke={P.orange} strokeOpacity="0.18"
              strokeWidth="3" strokeDasharray="6 8" strokeLinecap="round" />

            {/* Path animado glow */}
            <path
              ref={pathRef}
              d={pathD}
              fill="none" stroke={P.orange}
              strokeWidth="3" strokeLinecap="round"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - progress}
              filter="url(#splashGlow)"
            />
            {/* Path animado nítido */}
            <path
              d={pathD}
              fill="none" stroke={P.orange}
              strokeWidth="1.8" strokeLinecap="round"
              pathLength="1"
              strokeDasharray="1"
              strokeDashoffset={1 - progress}
            />

            {/* Stops */}
            {stops.map((s, i) => {
              const active = progress >= s.t - 0.02
              const onLeft = s.x < 150
              const labelOffset = onLeft ? 14 : -14
              return (
                <g key={`${s.id}-${i}`} transform={`translate(${s.x} ${s.y})`}>
                  {active && (
                    <circle r="10" fill="none" stroke={P.orange} strokeWidth="1.5" opacity="0.5">
                      <animate attributeName="r" values="8;16;8" dur="1.4s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.6;0;0.6" dur="1.4s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle r="8" fill={active ? P.orange : P.bg2}
                    stroke={active ? P.orange : P.stroke} strokeWidth="1.5"
                    style={{ transition: 'fill .3s' }} />
                  <text textAnchor="middle" y="3" fontSize="10">{s.icon}</text>

                  <g transform={`translate(${labelOffset} 0)`} style={{ opacity: active ? 1 : 0.45, transition: 'opacity .4s' }}>
                    <rect x={onLeft ? 0 : -130} y="-11" width="130" height="28" rx="14"
                      fill={P.bg2}
                      stroke={active ? P.orange : P.stroke} strokeWidth="1" />
                    <text x={onLeft ? 9 : -121} y="0"
                      fontFamily="system-ui, sans-serif" fontSize="11"
                      fill={active ? P.ink : P.inkDim}>{s.name}</text>
                    <text x={onLeft ? 9 : -121} y="12"
                      fontFamily="ui-monospace, monospace" fontSize="8"
                      fill={P.inkDim}>{s.meta}</text>
                  </g>
                </g>
              )
            })}

            {/* Moto */}
            {progress < 1 && (
              <g transform={`translate(${motoPos.x} ${motoPos.y})`}>
                <circle r="11" fill={P.orange} opacity="0.3">
                  <animate attributeName="r" values="9;13;9" dur="0.8s" repeatCount="indefinite" />
                </circle>
                <text textAnchor="middle" y="5" fontSize="16">🛵</text>
              </g>
            )}
          </svg>
        </div>

        {/* Resumen ruta */}
        <div style={{ padding: '6px 16px 28px' }}>
          <div style={{
            background: P.bg2, border: `1px solid ${P.stroke}`,
            borderRadius: 14, padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: 'ui-monospace, monospace', fontSize: 10, color: P.inkDim,
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            <span>cómo se llega</span>
            <span style={{ flex: 1, height: 1, background: P.stroke }} />
            <span style={{ color: P.orange }}>{totalMin}min · {totalKm}km</span>
          </div>
        </div>
      </div>
    </>
  )
}
