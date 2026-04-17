import { Home, Heart, Map, ClipboardList, ShoppingBag } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'home',      l: 'Inicio',    Icon: Home },
  { id: 'favoritos', l: 'Favoritos', Icon: Heart },
  { id: 'carrito',   l: 'Carrito',   Icon: ShoppingBag, center: true },
  { id: 'mapa',      l: 'Mapa',      Icon: Map },
  { id: 'pedidos',   l: 'Pedidos',   Icon: ClipboardList },
]

export default function BottomNav({ active, onChange, totalItems = 0 }) {
  return (
    <div style={{
      position: 'fixed', bottom: 20, left: 0, right: 0, zIndex: 50,
      display: 'flex', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{
        width: '90%', maxWidth: 400,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        height: 64,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 22,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 12px 40px rgba(255,107,44,0.06)',
        padding: '0 6px',
        pointerEvents: 'auto',
      }}>
        {NAV_ITEMS.map(n => {
          const isActive = active === n.id
          if (n.center) {
            return (
              <button
                key={n.id}
                onClick={() => onChange(n.id)}
                aria-label="Carrito"
                style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 56, height: 56, borderRadius: 18,
                  background: '#FF6B2C',
                  border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                  color: '#fff',
                  boxShadow: '0 8px 20px rgba(255,107,44,0.35)',
                  transform: 'translateY(-10px)',
                  flexShrink: 0,
                }}
              >
                <n.Icon size={24} strokeWidth={2} />
                {totalItems > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    minWidth: 20, height: 20, padding: '0 6px',
                    borderRadius: 10, background: '#FF6B2C',
                    border: '2px solid #0D0D0D',
                    color: '#fff', fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{totalItems}</span>
                )}
              </button>
            )
          }
          return (
            <button
              key={n.id}
              onClick={() => onChange(n.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 2,
                background: isActive ? 'rgba(255,107,44,0.15)' : 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                color: isActive ? '#FF6B2C' : 'rgba(255,255,255,0.4)',
                padding: '6px 10px',
                borderRadius: 14,
                transition: 'all 0.2s ease',
                minWidth: 0,
              }}
            >
              <n.Icon size={20} strokeWidth={isActive ? 2.2 : 1.5} />
              <span style={{
                fontSize: 9, fontWeight: 600,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
              }}>{n.l}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
