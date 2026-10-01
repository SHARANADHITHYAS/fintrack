import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, Info, TriangleAlert } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const toast = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])
  const Icon = { success: CheckCircle2, info: Info, error: TriangleAlert }
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
        {toasts.map((t) => {
          const I = Icon[t.tone] ?? Info
          return (
            <div key={t.id} className="anim-pop pointer-events-auto flex max-w-md items-center gap-2.5 rounded-2xl border border-line bg-card px-4 py-3 text-sm font-medium text-fg shadow-glow-strong">
              <I className={t.tone === 'error' ? 'size-5 text-exp' : t.tone === 'info' ? 'size-5 text-net' : 'size-5 text-teal'} />
              {t.message}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
