import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

export default function AnimatedSplash({ onComplete }) {
  const [exiting, setExiting] = useState(false)
  const isNative = Capacitor.isNativePlatform()

  useEffect(() => {
    const exitAt     = isNative ? 1000 : 2200
    const completeAt = isNative ? 1400 : 2600
    const t1 = setTimeout(() => setExiting(true), exitAt)
    const t2 = setTimeout(() => onComplete(), completeAt)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <>
      <style>{`
        @keyframes splashLogoIn {
          0%   { opacity: 0; transform: scale(0.5); }
          60%  { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splashGlow {
          0%, 100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.22; }
          50%       { transform: translate(-50%, -50%) scale(1.4); opacity: 0.48; }
        }
        @keyframes splashRingPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
          50%       { transform: translate(-50%, -50%) scale(1.6); opacity: 0.12; }
        }
        @keyframes splashTextIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashOut {
          to { opacity: 0; transform: scale(1.05); }
        }
        @keyframes splashDotsIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40%            { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'var(--c-bg)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        animation: exiting ? 'splashOut 0.4s ease forwards' : undefined,
        overflow: 'hidden',
      }}>

        {/* Glow outer ring */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 380, height: 380, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,44,0.10) 0%, transparent 70%)',
          animation: 'splashRingPulse 2.4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* Glow core */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,44,0.20) 0%, transparent 70%)',
          animation: 'splashGlow 1.8s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <img
          src="/icon.png"
          alt="Pidoo"
          style={{
            width: 92, height: 92,
            borderRadius: 24,
            boxShadow: '0 12px 48px rgba(255,107,44,0.32)',
            animation: 'splashLogoIn 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            opacity: 0,
            position: 'relative', zIndex: 2,
          }}
        />

        {/* Brand name */}
        <div style={{
          fontSize: 40, fontWeight: 800, color: 'var(--c-primary)',
          letterSpacing: '-0.03em', marginTop: 18,
          animation: 'splashTextIn 0.5s ease both',
          animationDelay: '0.55s',
          fontFamily: 'var(--font)',
          position: 'relative', zIndex: 2,
        }}>
          pidoo
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 13, color: 'var(--c-muted-soft)',
          fontWeight: 500, letterSpacing: '0.02em',
          marginTop: 6,
          animation: 'splashTextIn 0.5s ease both',
          animationDelay: '0.85s',
          fontFamily: 'var(--font)',
          position: 'relative', zIndex: 2,
        }}>
          Tu delivery de confianza
        </div>

        {/* Loading dots */}
        <div style={{
          display: 'flex', gap: 6, marginTop: 48,
          animation: 'splashDotsIn 0.4s ease both',
          animationDelay: '1.2s',
          position: 'relative', zIndex: 2,
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--c-primary)',
              animation: 'dotBounce 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
            }} />
          ))}
        </div>
      </div>
    </>
  )
}
