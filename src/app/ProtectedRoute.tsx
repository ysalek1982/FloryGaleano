import { Navigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/AppState'

export default function ProtectedRoute() {
  const { isAuthenticated, isAuthLoading } = useAuth()
  const { t } = useTranslation()

  if (isAuthLoading) {
    return <div className="min-h-screen bg-cream-50 p-8 text-slate-700">{t('common.loading')}</div>
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
