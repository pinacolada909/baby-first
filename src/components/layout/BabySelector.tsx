import { useState } from 'react'
import { Baby, ChevronDown, Plus } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useBaby } from '@/contexts/BabyContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

export function BabySelector() {
  const { t } = useLanguage()
  const { selectedBaby, setSelectedBaby, babies, isLoading } = useBaby()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [babyName, setBabyName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCreateBaby = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!babyName.trim() || !user) return

    setSubmitting(true)
    try {
      const { data: baby, error: babyError } = await supabase
        .from('babies')
        .insert({ name: babyName.trim(), birth_date: birthDate || null })
        .select()
        .single()

      if (babyError) throw babyError

      const { error: linkError } = await supabase
        .from('baby_caregivers')
        .insert({
          baby_id: baby.id,
          user_id: user.id,
          role: 'primary',
          display_name: user.user_metadata?.display_name ?? user.email ?? '',
        })

      if (linkError) throw linkError

      await queryClient.invalidateQueries({ queryKey: queryKeys.babies.all(user.id) })
      setSelectedBaby(baby)
      toast.success(t('baby.created'))
      setDialogOpen(false)
      setBabyName('')
      setBirthDate('')
    } catch {
      toast.error(t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-1 text-xs">
        <Baby className="size-3.5" />
        {t('common.loading')}
      </Button>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <Baby className="size-3.5" />
            <span className="hidden sm:inline max-w-[80px] truncate">
              {selectedBaby?.name ?? t('baby.select')}
            </span>
            <ChevronDown className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {babies.map((baby) => (
            <DropdownMenuItem
              key={baby.id}
              onClick={() => setSelectedBaby(baby)}
              className={selectedBaby?.id === baby.id ? 'bg-purple-50 text-purple-700' : ''}
            >
              {baby.name}
            </DropdownMenuItem>
          ))}
          {babies.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            {t('baby.add')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('baby.add')}</DialogTitle>
            <DialogDescription>{t('baby.noBabies')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBaby} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baby-name">{t('baby.name')}</Label>
              <Input
                id="baby-name"
                value={babyName}
                onChange={(e) => setBabyName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baby-birth-date">{t('baby.birthDate')}</Label>
              <Input
                id="baby-birth-date"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={submitting || !babyName.trim()}>
                {t('baby.create')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
