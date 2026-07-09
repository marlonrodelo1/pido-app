/* ──────────────────────────────────────────────────────────────────────────
 * Primitivas compartidas de la landing (crema/terracotta · Plus Jakarta Sans)
 * Todo inline + var(--c-*) — mismo patrón que el resto de la app (sin Tailwind).
 * ────────────────────────────────────────────────────────────────────────── */
import { Check } from 'lucide-react'

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

export const Wordmark = ({ size = 22, color = 'var(--c-ink)' }) => (
  <span
    style={{
      fontFamily: FONT,
      fontWeight: 800,
      fontSize: size,
      letterSpacing: -1,
      color,
      lineHeight: 1,
    }}
  >
    pidoo
  </span>
)

/* Botón/enlace primario (gradiente terracotta). Renderiza <a> si hay href. */
export const SolidBtn = ({ children, href, size = 'md', full = false, style = {}, ...rest }) => {
  const padY = size === 'lg' ? 15 : 11
  const padX = size === 'lg' ? 26 : 18
  const fontSize = size === 'lg' ? 15 : 14
  const Tag = href ? 'a' : 'button'
  return (
    <Tag
      href={href}
      {...rest}
      style={{
        background: 'linear-gradient(180deg, #C5562C 0%, #A8451F 100%)',
        color: '#FBF8F2',
        border: '1px solid #A8451F',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 8px 18px -6px rgba(197,86,44,0.5)',
        borderRadius: 12,
        padding: `${padY}px ${padX}px`,
        fontFamily: FONT,
        fontSize,
        fontWeight: 700,
        letterSpacing: -0.2,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: full ? '100%' : 'auto',
        whiteSpace: 'nowrap',
        textDecoration: 'none',
        transition: 'transform .15s ease, box-shadow .15s ease',
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}

/* Botón/enlace secundario glaseado. Renderiza <a> si hay href. */
export const GhostBtn = ({ children, href, size = 'md', full = false, style = {}, ...rest }) => {
  const padY = size === 'lg' ? 15 : 11
  const padX = size === 'lg' ? 26 : 18
  const fontSize = size === 'lg' ? 15 : 14
  const Tag = href ? 'a' : 'button'
  return (
    <Tag
      href={href}
      {...rest}
      style={{
        background: 'var(--c-glass)',
        color: 'var(--c-ink)',
        border: '1px solid var(--c-border-strong)',
        borderRadius: 12,
        padding: `${padY}px ${padX}px`,
        fontFamily: FONT,
        fontSize,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: full ? '100%' : 'auto',
        whiteSpace: 'nowrap',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        textDecoration: 'none',
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}

export const Chip = ({ children, tone = 'terracotta', style = {} }) => {
  const tones = {
    terracotta: { bg: 'var(--c-terracotta-soft)', color: 'var(--c-terracotta-2)' },
    sage: { bg: 'var(--c-sage-soft)', color: 'var(--c-sage-2)' },
    ink: { bg: '#E8E1D3', color: 'var(--c-ink)' },
  }
  const t = tones[tone] || tones.terracotta
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: t.bg,
        color: t.color,
        borderRadius: 999,
        padding: '6px 12px',
        fontSize: 12,
        fontWeight: 700,
        fontFamily: FONT,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

/* Bullet con check para las listas del modelo */
export const Bullet = ({ children }) => (
  <li
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      fontSize: 15,
      color: 'var(--c-text-soft)',
      lineHeight: 1.5,
    }}
  >
    <span
      style={{
        flexShrink: 0,
        width: 22,
        height: 22,
        borderRadius: 999,
        background: 'var(--c-terracotta-soft)',
        color: 'var(--c-terracotta-2)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
      }}
    >
      <Check size={13} strokeWidth={3} />
    </span>
    <span>{children}</span>
  </li>
)
