import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { captureAppError } from '../../lib/monitoring'
import { Button, Card } from '../../features/shared/chefUi'

class ErrorBoundaryCore extends Component<{
  children: ReactNode
  title: string
  body: string
  action: string
}, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    captureAppError(error, { componentStack: info.componentStack ? 'captured' : 'missing' })
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="min-h-screen bg-cream-50 p-6">
        <Card className="mx-auto mt-16 max-w-xl">
          <h1 className="font-serif text-3xl font-semibold text-slate-950">{this.props.title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{this.props.body}</p>
          <Button className="mt-5" onClick={() => window.location.assign('/')}>{this.props.action}</Button>
        </Card>
      </div>
    )
  }
}

export default function ErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <ErrorBoundaryCore
      title={t('errorBoundary.title')}
      body={t('errorBoundary.body')}
      action={t('errorBoundary.action')}
    >
      {children}
    </ErrorBoundaryCore>
  )
}
