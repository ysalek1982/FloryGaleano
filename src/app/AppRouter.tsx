import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import LoadingSkeleton from '../components/feedback/LoadingSkeleton'
import ProtectedRoute from './ProtectedRoute'
import AppShell from './AppShell'

const LandingPage = lazy(() => import('../pages/public/LandingPage'))
const LoginPage = lazy(() => import('../pages/public/LoginPage'))
const RegisterPage = lazy(() => import('../pages/public/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('../pages/public/ForgotPasswordPage'))

const DashboardPage = lazy(() => import('../pages/app/DashboardPage'))
const FamiliesPage = lazy(() => import('../pages/app/FamiliesPage'))
const FamilyDetailPage = lazy(() => import('../pages/app/FamilyDetailPage'))
const DinersPage = lazy(() => import('../pages/app/DinersPage'))
const IngredientsPage = lazy(() => import('../pages/app/IngredientsPage'))
const RecipesPage = lazy(() => import('../pages/app/RecipesPage'))
const MenuPlannerPage = lazy(() => import('../pages/app/MenuPlannerPage'))
const DayPlannerPage = lazy(() => import('../pages/app/DayPlannerPage'))
const PortionCalculatorPage = lazy(() => import('../pages/app/PortionCalculatorPage'))
const ShoppingListPage = lazy(() => import('../pages/app/ShoppingListPage'))
const PantryPage = lazy(() => import('../pages/app/PantryPage'))
const FreezerPage = lazy(() => import('../pages/app/FreezerPage'))
const AllergiesPage = lazy(() => import('../pages/app/AllergiesPage'))
const NutritionPage = lazy(() => import('../pages/app/NutritionPage'))
const AlertsPage = lazy(() => import('../pages/app/AlertsPage'))
const AiChefPage = lazy(() => import('../pages/app/AiChefPage'))
const ReportsPage = lazy(() => import('../pages/app/ReportsPage'))
const SettingsPage = lazy(() => import('../pages/app/SettingsPage'))

export default function AppRouter() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="families" element={<FamiliesPage />} />
            <Route path="families/:familyId" element={<FamilyDetailPage />} />
            <Route path="diners" element={<DinersPage />} />
            <Route path="ingredients" element={<IngredientsPage />} />
            <Route path="recipes" element={<RecipesPage />} />
            <Route path="menu-planner" element={<MenuPlannerPage />} />
            <Route path="day-planner" element={<DayPlannerPage />} />
            <Route path="portion-calculator" element={<PortionCalculatorPage />} />
            <Route path="shopping-list" element={<ShoppingListPage />} />
            <Route path="pantry" element={<PantryPage />} />
            <Route path="freezer" element={<FreezerPage />} />
            <Route path="allergies" element={<AllergiesPage />} />
            <Route path="nutrition" element={<NutritionPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="ai-chef" element={<AiChefPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
