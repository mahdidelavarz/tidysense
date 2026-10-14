import { createFileRoute } from '@tanstack/react-router'
import { WelcomeFlow } from '../features/welcome/components/WelcomeFlow'

export const Route = createFileRoute('/welcome')({ component: WelcomeFlow })
