import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home,
  HelpCircle,
  Moon,
  Baby,
  UtensilsCrossed,
  Clock,
  Ruler,
  Droplets,
  LogIn,
  LogOut,
  User,
  Settings,
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LanguageSelector } from './LanguageSelector'
import { BabySelector } from './BabySelector'
import type { TranslationKey } from '@/translations/en'

interface NavigationProps {
  onOpenAuth: () => void
}

const navLinks: { to: string; labelKey: TranslationKey; icon: typeof Home }[] = [
  { to: '/', labelKey: 'nav.home', icon: Home },
  { to: '/questions', labelKey: 'nav.questions', icon: HelpCircle },
  { to: '/sleep-tracker', labelKey: 'nav.sleep', icon: Moon },
  { to: '/diaper-tracker', labelKey: 'nav.diaper', icon: Baby },
  { to: '/feeding-tracker', labelKey: 'nav.feeding', icon: UtensilsCrossed },
  { to: '/growth', labelKey: 'nav.growth', icon: Ruler },
  { to: '/pumping-tracker', labelKey: 'nav.pumping', icon: Droplets },
  { to: '/time-management', labelKey: 'nav.time', icon: Clock },
]

export function Navigation({ onOpenAuth }: NavigationProps) {
  const { t } = useLanguage()
  const { user, isDemo, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-slate-100 bg-[#fdfcf8]/80 backdrop-blur-md">
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Left: App name */}
        <NavLink to="/" className="text-lg font-bold tracking-tight text-[#a78bfa]">
          BabyOS
        </NavLink>

        {/* Center: Nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-violet-100 text-[#a78bfa]'
                    : 'text-slate-500 hover:text-[#a78bfa] hover:bg-slate-50'
                }`
              }
            >
              <Icon className="size-4" />
              <span className="hidden md:inline">{t(labelKey)}</span>
            </NavLink>
          ))}
        </div>

        {/* Right: BabySelector, LanguageSelector, Auth */}
        <div className="flex items-center gap-2">
          {!isDemo && <BabySelector />}
          <LanguageSelector />

          {isDemo ? (
            <Button size="sm" className="rounded-full bg-[#a78bfa] text-white shadow-md shadow-[#a78bfa]/20 hover:opacity-90" onClick={onOpenAuth}>
              <LogIn className="size-4" />
              <span className="hidden sm:inline">{t('auth.signIn')}</span>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="size-4" />
                  {t('nav.settings')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="size-4" />
                  {t('auth.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  )
}
