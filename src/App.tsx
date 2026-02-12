import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { BabyProvider } from '@/contexts/BabyContext'
import { Toaster } from '@/components/ui/sonner'
import { Layout } from '@/components/layout/Layout'
import { UpdatePasswordModal } from '@/components/auth/UpdatePasswordModal'
import { HomePage } from '@/pages/HomePage'
import { QuestionsPage } from '@/pages/QuestionsPage'
import { SleepTrackerPage } from '@/pages/SleepTrackerPage'
import { DiaperTrackerPage } from '@/pages/DiaperTrackerPage'
import { FeedingTrackerPage } from '@/pages/FeedingTrackerPage'
import { TimeManagementPage } from '@/pages/TimeManagementPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <BabyProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/questions" element={<QuestionsPage />} />
                  <Route path="/sleep-tracker" element={<SleepTrackerPage />} />
                  <Route path="/diaper-tracker" element={<DiaperTrackerPage />} />
                  <Route path="/feeding-tracker" element={<FeedingTrackerPage />} />
                  <Route path="/time-management" element={<TimeManagementPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
            <Toaster richColors position="top-right" />
            <UpdatePasswordModal />
          </BabyProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  )
}
