// Design System PIDO - Light Theme (paleta Claude)
// Paleta unica - solo estos colores en toda la app

export const colors = {
  // Principal
  primary: '#FF6B2C',
  primaryLight: 'rgba(255,107,44,0.10)',
  primarySoft: 'rgba(255,107,44,0.18)',

  // Neutros (Light cálido tipo Claude)
  bg: '#FAFAF7',
  surface: '#FFFFFF',
  surface2: '#F4F2EC',
  border: '#E8E6E0',
  text: '#1F1F1E',
  textSecondary: '#3D3D3B',
  muted: '#6B6B68',

  // Glass
  glass: 'rgba(255,255,255,0.7)',
  glassBorder: 'rgba(0,0,0,0.06)',

  // Estados
  success: '#16A34A',
  successLight: 'rgba(22,163,74,0.10)',
  error: '#DC2626',
  errorLight: 'rgba(220,38,38,0.10)',
}

// Badge styles unificados
export const badge = (type) => {
  const map = {
    tarjeta: { bg: colors.primaryLight, color: colors.primary },
    efectivo: { bg: colors.successLight, color: colors.success },
    pido: { bg: colors.primaryLight, color: colors.primary },
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
