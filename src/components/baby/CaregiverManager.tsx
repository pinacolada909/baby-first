import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBaby } from '@/contexts/BabyContext'
import { useCaregivers, useRemoveCaregiver } from '@/hooks/useCaregivers'
import { useInvites, useCreateInvite, useRedeemInvite } from '@/hooks/useInvites'
import type { BabyCaregiver } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Copy, Link, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { sanitizeErrorMessage } from '@/lib/utils'

export function CaregiverManager() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const { selectedBaby } = useBaby()
  const babyId = selectedBaby?.id

  const { data: caregivers = [] } = useCaregivers(babyId)
  const { data: invites = [] } = useInvites(babyId)
  const createInvite = useCreateInvite()
  const redeemInvite = useRedeemInvite()
  const removeCaregiver = useRemoveCaregiver()

  const [inviteCode, setInviteCode] = useState('')
  const [joinName, setJoinName] = useState('')
  const [pendingRemoveUserId, setPendingRemoveUserId] = useState<string | null>(null)

  const isPrimary = caregivers.some(
    (c: BabyCaregiver) => c.user_id === user?.id && c.role === 'primary'
  )

  const activeInvite = invites.find(
    (i) => !i.used_by && new Date(i.expires_at) > new Date()
  )

  const handleGenerateInvite = async () => {
    if (!babyId || !user) return
    try {
      await createInvite.mutateAsync({ babyId, createdBy: user.id })
      toast.success(t('caregiver.invite.code'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success(t('caregiver.invite.copied'))
  }

  const handleCopyLink = (code: string) => {
    const link = `${window.location.origin}/join?code=${code}`
    navigator.clipboard.writeText(link)
    toast.success(t('caregiver.invite.linkCopied'))
  }

  const handleJoin = async () => {
    if (!inviteCode.trim() || !joinName.trim()) return
    try {
      await redeemInvite.mutateAsync({ code: inviteCode.trim().toUpperCase(), displayName: joinName.trim() })
      toast.success(t('caregiver.joined'))
      setInviteCode('')
      setJoinName('')
    } catch (err) {
      const message = err instanceof Error ? err.message : t('common.error')
      if (message.includes('already a caregiver')) {
        toast.error(t('join.error.alreadyMember'))
      } else if (message.includes('Invalid or expired')) {
        toast.error(t('join.error.invalidCode'))
      } else {
        toast.error(sanitizeErrorMessage(message))
      }
    }
  }

  const handleConfirmRemove = async () => {
    if (!babyId || !pendingRemoveUserId) return
    try {
      await removeCaregiver.mutateAsync({ babyId, userId: pendingRemoveUserId })
      toast.success(t('caregiver.removed'))
    } catch {
      toast.error(t('common.error'))
    } finally {
      setPendingRemoveUserId(null)
    }
  }

  const pendingCaregiver = caregivers.find(
    (c: BabyCaregiver) => c.user_id === pendingRemoveUserId
  )

  if (!babyId) return null

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-500" />
          <h2 className="text-lg font-semibold">{t('caregiver.title')}</h2>
        </div>

        {/* Caregiver List */}
        <div className="space-y-2">
          {caregivers.map((c: BabyCaregiver) => (
            <div key={c.user_id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{c.display_name}</span>
                <Badge variant={c.role === 'primary' ? 'default' : 'outline'}>
                  {c.role === 'primary' ? t('caregiver.role.primary') : t('caregiver.role.member')}
                </Badge>
              </div>
              {isPrimary && c.user_id !== user?.id && (
                <Button variant="ghost" size="sm" onClick={() => setPendingRemoveUserId(c.user_id)}>
                  {t('caregiver.remove')}
                </Button>
              )}
            </div>
          ))}
        </div>

        <Separator />

        {/* Invite Section (Primary Only) */}
        {isPrimary && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">{t('caregiver.invite')}</h3>
            {activeInvite ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="rounded bg-muted px-3 py-2 text-lg font-mono tracking-wider">
                    {activeInvite.code}
                  </code>
                  <Button variant="outline" size="icon" onClick={() => handleCopyCode(activeInvite.code)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {t('caregiver.invite.expires')}: {new Date(activeInvite.expires_at).toLocaleDateString()}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleCopyLink(activeInvite.code)}
                >
                  <Link className="mr-2 h-4 w-4" />
                  {t('caregiver.invite.copyLink')}
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={handleGenerateInvite} disabled={createInvite.isPending}>
                <UserPlus className="mr-2 h-4 w-4" />
                {t('caregiver.invite')}
              </Button>
            )}
          </div>
        )}

        {/* Join Section (non-primary only — primary already has access) */}
        {!isPrimary && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-medium">{t('caregiver.join')}</h3>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex-1">
                  <Label className="sr-only">{t('caregiver.join.code')}</Label>
                  <Input
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder={t('caregiver.join.code')}
                    maxLength={15}
                    className="font-mono tracking-wider uppercase"
                  />
                </div>
                <div className="flex-1">
                  <Label className="sr-only">{t('caregiver.join.name')}</Label>
                  <Input
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    placeholder={t('caregiver.join.name')}
                    maxLength={50}
                  />
                </div>
                <Button onClick={handleJoin} disabled={redeemInvite.isPending || !inviteCode || !joinName}>
                  {t('caregiver.join.button')}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!pendingRemoveUserId} onOpenChange={(open) => { if (!open) setPendingRemoveUserId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('caregiver.remove.confirm.title')}</DialogTitle>
            <DialogDescription>
              {t('caregiver.remove.confirm.desc').replace('{name}', pendingCaregiver?.display_name ?? '')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRemoveUserId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemove}
              disabled={removeCaregiver.isPending}
            >
              {t('caregiver.remove.confirm.button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
