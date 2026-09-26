import { createFileRoute } from '@tanstack/react-router'
import { LoginView } from '../features/auth/components/LoginView'

export const Route = createFileRoute('/login')({ component: LoginView })
