import Modal from './Modal'
import Button from './ui/Button'

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  isLoading,
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{message}</p>
      <div className="flex gap-3">
        <Button variant="danger" onClick={onConfirm} disabled={isLoading} className="flex-1">
          {isLoading ? 'Please wait...' : confirmLabel}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </Modal>
  )
}
