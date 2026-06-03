import {
  AlertTriangle,
  Brain,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Gauge,
  ShieldAlert,
  Users,
} from 'lucide-react'
import type React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import PublicLanguageSwitcher from '../../components/layout/PublicLanguageSwitcher'
import { Badge, Card } from '../../features/shared/chefUi'

export default function LandingPage() {
  const { t } = useTranslation()
  const problemItems = t('landing.problemItems', { returnObjects: true }) as string[]
  const solutionItems = t('landing.solutionItems', { returnObjects: true }) as string[]
  const features = t('landing.features', { returnObjects: true }) as string[]

  return (
    <div className="min-h-screen bg-cream-50 text-slate-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-3 focus-ring" aria-label={t('brand.name')}>
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-forest-900 to-copper-700 text-white shadow-sm">
            <ChefHat className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-serif text-2xl font-semibold leading-none">{t('brand.name')}</span>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-copper-700">{t('brand.byline')}</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <PublicLanguageSwitcher compact />
          <Link to="/login" className="hidden rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white sm:inline-flex">
            {t('common.signIn')}
          </Link>
          <Link to="/register" className="rounded-md bg-forest-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-forest-700 focus-ring">
            {t('common.createAccount')}
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-10 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div>
            <Badge status="safe">{t('brand.subtitle')}</Badge>
            <h1 className="mt-6 max-w-4xl font-serif text-6xl font-semibold leading-[0.95] text-slate-950 md:text-7xl">
              {t('landing.heroTitle')}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-650">{t('landing.heroSubtitle')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-md bg-forest-900 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-forest-700 focus-ring">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                {t('common.startPlanning')}
              </Link>
              <a href="#how-it-works" className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-stone-50 focus-ring">
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                {t('common.seeHowItWorks')}
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-stone-200/80 bg-white/80 p-4 shadow-soft backdrop-blur">
            <div className="rounded-lg bg-[linear-gradient(135deg,#132419,#182a22_55%,#7d3818)] p-4 text-white shadow-inset">
              <div className="flex items-center justify-between">
                <p className="font-serif text-2xl">{t('landing.mockupTitle')}</p>
                <Badge status="ai">{t('nav.aiChef')}</Badge>
              </div>
              <div className="mt-5 grid gap-3">
                {[
                  [t('landing.mockupToday'), t('landing.mockupRecipe'), 'safe'],
                  [t('landing.mockupSafety'), t('common.safe'), 'safe'],
                  [t('landing.mockupPortions'), '3.4 x', 'ai'],
                  [t('landing.mockupMissing'), '680 g', 'warning'],
                ].map(([label, value, status]) => (
                  <div key={label} className="rounded-md border border-white/10 bg-white/10 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-stone-300">{label}</span>
                      <Badge status={status}>{value}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-stone-200 bg-white/70 backdrop-blur">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-2">
            <Card>
              <h2 className="font-serif text-3xl font-semibold">{t('landing.problemTitle')}</h2>
              <ul className="mt-6 grid gap-3 text-sm text-slate-650">
                {problemItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-saffron-600" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h2 className="font-serif text-3xl font-semibold">{t('landing.solutionTitle')}</h2>
              <ul className="mt-6 grid gap-3 text-sm text-slate-650">
                {solutionItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16">
          <h2 className="font-serif text-4xl font-semibold">{t('landing.featuresTitle')}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card key={feature} className="min-h-36">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-forest-50 text-forest-700">
                  {index % 3 === 0 ? <Users className="h-5 w-5" /> : index % 3 === 1 ? <ShieldAlert className="h-5 w-5" /> : <Gauge className="h-5 w-5" />}
                </div>
                <h3 className="font-semibold text-slate-950">{feature}</h3>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-[linear-gradient(135deg,#0f172a,#17251d_45%,#38190e)] text-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 py-16 lg:grid-cols-4">
            {[
              ['landing.chefsTitle', 'landing.chefsBody', ChefHat],
              ['landing.familiesTitle', 'landing.familiesBody', Users],
              ['landing.aiTitle', 'landing.aiBody', Brain],
              ['landing.trustTitle', 'landing.trustBody', ShieldAlert],
            ].map(([titleKey, bodyKey, Icon]) => {
              const TypedIcon = Icon as React.ComponentType<{ className?: string }>
              return (
                <div key={titleKey as string} className="rounded-lg border border-white/10 bg-white/5 p-5">
                  <TypedIcon className="h-6 w-6 text-forest-100" aria-hidden="true" />
                  <h3 className="mt-5 font-serif text-2xl font-semibold">{t(titleKey as string)}</h3>
                  <p className="mt-3 text-sm leading-6 text-stone-300">{t(bodyKey as string)}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mx-auto flex max-w-7xl flex-col items-start gap-5 px-5 py-16 md:flex-row md:items-center md:justify-between">
          <h2 className="max-w-2xl font-serif text-4xl font-semibold">{t('landing.finalTitle')}</h2>
          <div className="flex gap-3">
            <Link to="/register" className="rounded-md bg-forest-900 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-forest-700 focus-ring">
              {t('common.createAccount')}
            </Link>
            <Link to="/login" className="rounded-md border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-stone-50 focus-ring">
              {t('common.signIn')}
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
