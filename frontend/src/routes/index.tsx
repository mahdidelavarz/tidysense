import { createFileRoute, redirect } from '@tanstack/react-router'

// Today is the home of the app; the bare root only forwards there.
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/today' })
  },
})
