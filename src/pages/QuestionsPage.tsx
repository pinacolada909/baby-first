import { useState, useMemo } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { faqData } from '@/data/faq'
import type { FaqItem } from '@/data/faq'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'

const CATEGORIES = [
  'all', 'feeding', 'sleep', 'health', 'development', 'safety', 'emotional',
] as const

export function QuestionsPage() {
  const { language, t } = useLanguage()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return faqData.filter((item: FaqItem) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
      const question = language === 'en' ? item.question_en : item.question_zh
      const answer = language === 'en' ? item.answer_en : item.answer_zh
      const matchesSearch = !search ||
        question.toLowerCase().includes(search.toLowerCase()) ||
        answer.toLowerCase().includes(search.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [search, selectedCategory, language])

  const categoryKey = (cat: string) => {
    if (cat === 'all') return 'questions.category.all' as const
    return `questions.category.${cat}` as `questions.category.${'feeding' | 'sleep' | 'health' | 'development' | 'safety' | 'emotional'}`
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{t('questions.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('questions.subtitle')}</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder={t('questions.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Badge
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(cat)}
          >
            {t(categoryKey(cat))}
          </Badge>
        ))}
      </div>

      {/* FAQ List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">{t('questions.empty')}</p>
        ) : (
          filtered.map((item: FaqItem) => {
            const question = language === 'en' ? item.question_en : item.question_zh
            const answer = language === 'en' ? item.answer_en : item.answer_zh
            const isExpanded = expandedId === item.id

            return (
              <Card
                key={item.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-0.5 shrink-0 text-xs">
                        {t(categoryKey(item.category))}
                      </Badge>
                      <h3 className="font-medium">{question}</h3>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                  {isExpanded && (
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {answer}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
