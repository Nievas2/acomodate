// app/join/[code]/page.tsx
'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { Spinner } from '@/components/ui/spinner'

export default function JoinByLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return

    // Sin sesión → mandar a register con callbackUrl
    if (!user) {
      router.replace(`/register?callbackUrl=/join/${code}`)
      return
    }

    // Con sesión → intentar unirse al grupo
    const joinAndRedirect = async () => {
      try {
        const res = await fetch('/api/groups/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inviteCode: code }),
        })

        const data = await res.json()

        if (res.ok) {
          // Unido exitosamente → ir al grupo
          router.replace(`/group/${data.groupId}`)
        } else if (res.status === 409) {
          // Ya era miembro → igual redirigir al grupo
          router.replace(`/group/${data.groupId}`)
        } else {
          // Código inválido u otro error
          router.replace('/dashboard?error=invalid-invite')
        }
      } catch {
        router.replace('/dashboard?error=invalid-invite')
      }
    }

    joinAndRedirect()
  }, [user, isLoading, code, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Spinner className="w-8 h-8" />
      <p className="text-muted-foreground text-sm">Uniéndote al grupo...</p>
    </div>
  )
}