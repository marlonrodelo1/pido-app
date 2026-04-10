import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Sanitizar HTML para prevenir XSS
function sanitizeHtml(html) {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  // Eliminar scripts, iframes, event handlers
  doc.querySelectorAll('script, iframe, object, embed, form').forEach(el => el.remove())
  doc.querySelectorAll('*').forEach(el => {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith('on') || attr.value.includes('javascript:')) {
        el.removeAttribute(attr.name)
      }
    }
  })
  return doc.body.innerHTML
}

export default function PaginaLegal({ slug, onBack }) {
  const [pagina, setPagina] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('paginas_legales').select('*').eq('slug', slug).single()
      .then(({ data }) => { setPagina(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug])

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}><div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Cargando...</div></div>
  if (!pagina) return <div style={{ textAlign: 'center', padding: '60px 20px' }}><div style={{ fontSize: 48, marginBottom: 12 }}>📄</div><div style={{ fontSize: 16, fontWeight: 700 }}>Página no encontrada</div></div>

  return (
    <div className="legal-content" style={{ padding: '20px', maxWidth: 420, margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
      {onBack && (
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#FF6B2C', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16, padding: 0 }}>
          <ArrowLeft size={16} strokeWidth={2.5} /> Volver
        </button>
      )}
      <div
        style={{ fontSize: 14, lineHeight: 1.7, color: '#F5F5F5' }}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(pagina.contenido) }}
      />
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 24, textAlign: 'center' }}>
        Última actualización: {new Date(pagina.updated_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  )
}
