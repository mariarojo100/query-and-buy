import { AuthForm } from '@/components/auth/AuthForm'
import { signup } from '@/app/(auth)/actions'

export default function SignupPage() {
  return <AuthForm mode="signup" action={signup} />
}
