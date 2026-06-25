import { AuthForm } from '@/components/auth/AuthForm'
import { login } from '@/app/(auth)/actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams
  return <AuthForm mode="login" action={login} message={message} />
}
