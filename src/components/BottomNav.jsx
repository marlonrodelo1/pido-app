import { Home, Heart, Map, ClipboardList, User } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'home', l: 'Inicio', Icon: Home },
  { id: 'favoritos', l: 'Favoritos', Icon: Heart },
  { id: 'mapa', l: 'Mapa', Icon: Map },
  { id: 'pedidos', l: 'Pedidos', Icon: ClipboardList },
  { id: 'perfil', l: 'Perfil', Icon: User },
]

export default function BottomNav({ active, onChange }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
    }}>
    <div className="bottom-nav-wrap" style={{
      width: '100%', maxWidth: 420, margin: '0 auto',
      background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '22px 22px 0 0',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '6px 4px calc(8px + env(safe-area-inset-bottom, 0px))',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.35)',
    }}>
      {NAV_ITEMS.map(n => {
        const isActive = active === n.id
        return (
          <button key={n.id} onClick={() => onChange(n.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            color: isActive ? '#FF6B2C' : 'rgba(255,255,255,0.5)',
            fontSize: 9, fontWeight: 600, padding: '8px 6px', minWidth: 44, minHeight: 44, flex: 1,
            borderRadius: 14, transition: 'all 0.2s ease',
            justifyContent: 'center',
          }}>
            <n.Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            {n.l}
          </button>
        )
      })}
    </div>
    </div>
  )
}
