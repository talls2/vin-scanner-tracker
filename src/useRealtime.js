import { useEffect, useRef } from 'react'
import { supabase } from './supabase.js'

/**
 * Subscribe to Supabase Realtime changes on a table.
 * Calls `onChange` whenever an INSERT, UPDATE, or DELETE happens.
 *
 * Usage:
 *   useRealtime('bodyshop_jobs', loadJobs)
 *   useRealtime('bigrig_jobs', loadAll)
 *   useRealtime(['bodyshop_jobs','bigrig_jobs','repair_orders'], loadAll)
 */
export function useRealtime(tables, onChange) {
  const cbRef = useRef(onChange)
  cbRef.current = onChange

  useEffect(() => {
    const tableList = Array.isArray(tables) ? tables : [tables]
    const channelName = `rt-${tableList.join('-')}-${Date.now()}`
    const channel = supabase.channel(channelName)

    for (const table of tableList) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => cbRef.current()
      )
    }

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [Array.isArray(tables) ? tables.join(',') : tables])
}
