export function visibleModelName(model?: string) {
  return model || 'gemini-2.5-flash'
}

export function securityStatusKey(enabled: boolean) {
  return enabled ? 'common.configured' : 'common.notConfigured'
}
