/* ──────────────────────────────────────────────────────────────────────────
 * AppDownloadBanner — banner de descarga de la app cliente para las URLs
 * públicas web (tienda del restaurante). Muestra los badges OFICIALES de
 * App Store + Google Play enlazando a las stores reales (la app cliente ya
 * está publicada). Se oculta dentro de la app nativa (Capacitor) y es
 * descartable (se recuerda en localStorage para no ser pesado).
 *
 * Con `slug` y VITE_DEEP_LINKS_ACTIVOS=1 añade además el botón que lleva a
 * ESE restaurante DENTRO de la app (página puente /abrir/<slug>).
 * ────────────────────────────────────────────────────────────────────────── */
import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { slugValido, detectarPlataforma, APPSTORE, GPLAY } from '../lib/deepLinks'

const DISMISS_KEY = 'pido_dl_banner_dismissed'

/* Interruptor APAGADO por defecto. Motivo: las versiones de la app que ya
 * están instaladas no traen el filtro de com.pidoo.app://r/<slug>, así que
 * mientras las tiendas no aprueben la build nueva el botón manda a Play/App
 * Store a gente que YA tiene la app. Se enciende con VITE_DEEP_LINKS_ACTIVOS=1
 * (build arg en Dokploy) el día que las builds estén publicadas. */
const DEEP_LINKS_ACTIVOS = import.meta.env.VITE_DEEP_LINKS_ACTIVOS === '1'

const C = {
  paper: '#FBF8F2', ink: '#1A1815', stone: '#6B6356', border: '#E8E1D3',
  primary: '#C5562C',
}

// Las dos insignias oficiales tienen el MISMO ratio de contenido (~3.37), asi
// que a igual altura se ven iguales. Hubo que recortarle al PNG de Google los
// 29px de relleno transparente que trae de fabrica arriba y abajo: sin eso, a
// height:40px su caja negra medía 30,7px y la de Apple 40px (23% más pequeña).
const TIENDAS = [
  { href: APPSTORE, src: '/badges/appstore_official.png', alt: 'Descargar en la App Store' },
  { href: GPLAY, src: '/badges/gplay_official_v2.png', alt: 'Disponible en Google Play' },
]

export default function AppDownloadBanner({ slug = null }) {
  // En el móvil solo tienes UNA tienda: enseñar las dos insignias es ruido, y
  // encima obliga a que encajen entre sí. En escritorio se enseñan las dos y
  // no se enseña el botón (llevaría a una página que solo dice "coge el móvil").
  const [plataforma] = useState(detectarPlataforma)
  const esMovil = plataforma === 'android' || plataforma === 'ios'
  const conBotonAbrir = DEEP_LINKS_ACTIVOS && slugValido(slug) && esMovil
  const tiendas = plataforma === 'ios' ? [TIENDAS[0]] : plataforma === 'android' ? [TIENDAS[1]] : TIENDAS
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
            {conBotonAbrir
              ? 'Abre este restaurante en la app de Pidoo.'
              : 'Descarga Pidoo gratis y sigue tus pedidos desde el móvil.'}
          </div>
        </div>
      </div>

      {/* Abrir ESTE restaurante en la app. En su PROPIA fila a ancho completo:
          metido junto a los dos badges, la fila se desbordaba entre 420 y
          485 px (iPhone Pro Max). */}
      {conBotonAbrir && (
        <Link
          to={'/abrir/' + slug}
          style={{
            display: 'block', width: '100%', boxSizing: 'border-box',
            padding: '12px 16px', borderRadius: 13,
            background: C.primary, color: '#fff',
            fontSize: 14, fontWeight: 800, textAlign: 'center',
            textDecoration: 'none', fontFamily: 'inherit',
          }}
        >
          Abrir en la app
        </Link>
      )}

      {/* Insignias oficiales. En móvil solo la de la tienda que te sirve. */}
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
        {tiendas.map(t => (
          <a key={t.href} href={t.href} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex' }} aria-label={t.alt}>
            <img src={t.src} alt={t.alt} style={{ height: 40, width: 'auto', display: 'block' }} />
          </a>
        ))}
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
