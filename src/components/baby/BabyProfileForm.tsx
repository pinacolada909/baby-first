import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useCreateBaby } from '@/hooks/useBabies'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface BabyProfileFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BabyProfileForm({ open, onOpenChange }: BabyProfileFormProps) {
  const { t } = useLanguage()
  const createBaby = useCreateBaby()
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      await createBaby.mutateAsync({ name: name.trim(), birthDate: birthDate || undefined })
      toast.success(t('baby.created'))
      setName('')
      setBirthDate('')
      onOpenChange(false)
    } catch {
      toast.error(t('common.error'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('baby.add')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{t('baby.name')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label>{t('baby.birthDate')}</Label>
            <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createBaby.isPending}>
              {t('baby.create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
