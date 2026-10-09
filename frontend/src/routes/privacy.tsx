import { createFileRoute } from '@tanstack/react-router'
import { PrivacyPage } from '../features/pilot/components/PrivacyPage'

export const Route = createFileRoute('/privacy')({ component: PrivacyPage })
