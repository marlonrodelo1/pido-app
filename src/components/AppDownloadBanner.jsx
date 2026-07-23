/* ──────────────────────────────────────────────────────────────────────────
 * AppDownloadBanner — banner de descarga de la app cliente para las URLs
 * públicas web (tienda del restaurante). Muestra los badges OFICIALES de
 * App Store + Google Play enlazando a las stores reales (la app cliente ya
 * está publicada). Se oculta dentro de la app nativa (Capacitor) y es
 * descartable (se recuerda en localStorage para no ser pesado).
 * ────────────────────────────────────────────────────────────────────────── */
import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { X } from 'lucide-react'

const APPSTORE = 'https://apps.apple.com/es/app/pidoo/id6759052572'
const GPLAY = 'https://play.google.com/store/apps/details?id=com.pidoo.app'
const DISMISS_KEY = 'pido_dl_banner_dismissed'

const C = {
  paper: '#FBF8F2', ink: '#1A1815', stone: '#6B6356', border: '#E8E1D3',
}

export default function AppDownloadBanner() {
  const [hidden, setHidden] = useState(() => {
    // Dentro de la app nativa no tiene sentido pedir que la descarguen.
    if (Capacitor.isNativePlatform()) return true
    try { return localStorage.getItem(DISMISS_KEY) === '1' } catch (_) { return false }
  })
  if (hidden) return null

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch (_) {}
    setHidden(true)
  }

  return (
    <div style={{
      position: 'relative',
      background: C.paper,
      border: `1px solid ${C.border}`,
      borderRadius: 18,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      boxShadow: '0 1px 3px rgba(26,24,21,0.05)',
    }}>
      {/* Icono + textos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <img
          src="/apple-touch-icon.png"
          alt="Pidoo"
          style={{ width: 50, height: 50, borderRadius: 13, flexShrink: 0, border: `1px solid ${C.border}` }}
        />
        <div style={{ flex: 1, minWidth: 0, paddingRight: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
            Pide más rápido desde la app
          </div>
          <div style={{ fontSize: 12.5, color: C.stone, lineHeight: 1.4, marginTop: 3 }}>
            Descarga Pidoo gratis y sigue tus pedidos desde el móvil.
          </div>
        </div>
      </div>

      {/* Badges oficiales */}
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
        <a href={APPSTORE} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex' }} aria-label="Descargar en la App Store">
          <img src="/badges/appstore_official.png" alt="Descargar en la App Store" style={{ height: 40, width: 'auto', display: 'block' }} />
        </a>
        <a href={GPLAY} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex' }} aria-label="Disponible en Google Play">
          <img src="/badges/gplay_official.png" alt="Disponible en Google Play" style={{ height: 40, width: 'auto', display: 'block' }} />
        </a>
      </div>

      {/* Cerrar */}
      <button
        onClick={dismiss}
        aria-label="Cerrar"
        style={{
          position: 'absolute', top: 8, right: 8,
          width: 28, height: 28, borderRadius: '50%',
          border: 'none', background: 'transparent',
          color: C.stone, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <X size={16} strokeWidth={2.4} />
      </button>
    </div>
  )
}
