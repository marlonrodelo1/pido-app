import { useEffect, useState, useRef } from 'react'
import { supabase } from './supabase'

export function useDriversOnline(establecimientoId, { enabled = true, refreshIntervalMs = 30000 } = {}) {
  const [state, setState] = useState({ loading: true, online: 0, total: 0, lastChecked: null })
  const intervalRef = useRef(null)

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

    // Leer estado cacheado inmediatamente (ya propagado por cron / refresh previo)
    supabase
      .from('drivers_status')
      .select('online_count,total_count,last_checked')
      .eq('establecimiento_id', establecimientoId)
      .maybeSingle()
      .then(({ data }) => apply(data))

    // Forzar un refresh fresco contra Shipday al abrir
    const forceRefresh = async () => {
      try {
        const { data } = await supabase.functions.invoke('refresh-restaurant-drivers', {
          body: { establecimiento_id: establecimientoId },
        })
        if (cancel || !data) return
        if (typeof data.online === 'number') {
          setState({
            loading: false,
            online: data.online,
            total: data.total,
            lastChecked: data.last_checked,
          })
        }
      } catch {
        // Si falla el refresh, seguimos con el valor cacheado
      }
    }

    forceRefresh()
    intervalRef.current = setInterval(forceRefresh, refreshIntervalMs)

    // Suscripción Realtime: si el cron u otro cliente lo actualiza, reflejar en UI
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
      if (intervalRef.current) clearInterval(intervalRef.current)
      supabase.removeChannel(channel)
    }
  }, [establecimientoId, enabled, refreshIntervalMs])

  return state
}
