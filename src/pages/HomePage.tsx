import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  HelpCircle,
  Moon,
  Baby,
  Utensils,
  Clock,
  Mail,
  Paperclip,
} from 'lucide-react'

const FEATURES = [
  {
    titleKey: 'feature.questions.title' as const,
    descKey: 'feature.questions.desc' as const,
    icon: HelpCircle,
    route: '/questions',
    color: 'text-blue-500',
  },
  {
    titleKey: 'feature.sleep.title' as const,
    descKey: 'feature.sleep.desc' as const,
    icon: Moon,
    route: '/sleep-tracker',
    color: 'text-indigo-500',
  },
  {
    titleKey: 'feature.diaper.title' as const,
    descKey: 'feature.diaper.desc' as const,
    icon: Baby,
    route: '/diaper-tracker',
    color: 'text-green-500',
  },
  {
    titleKey: 'feature.feeding.title' as const,
    descKey: 'feature.feeding.desc' as const,
    icon: Utensils,
    route: '/feeding-tracker',
    color: 'text-orange-500',
  },
  {
    titleKey: 'feature.time.title' as const,
    descKey: 'feature.time.desc' as const,
    icon: Clock,
    route: '/time-management',
    color: 'text-purple-500',
  },
]

export function HomePage() {
  const { t } = useLanguage()
  const { isDemo } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 px-6 py-16 text-center text-white shadow-lg">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t('home.hero.title')}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-purple-100">
          {t('home.hero.subtitle')}
        </p>
        <Button
          size="lg"
          variant="secondary"
          className="mt-8"
          onClick={() => navigate(isDemo ? '/questions' : '/sleep-tracker')}
        >
          {t('home.hero.cta')}
        </Button>
      </section>

      {/* Stats Row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-purple-600">
              {t('home.stats.questions')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('home.stats.questions.desc')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-purple-600">
              {t('home.stats.tracking')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('home.stats.tracking.desc')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-purple-600">
              {t('home.stats.saved')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('home.stats.saved.desc')}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Feature Cards */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold">{t('home.features.title')}</h2>
          <p className="mt-2 text-muted-foreground">
            {t('home.features.subtitle')}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <Card
                key={idx}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => navigate(feature.route)}
              >
                <CardContent className="flex items-start gap-4 p-6">
                  <div
                    className={`rounded-lg bg-muted p-3 ${feature.color}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t(feature.titleKey)}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(feature.descKey)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Daily Summary Email Preview */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold">{t('home.email.title')}</h2>
          <p className="mt-2 text-muted-foreground">
            {t('home.email.subtitle')}
          </p>
        </div>
        <Card className="mx-auto max-w-lg overflow-hidden">
          <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t('home.email.sample.subject')}</span>
          </div>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-2 dark:bg-indigo-950/30">
              <Moon className="h-4 w-4 text-indigo-500" />
              <span className="text-sm">{t('home.email.sample.sleep')}</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-orange-50 px-3 py-2 dark:bg-orange-950/30">
              <Utensils className="h-4 w-4 text-orange-500" />
              <span className="text-sm">{t('home.email.sample.feeding')}</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 dark:bg-green-950/30">
              <Baby className="h-4 w-4 text-green-500" />
              <span className="text-sm">{t('home.email.sample.diaper')}</span>
            </div>
            <div className="flex items-center gap-1 pt-1 text-xs text-muted-foreground">
              <Paperclip className="h-3 w-3" />
              <span>{t('home.email.sample.attachment')}</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA Section */}
      {isDemo && (
        <section className="rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 p-8 text-center dark:from-purple-950/30 dark:to-indigo-950/30">
          <h2 className="text-2xl font-bold">{t('home.cta.title')}</h2>
          <p className="mt-2 text-muted-foreground">
            {t('home.cta.subtitle')}
          </p>
          <Button
            className="mt-6"
            size="lg"
            onClick={() => navigate('/questions')}
          >
            {t('home.cta.button')}
          </Button>
        </section>
      )}
    </div>
  )
}
