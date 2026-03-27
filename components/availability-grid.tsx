'use client'

import { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'

// Cada slot es simplemente true/false (disponible o no)
// Un día tiene 24 slots, uno por hora

export interface DayAvailability {
  user_id: string
  user_name: string
  day_of_week: number  // 0=lunes … 6=domingo
  slots: boolean[]     // longitud 24
}

interface AvailabilityGridProps {
  availability: DayAvailability[]
  currentUserId: string
  onUpdateDay: (dayOfWeek: number, slots: boolean[]) => void
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
  onUpdateDay,
  memberCount,
}: AvailabilityGridProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragValue, setDragValue] = useState(true)
  const [draggedCells, setDraggedCells] = useState<Set<string>>(new Set())

  // Estado local para los slots del usuario actual (editable)
  // Mapa: dayOfWeek -> boolean[24]
  const [localSlots, setLocalSlots] = useState<Map<number, boolean[]>>(() => {
    const map = new Map<number, boolean[]>()
    for (const entry of availability) {
      if (entry.user_id === currentUserId) {
        map.set(entry.day_of_week, [...entry.slots])
      }
    }
    return map
  })

  // Cuando llegan nuevos datos del servidor, sincronizar solo los días
  // que no están siendo editados actualmente
  const getSlots = useCallback((dayOfWeek: number): boolean[] => {
    return localSlots.get(dayOfWeek) ?? new Array(24).fill(false)
  }, [localSlots])

  const handleMouseDown = useCallback((dayOfWeek: number, slotIndex: number) => {
    const current = getSlots(dayOfWeek)
    const newValue = !current[slotIndex]
    setDragValue(newValue)
    setIsDragging(true)
    setDraggedCells(new Set([`${dayOfWeek}-${slotIndex}`]))

    setLocalSlots(prev => {
      const next = new Map(prev)
      const slots = [...(next.get(dayOfWeek) ?? new Array(24).fill(false))]
      slots[slotIndex] = newValue
      next.set(dayOfWeek, slots)
      return next
    })
  }, [getSlots])

  const handleMouseEnter = useCallback((dayOfWeek: number, slotIndex: number) => {
    if (!isDragging) return
    const key = `${dayOfWeek}-${slotIndex}`
    if (draggedCells.has(key)) return
    setDraggedCells(prev => new Set([...prev, key]))

    setLocalSlots(prev => {
      const next = new Map(prev)
      const slots = [...(next.get(dayOfWeek) ?? new Array(24).fill(false))]
      slots[slotIndex] = dragValue
      next.set(dayOfWeek, slots)
      return next
    })
  }, [isDragging, dragValue, draggedCells])

  const handleMouseUp = useCallback((dayOfWeek?: number) => {
    if (!isDragging) return
    setIsDragging(false)
    setDraggedCells(new Set())

    // Guardar el día que se terminó de editar
    if (dayOfWeek !== undefined) {
      const slots = localSlots.get(dayOfWeek) ?? new Array(24).fill(false)
      onUpdateDay(dayOfWeek, slots)
    }
  }, [isDragging, localSlots, onUpdateDay])

  // Al soltar fuera de la grilla también guardamos todos los días modificados
  const handleGlobalMouseUp = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    setDraggedCells(prev => {
      const days = new Set<number>()
      prev.forEach(key => days.add(parseInt(key.split('-')[0])))
      days.forEach(day => {
        const slots = localSlots.get(day) ?? new Array(24).fill(false)
        onUpdateDay(day, slots)
      })
      return new Set()
    })
  }, [isDragging, localSlots, onUpdateDay])

  return (
    <div
      className="overflow-x-auto"
      onMouseUp={handleGlobalMouseUp}
      onMouseLeave={handleGlobalMouseUp}
    >
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
                      onMouseUp={() => handleMouseUp(dayIndex)}
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
  // Contar cuántos miembros están disponibles por día/hora
  const overlapMap = useMemo(() => {
    // map[dayOfWeek][slotIndex] = lista de nombres disponibles
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