"use client"

import { useEffect, useCallback, use, useMemo } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import useSWR from "swr"
import { useAuth } from "@/components/auth-provider"
import { DashboardHeader } from "@/components/dashboard-header"
import {
  AvailabilityGrid,
  GroupOverlapGrid,
  type DayAvailability,
} from "@/components/availability-grid"
import { SubgroupsPanel, type Subgroup } from "@/components/subgroups-panel"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ArrowLeft, Copy, Users, Check, LinkIcon } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion } from "framer-motion"

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

interface AvailabilityRow {
  user_id: string
  user_name: string
  day_of_week: number
  slots: boolean[]
}

const tabs = [
  { value: "my-availability", label: "Mi disponibilidad" },
  { value: "group-overlap", label: "Overlap del grupo" },
]

// Parsea/serializa los IDs de subgrupos en el param "sg" de la URL
// Ej: ?sg=abc123,def456
function parseSubgroupIds(param: string | null): string[] {
  if (!param) return []
  return param.split(",").filter(Boolean)
}
function serializeSubgroupIds(ids: string[]): string {
  return ids.join(",")
}

export default function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading } = useAuth()
  const [copied, setCopied] = useState<"code" | "link" | null>(null)
  const [activeTab, setActiveTab] = useState("my-availability")

  // Subgrupos seleccionados — viven en los search params para ser compartibles
  const selectedSubgroupIds = parseSubgroupIds(searchParams.get("sg"))

  const setSelectedSubgroupIds = useCallback(
    (ids: string[]) => {
      const params = new URLSearchParams(searchParams.toString())
      if (ids.length === 0) {
        params.delete("sg")
      } else {
        params.set("sg", serializeSubgroupIds(ids))
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: groupData, isLoading: groupLoading } = useSWR<{
    group: Group
    members: Member[]
  }>(user ? `/api/groups/${id}` : null, fetcher)

  const { data: availabilityData, mutate: mutateAvailability } = useSWR<{
    availability: AvailabilityRow[]
  }>(user ? `/api/groups/${id}/availability` : null, fetcher)

  const { data: subgroupsData, mutate: mutateSubgroups } = useSWR<{
    subgroups: Subgroup[]
  }>(user ? `/api/groups/${id}/subgroups` : null, fetcher)

  // ── Auth guard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  // ── Invitación ─────────────────────────────────────────────────────────────

  const copyInviteCode = async () => {
    if (!groupData?.group.invite_code) return
    await navigator.clipboard.writeText(groupData.group.invite_code)
    setCopied("code")
    setTimeout(() => setCopied(null), 2000)
  }

  const copyInviteLink = async () => {
    if (!groupData?.group.invite_code) return
    const link = `${window.location.origin}/join/${groupData.group.invite_code}`
    await navigator.clipboard.writeText(link)
    setCopied("link")
    setTimeout(() => setCopied(null), 2000)
  }

  // ── Disponibilidad ─────────────────────────────────────────────────────────

  const handleUpdateDays = useCallback(
    async (days: { dayOfWeek: number; slots: boolean[] }[]) => {
      if (days.length === 0) return

      mutateAvailability((current) => {
        if (!current) return current
        const filtered = current.availability.filter(
          (a) =>
            !(
              a.user_id === user?.id &&
              days.some((d) => d.dayOfWeek === a.day_of_week)
            ),
        )
        for (const { dayOfWeek, slots } of days) {
          filtered.push({
            user_id: user!.id,
            user_name: (user as any).username ?? user!.username,
            day_of_week: dayOfWeek,
            slots,
          })
        }
        return { availability: filtered }
      }, false)

      try {
        await fetch(`/api/groups/${id}/availability`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ days }),
        })
        mutateAvailability()
      } catch (error) {
        console.error("Error al guardar disponibilidad:", error)
        mutateAvailability()
      }
    },
    [user, id, mutateAvailability],
  )

  // ── Subgrupos ──────────────────────────────────────────────────────────────

  const handleCreateSubgroup = useCallback(
    async (name: string, memberIds: string[]) => {
      await fetch(`/api/groups/${id}/subgroups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, memberIds }),
      })
      mutateSubgroups()
    },
    [id, mutateSubgroups],
  )

  const handleDeleteSubgroup = useCallback(
    async (subgroupId: string) => {
      await fetch(`/api/groups/${id}/subgroups?subgroupId=${subgroupId}`, {
        method: "DELETE",
      })
      mutateSubgroups()
    },
    [id, mutateSubgroups],
  )

  // ── Filtro de availability por subgrupos seleccionados ─────────────────────
  //
  // Si no hay subgrupos seleccionados → mostrar todos los miembros
  // Si hay uno o más → mostrar la unión de sus miembros
  const filteredUserIds = useMemo(() => {
    if (selectedSubgroupIds.length === 0) return null // null = sin filtro

    const subgroups = subgroupsData?.subgroups ?? []
    const selectedSubgroups = subgroups.filter((sg) =>
      selectedSubgroupIds.includes(sg.id),
    )
    const ids = new Set<string>()
    selectedSubgroups.forEach((sg) => sg.members.forEach((m) => ids.add(m.id)))
    return ids
  }, [selectedSubgroupIds, subgroupsData])

  const filteredAvailability = useMemo(() => {
    const all: DayAvailability[] = (availabilityData?.availability ?? []).map(
      (row) => ({
        user_id: row.user_id,
        user_name: row.user_name,
        day_of_week: row.day_of_week,
        slots: row.slots,
      }),
    )
    if (!filteredUserIds) return all
    return all.filter((a) => filteredUserIds.has(a.user_id))
  }, [availabilityData, filteredUserIds])

  const filteredMemberCount = useMemo(() => {
    if (!filteredUserIds) return groupData?.members.length ?? 0
    return filteredUserIds.size
  }, [filteredUserIds, groupData])

  // ── Loading / error states ─────────────────────────────────────────────────

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
          <p className="text-muted-foreground">
            Grupo no encontrado o no tenés acceso.
          </p>
        </main>
      </div>
    )
  }

  const { group, members } = groupData
  const subgroups = subgroupsData?.subgroups ?? []
  const isAdmin =
    members.find((m) => m.id === user.id) !== undefined &&
    (group.owner_id === user.id || true) // ajustar según tu lógica de roles
  // Más preciso: verificar el role del usuario en group_members
  // Por ahora usamos: es admin si es el owner
  const isOwner = group.owner_id === user.id

  return (
    <div className="min-h-screen pb-8">
      <DashboardHeader />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Botón volver */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
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
                  {members.length}{" "}
                  {members.length === 1 ? "miembro" : "miembros"}
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
                            <span className="ml-2 text-xs text-muted-foreground">
                              (dueño)
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            {/* Código de invitación */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="plastic-button font-mono">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                      ¡Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      {group.invite_code}
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={copyInviteCode}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar código
                </DropdownMenuItem>
                <DropdownMenuItem onClick={copyInviteLink}>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Copiar link de invitación
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Panel de subgrupos — visible siempre, admin puede crear */}
        {(subgroups.length > 0 || isOwner) && (
          <div className="plastic-surface p-4 mb-6">
            <SubgroupsPanel
              subgroups={subgroups}
              allMembers={members.map((m) => ({ id: m.id, name: m.name }))}
              currentUserId={user.id}
              isAdmin={isOwner}
              selectedSubgroupIds={selectedSubgroupIds}
              onSelectionChange={setSelectedSubgroupIds}
              onCreateSubgroup={handleCreateSubgroup}
              onDeleteSubgroup={handleDeleteSubgroup}
            />
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 relative">
            {tabs.map((tab) => (
              <TabsPrimitive.Trigger
                key={tab.value}
                value={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className="relative z-10 px-4 py-1.5 text-sm font-medium transition-colors
                  data-[state=active]:text-primary-foreground
                  data-[state=inactive]:text-muted-foreground"
              >
                {activeTab === tab.value && (
                  <motion.span
                    layoutId="bubble"
                    className="absolute inset-0 z-[-1] rounded-md bg-primary"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                {tab.label}
              </TabsPrimitive.Trigger>
            ))}
          </TabsList>

          <TabsContent value="my-availability">
            <div className="plastic-surface p-6">
              <p className="text-sm text-muted-foreground mb-4">
                Marcá los horarios en los que estás disponible cada semana. Hacé
                click y arrastrá para marcar varios a la vez.
              </p>
              <AvailabilityGrid
                availability={filteredAvailability}
                currentUserId={user.id}
                onUpdateDays={handleUpdateDays}
                memberCount={filteredMemberCount}
              />
            </div>
          </TabsContent>

          <TabsContent value="group-overlap">
            <div className="plastic-surface p-6">
              {selectedSubgroupIds.length > 0 && (
                <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                  Mostrando overlap de{" "}
                  <span className="font-medium text-foreground">
                    {selectedSubgroupIds.length === 1
                      ? (subgroups.find(
                          (sg) => sg.id === selectedSubgroupIds[0],
                        )?.name ?? "subgrupo")
                      : `${selectedSubgroupIds.length} subgrupos combinados`}
                  </span>
                  <button
                    onClick={() => setSelectedSubgroupIds([])}
                    className="text-primary hover:underline ml-1"
                  >
                    (ver todos)
                  </button>
                </div>
              )}
              {!selectedSubgroupIds.length && (
                <p className="text-sm text-muted-foreground mb-4">
                  Horarios en los que todos coinciden. Los números indican
                  cuántas personas pueden en cada franja.
                </p>
              )}
              <GroupOverlapGrid
                availability={filteredAvailability}
                memberCount={filteredMemberCount}
                members={members.map(m => ({ id: m.id, name: m.name, email: m.email }))}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
