import { Download } from 'lucide-react'

import { Button } from '../../shared/chefUi'

export function ExportButton({
  label,
  onClick,
  testId,
  disabled,
}: {
  label: string
  onClick: () => void
  testId?: string
  disabled?: boolean
}) {
  return (
    <Button variant="secondary" onClick={onClick} data-testid={testId} disabled={disabled}>
      <Download className="h-4 w-4" />
      {label}
    </Button>
  )
}
