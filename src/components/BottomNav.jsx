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
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      background: 'var(--c-surface)',
      borderTop: '1px solid var(--c-border-soft)',
      backdropFilter: 'var(--blur-md)',
      WebkitBackdropFilter: 'var(--blur-md)',
    }}>
      <div style={{
        width: '100%', maxWidth: 420, margin: '0 auto',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: '8px 4px 10px',
      }}>
        {NAV_ITEMS.map(n => {
          const isActive = active === n.id
          return (
            <button
              key={n.id}
              onClick={() => onChange(n.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                background: isActive ? 'var(--c-primary-glow)' : 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                color: isActive ? 'var(--c-primary-light)' : 'var(--c-muted)',
                fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
                padding: '7px 8px', minWidth: 52, minHeight: 44, flex: 1,
                borderRadius: 10, transition: 'color 0.2s ease, background 0.2s ease',
                justifyContent: 'center',
              }}
            >
              <n.Icon size={21} strokeWidth={isActive ? 2.5 : 1.8} />
              {n.l}
            </button>
          )
        })}
      </div>
    </div>
  )
}
