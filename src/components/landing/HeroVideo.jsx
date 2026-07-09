/* ──────────────────────────────────────────────────────────────────────────
 * HERO — video de fondo a sangre + frases animadas que rotan + botón glaseado.
 * El video lo sube Marlon a public/hero/pidoo-hero.mp4. Hasta entonces se ve el
 * poster. Si el .mp4 no existe, el <img> de debajo hace de fallback.
 * ────────────────────────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { GhostBtn } from './_ui'

const POSTER = '/hero/pidoo-hero-poster.jpg'
const VIDEO_MP4 = '/hero/pidoo-hero.mp4'

/* Frases que rotan sobre el video (clientes + negocio) */
const PHRASES = [
  '¿Qué esperas para montar tu negocio?',
  'Te estamos buscando',
  'Si tienes un restaurante…',
  '¿Quieres buscar comida? Encuentra tu favorita en el mejor restaurante',
]

const ROTATE_MS = 3800

function RotatingHeadline() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % PHRASES.length), ROTATE_MS)
    return () => clearInterval(t)
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        textAlign: 'center',
        padding: '0 20px',
        maxWidth: 860,
      }}
    >
      <div
        style={{
          minHeight: 132,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <h1
          key={i}
          className="pd-hero-rot"
          style={{
            color: '#FFFFFF',
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(26px, 4.6vw, 52px)',
            lineHeight: 1.12,
            letterSpacing: -1,
            margin: 0,
            textShadow: '0 2px 24px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.5)',
            maxWidth: 820,
          }}
        >
          {PHRASES[i]}
        </h1>
      </div>

      {/* Botón glaseado */}
      <GhostBtn
        href="#descargas"
        size="lg"
        style={{
          background: 'rgba(251,248,242,0.85)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 10px 30px -8px rgba(0,0,0,0.5)',
        }}
      >
        Descargar la app
        <ArrowDown size={17} strokeWidth={2.5} />
      </GhostBtn>

      {/* Indicadores de rotación */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        {PHRASES.map((_, idx) => (
          <span
            key={idx}
            style={{
              width: idx === i ? 22 : 8,
              height: 8,
              borderRadius: 999,
              background: idx === i ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
              transition: 'width .3s ease, background .3s ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default function HeroVideo() {
  const videoRef = useRef(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    const p = v.play()
    if (p && p.catch) p.catch(() => {})
  }, [])

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        height: 'min(88vh, 760px)',
        minHeight: 480,
        overflow: 'hidden',
        background: 'var(--c-ink)',
      }}
    >
      <style>{heroCss}</style>

      {/* Base: poster como imagen (fallback si el video falta o falla) */}
      <img
        src={POSTER}
        alt=""
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* Video encima (transparente si no hay .mp4 → se ve el poster) */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={POSTER}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      >
        <source src={VIDEO_MP4} type="video/mp4" />
      </video>

      {/* Velo para legibilidad del texto */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(26,24,21,0.35) 0%, rgba(26,24,21,0.15) 35%, rgba(26,24,21,0.25) 65%, rgba(26,24,21,0.55) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Contenido: frases rotando + botón */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}
      >
        <RotatingHeadline />
      </div>
    </section>
  )
}

const heroCss = `
@keyframes pd-hero-in {
  0%   { opacity: 0; transform: translateY(16px); filter: blur(4px); }
  100% { opacity: 1; transform: translateY(0);    filter: blur(0);   }
}
.pd-hero-rot { animation: pd-hero-in .7s cubic-bezier(.22,.61,.36,1) both; }
@media (prefers-reduced-motion: reduce) {
  .pd-hero-rot { animation: none; }
}
`
