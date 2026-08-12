import { useEffect, useRef, useState } from 'react'
import Button from './ui/Button'

// Renders a QR code for `value` entirely client-side (the `qrcode`
// package encodes to a data: URI in-browser, no network call, no backend
// involvement) — opened from a small popover anchored to the button.
export default function QrCodeButton({ value, size = 176 }) {
  const [isOpen, setIsOpen] = useState(false)
  const [dataUrl, setDataUrl] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleToggle = async () => {
    const next = !isOpen
    setIsOpen(next)
    if (next && !dataUrl) {
      setIsGenerating(true)
      setError('')
      try {
        const QRCode = await import('qrcode')
        const url = await QRCode.toDataURL(value, {
          width: size,
          margin: 1,
          color: { dark: '#111827', light: '#00000000' },
        })
        setDataUrl(url)
      } catch {
        setError('Could not generate QR code.')
      } finally {
        setIsGenerating(false)
      }
    }
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-label="Show QR code"
      >
        <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
          <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
          <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
          <path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z" fill="currentColor" />
        </svg>
        QR
      </Button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="QR code"
          className="absolute right-0 z-30 mt-2 w-52 origin-top-right rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-premium-lg motion-safe:animate-scale-in"
        >
          <div className="flex items-center justify-center min-h-[176px]">
            {isGenerating ? (
              <div className="w-44 h-44 skeleton rounded-lg" />
            ) : error ? (
              <p className="text-xs text-red-600 dark:text-red-400 text-center">{error}</p>
            ) : (
              dataUrl && (
                <img
                  src={dataUrl}
                  alt="QR code for the shortened URL"
                  className="w-44 h-44 motion-safe:animate-pop-in"
                />
              )
            )}
          </div>
          <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
            Scan to open the link
          </p>
        </div>
      )}
    </div>
  )
}
