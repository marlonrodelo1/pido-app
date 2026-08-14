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
      {/* Barra flotante de cristal.
          Antes iba al 96 % de blanco: eso no es cristal, es una tabla opaca con
          un blur que no se veía porque no pasaba nada por detrás.

          EL 72 % NO ES UN NÚMERO BONITO, ES EL LÍMITE MEDIDO. Por debajo, con
          una foto oscura pasando por detrás, los iconos apagados se quedan sin
          contraste: al 62 % dan 2,2:1 y desaparecen. Al 72 % con el icono en
          #5A5348 dan 3,7:1, por encima del 3:1 que pide un control. Si alguien
          la vuelve más transparente, hay que oscurecer los iconos a la vez.

          El `background` sólido va además de respaldo: el WebView antiguo de
          Android ignora `backdrop-filter`, y sin él la barra se quedaría en
          blanco liso — feo, pero legible, que es lo que importa. */}
      <div style={{
        width: '90%', maxWidth: 400,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        height: 64,
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(26px) saturate(180%)', WebkitBackdropFilter: 'blur(26px) saturate(180%)',
        borderRadius: 32,
        border: '1px solid rgba(255,255,255,0.75)',
        boxShadow: [
          'inset 0 1px 0 rgba(255,255,255,0.9)',
          '0 -2px 10px rgba(15,15,15,0.04)',
          '0 14px 36px rgba(15,15,15,0.14)',
        ].join(', '),
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
                  // OJO: nada de `overflow: hidden` aquí — el contador de
                  // artículos va en top/right negativos y quedaría recortado.
                  // Por eso el brillo se dibuja DENTRO del botón, no desbordando.
                  position: 'relative',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 56, height: 56, borderRadius: 18,
                  // Glaseado: el degradado da el volumen (claro arriba, tostado
                  // abajo), el `inset` de arriba es el filo de luz y el de abajo
                  // el rebote interior. Sin los dos inset esto es un cuadrado
                  // naranja con sombra; con ellos parece una pieza esmaltada.
                  background: 'linear-gradient(168deg, #F0813F 0%, #D45F2C 46%, #A8451F 100%)',
                  border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                  color: '#fff',
                  boxShadow: [
                    'inset 0 1.5px 0 rgba(255,255,255,0.55)',
                    'inset 0 -6px 12px rgba(120,40,10,0.35)',
                    '0 8px 20px rgba(197,86,44,0.38)',
                    '0 2px 5px rgba(120,40,10,0.28)',
                  ].join(', '),
                  transform: 'translateY(-10px)',
                  flexShrink: 0,
                }}
              >
                {/* El brillo del esmalte: una elipse de luz en el tercio de
                    arriba, difuminada hacia abajo. Va detras del icono y no
                    captura toques. */}
                <span aria-hidden="true" style={{
                  position: 'absolute', top: 3, left: '13%', right: '13%', height: 20,
                  borderRadius: '50%', pointerEvents: 'none',
                  background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.50) 0%, rgba(255,255,255,0) 72%)',
                }} />
                <n.Icon size={24} strokeWidth={2} style={{ position: 'relative', zIndex: 1 }} />
                {totalItems > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    minWidth: 20, height: 20, padding: '0 6px',
                    borderRadius: 10, background: '#C5562C',
                    border: '2px solid #FFFFFF',
                    color: '#fff', fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{totalItems}</span>
                )}
              </button>
            )
          }
          // El activo se marca con una pastilla y ES EL ÚNICO QUE LLEVA TEXTO.
          // En la referencia (Instagram) no hay texto en ninguno, pero allí son
          // cinco iconos que todo el mundo conoce; aquí "Mapa" y "Pedidos" no se
          // distinguen por el dibujo. Con el rótulo solo en el activo se queda
          // igual de limpio y sigues sabiendo dónde estás.
          return (
            <button
              key={n.id}
              onClick={() => onChange(n.id)}
              aria-label={n.l}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: isActive ? 'rgba(197,86,44,0.13)' : 'transparent',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                color: isActive ? '#A8451F' : '#5A5348',
                padding: isActive ? '8px 13px' : '8px 11px',
                borderRadius: 999,
                transition: 'background 0.22s ease, color 0.22s ease, padding 0.22s ease',
                minWidth: 0,
              }}
            >
              <n.Icon size={21} strokeWidth={isActive ? 2.3 : 1.8} style={{ flexShrink: 0 }} />
              {isActive && (
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  letterSpacing: '-0.01em', whiteSpace: 'nowrap',
                }}>{n.l}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
