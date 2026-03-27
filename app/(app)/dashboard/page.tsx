'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { useAuth } from '@/components/auth-provider'
import { DashboardHeader } from '@/components/dashboard-header'
import { CreateGroupDialog } from '@/components/create-group-dialog'
import { JoinGroupDialog } from '@/components/join-group-dialog'
import { Users, Calendar, ChevronRight } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Group {
  id: string
  name: string
  description: string | null
  invite_code: string
  member_count: number
  created_at: string
  owner_id: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { data, isLoading: groupsLoading, mutate } = useSWR<{ groups: Group[] }>(
    user ? '/api/groups' : null,
    fetcher
  )

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    )
  }

  const groups = data?.groups || []

  return (
    <div className="min-h-screen pb-8">
      <DashboardHeader />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Your Groups</h1>
            <p className="text-muted-foreground">
              Manage your scheduling groups
            </p>
          </div>
          <div className="flex gap-3">
            <JoinGroupDialog onJoined={mutate} />
            <CreateGroupDialog onCreated={mutate} />
          </div>
        </div>

        {groupsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="w-8 h-8" />
          </div>
        ) : groups.length === 0 ? (
          <div className="plastic-surface p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No groups yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Create a new group to start coordinating availability with friends or colleagues
            </p>
            <div className="flex justify-center gap-3">
              <JoinGroupDialog onJoined={mutate} />
              <CreateGroupDialog onCreated={mutate} />
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {groups.map((group) => (
              <Link key={group.id} href={`/group/${group.id}`}>
                <div className="plastic-surface p-5 flex items-center justify-between hover:border-primary/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{group.name}</h3>
                      {group.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {group.description}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
