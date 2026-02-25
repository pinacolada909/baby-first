import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useBaby } from '@/contexts/BabyContext'
import { useLayoutContext } from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BabyStatusCard } from '@/components/home/BabyStatusCard'
import { CurrentShiftCard } from '@/components/home/CurrentShiftCard'
import { TrackerSummaryCards } from '@/components/home/TrackerSummaryCards'
import { RecentTimeline } from '@/components/home/RecentTimeline'
import {
  HelpCircle,
  Moon,
  Baby,
  Utensils,
  Clock,
  Ruler,
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
    borderColor: 'border-[#fbcfe8]',
    hoverBg: 'hover:bg-[#fce7f3]/30',
  },
  {
    titleKey: 'feature.sleep.title' as const,
    descKey: 'feature.sleep.desc' as const,
    icon: Moon,
    route: '/sleep-tracker',
    iconColor: 'text-blue-500',
    iconBg: 'bg-blue-100',
    borderColor: 'border-[#bfdbfe]',
    hoverBg: 'hover:bg-[#e0f2fe]/30',
  },
  {
    titleKey: 'feature.diaper.title' as const,
    descKey: 'feature.diaper.desc' as const,
    icon: Baby,
    route: '/diaper-tracker',
    iconColor: 'text-green-500',
    iconBg: 'bg-green-100',
    borderColor: 'border-[#bbf7d0]',
    hoverBg: 'hover:bg-[#dcfce7]/30',
  },
  {
    titleKey: 'feature.feeding.title' as const,
    descKey: 'feature.feeding.desc' as const,
    icon: Utensils,
    route: '/feeding-tracker',
    iconColor: 'text-rose-500',
    iconBg: 'bg-rose-100',
    borderColor: 'border-[#fbcfe8]',
    hoverBg: 'hover:bg-[#fce7f3]/30',
  },
  {
    titleKey: 'feature.time.title' as const,
    descKey: 'feature.time.desc' as const,
    icon: Clock,
    route: '/time-management',
    iconColor: 'text-amber-500',
    iconBg: 'bg-amber-100',
    borderColor: 'border-[#fde68a]',
    hoverBg: 'hover:bg-[#fef9c3]/30',
  },
  {
    titleKey: 'feature.growth.title' as const,
    descKey: 'feature.growth.desc' as const,
    icon: Ruler,
    route: '/growth',
    iconColor: 'text-teal-500',
    iconBg: 'bg-teal-100',
    borderColor: 'border-[#99f6e4]',
    hoverBg: 'hover:bg-[#ccfbf1]/30',
  },
]

export function HomePage() {
  const { t } = useLanguage()
  const { isDemo } = useAuth()
  const { selectedBaby } = useBaby()
  const { onOpenAuth } = useLayoutContext()
  const navigate = useNavigate()
  const showDashboardCards = !isDemo && !!selectedBaby

  // Logged-in users with a baby selected see the dashboard view
  if (showDashboardCards) {
    return (
      <div className="space-y-6">
        <BabyStatusCard />
        <CurrentShiftCard />
        <TrackerSummaryCards babyId={selectedBaby!.id} />
        <RecentTimeline babyId={selectedBaby!.id} />
      </div>
    )
  }

  // Demo / unauthenticated users see the marketing layout
  return (
    <div className="space-y-14">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#a78bfa] via-indigo-400 to-[#a78bfa] px-6 py-16 text-center text-white shadow-lg">
        <div className="absolute top-0 left-0 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-0 bottom-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t('home.hero.title')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            {t('home.hero.subtitle')}
          </p>
          <Button
            size="lg"
            className="mt-8 rounded-full bg-white px-8 font-semibold text-[#a78bfa] shadow-lg hover:bg-white/90"
            onClick={onOpenAuth}
          >
            {t('home.hero.cta')}
          </Button>
        </div>
      </section>

      {/* Stats Row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border border-[#e9e5f5]">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-[#b4a0d6]">
              {t('home.stats.questions')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('home.stats.questions.desc')}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-[#d4edda]">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-[#6dbc86]">
              {t('home.stats.tracking')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('home.stats.tracking.desc')}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-[#f5dce8]">
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold text-[#d4859a]">
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
                className={`cursor-pointer border-2 ${feature.borderColor} bg-white transition-all ${feature.hoverBg} hover:shadow-md`}
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
        <div className="rounded-2xl bg-[#e0f2fe]/20 py-10">
          <div className="mx-auto max-w-sm -rotate-1">
            <div className="mx-auto w-fit rounded-t-lg bg-amber-200 px-4 py-1 text-xs font-medium text-amber-800">
              {t('home.email.diary.tab')}
            </div>
            <Card className="overflow-hidden rounded-t-none border-t-8 border-t-[#a78bfa] shadow-lg">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">{t('home.email.sample.subject')}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t('home.email.sample.date')}</p>
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
                <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    <span>{t('home.email.sample.attachment')}</span>
                  </div>
                  <span className="font-medium italic text-[#a78bfa]">{t('home.email.handled')}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="rounded-3xl bg-[#f3e8ff] p-8 text-center">
        <h2 className="text-2xl font-bold">{t('home.cta.title')}</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          {t('home.cta.subtitle')}
        </p>
        <Button
          className="mt-6 rounded-full bg-[#a78bfa] px-8 text-white shadow-lg shadow-[#a78bfa]/20 hover:opacity-90"
          size="lg"
          onClick={onOpenAuth}
        >
          {t('home.cta.button')}
        </Button>
      </section>
    </div>
  )
}
