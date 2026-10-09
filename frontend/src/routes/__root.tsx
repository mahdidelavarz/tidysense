import { createRootRoute, Link } from '@tanstack/react-router'
import { AuthGate } from '../features/auth/components/AuthGate'
import { NotFoundState } from '../shared/ui/StateUi'

/** Shown inside the app frame for any address that matches no route. */
function NotFound() {
  return <NotFoundState action={<Link className="primary-button" to="/today">رفتن به امروز</Link>} />
}

export const Route = createRootRoute({
  component: () => <AuthGate />,
  notFoundComponent: NotFound,
})
