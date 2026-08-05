/* ──────────────────────────────────────────────────────────────────────────
 * DESCARGAS — las 3 apps de Pidoo. Cliente enlaza a stores reales; restaurante
 * y socio van como "Próximamente" con enlace a su panel web (aún no publicadas).
 * Cuando se publiquen, cambiar `soon:false` + rellenar ios/android.
 * ────────────────────────────────────────────────────────────────────────── */
import { Smartphone, Store, Bike, ExternalLink } from 'lucide-react'
import { Chip } from './_ui'

const APPS = [
  {
    key: 'cliente',
    icon: Smartphone,
    title: 'App para clientes',
    desc: 'Pide en tus restaurantes y tiendas favoritas de Tenerife.',
    soon: false,
    ios: 'https://apps.apple.com/es/app/pidoo/id6759052572',
    android: 'https://play.google.com/store/apps/details?id=com.pidoo.app',
  },
  {
    key: 'restaurante',
    icon: Store,
    title: 'App para restaurantes',
    desc: 'Recibe y gestiona tus pedidos en tiempo real.',
    soon: true,
    panel: { label: 'Entrar al panel', href: 'https://panel.pidoo.es' },
  },
  {
    key: 'socio',
    icon: Bike,
    title: 'App para socios',
    desc: 'Tu marketplace y tus repartos, todo en una app.',
    soon: true,
    panel: { label: 'Entrar al panel', href: 'https://socio.pidoo.es' },
  },
]

const StoreBadge = ({ src, alt, href }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex' }}>
    <img src={src} alt={alt} style={{ height: 46, width: 'auto', display: 'block' }} />
  </a>
)

const AppCard = ({ app }) => {
  const Icon = app.icon
  return (
    <div
      style={{
        background: 'var(--c-paper)',
        border: '1px solid var(--c-border)',
        borderRadius: 22,
        padding: 26,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        boxShadow: '0 1px 3px rgba(26,24,21,0.04)',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: 'var(--c-terracotta-soft)',
          color: 'var(--c-terracotta-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={24} strokeWidth={2.2} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--c-ink)' }}>{app.title}</div>
        <div style={{ fontSize: 14, color: 'var(--c-muted)', lineHeight: 1.5, marginTop: 4 }}>
          {app.desc}
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
        {app.soon ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            <Chip tone="sage">Próximamente en stores</Chip>
            <a
              href={app.panel.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--c-terracotta-2)',
                textDecoration: 'none',
              }}
            >
              {app.panel.label} <ExternalLink size={14} strokeWidth={2.4} />
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <StoreBadge src="/badges/appstore_official.png" alt="Descargar en la App Store" href={app.ios} />
            <StoreBadge src="/badges/gplay_official_v2.png" alt="Disponible en Google Play" href={app.android} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function DownloadApps() {
  return (
    <section id="descargas" style={{ background: 'var(--c-surface2)', padding: '72px 20px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 40px' }}>
          <Chip>Descargas</Chip>
          <h2
            className="landing-h2"
            style={{
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: -1,
              color: 'var(--c-ink)',
              margin: '16px 0 10px',
              lineHeight: 1.1,
            }}
          >
            Descarga las apps de Pidoo
          </h2>
          <p style={{ fontSize: 16, color: 'var(--c-muted)', lineHeight: 1.6 }}>
            Una para pedir, una para tu restaurante y una para tu marketplace.
          </p>
        </div>

        <div className="landing-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {APPS.map((app) => (
            <AppCard key={app.key} app={app} />
          ))}
        </div>
      </div>
    </section>
  )
}
