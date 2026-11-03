import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../lib/auth'
import { messageFromError } from '../lib/api'

export const Route = createFileRoute('/login')({ component: LoginPage })

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('demo@jungle.test')
  const [password, setPassword] = useState('Demo1234!')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setPending(true)
    try {
      await login(email, password)
      const target = sessionStorage.getItem('jungle-resume-path') || '/profile'
      sessionStorage.removeItem('jungle-resume-path')
      if (target === '/checkout') await navigate({ to: '/checkout', replace: true })
      else if (target === '/favorites') await navigate({ to: '/favorites', replace: true })
      else if (target === '/wallets') await navigate({ to: '/wallets', replace: true })
      else if (target.startsWith('/order/')) await navigate({ to: '/order/$id', params: { id: target.slice('/order/'.length) }, replace: true })
      else await navigate({ to: '/profile', replace: true })
    } catch (cause) { setError(messageFromError(cause)) } finally { setPending(false) }
  }

  return <main className="mx-auto max-w-md px-6 py-20"><div className="text-center"><span className="pill">Welcome back</span><h1 className="mt-5 text-4xl font-extrabold">Sign in</h1><p className="mt-3 text-slate-400">Access your collection and checkout.</p></div>
    <form onSubmit={submit} className="panel mt-9 space-y-5 p-7"><label className="block text-sm font-medium">Email<input className="field mt-2" type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></label><label className="block text-sm font-medium">Password<input className="field mt-2" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>{error && <p role="alert" className="text-sm text-red-300">{error}</p>}<button type="submit" className="btn-primary w-full" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button><p className="text-center text-sm text-slate-400">New here? <Link to="/register" className="text-violet-300 underline">Create account</Link></p></form>
    <div className="mt-6 rounded-xl border border-violet-500/20 bg-violet-500/10 p-4 text-sm text-violet-200"><p className="font-bold">Demo accounts (fictitious)</p><p className="mt-1">demo@jungle.test / Demo1234!</p><p>test@jungle.test / Teste1234!</p></div>
  </main>
}
