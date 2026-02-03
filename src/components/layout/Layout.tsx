import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from './Navigation'
import { DemoBanner } from '@/components/auth/DemoBanner'
import { AuthModal } from '@/components/auth/AuthModal'

export function Layout() {
  const { isDemo } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <Navigation onOpenAuth={() => setAuthOpen(true)} />
      {isDemo && <DemoBanner onOpenAuth={() => setAuthOpen(true)} />}
      <main className={`container mx-auto max-w-6xl px-4 pb-8 ${isDemo ? 'pt-28' : 'pt-20'}`}>
        <Outlet />
      </main>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  )
}
