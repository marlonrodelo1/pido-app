import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Notificaciones() {
  const { user } = useAuth()
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) fetchNotificaciones() }, [user])

  async function fetchNotificaciones() {
    const hace7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('notificaciones').select('*').eq('usuario_id', user.id)
      .gte('created_at', hace7d).order('created_at', { ascending: false }).limit(30)
    setNotifs(data || []); setLoading(false)
  }

  async function marcarLeida(id) {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
  }

  function tiempoRelativo(fecha) {
    const diff = Date.now() - new Date(fecha).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `Hace ${mins} min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `Hace ${hours}h`
    return `Hace ${Math.floor(hours / 24)}d`
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-text)', margin: '0 0 16px', letterSpacing: '-0.02em' }}>Notificaciones</h2>
      {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--c-muted)' }}>Cargando...</div>}
      {!loading && notifs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--c-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Sin notificaciones</div>
        </div>
      )}
      {notifs.map(n => (
        <div key={n.id} onClick={() => !n.leida && marcarLeida(n.id)} style={{
          background: n.leida ? '#1A1919' : 'rgba(255,107,44,0.08)',
          borderRadius: 12, padding: '14px 16px',
          border: n.leida ? '1px solid #262626' : '1px solid rgba(255,107,44,0.2)',
          marginBottom: 8, cursor: 'pointer',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--c-text)' }}>{n.titulo}</span>
            {!n.leida && <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--c-primary)', flexShrink: 0 }} />}
          </div>
          {n.descripcion && <div style={{ fontSize: 12, color: 'var(--c-muted)' }}>{n.descripcion}</div>}
          <div style={{ fontSize: 10, color: '#767575', marginTop: 4 }}>{tiempoRelativo(n.created_at)}</div>
        </div>
      ))}
    </div>
  )
}
