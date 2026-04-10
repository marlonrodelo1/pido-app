import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Stars from '../components/Stars'

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
      const { data } = await supabase.from('establecimientos').select('*').in('id', favIds)
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
          background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderRadius: 14, padding: '14px 16px',
          border: '1px solid rgba(255,255,255,0.1)', marginBottom: 10, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 50, height: 50, borderRadius: 12, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, overflow: 'hidden' }}>
            {r.logo_url ? <img src={r.logo_url} alt="" style={{ width: 50, height: 50, borderRadius: 12, objectFit: 'cover' }} /> : '🍽️'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--c-text)' }}>{r.nombre}</div>
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
