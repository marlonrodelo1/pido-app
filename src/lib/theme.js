// Design System PIDO - Dark Theme
// Paleta unica - solo estos colores en toda la app

export const colors = {
  // Principal
  primary: '#FF6B2C',
  primaryLight: 'rgba(255,107,44,0.15)',
  primarySoft: 'rgba(255,107,44,0.25)',

  // Neutros (Dark)
  bg: '#0D0D0D',
  surface: 'rgba(255,255,255,0.08)',
  surface2: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.1)',
  text: '#F5F5F5',
  textSecondary: 'rgba(255,255,255,0.6)',
  muted: 'rgba(255,255,255,0.45)',

  // Glass
  glass: 'rgba(255,255,255,0.06)',
  glassBorder: 'rgba(255,255,255,0.12)',

  // Estados (solo estos 2)
  success: '#22C55E',
  successLight: 'rgba(34,197,94,0.15)',
  error: '#EF4444',
  errorLight: 'rgba(239,68,68,0.15)',
}

// Badge styles unificados
export const badge = (type) => {
  const map = {
    tarjeta: { bg: colors.primaryLight, color: colors.primary },
    efectivo: { bg: colors.successLight, color: colors.success },
    pido: { bg: colors.primaryLight, color: colors.primary },
    pidogo: { bg: colors.successLight, color: colors.success },
    activo: { bg: colors.successLight, color: colors.success },
    inactivo: { bg: colors.errorLight, color: colors.error },
    nuevo: { bg: colors.primaryLight, color: colors.primary },
    aceptado: { bg: colors.primaryLight, color: colors.primary },
    preparando: { bg: colors.primaryLight, color: colors.primary },
    listo: { bg: colors.primaryLight, color: colors.primary },
    en_camino: { bg: colors.primaryLight, color: colors.primary },
    entregado: { bg: colors.successLight, color: colors.success },
    cancelado: { bg: colors.errorLight, color: colors.error },
    fallido: { bg: colors.errorLight, color: colors.error },
    recogida: { bg: colors.surface, color: colors.muted },
    reparto: { bg: colors.primaryLight, color: colors.primary },
    pendiente: { bg: colors.surface, color: colors.muted },
    pagado: { bg: colors.successLight, color: colors.success },
  }
  const style = map[type] || { bg: colors.surface, color: colors.muted }
  return {
    background: style.bg, color: style.color,
    fontSize: 10, fontWeight: 700, padding: '3px 10px',
    borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
  }
}
