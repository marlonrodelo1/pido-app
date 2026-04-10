import { Home, Heart, Map, ClipboardList, User } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'home',      l: 'Inicio',    Icon: Home },
  { id: 'favoritos', l: 'Favoritos', Icon: Heart },
  { id: 'mapa',      l: 'Mapa',      Icon: Map },
  { id: 'pedidos',   l: 'Pedidos',   Icon: ClipboardList },
  { id: 'perfil',    l: 'Perfil',    Icon: User },
]

export default function BottomNav({ active, onChange }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: 0, right: 0, zIndex: 50,
      display: 'flex', justifyContent: 'center',
    }}>
      <div style={{
        width: '92%', maxWidth: 448,
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        height: 72,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 22,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 50px -12px rgba(255,107,44,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {NAV_ITEMS.map(n => {
          const isActive = active === n.id
          return (
            <button
              key={n.id}
              onClick={() => onChange(n.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 4,
                background: isActive ? 'rgba(255,107,44,0.15)' : 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                color: isActive ? '#FF6B2C' : 'rgba(255,255,255,0.45)',
                padding: '8px 14px',
                borderRadius: 16,
                transition: 'all 0.2s ease',
              }}
            >
              <n.Icon size={22} strokeWidth={isActive ? 2.2 : 1.6} />
              <span style={{
                fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>{n.l}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
