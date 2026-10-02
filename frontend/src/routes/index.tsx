import { createFileRoute } from '@tanstack/react-router'
import { AccountControls } from '../features/auth/components/AccountControls'
import { ParentDashboard } from '../features/parents/components/ParentDashboard'

function Home() {
  return (
    <>
      <ParentDashboard />
      <AccountControls />
    </>
  )
}

export const Route = createFileRoute('/')({ component: Home })
