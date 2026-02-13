import { useState } from 'react'
import { Outlet, useOutletContext } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePendingSignupAction } from '@/hooks/usePendingSignupAction'
import { Navigation } from './Navigation'
import { DemoBanner } from '@/components/auth/DemoBanner'
import { AuthModal } from '@/components/auth/AuthModal'

type LayoutContext = { onOpenAuth: () => void }

export function useLayoutContext() {
  return useOutletContext<LayoutContext>()
}

export function Layout() {
  const { isDemo } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  usePendingSignupAction()

  return (
    <div className="min-h-screen bg-background">
      <Navigation onOpenAuth={() => setAuthOpen(true)} />
      {isDemo && <DemoBanner onOpenAuth={() => setAuthOpen(true)} />}
      <main className={`container mx-auto max-w-6xl px-4 pb-8 ${isDemo ? 'pt-28' : 'pt-20'}`}>
        <Outlet context={{ onOpenAuth: () => setAuthOpen(true) }} />
      </main>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  )
}
