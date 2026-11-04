import { createFileRoute } from '@tanstack/react-router'
import { AuthModal } from '../components/AuthModal'

export const Route = createFileRoute('/register')({
  component: () => <AuthModal mode="register" />,
})