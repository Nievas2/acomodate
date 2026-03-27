'use client'

import { useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useAuth } from '@/components/auth-provider'
import { DashboardHeader } from '@/components/dashboard-header'
import { AvailabilityGrid, GroupOverlapGrid, type DayAvailability } from '@/components/availability-grid'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ArrowLeft, Copy, Users, Check } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { useState } from 'react'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Member {
  id: string
  name: string
  email: string
}

interface Group {
  id: string
  name: string
  description: string | null
  invite_code: string
  owner_id: string
}

// Lo que devuelve la API (shape de la DB)
interface AvailabilityRow {
  user_id: string
  user_name: string
  day_of_week: number
  slots: boolean[]
}

export default function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [copied, setCopied] = useState(false)

  const { data: groupData, isLoading: groupLoading } = useSWR<{ group: Group; members: Member[] }>(
    user ? `/api/groups/${id}` : null,
    fetcher
  )

  const { data: availabilityData, mutate: mutateAvailability } = useSWR<{ availability: AvailabilityRow[] }>(
    user ? `/api/groups/${id}/availability` : null,
    fetcher
  )

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  // Guardar un día completo cuando el usuario termina de editar
  const handleUpdateDay = useCallback(async (dayOfWeek: number, slots: boolean[]) => {
    // Optimistic update
    mutateAvailability((current) => {
      if (!current) return current

      const filtered = current.availability.filter(
        a => !(a.user_id === user?.id && a.day_of_week === dayOfWeek)
      )

      filtered.push({
        user_id: user!.id,
        user_name: user!.username,
        day_of_week: dayOfWeek,
        slots,
      })

      return { availability: filtered }
    }, false)

    try {
      await fetch(`/api/groups/${id}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayOfWeek, slots }),
      })
      mutateAvailability()
    } catch (error) {
      console.error('Error al guardar disponibilidad:', error)
      mutateAvailability()
    }
  }, [user, id, mutateAvailability])

  const copyInviteCode = async () => {
    if (!groupData?.group.invite_code) return
    await navigator.clipboard.writeText(groupData.group.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (authLoading || !user || groupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  if (!groupData?.group) {
    return (
      <div className="min-h-screen">
        <DashboardHeader />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-muted-foreground">Grupo no encontrado o no tenés acceso.</p>
        </main>
      </div>
    )
  }

  const { group, members } = groupData

  // Convertir la respuesta de la API al tipo que espera el grid
  const availability: DayAvailability[] = (availabilityData?.availability ?? []).map(row => ({
    user_id: row.user_id,
    user_name: row.user_name,
    day_of_week: row.day_of_week,
    slots: row.slots,
  }))

  return (
    <div className="min-h-screen pb-8">
      <DashboardHeader />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Botón volver y título */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="plastic-button"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            {group.description && (
              <p className="text-muted-foreground mt-1">{group.description}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Dialog de miembros */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="plastic-button">
                  <Users className="w-4 h-4 mr-2" />
                  {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
                </Button>
              </DialogTrigger>
              <DialogContent className="plastic-surface border-0">
                <DialogHeader>
                  <DialogTitle>Miembros del grupo</DialogTitle>
                  <DialogDescription>
                    Personas en este grupo de coordinación
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 mt-4">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">
                          {member.name}
                          {member.id === group.owner_id && (
                            <span className="ml-2 text-xs text-muted-foreground">(dueño)</span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            {/* Código de invitación */}
            <Button
              variant="outline"
              className="plastic-button font-mono"
              onClick={copyInviteCode}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-available" />
                  ¡Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  {group.invite_code}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tabs de disponibilidad */}
        <Tabs defaultValue="my-availability" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="my-availability">Mi disponibilidad</TabsTrigger>
            <TabsTrigger value="group-overlap">Overlap del grupo</TabsTrigger>
          </TabsList>

          <TabsContent value="my-availability">
            <div className="plastic-surface p-6">
              <p className="text-sm text-muted-foreground mb-4">
                Marcá los horarios en los que estás disponible cada semana. Hacé click y arrastrá para marcar varios a la vez.
              </p>
              <AvailabilityGrid
                availability={availability}
                currentUserId={user.id}
                onUpdateDay={handleUpdateDay}
                memberCount={members.length}
              />
            </div>
          </TabsContent>

          <TabsContent value="group-overlap">
            <div className="plastic-surface p-6">
              <p className="text-sm text-muted-foreground mb-4">
                Horarios en los que todos coinciden. Los números indican cuántas personas pueden en cada franja.
              </p>
              <GroupOverlapGrid
                availability={availability}
                memberCount={members.length}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}