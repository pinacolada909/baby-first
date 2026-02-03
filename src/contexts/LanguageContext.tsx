import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Language } from '@/types'
import { t, type TranslationKey } from '@/translations'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('babyfirst-lang')
    return (stored === 'zh' ? 'zh' : 'en') as Language
  })

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('babyfirst-lang', lang)
  }

  const translate = (key: TranslationKey) => t(key, language)

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t: translate }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
