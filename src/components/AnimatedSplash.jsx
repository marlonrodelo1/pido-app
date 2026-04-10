import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

export default function AnimatedSplash({ onComplete }) {
  const [exiting, setExiting] = useState(false)
  const isNative = Capacitor.isNativePlatform()

  useEffect(() => {
    const exitAt = isNative ? 1000 : 2200
    const completeAt = isNative ? 1400 : 2600
    const t1 = setTimeout(() => setExiting(true), exitAt)
    const t2 = setTimeout(() => onComplete(), completeAt)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <>
      <style>{`
        @keyframes splashLogoIn {
          0% { opacity: 0; transform: scale(0.5); }
          60% { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splashGlow {
          0%, 100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.25; }
          50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0.5; }
        }
        @keyframes splashTextIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashOut {
          to { opacity: 0; transform: scale(1.06); }
        }
      `}</style>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0D0D0D',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        animation: exiting ? 'splashOut 0.4s ease forwards' : undefined,
      }}>
        {/* Glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,44,0.18) 0%, transparent 70%)',
          animation: 'splashGlow 1.6s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        {/* Logo */}
        <img
          src="/icon.png"
          alt="Pidoo"
          style={{
            width: 88, height: 88, borderRadius: 22,
            boxShadow: '0 8px 40px rgba(255,107,44,0.3)',
            animation: 'splashLogoIn 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            opacity: 0,
            position: 'relative', zIndex: 2,
          }}
        />
        {/* Brand text */}
        <div style={{
          fontSize: 38, fontWeight: 800, color: '#FF6B2C',
          letterSpacing: -2, marginTop: 16,
          animation: 'splashTextIn 0.5s ease both',
          animationDelay: '0.6s',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          pidoo
        </div>
        {/* Tagline */}
        <div style={{
          fontSize: 13, color: 'rgba(255,255,255,0.35)',
          fontWeight: 600, marginTop: 6,
          animation: 'splashTextIn 0.5s ease both',
          animationDelay: '0.9s',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Tu delivery de confianza
        </div>
      </div>
    </>
  )
}
