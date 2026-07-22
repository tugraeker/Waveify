import { useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

let toastId = 0

const listeners: Set<(toast: Toast) => void> = new Set()

export function emitToast(message: string, type: ToastType = 'info') {
  const toast: Toast = { id: ++toastId, message, type }
  listeners.forEach((fn) => fn(toast))
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useState(() => {
    const listener = (toast: Toast) => {
      setToasts((prev) => [...prev, toast])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, 3500)
    }
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  })

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, removeToast }
}
