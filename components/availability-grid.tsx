'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

export interface DayAvailability {
  user_id: string
  user_name: string
  day_of_week: number
  slots: boolean[]
}

// Nuevo: tipo con email para el botón de Calendar
export interface MemberInfo {
  id: string
  name: string
  email: string
}

interface AvailabilityGridProps {
  availability: DayAvailability[]
  currentUserId: string
  onUpdateDays: (days: { dayOfWeek: number; slots: boolean[] }[]) => void
  memberCount: number
}

// GroupOverlapGrid ahora recibe members para tener los emails
interface GroupOverlapGridProps {
  availability: DayAvailability[]
  memberCount: number
  members: MemberInfo[]  // <-- nuevo
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DAYS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i)

const formatHour = (slot: number): string => {
  const hour = slot % 12 || 12
  const ampm = slot < 12 ? 'AM' : 'PM'
  return `${hour}${ampm}`
}

// ─── Avatar inicial ───────────────────────────────────────────────────────────

function UserAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const initial = name.charAt(0).toUpperCase()
  const colors = [
    'bg-blue-500', 'bg-purple-500', 'bg-pink-500',
    'bg-orange-500', 'bg-teal-500', 'bg-indigo-500',
  ]
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center text-white font-semibold shrink-0',
      color,
      size === 'sm' ? 'w-5 h-5 text-xs' : 'w-7 h-7 text-sm'
    )}>
      {initial}
    </div>
  )
}

// ─── Tooltip rico ─────────────────────────────────────────────────────────────

interface RichTooltipProps {
  users: string[]
  memberCount: number
  label: string
  visible: boolean
  x: number
  y: number
}

