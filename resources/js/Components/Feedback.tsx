/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { usePage } from '@inertiajs/react'
import { CheckCircle2, X, XCircle } from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { cn } from '@/lib/utils'
import type { SharedPageProps } from '@/types'

type FeedbackTone = 'success' | 'error'

interface FeedbackMessage {
  id: number
  message: string
  tone: FeedbackTone
}

interface FeedbackContextValue {
  notify: (message: string, tone?: FeedbackTone) => void
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null)

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null)
  const nextId = useRef(0)
  const page = usePage<SharedPageProps>()
  const seenFlash = useRef<string | null>(null)

  const notify = useCallback((message: string, tone: FeedbackTone = 'success') => {
    setFeedback({ id: ++nextId.current, message, tone })
  }, [])

  useEffect(() => {
    const success = page.props.flash?.success
    const error = page.props.flash?.error
    const key = success ? `s:${success}` : error ? `e:${error}` : null
    if (!key || seenFlash.current === key) return
    seenFlash.current = key
    if (success) notify(success, 'success')
    if (error) notify(error, 'error')
  }, [page.props.flash, notify])

  useEffect(() => {
    if (!feedback) return
    const timeout = window.setTimeout(() => setFeedback(null), 4500)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  return (
    <FeedbackContext.Provider value={{ notify }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex justify-center sm:inset-x-auto sm:right-6"
        aria-live="polite"
        aria-atomic="true"
      >
        {feedback && (
          <div
            key={feedback.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border bg-card p-3 shadow-2xl shadow-foreground/10',
              feedback.tone === 'error' ? 'border-destructive/25' : 'border-success/25'
            )}
          >
            {feedback.tone === 'error' ? (
              <XCircle className="size-5 shrink-0 text-destructive" />
            ) : (
              <CheckCircle2 className="size-5 shrink-0 text-success" />
            )}
            <p className="min-w-0 flex-1 text-sm font-medium">{feedback.message}</p>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setFeedback(null)}
              aria-label="Dismiss notification"
            >
              <X className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </FeedbackContext.Provider>
  )
}

export function useFeedback() {
  const context = useContext(FeedbackContext)
  if (!context) throw new Error('useFeedback must be used within FeedbackProvider')
  return context
}
