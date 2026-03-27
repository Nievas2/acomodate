'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

export interface DayAvailability {
  user_id: string
  user_name: string
  day_of_week: number  // 0=lunes … 6=domingo
  slots: boolean[]     // longitud 24
}

interface AvailabilityGridProps {
  availability: DayAvailability[]
  currentUserId: string
  /** Se llama UNA sola vez al soltar el mouse, con todos los días modificados */
  onUpdateDays: (days: { dayOfWeek: number; slots: boolean[] }[]) => void
  memberCount: number
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DAYS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i)

const formatHour = (slot: number): string => {
  const hour = slot % 12 || 12
  const ampm = slot < 12 ? 'AM' : 'PM'
  return `${hour}${ampm}`
}

export function AvailabilityGrid({
  availability,
  currentUserId,
  onUpdateDays,
  memberCount,
}: AvailabilityGridProps) {
  const isDraggingRef = useRef(false)
  const dragValueRef = useRef(true)
  const dirtyDaysRef = useRef<Set<number>>(new Set())

  const [localSlots, setLocalSlots] = useState<Map<number, boolean[]>>(() => {
    const map = new Map<number, boolean[]>()
    for (const entry of availability) {
      if (entry.user_id === currentUserId) {
        map.set(entry.day_of_week, [...entry.slots])
      }
    }
    return map
  })

  const localSlotsRef = useRef(localSlots)
  localSlotsRef.current = localSlots

  // Referencia estable a onUpdateDays para usarla en el listener global
  const onUpdateDaysRef = useRef(onUpdateDays)
  onUpdateDaysRef.current = onUpdateDays

  // Listener global en window: se registra una sola vez y captura el mouseup
  // sin importar dónde suelte el usuario (dentro o fuera del componente).
  useEffect(() => {
    const handleWindowMouseUp = () => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false

      const days = dirtyDaysRef.current
      dirtyDaysRef.current = new Set()

      if (days.size === 0) return

      // Una sola llamada con todos los días modificados
      const updates = Array.from(days).map(day => ({
        dayOfWeek: day,
        slots: localSlotsRef.current.get(day) ?? new Array(24).fill(false),
      }))

      onUpdateDaysRef.current(updates)
    }

    window.addEventListener('mouseup', handleWindowMouseUp)
    return () => window.removeEventListener('mouseup', handleWindowMouseUp)
  }, [])

  const getSlots = useCallback((dayOfWeek: number): boolean[] => {
    return localSlots.get(dayOfWeek) ?? new Array(24).fill(false)
  }, [localSlots])

  const handleMouseDown = useCallback((dayOfWeek: number, slotIndex: number) => {
    const current = localSlotsRef.current.get(dayOfWeek) ?? new Array(24).fill(false)
    const newValue = !current[slotIndex]
    isDraggingRef.current = true
    dragValueRef.current = newValue
    dirtyDaysRef.current = new Set([dayOfWeek])

    setLocalSlots(prev => {
      const next = new Map(prev)
      const slots = [...(next.get(dayOfWeek) ?? new Array(24).fill(false))]
      slots[slotIndex] = newValue
      next.set(dayOfWeek, slots)
      return next
    })
  }, [])

  const handleMouseEnter = useCallback((dayOfWeek: number, slotIndex: number) => {
    if (!isDraggingRef.current) return
    dirtyDaysRef.current.add(dayOfWeek)

    setLocalSlots(prev => {
      const next = new Map(prev)
      const slots = [...(next.get(dayOfWeek) ?? new Array(24).fill(false))]
      if (slots[slotIndex] === dragValueRef.current) return prev
      slots[slotIndex] = dragValueRef.current
      next.set(dayOfWeek, slots)
      return next
    })
  }, [])

  return (
    <div className="overflow-x-auto">
      {/* Leyenda */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-available" />
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted/30" />
          <span>No disponible</span>
        </div>
      </div>

      <div className="inline-block min-w-full">
        {/* Header con días */}
        <div className="flex">
          <div className="w-16 shrink-0" />
          {DAYS.map((day, i) => (
            <div key={i} className="flex-1 min-w-12 text-center px-1">
              <div className="text-sm font-medium">{day}</div>
            </div>
          ))}
        </div>

        {/* Filas de horas */}
        <div className="mt-2 space-y-px select-none">
          {TIME_SLOTS.map((slot) => (
            <div key={slot} className="flex items-center">
              <div className="w-16 shrink-0 text-xs text-muted-foreground pr-2 text-right">
                {formatHour(slot)}
              </div>
              {DAYS.map((_, dayIndex) => {
                const isAvailable = getSlots(dayIndex)[slot]
                return (
                  <div key={dayIndex} className="flex-1 min-w-12 px-0.5">
                    <div
                      className={cn(
                        'h-6 rounded cursor-pointer transition-colors',
                        'hover:ring-2 hover:ring-primary/50',
                        isAvailable ? 'bg-available' : 'bg-muted/30'
                      )}
                      onMouseDown={() => handleMouseDown(dayIndex, slot)}
                      onMouseEnter={() => handleMouseEnter(dayIndex, slot)}
                      title={`${DAYS_FULL[dayIndex]} ${formatHour(slot)}`}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Vista de overlap del grupo ──────────────────────────────────────────────

interface GroupOverlapGridProps {
  availability: DayAvailability[]
  memberCount: number
}

export function GroupOverlapGrid({ availability, memberCount }: GroupOverlapGridProps) {
  const overlapMap = useMemo(() => {
    const map: Map<number, Map<number, string[]>> = new Map()

    for (const entry of availability) {
      if (!map.has(entry.day_of_week)) {
        map.set(entry.day_of_week, new Map())
      }
      const dayMap = map.get(entry.day_of_week)!
      entry.slots.forEach((available, slotIndex) => {
        if (available) {
          const existing = dayMap.get(slotIndex) ?? []
          existing.push(entry.user_name)
          dayMap.set(slotIndex, existing)
        }
      })
    }

    return map
  }, [availability])

  const getUsers = (dayOfWeek: number, slotIndex: number): string[] => {
    return overlapMap.get(dayOfWeek)?.get(slotIndex) ?? []
  }

  const getOverlapColor = (count: number): string => {
    if (count === 0) return 'bg-muted/30'
    const ratio = count / memberCount
    if (ratio === 1) return 'bg-available'
    if (ratio >= 0.5) return 'bg-maybe'
    return 'bg-unavailable/30'
  }

  return (
    <div className="overflow-x-auto">
      {/* Leyenda */}
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-available" />
          <span>Todos disponibles</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-maybe" />
          <span>Algunos disponibles</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted/30" />
          <span>Nadie disponible</span>
        </div>
      </div>

      <div className="inline-block min-w-full">
        {/* Header con días */}
        <div className="flex">
          <div className="w-16 shrink-0" />
          {DAYS.map((day, i) => (
            <div key={i} className="flex-1 min-w-12 text-center px-1">
              <div className="text-sm font-medium">{day}</div>
            </div>
          ))}
        </div>

        {/* Filas de horas */}
        <div className="mt-2 space-y-px select-none">
          {TIME_SLOTS.map((slot) => (
            <div key={slot} className="flex items-center">
              <div className="w-16 shrink-0 text-xs text-muted-foreground pr-2 text-right">
                {formatHour(slot)}
              </div>
              {DAYS.map((_, dayIndex) => {
                const users = getUsers(dayIndex, slot)
                const count = users.length
                const tooltip = count > 0
                  ? `${users.join(', ')} (${count}/${memberCount})`
                  : 'Nadie disponible'

                return (
                  <div key={dayIndex} className="flex-1 min-w-12 px-0.5">
                    <div
                      className={cn(
                        'h-6 rounded transition-colors relative',
                        getOverlapColor(count)
                      )}
                      title={tooltip}
                    >
                      {count > 0 && (
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-foreground/80">
                          {count}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}