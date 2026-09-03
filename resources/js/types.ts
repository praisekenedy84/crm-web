import type { PageProps } from '@inertiajs/core'

/**
 * The authenticated user as shared by HandleInertiaRequests.
 * Mirrors AuthenticationService::formatUser() on the PHP side.
 */
export interface SharedUser {
  id: number
  name: string
  email: string
  role: string
  tenant: {
    id: number
    name: string
    slug: string
    default_currency: string
    enabled_modules?: string[]
  } | null
}

export interface SharedPageProps extends PageProps {
  auth: {
    user: SharedUser | null
  }
  flash: {
    success: string | null
    error: string | null
  }
}

/** Laravel's paginator payload, as passed straight through to a page prop. */
export interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}
