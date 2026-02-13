import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useLayoutContext } from '@/components/layout/Layout'
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
  TrendingUp,
} from 'lucide-react'

const FEATURES = [
  {
    titleKey: 'feature.questions.title' as const,
    descKey: 'feature.questions.desc' as const,
    icon: HelpCircle,
    route: '/questions',
    iconColor: 'text-pink-500',
    iconBg: 'bg-pink-100',
    cardBg: 'bg-pink-50',
  },
  {
    titleKey: 'feature.sleep.title' as const,
    descKey: 'feature.sleep.desc' as const,
    icon: Moon,
    route: '/sleep-tracker',
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-100',
    cardBg: 'bg-blue-50',
  },
  {
    titleKey: 'feature.diaper.title' as const,
    descKey: 'feature.diaper.desc' as const,
    icon: Baby,
    route: '/diaper-tracker',
    iconColor: 'text-green-500',
    iconBg: 'bg-green-100',
    cardBg: 'bg-green-50',
  },
  {
    titleKey: 'feature.feeding.title' as const,
    descKey: 'feature.feeding.desc' as const,
    icon: Utensils,
    route: '/feeding-tracker',
    iconColor: 'text-rose-500',
    iconBg: 'bg-rose-100',
    cardBg: 'bg-rose-50',
  },
  {
    titleKey: 'feature.time.title' as const,
    descKey: 'feature.time.desc' as const,
    icon: Clock,
    route: '/time-management',
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-100',
    cardBg: 'bg-yellow-50',
  },
]

export function HomePage() {
  const { t } = useLanguage()
  const { isDemo } = useAuth()
  const { onOpenAuth } = useLayoutContext()
  const navigate = useNavigate()

  return (
    <div className="space-y-14">
      {/* Hero Section */}
      <section className="rounded-3xl bg-gradient-to-br from-violet-400 via-purple-400 to-teal-300 px-6 py-16 text-center text-white shadow-lg">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t('home.hero.title')}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
          {t('home.hero.subtitle')}
        </p>
        <Button
          size="lg"
          className="mt-8 rounded-full bg-emerald-500 px-8 text-white hover:bg-emerald-600"
          onClick={() => isDemo ? onOpenAuth() : navigate('/sleep-tracker')}
        >
          {t('home.hero.cta')}
        </Button>
      </section>

      {/* Stats Row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-pink-200">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-pink-500">
              {t('home.stats.questions')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('home.stats.questions.desc')}
            </p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-green-500">
              {t('home.stats.tracking')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('home.stats.tracking.desc')}
            </p>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-orange-500">
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
                className={`cursor-pointer border-0 ${feature.cardBg} transition-shadow hover:shadow-md`}
                onClick={() => navigate(feature.route)}
              >
                <CardContent className="p-6">
                  <div
                    className={`mb-3 inline-flex rounded-xl p-3 ${feature.iconBg}`}
                  >
                    <Icon className={`h-6 w-6 ${feature.iconColor}`} />
                  </div>
                  <h3 className="font-semibold">{t(feature.titleKey)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(feature.descKey)}
                  </p>
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
          <p className="mx-auto mt-2 max-w-lg text-muted-foreground">
            {t('home.email.subtitle')}
          </p>
        </div>
        <div className="mx-auto max-w-sm">
          {/* Diary tab */}
          <div className="mx-auto w-fit rounded-t-lg bg-amber-200 px-4 py-1 text-xs font-medium text-amber-800">
            {t('home.email.diary.tab')}
          </div>
          <Card className="overflow-hidden rounded-t-none border-amber-200 shadow-lg">
            <CardContent className="space-y-3 p-5">
              {/* Subject */}
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{t('home.email.sample.subject')}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t('home.email.sample.date')}</p>

              {/* Stats */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-3 rounded-lg bg-amber-50 px-3 py-2">
                  <Moon className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-xs font-semibold">{t('home.email.sample.sleep.title')}</p>
                    <p className="text-xs text-muted-foreground">{t('home.email.sample.sleep')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-pink-50 px-3 py-2">
                  <Utensils className="h-4 w-4 text-pink-500" />
                  <div>
                    <p className="text-xs font-semibold">{t('home.email.sample.feeding.title')}</p>
                    <p className="text-xs text-muted-foreground">{t('home.email.sample.feeding')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-xs font-semibold">{t('home.email.sample.diaper.title')}</p>
                    <p className="text-xs text-muted-foreground">{t('home.email.sample.diaper')}</p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  <span>{t('home.email.sample.attachment')}</span>
                </div>
                <span className="font-medium italic text-purple-400">{t('home.email.handled')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      {isDemo && (
        <section className="rounded-3xl bg-purple-100 p-8 text-center">
          <h2 className="text-2xl font-bold">{t('home.cta.title')}</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            {t('home.cta.subtitle')}
          </p>
          <Button
            className="mt-6 rounded-full bg-rose-500 px-8 text-white hover:bg-rose-600"
            size="lg"
            onClick={onOpenAuth}
          >
            {t('home.cta.button')}
          </Button>
        </section>
      )}
    </div>
  )
}
