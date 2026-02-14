import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBaby } from '@/contexts/BabyContext'
import { useCaregivers } from '@/hooks/useCaregivers'
import { useDeleteBaby } from '@/hooks/useBabies'
import type { BabyCaregiver } from '@/types'
import { CaregiverManager } from '@/components/baby/CaregiverManager'
import { EmailSettings } from '@/components/settings/EmailSettings'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Baby, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export function SettingsPage() {
  const { t } = useLanguage()
  const { user, isDemo } = useAuth()
  const { selectedBaby, setSelectedBaby, babies } = useBaby()

  const deleteBaby = useDeleteBaby()

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const pendingBaby = babies.find((b) => b.id === pendingDeleteId)

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return
    try {
      await deleteBaby.mutateAsync(pendingDeleteId)
      toast.success(t('baby.deleted'))
      // If we deleted the selected baby, pick another or clear
      if (selectedBaby?.id === pendingDeleteId) {
        const remaining = babies.filter((b) => b.id !== pendingDeleteId)
        setSelectedBaby(remaining[0] ?? null)
      }
    } catch {
      toast.error(t('common.error'))
    } finally {
      setPendingDeleteId(null)
    }
  }

  if (isDemo) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('settings.subtitle')}</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('auth.demo.login')}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      {/* Baby Profiles */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Baby className="h-5 w-5 text-[#a78bfa]" />
            <h2 className="text-lg font-semibold">{t('settings.babyProfiles')}</h2>
          </div>

          {babies.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">{t('baby.noBabies')}</p>
          ) : (
            <div className="space-y-2">
              {babies.map((baby) => (
                <BabyProfileRow
                  key={baby.id}
                  babyId={baby.id}
                  name={baby.name}
                  birthDate={baby.birth_date}
                  isSelected={selectedBaby?.id === baby.id}
                  userId={user?.id}
                  onDelete={() => setPendingDeleteId(baby.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Caregivers */}
      <CaregiverManager />

      {/* Email Settings */}
      <EmailSettings />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!pendingDeleteId} onOpenChange={(open) => { if (!open) setPendingDeleteId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('baby.delete')}</DialogTitle>
            <DialogDescription>
              {t('baby.delete.confirm').replace('{name}', pendingBaby?.name ?? '')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteBaby.isPending}
            >
              {t('baby.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Row for a single baby profile — checks primary status internally */
function BabyProfileRow({
  babyId,
  name,
  birthDate,
  isSelected,
  userId,
  onDelete,
}: {
  babyId: string
  name: string
  birthDate: string | null
  isSelected: boolean
  userId?: string
  onDelete: () => void
}) {
  const { t } = useLanguage()
  const { data: caregivers = [] } = useCaregivers(babyId)
  const isPrimary = caregivers.some(
    (c: BabyCaregiver) => c.user_id === userId && c.role === 'primary',
  )
  const role = caregivers.find((c: BabyCaregiver) => c.user_id === userId)?.role

  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-3 ${
        isSelected ? 'border-[#a78bfa] bg-violet-50/50' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{name}</span>
            {role && (
              <Badge variant={role === 'primary' ? 'default' : 'outline'} className="text-xs">
                {role === 'primary' ? t('caregiver.role.primary') : t('caregiver.role.member')}
              </Badge>
            )}
          </div>
          {birthDate && (
            <p className="text-xs text-muted-foreground">
              {new Date(birthDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
      {isPrimary && (
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  )
}
