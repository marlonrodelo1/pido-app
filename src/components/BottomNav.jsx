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
      background: '#0E0E0E',
      borderTop: '1px solid #262626',
    }}>
      <div style={{
        width: '100%', maxWidth: 420, margin: '0 auto',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: '10px 0 calc(10px + env(safe-area-inset-bottom, 0px))',
        height: 60,
      }}>
        {NAV_ITEMS.map(n => {
          const isActive = active === n.id
          return (
            <button
              key={n.id}
              onClick={() => onChange(n.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 4,
                background: 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                color: isActive ? '#FF9066' : '#ADAAAA',
                fontSize: 10, fontWeight: isActive ? 600 : 400,
                padding: 0, flex: 1,
                transition: 'color 0.2s ease',
              }}
            >
              <n.Icon size={22} strokeWidth={isActive ? 2.2 : 1.6} />
              <span>{n.l}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
