import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export function useDriversOnline(establecimientoId) {
  const [state, setState] = useState({ loading: true, online: 0, total: 0, lastChecked: null })

  useEffect(() => {
    if (!establecimientoId) {
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

    supabase
      .from('drivers_status')
      .select('online_count,total_count,last_checked')
      .eq('establecimiento_id', establecimientoId)
      .maybeSingle()
      .then(({ data }) => apply(data))

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
  }, [establecimientoId])

  return state
}
