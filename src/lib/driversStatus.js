import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Lee el estado online de los riders de un establecimiento desde la tabla
// `drivers_status`, que mantienen los propios riders al ponerse online/offline
// (edge functions rider-online / rider-offline). Realtime para reflejar
// cambios en vivo sin polling externo.
export function useDriversOnline(establecimientoId, { enabled = true, refreshIntervalMs = 30000 } = {}) {
  const [state, setState] = useState({ loading: true, online: 0, total: 0, lastChecked: null })

  // refreshIntervalMs se mantiene en la firma por compatibilidad con
  // llamadores que aún lo pasan; ya no se usa.
  void refreshIntervalMs

  useEffect(() => {
    if (!establecimientoId || !enabled) {
      setState({ loading: false, online: 0, total: 0, lastChecked: null })
      return
    }

    let cancel = false

    const apply = (row) => {
      if (cancel) return
      setState({
        loading: false,
        online: row?.online_count ?? 0,
        total: row?.total_count ?? 0,
        lastChecked: row?.last_checked ?? null,
      })
    }

    // Leer estado cacheado inmediatamente
    supabase
      .from('drivers_status')
      .select('online_count,total_count,last_checked')
      .eq('establecimiento_id', establecimientoId)
      .maybeSingle()
      .then(({ data }) => apply(data))

    // Suscripción Realtime: cualquier cambio en drivers_status se refleja en UI
    const channel = supabase
      .channel(`drivers_status_${establecimientoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drivers_status',
          filter: `establecimiento_id=eq.${establecimientoId}`,
        },
        (payload) => apply(payload.new)
      )
      .subscribe()

    return () => {
      cancel = true
      supabase.removeChannel(channel)
    }
  }, [establecimientoId, enabled])

  return state
}
