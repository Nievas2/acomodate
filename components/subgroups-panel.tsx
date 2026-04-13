'use client'

import { useState, useCallback } from 'react'
import { Plus, Trash2, Users, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface Subgroup {
  id: string
  name: string
  created_by: string
  members: { id: string; name: string }[]
}

interface SubgroupsPanelProps {
  subgroups: Subgroup[]
  allMembers: { id: string; name: string }[]
  currentUserId: string
  isAdmin: boolean
  selectedSubgroupIds: string[]        // IDs activos (multi-select)
  onSelectionChange: (ids: string[]) => void
  onCreateSubgroup: (name: string, memberIds: string[]) => Promise<void>
  onDeleteSubgroup: (id: string) => Promise<void>
}

// Colores deterministas por nombre
const CHIP_COLORS = [
  'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'bg-teal-500/15 text-teal-400 border-teal-500/30',
  'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'bg-pink-500/15 text-pink-400 border-pink-500/30',
  'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
]

function chipColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return CHIP_COLORS[Math.abs(hash) % CHIP_COLORS.length]
}

// ─── Formulario de creación ───────────────────────────────────────────────────

function CreateSubgroupForm({
  allMembers,
  onSubmit,
  onCancel,
}: {
  allMembers: { id: string; name: string }[]
  onSubmit: (name: string, memberIds: string[]) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleMember = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Escribí un nombre para el subgrupo'); return }
    if (selected.size === 0) { setError('Seleccioná al menos un miembro'); return }
    setLoading(true)
    try {
      await onSubmit(name.trim(), Array.from(selected))
    } catch {
      setError('Error al crear el subgrupo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/20">
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
          Nombre del subgrupo
        </label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError('') }}
          placeholder="ej: Frontend, Diseño, Marketing…"
          className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
            placeholder:text-muted-foreground/50"
          autoFocus
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
          Miembros ({selected.size} seleccionados)
        </label>
        <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
          {allMembers.map(member => (
            <button
              key={member.id}
              onClick={() => toggleMember(member.id)}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm text-left transition-colors border',
                selected.has(member.id)
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'bg-background border-border text-foreground hover:bg-muted/50'
              )}
            >
              <div className={cn(
                'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                selected.has(member.id) ? 'bg-primary border-primary' : 'border-muted-foreground/40'
              )}>
                {selected.has(member.id) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
              </div>
              <span className="truncate">{member.name}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={handleSubmit} disabled={loading} className="flex-1">
          {loading ? 'Creando…' : 'Crear subgrupo'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

// ─── Chip de subgrupo ─────────────────────────────────────────────────────────

function SubgroupChip({
  subgroup,
  active,
  onToggle,
  onDelete,
  isAdmin,
}: {
  subgroup: Subgroup
  active: boolean
  onToggle: () => void
  onDelete: () => void
  isAdmin: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const color = chipColor(subgroup.name)

  return (
    <div className={cn(
      'rounded-lg border transition-all',
      active ? color : 'bg-background border-border'
    )}>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5">
        {/* Click en el nombre activa/desactiva */}
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
        >
          <Users className="w-3.5 h-3.5 shrink-0 opacity-70" />
          <span className="text-sm font-medium truncate">{subgroup.name}</span>
          <span className="text-xs opacity-60 shrink-0">({subgroup.members.length})</span>
        </button>

        {/* Expandir lista de miembros */}
        <button
          onClick={() => setExpanded(p => !p)}
          className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100 transition-opacity"
        >
          {expanded
            ? <ChevronUp className="w-3 h-3" />
            : <ChevronDown className="w-3 h-3" />
          }
        </button>

        {/* Borrar (solo admin) */}
        {isAdmin && (
          <button
            onClick={onDelete}
            className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors opacity-60 hover:opacity-100"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Lista de miembros expandida */}
      {expanded && (
        <div className="px-3 pb-2.5 pt-0.5 border-t border-current/10">
          <div className="flex flex-wrap gap-1 mt-1.5">
            {subgroup.members.map(m => (
              <span key={m.id} className="text-xs px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
                {m.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Panel principal ──────────────────────────────────────────────────────────

export function SubgroupsPanel({
  subgroups,
  allMembers,
  currentUserId,
  isAdmin,
  selectedSubgroupIds,
  onSelectionChange,
  onCreateSubgroup,
  onDeleteSubgroup,
}: SubgroupsPanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)

  const toggleSubgroup = useCallback((id: string) => {
    onSelectionChange(
      selectedSubgroupIds.includes(id)
        ? selectedSubgroupIds.filter(s => s !== id)
        : [...selectedSubgroupIds, id]
    )
  }, [selectedSubgroupIds, onSelectionChange])

  const handleCreate = async (name: string, memberIds: string[]) => {
    await onCreateSubgroup(name, memberIds)
    setShowCreateForm(false)
  }

  const handleDelete = async (id: string) => {
    // Si estaba seleccionado, sacarlo de la selección
    onSelectionChange(selectedSubgroupIds.filter(s => s !== id))
    await onDeleteSubgroup(id)
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Subgrupos</h3>
          {selectedSubgroupIds.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedSubgroupIds.length === 1
                ? 'Viendo 1 subgrupo'
                : `Viendo ${selectedSubgroupIds.length} subgrupos combinados`
              }
              {' · '}
              <button
                onClick={() => onSelectionChange([])}
                className="text-primary hover:underline"
              >
                Ver todos
              </button>
            </p>
          )}
        </div>
        {isAdmin && !showCreateForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCreateForm(true)}
            className="h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Nuevo
          </Button>
        )}
      </div>

      {/* Formulario de creación */}
      {showCreateForm && (
        <CreateSubgroupForm
          allMembers={allMembers}
          onSubmit={handleCreate}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Chips de subgrupos */}
      {subgroups.length === 0 && !showCreateForm && (
        <p className="text-xs text-muted-foreground italic">
          {isAdmin
            ? 'No hay subgrupos. Creá uno para filtrar el overlap por equipo.'
            : 'El administrador no creó subgrupos todavía.'
          }
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {subgroups.map(sg => (
          <SubgroupChip
            key={sg.id}
            subgroup={sg}
            active={selectedSubgroupIds.includes(sg.id)}
            onToggle={() => toggleSubgroup(sg.id)}
            onDelete={() => handleDelete(sg.id)}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </div>
  )
}