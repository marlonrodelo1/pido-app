import { useState, useEffect } from 'react'
import { Video, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

// Banner de descubrimiento de Pidoo Creadores en la Home.
//
// POR QUÉ EXISTE: la tarjeta de "graba un vídeo" solo aparece DESPUÉS de recibir
// un pedido. Quien no ha pedido nunca —o hace tiempo— no se entera de que el
// programa existe. Esto es lo único que lo cuenta antes.
//
// TRES REGLAS PARA QUE NO SEA RUIDO:
//  1. Solo si hay ALGÚN restaurante con el programa abierto y con escalera. Sin
//     esto se le prometerían premios a alguien que no puede conseguir ninguno:
//     toca, no pasa nada, y la próxima vez ya no mira.
//  2. Desaparece solo en cuanto el cliente registra su primer vídeo: ya se enteró.
//  3. Se puede cerrar, y se queda cerrado. Un banner que no se puede quitar es un
//     banner que la gente aprende a ignorar.

const CERRADO_KEY = 'pidoo_creadores_banner_cerrado'

export default function CreadoresBanner({ onAbrir }) {
  const { user } = useAuth()
  const [mostrar, setMostrar] = useState(false)

  useEffect(() => {
    let vivo = true
    async function mirar() {
      try { if (localStorage.getItem(CERRADO_KEY) === '1') return } catch (_) {}

      const { data: hay } = await supabase.rpc('creadores_hay_programa_activo')
      if (!vivo || hay !== true) return

      // Si ya participa, no hay nada que descubrirle.
      if (user) {
        const { count } = await supabase
          .from('participaciones_creador')
          .select('id', { count: 'exact', head: true })
        if (!vivo || (count || 0) > 0) return
      }
      setMostrar(true)
    }
    mirar()
    return () => { vivo = false }
  }, [user])

  if (!mostrar) return null

  function cerrar(e) {
    e.stopPropagation()
    try { localStorage.setItem(CERRADO_KEY, '1') } catch (_) {}
    setMostrar(false)
  }

  return (
    <div
      className="home-fade shell-narrow"
      role="button"
      tabIndex={0}
      onClick={onAbrir}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onAbrir?.() }}
      style={{
        animationDelay: '0.12s',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', marginBottom: 28, cursor: 'pointer',
        borderRadius: 16,
        background: 'linear-gradient(135deg, #FDE8D6 0%, #F7CFB2 100%)',
        border: '1px solid #E4671F',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: 'rgba(255,255,255,0.6)', display: 'grid', placeItems: 'center',
      }}>
        <Video size={20} color="#A85018" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#A85018', lineHeight: 1.25 }}>
          Gana premios por grabar tus pedidos
        </div>
        <div style={{ fontSize: 12, color: '#8A5A33', marginTop: 2, lineHeight: 1.35 }}>
          Sube un vídeo a TikTok o Instagram y consigue descuentos
        </div>
      </div>

      <button
        onClick={cerrar}
        aria-label="Cerrar aviso"
        style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0, border: 'none',
          background: 'rgba(255,255,255,0.5)', cursor: 'pointer',
          display: 'grid', placeItems: 'center',
        }}
      >
        <X size={14} color="#A85018" />
      </button>
    </div>
  )
}
