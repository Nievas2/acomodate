'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, UserPlus } from 'lucide-react'

interface JoinGroupDialogProps {
  onJoined: () => void
}

export function JoinGroupDialog({ onJoined }: JoinGroupDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to join group')
        return
      }

      setInviteCode('')
      setOpen(false)
      onJoined()
    } catch {
      setError('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="plastic-button">
          <UserPlus className="mr-2 h-4 w-4" />
          Join Group
        </Button>
      </DialogTrigger>
      <DialogContent className="plastic-surface border-0">
        <DialogHeader>
          <DialogTitle>Join a group</DialogTitle>
          <DialogDescription>
            Enter the invite code shared with you to join an existing group
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="inviteCode">Invite code</Label>
            <Input
              id="inviteCode"
              placeholder="Enter 8-character code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
              className="plastic-input font-mono"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="plastic-button"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="plastic-button">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join group'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
