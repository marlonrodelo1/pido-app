import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Stars from '../components/Stars'
import { estaAbierto } from '../lib/horario'
import { COLS_ESTABLECIMIENTO } from '../lib/estColumns'

export default function Favoritos({ onOpenRest }) {
  const { user } = useAuth()
  const [restaurantes, setRestaurantes] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (user?.id) fetchFavoritos() }, [user?.id])

  async function fetchFavoritos() {
    setLoading(true)
    try {
      const { data: favIds, error: rpcError } = await supabase.rpc('get_favoritos')
      if (rpcError || !favIds || favIds.length === 0) { setRestaurantes([]); return }
      // No filtramos por `activo`: un favorito debe seguir apareciendo aunque el
      // restaurante esté Cerrado ahora mismo (se marca "Cerrado"). Solo excluimos los
      // que ya no están en la plataforma (estado != 'activo'). Columnas explícitas
      // y compartidas con el resto de entradas a la ficha (ver lib/estColumns.js).
      const { data } = await supabase.from('establecimientos')
        .select(COLS_ESTABLECIMIENTO)
        .in('id', favIds).eq('estado', 'activo')
      setRestaurantes(data || [])
    } catch { setRestaurantes([]) }
    finally { setLoading(false) }
  }

  async function removeFav(id) {
    setRestaurantes(prev => prev.filter(r => r.id !== id))
    await supabase.rpc('toggle_favorito', { p_establecimiento_id: id })
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-text)', margin: '0 0 16px', letterSpacing: '-0.02em' }}>Favoritos</h2>
      {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--c-muted)' }}>Cargando...</div>}
      {!loading && restaurantes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--c-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>❤️</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Aún no tienes favoritos</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Toca el corazón en un restaurante</div>
        </div>
      )}
      {restaurantes.map(r => (
        <div key={r.id} onClick={() => onOpenRest(r)} style={{
          background: 'rgba(0,0,0,0.06)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 14, padding: '14px 16px',
          border: '1px solid rgba(0,0,0,0.08)', marginBottom: 10, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 50, height: 50, borderRadius: 12, background: 'rgba(0,0,0,0.06)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, overflow: 'hidden' }}>
            {r.logo_url ? <img src={r.logo_url} alt="" style={{ width: 50, height: 50, borderRadius: 12, objectFit: 'cover' }} /> : '🍽️'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--c-text)' }}>{r.nombre}</div>
              {!estaAbierto(r).abierto && (
                <span style={{ fontSize: 9, fontWeight: 800, color: '#DC2626', background: 'rgba(239,68,68,0.12)', padding: '2px 6px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cerrado</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--c-muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <Stars rating={r.rating} size={11} />
              <span style={{ fontWeight: 600 }}>{r.rating?.toFixed(1)}</span>
            </div>
          </div>
          <button onClick={e => { e.stopPropagation(); removeFav(r.id) }} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer' }}>❤️</button>
        </div>
      ))}
    </div>
  )
}
