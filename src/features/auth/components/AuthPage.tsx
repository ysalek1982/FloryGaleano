import { zodResolver } from '@hookform/resolvers/zod'
import { ChefHat, KeyRound, Lock, Mail, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import PublicLanguageSwitcher from '../../../components/layout/PublicLanguageSwitcher'
import { useAuth } from '../../../lib/AppState'
import { isProductionApp } from '../../../lib/env'
import { isSupabaseConfigured } from '../../../lib/supabase'
import { Button, Card } from '../../shared/chefUi'

const authSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(6).optional(),
})

export function AuthPage({ mode }: { mode: 'login' | 'register' | 'forgot' }) {
  const { t } = useTranslation()
  const auth = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState } = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: '', password: '', fullName: '' },
  })

  const onSubmit = async (values: z.infer<typeof authSchema>) => {
    try {
      if (mode === 'login') await auth.login(values.email, values.password || '')
      if (mode === 'register') await auth.register(values.fullName || values.email, values.email, values.password || '')
      if (mode === 'forgot') await auth.forgotPassword(values.email)
      if (mode !== 'forgot') navigate('/app/dashboard')
      setError('')
    } catch {
      setError(t('auth.authError'))
    }
  }

  const titleKey = mode === 'login' ? 'auth.loginTitle' : mode === 'register' ? 'auth.registerTitle' : 'auth.forgotTitle'
  const subtitleKey = mode === 'login' ? 'auth.loginSubtitle' : mode === 'register' ? 'auth.registerSubtitle' : 'auth.forgotSubtitle'

  if (auth.isAuthenticated) return <Navigate to="/app/dashboard" replace />

  return (
    <div className="grid min-h-screen bg-cream-50 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden bg-[linear-gradient(145deg,#0f172a,#182a22_52%,#7d3818)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-3 focus-ring" aria-label={t('brand.name')}>
          <span className="rounded-lg bg-white/10 p-3 shadow-sm ring-1 ring-white/15"><ChefHat className="h-6 w-6" /></span>
          <span>
            <span className="block font-serif text-3xl font-semibold leading-none">{t('brand.name')}</span>
            <span className="mt-1 block text-xs font-bold uppercase tracking-[0.18em] text-cream-200">{t('brand.subtitle')}</span>
          </span>
        </Link>
        <div className="max-w-md">
          <p className="font-serif text-5xl font-semibold leading-tight">{t('landing.trustTitle')}</p>
          <p className="mt-4 leading-7 text-stone-300">{t('landing.trustBody')}</p>
        </div>
      </section>
      <section className="flex items-center justify-center p-5">
        <Card className="w-full max-w-md border-stone-200/90 bg-white/90 p-6 backdrop-blur">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 h-1 w-14 rounded-full bg-gradient-to-r from-copper-500 to-forest-600" aria-hidden="true" />
              <h1 className="font-serif text-4xl font-semibold leading-none">{t(titleKey)}</h1>
              <p className="mt-2 text-sm text-slate-600">{t(subtitleKey)}</p>
            </div>
            <PublicLanguageSwitcher compact />
          </div>
          <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)} data-testid="auth-form">
            {mode === 'register' && (
              <label className="grid gap-1.5">
                <span className="label">{t('auth.fullName')}</span>
                <div className="relative">
                  <UserPlus className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input className="input pl-9" {...register('fullName')} data-testid="auth-full-name" />
                </div>
              </label>
            )}
            <label className="grid gap-1.5">
              <span className="label">{t('auth.email')}</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input className="input pl-9" type="email" {...register('email')} data-testid="auth-email" />
              </div>
              {formState.errors.email && <span className="text-xs text-danger-700">{t('validation.required')}</span>}
            </label>
            {mode !== 'forgot' && (
              <label className="grid gap-1.5">
                <span className="label">{t('auth.password')}</span>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input className="input pl-9" type="password" {...register('password')} data-testid="auth-password" />
                </div>
              </label>
            )}
            {error && <p className="rounded-md bg-danger-50 p-3 text-sm text-danger-700">{error}</p>}
            <Button type="submit" className="w-full" data-testid="auth-submit">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              {mode === 'forgot' ? t('auth.sendReset') : mode === 'register' ? t('common.createAccount') : t('common.signIn')}
            </Button>
            {mode !== 'forgot' && !isSupabaseConfigured && !isProductionApp && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => {
                  auth.demoLogin()
                  navigate('/app/dashboard')
                }}
              >
                {t('auth.useDemo')}
              </Button>
            )}
          </form>
          <div className="mt-5 flex items-center justify-between text-sm">
            {mode === 'login' ? (
              <>
                <Link className="text-forest-700 hover:underline" to="/forgot-password">{t('auth.forgotPassword')}</Link>
                <Link className="text-forest-700 hover:underline" to="/register">{t('auth.needAccount')}</Link>
              </>
            ) : (
              <Link className="text-forest-700 hover:underline" to="/login">{t('auth.alreadyAccount')}</Link>
            )}
          </div>
        </Card>
      </section>
    </div>
  )
}
