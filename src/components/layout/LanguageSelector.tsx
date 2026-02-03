import { Globe } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en')
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-1 text-xs font-medium"
    >
      <Globe className="size-3.5" />
      {language === 'en' ? 'EN' : '\u4E2D\u6587'}
    </Button>
  )
}
