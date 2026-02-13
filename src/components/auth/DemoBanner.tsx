import { AlertTriangle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface DemoBannerProps {
  onOpenAuth: () => void
}

export function DemoBanner({ onOpenAuth }: DemoBannerProps) {
  const { t } = useLanguage()

  return (
    <div className="fixed top-14 right-0 left-0 z-40 bg-[#fef9c3] px-4 py-2 text-center text-sm font-medium text-amber-800">
      <div className="container mx-auto flex max-w-6xl items-center justify-center gap-2">
        <AlertTriangle className="size-4 shrink-0" />
        <span>{t('auth.demo.banner')}</span>
        <span className="text-amber-500">|</span>
        <button
          onClick={onOpenAuth}
          className="font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700"
        >
          {t('auth.demo.login')}
        </button>
      </div>
    </div>
  )
}
