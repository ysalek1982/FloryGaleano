export const appEnv = (import.meta.env.VITE_APP_ENV as string | undefined) || import.meta.env.MODE || 'development'
export const appVersion = (import.meta.env.VITE_APP_VERSION as string | undefined) || '0.0.0'
export const sentryDsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined) || ''

export const isProductionApp = appEnv === 'production'
export const isStagingApp = appEnv === 'staging'
export const isMonitoringConfigured = Boolean(sentryDsn)

export function visibleRuntimeEnv() {
  return {
    appEnv,
    appVersion,
    monitoringConfigured: isMonitoringConfigured,
  }
}
