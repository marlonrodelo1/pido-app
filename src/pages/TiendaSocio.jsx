import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Stars from '../components/Stars'

function HorarioBadge({ horario }) {
  if (!horario) return null
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  const hoy = dias[new Date().getDay()]
  const h = horario[hoy]
  if (!h || !h.abierto) return <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 700 }}>Cerrado</span>
  return <span style={{ fontSize: 11, color: '#22C55E', fontWeight: 700 }}>Abierto · {h.desde}–{h.hasta}</span>
}

function RestCard({ est, onClick }) {
  return (
    <div onClick={() => onClick(est)} style={{
      background: '#1A1A1A', borderRadius: 16, overflow: 'hidden',
      border: est.exclusivo ? '1px solid rgba(255,87,51,0.3)' : '1px solid rgba(255,255,255,0.07)',
      cursor: 'pointer', transition: 'transform 0.15s',
    }}>
      {/* Banner */}
      <div style={{ height: 120, background: '#2A2A2A', position: 'relative', overflow: 'hidden' }}>
        {est.banner_url
          ? <img src={est.banner_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1e1e1e,#2a2a2a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🍽️</div>
        }
        {/* Logo */}
        <div style={{
          position: 'absolute', bottom: -20, left: 14,
          width: 44, height: 44, borderRadius: 12, overflow: 'hidden',
          background: '#111', border: '2px solid #1A1A1A',
        }}>
          {est.logo_url
            ? <img src={est.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🍽️</div>
          }
        </div>
        {/* Badge exclusivo / cobertura */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          background: est.exclusivo ? 'rgba(255,87,51,0.92)' : 'rgba(34,197,94,0.88)',
          borderRadius: 8, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#fff',
        }}>
          {est.exclusivo ? '🔒 Exclusivo' : '🛵 Cobertura garantizada'}
        </div>
      </div>

      <div style={{ padding: '28px 14px 14px' }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: '#F5F5F5', marginBottom: 4 }}>{est.nombre}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          {est.rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Stars rating={est.rating} size={11} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{est.rating?.toFixed(1)}</span>
            </div>
          )}
          <HorarioBadge horario={est.horario} />
        </div>
        {est.descripcion && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {est.descripcion}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TiendaSocio({ slug }) {
  const [socio, setSocio] = useState(null)
  const [establecimientos, setEstablecimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { cargar() }, [slug])

  async function cargar() {
    setLoading(true)
    setError(null)

    // 1. Cargar socio
    const { data: socioData, error: socioErr } = await supabase
      .from('socios')
      .select('id, nombre_comercial, slug, logo_url, banner_url, rating, total_resenas, modo_entrega, redes, en_servicio')
      .eq('slug', slug)
      .single()

    if (socioErr || !socioData) {
      setError('Tienda no encontrada')
      setLoading(false)
      return
    }
    setSocio(socioData)

    // 2. Cargar relaciones SOLO estado='aceptado'
    const { data: relaciones } = await supabase
      .from('socio_establecimiento')
      .select('establecimiento_id, destacado, exclusivo')
      .eq('socio_id', socioData.id)
      .eq('estado', 'aceptado')

    if (!relaciones || relaciones.length === 0) {
      setEstablecimientos([])
      setLoading(false)
      return
    }

    // 3. Cargar establecimientos activos de esas relaciones
    const estIds = relaciones.map(r => r.establecimiento_id)
    const { data: ests } = await supabase
      .from('establecimientos')
      .select('id, nombre, descripcion, logo_url, banner_url, rating, total_resenas, horario, activo')
      .in('id', estIds)
      .eq('activo', true)

    // Marcar exclusivo / destacado desde la relación
    const conMeta = (ests || []).map(e => {
      const rel = relaciones.find(r => r.establecimiento_id === e.id)
      return { ...e, exclusivo: rel?.exclusivo ?? false, destacado: rel?.destacado ?? false }
    }).sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0))

    setEstablecimientos(conMeta)
    setLoading(false)
  }

  function abrirRest(est) {
    // Redirige a pido-app con el restaurante seleccionado dentro de la app
    // El usuario tendrá que estar logueado para hacer pedido desde pido-app
    // — o visitar pidoo.es/{slug} (pido-go-tienda) para pedir sin login
    window.location.href = `/?tienda=${slug}&est=${est.id}`
  }

  const shell = {
    minHeight: '100vh',
    background: '#0D0D0D',
    fontFamily: "'DM Sans', sans-serif",
    color: '#F5F5F5',
  }

  if (loading) {
    return (
      <div style={{ ...shell, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#FF5733' }}>Cargando tienda...</div>
      </div>
    )
  }

  if (error || !socio) {
    return (
      <div style={{ ...shell, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
        <div style={{ fontSize: 48 }}>😕</div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Tienda no encontrada</div>
        <a href="/" style={{ fontSize: 14, color: '#FF5733', textDecoration: 'none', fontWeight: 600 }}>← Volver a Pidoo</a>
      </div>
    )
  }

  const redes = socio.redes || {}

  return (
    <div style={shell}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0D0D0D; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Banner */}
      <div style={{ position: 'relative', height: 180, background: '#1A1A1A', overflow: 'hidden' }}>
        {socio.banner_url
          ? <img src={socio.banner_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a1a1a,#2a2a2a)' }} />
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7))' }} />

        {/* Logo centrado */}
        <div style={{
          position: 'absolute', bottom: -28, left: '50%', transform: 'translateX(-50%)',
          width: 72, height: 72, borderRadius: 20, overflow: 'hidden',
          background: '#111', border: '3px solid #0D0D0D', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}>
          {socio.logo_url
            ? <img src={socio.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🛵</div>
          }
        </div>

        {/* Botón volver */}
        <a href="/" style={{
          position: 'absolute', top: 14, left: 14,
          width: 34, height: 34, borderRadius: 10,
          background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 16, textDecoration: 'none',
          backdropFilter: 'blur(8px)',
        }}>←</a>
      </div>

      {/* Info socio */}
      <div style={{ textAlign: 'center', paddingTop: 40, paddingBottom: 16, padding: '40px 20px 16px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#F5F5F5', marginBottom: 6 }}>{socio.nombre_comercial}</h1>
        {socio.rating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
            <Stars rating={socio.rating} size={13} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{socio.rating?.toFixed(1)} ({socio.total_resenas || 0})</span>
          </div>
        )}

        {/* Estado servicio */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 20,
          background: socio.en_servicio ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
          border: `1px solid ${socio.en_servicio ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.1)'}`,
          fontSize: 12, fontWeight: 700,
          color: socio.en_servicio ? '#22C55E' : 'rgba(255,255,255,0.4)',
          marginBottom: 14,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: socio.en_servicio ? '#22C55E' : '#666', flexShrink: 0 }} />
          {socio.en_servicio ? 'En servicio ahora' : 'Fuera de servicio'}
        </div>

        {/* Redes sociales */}
        {(redes.whatsapp || redes.instagram || redes.tiktok) && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 4 }}>
            {redes.whatsapp && (
              <a href={`https://wa.me/${redes.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, textDecoration: 'none',
              }}>💬</a>
            )}
            {redes.instagram && (
              <a href={`https://instagram.com/${redes.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'rgba(255,87,51,0.12)', border: '1px solid rgba(255,87,51,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, textDecoration: 'none',
              }}>📸</a>
            )}
          </div>
        )}
      </div>

      {/* Lista de restaurantes */}
      <div style={{ padding: '0 16px 40px' }}>
        {establecimientos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.35)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🍽️</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Esta tienda aún no tiene restaurantes</div>
            <div style={{ fontSize: 13 }}>Vuelve pronto</div>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#F5F5F5', marginBottom: 16, letterSpacing: -0.3 }}>
              Restaurantes ({establecimientos.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {establecimientos.map(est => (
                <RestCard key={est.id} est={est} onClick={abrirRest} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
