import { createInertiaApp } from '@inertiajs/react'
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers'
import { createRoot } from 'react-dom/client'
import type { ComponentType, ReactNode } from 'react'
import Layout from '@/Components/Layout'

const appName = import.meta.env.VITE_APP_NAME || 'CRM'

type PageModule = {
  default: ComponentType<Record<string, unknown>> & {
    layout?: (page: ReactNode) => ReactNode
  }
}

// Pages rendered outside the authenticated shell.
const LAYOUTLESS_PAGES = ['LoginPage']

const pages = import.meta.glob<PageModule>('./Pages/**/*.tsx')

createInertiaApp({
  title: (title) => (title ? `${title} — ${appName}` : appName),
  resolve: async (name) => {
    const page = await resolvePageComponent<PageModule>(`./Pages/${name}.tsx`, pages)

    if (!LAYOUTLESS_PAGES.includes(name)) {
      page.default.layout ??= (content: ReactNode) => <Layout>{content}</Layout>
    }

    return page
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
  },
})
