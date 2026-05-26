// Design System Pidoo — paleta cream/terracotta/sage
// Pivote SaaS (mayo 2026) — artesanal cálida
//
// API: mantiene nombres de tokens existentes (colors.primary, colors.bg, etc.)
// para no romper imports. Solo cambian los valores hex.

export const colors = {
  // === Bases (cream world) ===
  cream:    '#F7F3EC',
  cream2:   '#EFE9DD',
  paper:    '#FBF8F2',

  // === Tinta ===
  ink:      '#1A1815',
  ink2:     '#2B2823',
  stone:    '#6B6356',
  stone2:   '#8A8174',

  // === Acentos ===
  terracotta:      '#C5562C',
  terracotta2:     '#A8451F',
  terracottaSoft:  '#F1D9CC',

  sage:      '#8B9D7A',
  sage2:     '#6F8460',
  sageSoft:  '#DDE3D3',

  // === Funcionales ===
  warning:     '#C99551',
  warningSoft: '#F0E1C8',
  danger:      '#B5564A',
  dangerSoft:  '#F1D0CB',
  info:        '#7B8FA8',
  infoSoft:    '#DBE0E8',

  // === Compatibilidad hacia atrás ===
  primary:      '#C5562C',
  primaryLight: 'rgba(197,86,44,0.10)',
  primarySoft:  'rgba(197,86,44,0.18)',

  bg:            '#F7F3EC',
  surface:       '#FBF8F2',
  surface2:      '#EFE9DD',
  border:        '#E8E1D3',
  text:          '#1A1815',
  textSecondary: '#2B2823',
  muted:         '#6B6356',

  glass:        'rgba(251,248,242,0.7)',
  glassBorder:  'rgba(26,24,21,0.06)',

  success:      '#8B9D7A',
  successLight: '#DDE3D3',
  error:        '#B5564A',
  errorLight:   '#F1D0CB',
}

// Badge styles unificados
export const badge = (type) => {
  const map = {
    tarjeta:    { bg: colors.primaryLight, color: colors.primary },
    efectivo:   { bg: colors.successLight, color: colors.success },
    pido:       { bg: colors.primaryLight, color: colors.primary },
    activo:     { bg: colors.successLight, color: colors.success },
    inactivo:   { bg: colors.errorLight,   color: colors.error },
    nuevo:      { bg: colors.primaryLight, color: colors.primary },
    aceptado:   { bg: colors.primaryLight, color: colors.primary },
    preparando: { bg: colors.primaryLight, color: colors.primary },
    listo:      { bg: colors.primaryLight, color: colors.primary },
    en_camino:  { bg: colors.primaryLight, color: colors.primary },
    entregado:  { bg: colors.successLight, color: colors.success },
    cancelado:  { bg: colors.errorLight,   color: colors.error },
    fallido:    { bg: colors.errorLight,   color: colors.error },
    recogida:   { bg: colors.surface,      color: colors.muted },
    reparto:    { bg: colors.primaryLight, color: colors.primary },
    pendiente:  { bg: colors.surface,      color: colors.muted },
    pagado:     { bg: colors.successLight, color: colors.success },
  }
  const style = map[type] || { bg: colors.surface, color: colors.muted }
  return {
    background: style.bg, color: style.color,
    fontSize: 10, fontWeight: 700, padding: '3px 10px',
    borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
  }
}
