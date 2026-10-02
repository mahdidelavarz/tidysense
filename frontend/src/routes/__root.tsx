import { createRootRoute, Link } from '@tanstack/react-router'
import { AuthGate } from '../features/auth/components/AuthGate'
import { ErrorState } from '../shared/ui/StateUi'

/** Shown inside the app frame for any address that matches no route. */
function NotFound() {
  return (
    <div className="page pt-10">
      <ErrorState
        title="این صفحه پیدا نشد."
        description="نشانی اشتباه است یا این صفحه دیگر وجود ندارد."
        action={<Link className="primary-button" to="/today">رفتن به امروز</Link>}
      />
    </div>
  )
}

export const Route = createRootRoute({
  component: () => <AuthGate />,
  notFoundComponent: NotFound,
})
