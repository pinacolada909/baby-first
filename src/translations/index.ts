import { en, type TranslationKey } from './en'
import { zh } from './zh'
import type { Language } from '@/types'

const translations: Record<Language, Record<TranslationKey, string>> = { en, zh }

export function t(key: TranslationKey, language: Language): string {
  return translations[language][key] || key
}

export type { TranslationKey }
