import { usePage } from '@inertiajs/react'
import type { SharedPageProps } from '@/types'

/**
 * Effective abilities + CRM view scopes from HandleInertiaRequests.
 */
export function useCan() {
  const { auth } = usePage<SharedPageProps>().props
  const permissions = auth.permissions ?? []
  const scopes = auth.scopes ?? {}

  const can = (ability: string): boolean => permissions.includes(ability)

  const canAny = (...abilities: string[]): boolean => abilities.some((a) => can(a))

  const scope = (resource: string): 'own' | 'team' | 'all' | null =>
    (scopes[resource] as 'own' | 'team' | 'all' | undefined) ?? null

  const canView = (resource: string): boolean =>
    scope(resource) !== null || can(`${resource}.view`)

  return { can, canAny, scope, canView, permissions, scopes }
}
