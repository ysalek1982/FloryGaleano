import { X } from 'lucide-react'

import { Button } from '../../shared/chefUi'
import { useAiCopilot } from '../hooks/useAiCopilot'
import AiCopilotPanel from './AiCopilotPanel'

export default function AiCopilotDrawer() {
  const copilot = useAiCopilot()
  if (!copilot.open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" data-testid="ai-copilot-drawer">
      <aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-stone-200 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-end">
          <Button type="button" variant="ghost" onClick={copilot.closeCopilot} data-testid="ai-copilot-close">
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <AiCopilotPanel />
      </aside>
    </div>
  )
}
