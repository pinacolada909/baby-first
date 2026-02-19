import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Baby } from '@/types'
import { useAuth } from './AuthContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { queryKeys } from '@/lib/query-keys'

interface BabyContextType {
  selectedBaby: Baby | null
  setSelectedBaby: (baby: Baby | null) => void
  babies: Baby[]
  isLoading: boolean
}

const BabyContext = createContext<BabyContextType | null>(null)

export function BabyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { data: babies = [], isLoading } = useQuery({
    queryKey: queryKeys.babies.all(user?.id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('baby_caregivers')
        .select('baby_id, babies(id, name, birth_date, created_at)')
        .eq('user_id', user!.id)

      if (error) throw error
      return (data ?? []).map((row) => {
        const baby = row.babies as unknown as Baby
        return baby
      }).filter(Boolean)
    },
    enabled: !!user,
  })

  const [selectedBaby, setSelectedBaby] = useState<Baby | null>(null)

  useEffect(() => {
    if (babies.length > 0 && !selectedBaby) {
      const storedId = localStorage.getItem('babystep-selected-baby')
      const found = babies.find(b => b.id === storedId)
      setSelectedBaby(found ?? babies[0])
    }
    if (babies.length === 0 && !isLoading) {
      setSelectedBaby(null)
    }
  }, [babies, selectedBaby, isLoading])

  const handleSelect = useCallback((baby: Baby | null) => {
    setSelectedBaby(baby)
    if (baby) localStorage.setItem('babystep-selected-baby', baby.id)
  }, [])

  return (
    <BabyContext.Provider value={{
      selectedBaby, setSelectedBaby: handleSelect,
      babies, isLoading
    }}>
      {children}
    </BabyContext.Provider>
  )
}

export function useBaby() {
  const ctx = useContext(BabyContext)
  if (!ctx) throw new Error('useBaby must be used within BabyProvider')
  return ctx
}
