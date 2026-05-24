import { appEnv, isMonitoringConfigured, isProductionApp } from './env'

type MonitoringContext = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    Sentry?: {
      captureException: (error: unknown, context?: { extra?: MonitoringContext }) => void
    }
  }
}

export function initializeMonitoring() {
  if (!isMonitoringConfigured) return
  window.dispatchEvent(new CustomEvent('smart-family-meals:monitoring-ready', { detail: { appEnv } }))
}

export function captureAppError(error: unknown, context: MonitoringContext = {}) {
  window.Sentry?.captureException(error, { extra: { appEnv, ...context } })
  if (!isProductionApp) {
    console.error('Smart Family Meals handled error', error)
  }
}
