import { AppDataProvider, AuthProvider } from './lib/AppState'
import AppRouter from './app/AppRouter'
import ErrorBoundary from './components/feedback/ErrorBoundary'

export default function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <ErrorBoundary>
          <AppRouter />
        </ErrorBoundary>
      </AppDataProvider>
    </AuthProvider>
  )
}
