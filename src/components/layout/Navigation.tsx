import { NavLink } from 'react-router-dom'
import {
  Home,
  HelpCircle,
  Moon,
  Baby,
  UtensilsCrossed,
  Clock,
  LogIn,
  LogOut,
  User,
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
  { to: '/time-management', labelKey: 'nav.time', icon: Clock },
]

export function Navigation({ onOpenAuth }: NavigationProps) {
  const { t } = useLanguage()
  const { user, isDemo, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-white/20 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Left: App name */}
        <NavLink to="/" className="text-lg font-bold text-purple-700">
          BabyFirst
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
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
            <Button variant="outline" size="sm" onClick={onOpenAuth}>
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
