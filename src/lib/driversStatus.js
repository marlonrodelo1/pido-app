import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// useDriversOnline — ¿hay repartidor disponible para este restaurante AHORA?
//
// MODELO ACTUAL (socio = rider): el reparto lo hacen los SOCIOS vinculados al
// restaurante (`socio_establecimiento.estado='activa'`) que estén en línea
// (`socios.en_servicio = true`). El dispatcher propio asigna el pedido a uno de
// ellos al aceptarlo.
//
// (Antes esto leía la tabla `drivers_status`, que era del sistema viejo de
// Shipday — quedó VACÍA al quitar Shipday, así que SIEMPRE devolvía 0 y la
// tienda directa decía "no hay repartidores" para todos los restaurantes. El
// marketplace del socio ya usaba en_servicio; esto lo alinea.)
export function useDriversOnline(establecimientoId, { enabled = true, refreshIntervalMs = 20000 } = {}) {
  const [state, setState] = useState({ loading: true, online: 0, total: 0, lastChecked: null })

  useEffect(() => {
    if (!establecimientoId || !enabled) {
      setState({ loading: false, online: 0, total: 0, lastChecked: null })
      return
    }

    let cancel = false

    const fetchOnline = async () => {
      const { data, error } = await supabase
        .from('socio_establecimiento')
        .select('socios!inner(en_servicio, activo)')
        .eq('establecimiento_id', establecimientoId)
        .eq('estado', 'activa')
      if (cancel) return
      if (error) {
        // Ante error de red, no bloqueamos para siempre: mantenemos el último valor.
        setState((s) => ({ ...s, loading: false }))
        return
      }
      const socios = (data || []).map((r) => r.socios).filter(Boolean)
      const activos = socios.filter((s) => s.activo !== false)
      const online = activos.filter((s) => s.en_servicio === true).length
      setState({ loading: false, online, total: activos.length, lastChecked: new Date().toISOString() })
    }

    fetchOnline()

    // Realtime best-effort: cambios en el vínculo del restaurante. Los cambios de
    // en_servicio de los socios se captan sobre todo por el poll de abajo (la
    // tabla `socios` puede no estar en la publicación de realtime).
    const channel = supabase
      .channel(`riders_socio_${establecimientoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'socio_establecimiento', filter: `establecimiento_id=eq.${establecimientoId}` },
        () => fetchOnline()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'socios' },
        () => fetchOnline()
      )
      .subscribe()

    // Poll de respaldo: detecta a un socio que se pone online/offline aunque el
    // realtime de `socios` no llegue. Es el mecanismo principal aquí.
    const iv = setInterval(fetchOnline, Math.max(10000, refreshIntervalMs || 20000))

    return () => {
      cancel = true
      supabase.removeChannel(channel)
      clearInterval(iv)
    }
  }, [establecimientoId, enabled, refreshIntervalMs])

  return state
}
