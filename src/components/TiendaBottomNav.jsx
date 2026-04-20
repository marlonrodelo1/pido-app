import { BookOpen, ClipboardList, CircleUser } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'carta',   l: 'Carta',      Icon: BookOpen },
  { id: 'pedidos', l: 'Mis pedidos', Icon: ClipboardList },
  { id: 'perfil',  l: 'Perfil',     Icon: CircleUser },
]

export default function TiendaBottomNav({ active, onChange }) {
  return (
    <div style={{
      position: 'fixed', bottom: 20, left: 0, right: 0, zIndex: 50,
      display: 'flex', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{
        width: '90%', maxWidth: 400,
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        height: 64,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 22,
        border: '1px solid #E8E6E0',
        boxShadow: '0 -4px 16px rgba(15,15,15,0.06), 0 12px 32px rgba(15,15,15,0.08)',
        padding: '0 6px',
        pointerEvents: 'auto',
      }}>
        {NAV_ITEMS.map(n => {
          const isActive = active === n.id
          return (
            <button
              key={n.id}
              onClick={() => onChange(n.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 2,
                background: isActive ? 'rgba(255,107,44,0.10)' : 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                color: isActive ? '#FF6B2C' : '#6B6B68',
                padding: '6px 14px',
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