function RichTooltip({ users, memberCount, label, visible, x, y }: RichTooltipProps) {
  const MAX_SHOWN = 3
  const shown = users.slice(0, MAX_SHOWN)
  const remaining = users.length - MAX_SHOWN

  if (!visible || users.length === 0) return null

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: x + 14, top: y - 8 }}
    >
      <div className="bg-popover border border-border rounded-lg shadow-xl p-3 min-w-44 max-w-56">
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
          {label} · {users.length}/{memberCount}
        </p>
        <div className="space-y-1.5">
          {shown.map((name) => (
            <div key={name} className="flex items-center gap-2">
              <UserAvatar name={name} size="sm" />
              <span className="text-sm text-foreground truncate">{name}</span>
            </div>
          ))}
          {remaining > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              +{remaining} más · click para ver todos
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Helpers para Google Calendar URL ─────────────────────────────────────────

function buildCalendarUrl(
  label: string,
  dayOfWeek: number,  // 0=lunes … 6=domingo (nuestra convención)
  slotHour: number,
  guests: MemberInfo[]
): string {
  // Calcular la próxima ocurrencia de ese día de semana
  // JS usa 0=domingo…6=sábado, nosotros 0=lunes…6=domingo
  const jsTargetDay = (dayOfWeek + 1) % 7
  const today = new Date()
  const diff = (jsTargetDay - today.getDay() + 7) % 7 || 7  // mínimo 1 día adelante
  const eventDate = new Date(today)
  eventDate.setDate(today.getDate() + diff)
  eventDate.setHours(slotHour, 0, 0, 0)

  const endDate = new Date(eventDate)
  endDate.setHours(slotHour + 1)  // 1 hora de duración por defecto

  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}00`

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Reunión — ${label}`,
    dates: `${fmt(eventDate)}/${fmt(endDate)}`,
    details: `Creado desde el planificador de disponibilidad.\nDisponibles: ${guests.map(g => g.name).join(', ')}`,
    add: guests.map(g => g.email).join(','),
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// ─── Sidebar de detalle ───────────────────────────────────────────────────────

interface SlotSidebarProps {
  users: MemberInfo[]
  absentCount: number
  label: string
  dayOfWeek: number
  slotHour: number
  onClose: () => void
}

function SlotSidebar({ users, absentCount, label, dayOfWeek, slotHour, onClose }: SlotSidebarProps) {
  const calendarUrl = buildCalendarUrl(label, dayOfWeek, slotHour, users)

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-72 z-50 bg-background border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {users.length} de {users.length + absentCount} disponibles
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Botón crear Meet — solo si hay al menos 1 disponible */}
          {users.length > 0 && (
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full px-4 py-2.5 rounded-lg
                border border-border bg-background hover:bg-muted/40 active:scale-[0.98]
                transition-all text-sm font-medium shadow-sm select-none"
            >
              {/* Ícono de Google Calendar */}
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="8" width="40" height="36" rx="4" fill="white"/>
                <rect x="4" y="8" width="40" height="36" rx="4" stroke="#DADCE0" strokeWidth="1.5"/>
                <rect x="4" y="14" width="40" height="6" fill="#4285F4"/>
                <rect x="4" y="8" width="40" height="11" rx="4" fill="#4285F4"/>
                <rect x="4" y="14" width="40" height="5" fill="#4285F4"/>
                <circle cx="15" cy="11" r="2.5" fill="white"/>
                <circle cx="33" cy="11" r="2.5" fill="white"/>
                <text x="24" y="36" textAnchor="middle" fontSize="15" fontWeight="700" fill="#4285F4" fontFamily="Google Sans, sans-serif">
                  {new Date().getDate()}
                </text>
              </svg>
              Crear Meet en Google Calendar
            </a>
          )}

          {/* Lista de disponibles */}
          {users.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Disponibles ({users.length})
              </p>
              <div className="space-y-2.5">
                {users.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <UserAvatar name={member.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <span className="text-xs text-green-500 font-bold shrink-0">✓</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No disponibles */}
          {absentCount > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                No disponibles ({absentCount})
              </p>
              <p className="text-xs text-muted-foreground">
                {absentCount} {absentCount === 1 ? 'persona no marcó' : 'personas no marcaron'} este horario.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── AvailabilityGrid ─────────────────────────────────────────────────────────

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

  const onUpdateDaysRef = useRef(onUpdateDays)
  onUpdateDaysRef.current = onUpdateDays

  useEffect(() => {
    const handleWindowMouseUp = () => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false

      const days = dirtyDaysRef.current
      dirtyDaysRef.current = new Set()
      if (days.size === 0) return

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
        <div className="flex">
          <div className="w-16 shrink-0" />
          {DAYS.map((day, i) => (
            <div key={i} className="flex-1 min-w-12 text-center px-1">
              <div className="text-sm font-medium">{day}</div>
            </div>
          ))}
        </div>

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

// ─── GroupOverlapGrid con tooltip rico + sidebar + botón Calendar ─────────────

interface TooltipState {
  visible: boolean
  x: number
  y: number
  users: string[]
  label: string
}

interface SidebarState {
  open: boolean
  users: MemberInfo[]
  absentCount: number
  label: string
  dayOfWeek: number
  slotHour: number
}

export function GroupOverlapGrid({ availability, memberCount, members }: GroupOverlapGridProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, users: [], label: '',
  })
  const [sidebar, setSidebar] = useState<SidebarState>({
    open: false, users: [], absentCount: 0, label: '', dayOfWeek: 0, slotHour: 0,
  })

  // Mapa email/info por user_id para lookup rápido
  const memberMap = useMemo(() => {
    const map = new Map<string, MemberInfo>()
    members.forEach(m => map.set(m.id, m))
    return map
  }, [members])

  // overlapMap ahora guarda user_ids en lugar de nombres
  const overlapMap = useMemo(() => {
    const map: Map<number, Map<number, string[]>> = new Map()  // day -> slot -> user_ids[]
    for (const entry of availability) {
      if (!map.has(entry.day_of_week)) map.set(entry.day_of_week, new Map())
      const dayMap = map.get(entry.day_of_week)!
      entry.slots.forEach((available, slotIndex) => {
        if (available) {
          const existing = dayMap.get(slotIndex) ?? []
          existing.push(entry.user_id)
          dayMap.set(slotIndex, existing)
        }
      })
    }
    return map
  }, [availability])

  const getUserIds = (dayOfWeek: number, slotIndex: number): string[] =>
    overlapMap.get(dayOfWeek)?.get(slotIndex) ?? []

  const getOverlapStyle = (count: number): React.CSSProperties => {
    if (count === 0) return {}
    const ratio = count / memberCount
    const hue = Math.round(ratio * 120)
    const opacity = 0.4 + ratio * 0.6
    return { backgroundColor: `hsl(${hue}, 65%, 35%)`, opacity }
  }

  const handleMouseEnterCell = (e: React.MouseEvent, dayOfWeek: number, slot: number) => {
    const ids = getUserIds(dayOfWeek, slot)
    if (ids.length === 0) return
    const names = ids.map(id => memberMap.get(id)?.name ?? id)
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      users: names,
      label: `${DAYS_FULL[dayOfWeek]} ${formatHour(slot)}`,
    })
  }

  const handleMouseMoveCell = (e: React.MouseEvent) => {
    setTooltip(prev => prev.visible ? { ...prev, x: e.clientX, y: e.clientY } : prev)
  }

  const handleMouseLeaveCell = () => {
    setTooltip(prev => ({ ...prev, visible: false }))
  }

  const handleClickCell = (dayOfWeek: number, slot: number) => {
    const ids = getUserIds(dayOfWeek, slot)
    if (ids.length === 0) return
    setTooltip(prev => ({ ...prev, visible: false }))

    // Resolver MemberInfo completo para los disponibles
    const availableMembers = ids
      .map(id => memberMap.get(id))
      .filter((m): m is MemberInfo => m !== undefined)

    setSidebar({
      open: true,
      users: availableMembers,
      absentCount: memberCount - availableMembers.length,
      label: `${DAYS_FULL[dayOfWeek]} ${formatHour(slot)}`,
      dayOfWeek,
      slotHour: slot,
    })
  }

  return (
    <>
      <RichTooltip
        users={tooltip.users}
        memberCount={memberCount}
        label={tooltip.label}
        visible={tooltip.visible}
        x={tooltip.x}
        y={tooltip.y}
      />

      {sidebar.open && (
        <SlotSidebar
          users={sidebar.users}
          absentCount={sidebar.absentCount}
          label={sidebar.label}
          dayOfWeek={sidebar.dayOfWeek}
          slotHour={sidebar.slotHour}
          onClose={() => setSidebar(prev => ({ ...prev, open: false }))}
        />
      )}

      <div className="overflow-x-auto">
        <div className="flex items-center gap-3 mb-4 text-sm flex-wrap">
          <span className="text-muted-foreground text-xs">Overlap:</span>
          <div className="flex items-center gap-1">
            {[0.1, 0.3, 0.5, 0.7, 0.9, 1].map((ratio, i) => (
              <div
                key={i}
                className="w-5 h-4 rounded"
                style={{
                  backgroundColor: `hsl(${Math.round(ratio * 120)}, 65%, 35%)`,
                  opacity: 0.4 + ratio * 0.6,
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>pocos</span><span>→</span><span>todos</span>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <div className="w-5 h-4 rounded bg-muted/30" />
            <span className="text-xs text-muted-foreground">nadie</span>
          </div>
          <span className="text-xs text-muted-foreground ml-auto italic">
            Hover para ver quién · click para detalle
          </span>
        </div>

        <div className="inline-block min-w-full">
          <div className="flex">
            <div className="w-16 shrink-0" />
            {DAYS.map((day, i) => (
              <div key={i} className="flex-1 min-w-12 text-center px-1">
                <div className="text-sm font-medium">{day}</div>
              </div>
            ))}
          </div>

          <div className="mt-2 space-y-px select-none">
            {TIME_SLOTS.map((slot) => (
              <div key={slot} className="flex items-center">
                <div className="w-16 shrink-0 text-xs text-muted-foreground pr-2 text-right">
                  {formatHour(slot)}
                </div>
                {DAYS.map((_, dayIndex) => {
                  const ids = getUserIds(dayIndex, slot)
                  const count = ids.length

                  return (
                    <div key={dayIndex} className="flex-1 min-w-12 px-0.5">
                      <div
                        className={cn(
                          'h-6 rounded transition-all relative',
                          count === 0
                            ? 'bg-muted/30'
                            : 'cursor-pointer hover:ring-2 hover:ring-white/30'
                        )}
                        style={getOverlapStyle(count)}
                        onMouseEnter={(e) => handleMouseEnterCell(e, dayIndex, slot)}
                        onMouseMove={handleMouseMoveCell}
                        onMouseLeave={handleMouseLeaveCell}
                        onClick={() => handleClickCell(dayIndex, slot)}
                      >
                        {count > 0 && (
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white/90">
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
    </>
  )
}