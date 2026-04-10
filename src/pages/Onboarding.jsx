import { useState, useEffect } from 'react'

const CATS = [
  { id: 'comida',      nombre: 'Comida',       emoji: '🍕', desc: 'Restaurantes y cafeterías', color: '#FF6B2C' },
  { id: 'farmacia',    nombre: 'Farmacia',     emoji: '💊', desc: 'Medicamentos e higiene',    color: '#22C55E' },
  { id: 'marketplace', nombre: 'Marketplace',  emoji: '🛒', desc: 'Minimarkets y tiendas',     color: '#3B82F6' },
]

const ANIMATIONS = `
@keyframes float1{0%,100%{transform:translate(0,0) rotate(0deg)}33%{transform:translate(12px,-18px) rotate(8deg)}66%{transform:translate(-8px,10px) rotate(-5deg)}}
@keyframes float2{0%,100%{transform:translate(0,0) rotate(0deg)}33%{transform:translate(-15px,12px) rotate(-10deg)}66%{transform:translate(10px,-14px) rotate(6deg)}}
@keyframes float3{0%,100%{transform:translate(0,0) rotate(0deg)}33%{transform:translate(8px,16px) rotate(12deg)}66%{transform:translate(-12px,-10px) rotate(-8deg)}}
@keyframes logoIn{from{opacity:0;transform:scale(0.5) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
@keyframes textIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes cardIn0{from{opacity:0;transform:translateX(-40px) scale(0.9)}to{opacity:1;transform:translateX(0) scale(1)}}
@keyframes cardIn1{from{opacity:0;transform:translateY(40px) scale(0.9)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes cardIn2{from{opacity:0;transform:translateX(40px) scale(0.9)}to{opacity:1;transform:translateX(0) scale(1)}}
@keyframes emojiBounce{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes wave{0%{transform:rotate(0deg)}10%{transform:rotate(14deg)}20%{transform:rotate(-8deg)}30%{transform:rotate(14deg)}40%{transform:rotate(-4deg)}50%{transform:rotate(10deg)}60%{transform:rotate(0deg)}100%{transform:rotate(0deg)}}
@keyframes flagWave{0%,100%{clip-path:polygon(0 0,100% 2%,98% 100%,0 98%)}25%{clip-path:polygon(0 2%,100% 0,100% 98%,0 100%)}50%{clip-path:polygon(0 0,98% 0,100% 100%,2% 98%)}75%{clip-path:polygon(2% 0,100% 2%,98% 100%,0 100%)}}
`

const EMOJIS = ['🍕','🍔','🍣','💊','🛒','🥤','🍰','🫓','☕']

export default function Onboarding({ onComplete }) {
  const [ready, setReady] = useState(false)
  const [hovered, setHovered] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', position: 'relative', overflow: 'hidden' }}>
      <style>{ANIMATIONS}</style>

      {/* Emojis flotantes */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {EMOJIS.map((e, i) => (
          <div key={i} style={{
            position: 'absolute', top: `${10 + (i * 11) % 80}%`, left: `${5 + (i * 13) % 90}%`,
            fontSize: 24 + (i % 3) * 8, opacity: 0.06,
            animation: `float${(i % 3) + 1} ${4 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }}>{e}</div>
        ))}
      </div>

      {/* Logo */}
      <div style={{
        fontSize: 56, fontWeight: 800, color: 'var(--c-primary)', letterSpacing: '-0.04em',
        animation: ready ? 'logoIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none',
        opacity: ready ? 1 : 0, marginBottom: 6, fontFamily: 'var(--font)',
      }}>pidoo</div>

      <p style={{
        fontSize: 20, color: 'var(--c-text)', fontWeight: 700, textAlign: 'center',
        animation: ready ? 'textIn 0.5s ease 0.2s both' : 'none', opacity: 0,
        marginBottom: 4, letterSpacing: '-0.02em',
      }}>¿Qué necesitas hoy?</p>
      <p style={{
        fontSize: 13, color: 'var(--c-muted)', textAlign: 'center',
        animation: ready ? 'textIn 0.5s ease 0.35s both' : 'none', opacity: 0, marginBottom: 16,
      }}>Elige y te llevamos lo que quieras</p>

      {/* Bandera de Canarias */}
      <div style={{
        animation: ready ? 'textIn 0.5s ease 0.45s both' : 'none', opacity: 0, marginBottom: 28,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      }}>
        <div style={{ display: 'inline-flex', animation: 'wave 2.5s ease-in-out infinite', transformOrigin: '0% 50%' }}>
          <svg width="48" height="32" viewBox="0 0 48 32" style={{ animation: 'flagWave 3s ease-in-out infinite', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>
            <rect x="0" y="0" width="16" height="32" fill="#FFFFFF"/>
            <rect x="16" y="0" width="16" height="32" fill="#004EA8"/>
            <rect x="32" y="0" width="16" height="32" fill="#FECB00"/>
            <circle cx="24" cy="16" r="5" fill="#004EA8" stroke="#FECB00" strokeWidth="1"/>
            <text x="24" y="18.5" textAnchor="middle" fontSize="6" fill="#FECB00" fontWeight="bold">IC</text>
          </svg>
        </div>
        <span style={{ fontSize: 10, color: '#484847', fontWeight: 700, letterSpacing: '0.08em' }}>HECHO EN CANARIAS</span>
      </div>

      {/* Tarjetas */}
      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 1 }}>
        {CATS.map((c, i) => (
          <button key={c.id} onClick={() => onComplete(c.id)}
            onMouseEnter={() => setHovered(c.id)} onMouseLeave={() => setHovered(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 16, width: '100%',
              padding: '20px 18px', borderRadius: 16,
              border: hovered === c.id ? `1.5px solid ${c.color}` : '1.5px solid #262626',
              background: '#1A1919', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              transform: hovered === c.id ? 'scale(1.02)' : 'scale(1)',
              boxShadow: hovered === c.id ? `0 8px 30px ${c.color}15` : 'none',
              transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s ease, border 0.2s ease',
              animation: ready ? `cardIn${i} 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.4 + i * 0.12}s both` : 'none',
              opacity: 0,
            }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: '#262626',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, flexShrink: 0,
              animation: hovered === c.id ? 'emojiBounce 0.4s ease' : 'none',
            }}>{c.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: c.color, marginBottom: 2, letterSpacing: '-0.01em' }}>{c.nombre}</div>
              <div style={{ fontSize: 12, color: 'var(--c-muted)' }}>{c.desc}</div>
            </div>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: hovered === c.id ? c.color : '#262626',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.25s ease', flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={hovered === c.id ? '#fff' : c.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </button>
        ))}
      </div>

      <div style={{
        width: 100, height: 3, borderRadius: 2, marginTop: 36,
        background: 'linear-gradient(90deg, transparent, var(--c-primary), transparent)',
        backgroundSize: '200% 100%',
        animation: ready ? 'shimmer 2.5s ease-in-out infinite 1s' : 'none', opacity: 0.25,
      }} />
    </div>
  )
}
