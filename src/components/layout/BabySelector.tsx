import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Baby, ChevronDown, Plus, UserPlus } from 'lucide-react'
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
  const navigate = useNavigate()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [babyName, setBabyName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleCreateBaby = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!babyName.trim() || !user) return

    setSubmitting(true)
    try {
      const { data: babyId, error } = await supabase.rpc('create_baby_with_caregiver', {
        _name: babyName.trim(),
        _birth_date: birthDate || null,
        _display_name: user.user_metadata?.display_name ?? user.email ?? 'Parent',
      })

      if (error) throw error

      await queryClient.invalidateQueries({ queryKey: queryKeys.babies.all(user.id) })
      // Set the newly created baby as selected
      setSelectedBaby({ id: babyId, name: babyName.trim(), birth_date: birthDate || null, created_at: new Date().toISOString() })
      toast.success(t('baby.created'))
      setDialogOpen(false)
      setBabyName('')
      setBirthDate('')
    } catch (err) {
      const message = err instanceof Error ? err.message : t('common.error')
      toast.error(message)
      console.error('Create baby error:', err)
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
          <DropdownMenuItem onClick={() => navigate('/join')}>
            <UserPlus className="size-4" />
            {t('join.withCode')}
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
