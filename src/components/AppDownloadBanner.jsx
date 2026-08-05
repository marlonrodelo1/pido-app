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

// Insignias oficiales. Solo se usan en ESCRITORIO: en móvil todo se resuelve
// con un único botón (ver abajo).
// El PNG de Google lleva sufijo _v2 porque nginx sirve /badges/*.png como
// `immutable` un año y el fichero no lleva hash de Vite: para cambiar la imagen
// hay que cambiar el NOMBRE o nadie que ya haya entrado la vuelve a pedir.
const TIENDAS = [
  { href: APPSTORE, src: '/badges/appstore_official.png', alt: 'Descargar en la App Store' },
  { href: GPLAY, src: '/badges/gplay_official_v2.png', alt: 'Disponible en Google Play' },
]

/* Marcas de plataforma para el botón único. Monocromas en blanco: sobre el
 * naranja, la versión a color de Google Play ensucia. */
function MarcaApple() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  )
}
function MarcaPlay() {
  return (
    <svg viewBox="0 0 512 512" width="15" height="15" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M325.3 234.3 104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6-88.9-51.5-65.4 65.5 65.4 65.5 90.4-51.5c27-21.1 27-52.9-1.5-74zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
    </svg>
  )
}

export default function AppDownloadBanner({ slug = null }) {
  // En MÓVIL: un único botón. La página puente ya resuelve los dos casos —
  // si tienes la app la abre en ESTE restaurante, y si no te lleva a tu
  // tienda— así que la fila de insignias sobraba y solo metía ruido y alto.
  // En ESCRITORIO no hay app que abrir: se enseñan las dos insignias y ya.
  const [plataforma] = useState(detectarPlataforma)
  const esMovil = plataforma === 'android' || plataforma === 'ios'
  const conBotonAbrir = DEEP_LINKS_ACTIVOS && slugValido(slug) && esMovil
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
      padding: '13px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      boxShadow: '0 1px 3px rgba(26,24,21,0.05)',
    }}>
      {/* Icono + textos */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img
          src="/apple-touch-icon.png"
          alt="Pidoo"
          style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, border: `1px solid ${C.border}` }}
        />
        <div style={{ flex: 1, minWidth: 0, paddingRight: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
            Pide más rápido desde la app
          </div>
          <div style={{ fontSize: 12.5, color: C.stone, lineHeight: 1.35, marginTop: 2 }}>
            {conBotonAbrir
              ? 'Si no la tienes, te la descargas.'
              : 'Descarga Pidoo gratis y sigue tus pedidos desde el móvil.'}
          </div>
        </div>
      </div>

      {/* MÓVIL: un único botón, con la marca de TU tienda. Va a ancho completo
          en su propia fila; puesto en línea con nada más, la fila se desbordaba
          entre 420 y 485 px (iPhone Pro Max). */}
      {conBotonAbrir ? (
        <Link
          to={'/abrir/' + slug}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', boxSizing: 'border-box',
            padding: '12px 16px', borderRadius: 13,
            background: C.primary, color: '#fff',
            fontSize: 14.5, fontWeight: 800,
            textDecoration: 'none', fontFamily: 'inherit',
          }}
        >
          {plataforma === 'ios' ? <MarcaApple /> : <MarcaPlay />}
          Abrir en la app
        </Link>
      ) : (
        /* ESCRITORIO (o interruptor apagado): insignias oficiales. */
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          {TIENDAS.map(t => (
            <a key={t.href} href={t.href} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex' }} aria-label={t.alt}>
              <img src={t.src} alt={t.alt} style={{ height: 40, width: 'auto', display: 'block' }} />
            </a>
          ))}
        </div>
      )}

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
