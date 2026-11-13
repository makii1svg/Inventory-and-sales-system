import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((toast) => {
    const id = Date.now() + Math.random()
    const item = { id, ...toast }

    setToasts((current) => [...current, item])

    window.setTimeout(() => {
      setToasts((current) => current.filter((entry) => entry.id !== id))
    }, 3500)
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(360px,calc(100vw-32px))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              'pointer-events-auto rounded-lg border border-slate-200 bg-white p-3 shadow-lg',
              toast.type === 'success' && 'border-emerald-200 bg-emerald-50',
              toast.type === 'error' && 'border-red-200 bg-red-50',
              toast.type === 'warning' && 'border-amber-200 bg-amber-50',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="flex items-start justify-between gap-3">
              {toast.title ? (
                <div>
                  <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
                  {toast.message ? <p className="mt-1 text-xs text-slate-600">{toast.message}</p> : null}
                </div>
              ) : (
                <p className="text-sm text-slate-700">{toast.message}</p>
              )}
              <button type="button" className="text-xs text-slate-500">Close</button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }

  return context
}
