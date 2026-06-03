import {
  Apple,
  Archive,
  BarChart3,
  Bell,
  Brain,
  Calculator,
  CalendarDays,
  ChefHat,
  ClipboardList,
  Gauge,
  Home,
  Languages,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Snowflake,
  UserPlus,
  Users,
  Utensils,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import LoadingSkeleton from '../components/feedback/LoadingSkeleton'
import AiCopilotButton from '../features/ai-copilot/components/AiCopilotButton'
import AiCopilotProvider from '../features/ai-copilot/components/AiCopilotProvider'
import { AiConnectionProvider } from '../features/settings/hooks/useAiConnectionTest'
import { useAppData, useAuth } from '../lib/AppState'
import { cn } from '../lib/utils'

const navItems = [
  { to: '/app/dashboard', key: 'dashboard', icon: Home },
  { to: '/app/families', key: 'families', icon: Users },
  { to: '/app/diners', key: 'diners', icon: UserPlus },
  { to: '/app/ingredients', key: 'ingredients', icon: Apple },
  { to: '/app/recipes', key: 'recipes', icon: Utensils },
  { to: '/app/menu-planner', key: 'menuPlanner', icon: CalendarDays },
  { to: '/app/day-planner', key: 'dayPlanner', icon: ClipboardList },
  { to: '/app/portion-calculator', key: 'portionCalculator', icon: Calculator },
  { to: '/app/shopping-list', key: 'shoppingList', icon: ShoppingCart },
  { to: '/app/pantry', key: 'pantry', icon: Archive },
  { to: '/app/freezer', key: 'freezer', icon: Snowflake },
  { to: '/app/allergies', key: 'allergies', icon: ShieldAlert },
  { to: '/app/nutrition', key: 'nutrition', icon: Gauge },
  { to: '/app/alerts', key: 'alerts', icon: Bell },
  { to: '/app/ai-chef', key: 'aiChef', icon: Brain },
  { to: '/app/reports', key: 'reports', icon: BarChart3 },
  { to: '/app/settings', key: 'settings', icon: Settings },
]

export default function AppShell() {
  return (
    <AiConnectionProvider>
      <AiCopilotProvider>
        <AppShellFrame />
      </AiCopilotProvider>
    </AiConnectionProvider>
  )
}

function AppShellFrame() {
  const { t, i18n } = useTranslation()
  const { profile, logout, updateProfile } = useAuth()
  const { data, isDataLoading } = useAppData()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const unreadAlerts = data.alerts.filter((alert) => !alert.is_read).length
  const isAiChefRoute = location.pathname.includes('/app/ai-chef')

  const changeLanguage = (language: 'en' | 'es') => {
    i18n.changeLanguage(language)
    localStorage.setItem('smart-family-meals:language', language)
    if (profile) updateProfile({ ...profile, preferred_language: language })
  }

  return (
    <div className="min-h-screen bg-cream-50 text-slate-950 lg:grid lg:grid-cols-[292px_1fr]">
      {open && <button type="button" className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" aria-label={t('common.close')} onClick={() => setOpen(false)} />}
      <aside id="app-sidebar" className={cn('fixed inset-y-0 left-0 z-40 w-72 border-r border-stone-300/70 bg-[linear-gradient(180deg,#fffaf0,#f4ead8)] p-4 shadow-panel transition lg:static lg:block lg:w-full lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')} data-testid="app-sidebar">
        <div className="flex items-center gap-3 rounded-xl border border-stone-200/80 bg-white/70 px-3 py-3 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-forest-900 to-copper-700 text-white shadow-sm">
            <ChefHat className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-serif text-xl font-semibold leading-none">{t('brand.name')}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-copper-700">{t('brand.byline')}</p>
          </div>
        </div>
        <Link
          to="/app/ai-chef"
          className="mt-5 flex items-center justify-between rounded-lg border border-ai-100 bg-white/80 px-3 py-3 text-sm font-bold text-ai-800 shadow-sm focus-ring hover:border-ai-200 hover:bg-ai-50"
          onClick={() => setOpen(false)}
          data-testid="ai-quick-action"
        >
          <span className="inline-flex items-center gap-2"><Brain className="h-4 w-4" />{t('nav.aiChef')}</span>
          <span className="rounded-full border border-ai-100 bg-white px-2 py-0.5 text-xs">{t('common.enabled')}</span>
        </Link>
        <nav className="mt-5 grid gap-1.5" aria-label={t('nav.dashboard')}>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-bold transition focus-ring',
                    isActive ? 'border border-forest-100 bg-white text-forest-900 shadow-sm' : 'text-slate-650 hover:bg-white/70 hover:text-slate-950',
                  )
                }
                onClick={() => setOpen(false)}
              >
                <span className="inline-flex items-center gap-3">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {t(`nav.${item.key}`)}
                </span>
                {item.key === 'alerts' && unreadAlerts > 0 && (
                  <span className="rounded-full bg-danger-100 px-2 py-0.5 text-xs font-semibold text-danger-700" data-testid="alerts-indicator">{unreadAlerts}</span>
                )}
              </NavLink>
            )
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-cream-50/82 px-4 py-3 backdrop-blur-xl lg:px-8">
          <div className="mx-auto flex max-w-[1600px] items-center gap-3">
            <button type="button" className="rounded-md p-2 text-slate-700 hover:bg-stone-100 focus-ring lg:hidden" onClick={() => setOpen((value) => !value)} aria-label={t('nav.openMenu')} aria-controls="app-sidebar" aria-expanded={open} data-testid="mobile-nav-toggle">
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden="true" />
              <input className="input pl-9" aria-label={t('common.search')} placeholder={t('common.search')} data-testid="command-search" />
            </div>
            <select
              className="input hidden max-w-56 md:block"
              aria-label={t('common.family')}
              data-testid="family-selector"
              value={data.families[0]?.id || ''}
              onChange={(event) => event.target.value && navigate(`/app/families/${event.target.value}`)}
            >
              {data.families.length === 0 ? <option value="">{t('empty.families')}</option> : data.families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
            </select>
            {!isAiChefRoute && <AiCopilotButton compact testId="app-shell-ai-copilot" />}
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <Languages className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">{t('common.language')}</span>
              <select
                value={i18n.language.startsWith('es') ? 'es' : 'en'}
                onChange={(event) => changeLanguage(event.target.value as 'en' | 'es')}
                className="rounded-md border border-stone-300 bg-white px-2 py-1 focus-ring"
                aria-label={t('common.language')}
              >
                <option value="en">{t('common.english')}</option>
                <option value="es">{t('common.spanish')}</option>
              </select>
            </label>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">{profile?.full_name}</p>
              <p className="text-xs text-slate-500" data-testid="role-indicator">{profile ? t(`roles.${profile.role}`) : t('common.demoMode')}</p>
            </div>
            <button type="button" className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-stone-100 focus-ring" onClick={logout} aria-label={t('common.signOut')}>
              <span className="hidden sm:inline">{t('common.signOut')}</span>
              <span className="sm:hidden">{t('common.signOutShort')}</span>
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] px-4 py-7 lg:px-8">
          {isDataLoading ? (
            <div data-testid="app-data-loading">
              <LoadingSkeleton />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  )
}
