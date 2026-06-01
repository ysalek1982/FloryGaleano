import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { useAiCopilot } from '../hooks/useAiCopilot'
import AiCopilotPanel from './AiCopilotPanel'

export default function AiCopilotDrawer() {
  const { t } = useTranslation()
  const copilot = useAiCopilot()
  const { closeCopilot, open } = copilot
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const drawerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return undefined
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCopilot()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), details summary, [tabindex]:not([tabindex="-1"])',
      ) || []).filter((element) => element.offsetParent !== null)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [closeCopilot, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-stretch sm:justify-end" data-testid="ai-copilot-drawer">
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-copilot-title"
        className="flex h-full max-h-full w-full flex-col overflow-hidden bg-white shadow-soft sm:max-w-2xl sm:border-l sm:border-stone-200"
      >
        <div className="sticky top-0 z-10 flex items-center justify-end border-b border-stone-200 bg-white/95 p-3 backdrop-blur sm:p-4">
          <button
            ref={closeButtonRef}
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-stone-100 focus-ring"
            onClick={copilot.closeCopilot}
            data-testid="ai-copilot-close"
            aria-label={t('aiCopilot.close')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <AiCopilotPanel />
        </div>
      </aside>
    </div>
  )
}
