import { useState } from 'react'
import { router } from '@inertiajs/react'
import type { FormDataConvertible } from '@inertiajs/core'
import { useFeedback } from '@/Components/Feedback'

type Method = 'post' | 'put' | 'patch' | 'delete'
type Payload = Record<string, FormDataConvertible>

interface SubmitOptions {
  success?: string
  onSuccess?: () => void
  onError?: (message: string) => void
}

/**
 * Thin wrapper around Inertia's router for form mutations.
 * Surfaces the first validation error through Feedback when present.
 */
export function useSubmit() {
  const [processing, setProcessing] = useState(false)
  const { notify } = useFeedback()

  const submit = (
    method: Method,
    url: string,
    data: Payload = {},
    options: SubmitOptions = {},
  ) => {
    setProcessing(true)

    const callbacks = {
      preserveScroll: true as const,
      onSuccess: () => {
        if (options.success) notify(options.success)
        options.onSuccess?.()
      },
      onError: (errors: Record<string, string>) => {
        const first = Object.values(errors)[0]
        const message = typeof first === 'string' ? first : 'Something went wrong. Try again.'
        notify(message, 'error')
        options.onError?.(message)
      },
      onFinish: () => setProcessing(false),
    }

    if (method === 'delete') {
      router.delete(url, { ...callbacks, data })
      return
    }

    router[method](url, data, callbacks)
  }

  return { processing, submit }
}

export function visitFilters(url: string, params: Record<string, string | number | undefined | null>) {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
  router.get(url, cleaned, {
    preserveState: true,
    preserveScroll: true,
    replace: true,
  })
}
