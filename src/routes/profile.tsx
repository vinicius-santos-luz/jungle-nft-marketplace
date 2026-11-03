import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserRound, LockKeyhole } from 'lucide-react'
import { RequireAuth, useAuth } from '../lib/auth'
import { marketplaceApi, messageFromError } from '../lib/api'

export const Route = createFileRoute('/profile')({
  component: () => <RequireAuth><ProfilePage /></RequireAuth>,
})

function ProfilePage() {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const profile = useQuery({ queryKey: ['profile', user?.id], queryFn: marketplaceApi.profile })
  const orders = useQuery({ queryKey: ['orders', user?.id], queryFn: marketplaceApi.orders })
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [avatar, setAvatar] = useState(user?.avatar ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState('')

  const edit = useMutation({
    mutationFn: () => marketplaceApi.updateProfile({ name, email, avatar }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
      void queryClient.invalidateQueries({ queryKey: ['session'] })
      setMessage('Profile updated successfully.')
    },
    onError: cause => setMessage(messageFromError(cause)),
  })
  const password = useMutation({
    mutationFn: () => marketplaceApi.updatePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setMessage('Password updated.')
    },
    onError: cause => setMessage(messageFromError(cause)),
  })

  async function handleLogout() {
    await logout()
    queryClient.clear()
    window.location.replace('/login')
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <div className="mb-6 flex justify-end">
        <button type="button" onClick={() => void handleLogout()} className="rounded-lg border border-[#704530] px-4 py-2 text-sm text-[#df9b55] hover:bg-[#392216]">
          Sign out
        </button>
      </div>
      <div className="flex items-center gap-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 text-2xl font-bold">{avatar || '✦'}</span>
        <div>
          <h1 className="text-4xl font-extrabold">Collector profile</h1>
          <p className="mt-2 text-slate-400">Manage your personal details and collection.</p>
        </div>
      </div>
      <div className="mt-10 grid gap-7 lg:grid-cols-2">
        <form className="panel space-y-5 p-7" onSubmit={event => { event.preventDefault(); setMessage(''); edit.mutate() }}>
          <h2 className="flex items-center gap-2 text-xl font-bold"><UserRound size={20} /> Personal information</h2>
          <label className="block text-sm">Name<input className="field mt-2" required value={name} onChange={e => setName(e.target.value)} /></label>
          <label className="block text-sm">Email<input className="field mt-2" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label className="block text-sm">Avatar initials<input className="field mt-2" maxLength={12} value={avatar} onChange={e => setAvatar(e.target.value)} /></label>
          <button className="btn-primary" disabled={edit.isPending}>Save changes</button>
        </form>
        <form className="panel space-y-5 p-7" onSubmit={event => { event.preventDefault(); setMessage(''); password.mutate() }}>
          <h2 className="flex items-center gap-2 text-xl font-bold"><LockKeyhole size={20} /> Change password</h2>
          <label className="block text-sm">Current password<input className="field mt-2" type="password" autoComplete="current-password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></label>
          <label className="block text-sm">New password<input className="field mt-2" type="password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} /></label>
          <button className="btn-primary" disabled={password.isPending}>Update password</button>
        </form>
      </div>
      {profile.isError && <p role="alert" className="mt-5 text-sm text-red-300">{messageFromError(profile.error)}</p>}
      {message && <p role="status" className="mt-5 text-sm text-violet-300">{message}</p>}
      <section className="panel mt-9 p-7">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold">Recent orders</h2>
          <Link to="/wallets" className="text-sm text-violet-300 underline">My wallets</Link>
        </div>
        {orders.isPending ? (
          <div className="skeleton mt-5 h-20 rounded" />
        ) : !orders.data?.length ? (
          <p className="mt-5 text-slate-400">No orders yet. Start exploring the marketplace.</p>
        ) : (
          <div className="mt-5 divide-y divide-white/10">
            {orders.data.map(order => (
              <Link to="/order/$id" params={{ id: order.id }} key={order.id} className="flex flex-wrap justify-between gap-3 py-4 text-sm hover:text-violet-300">
                <span>{order.id} · {new Date(order.createdAt).toLocaleDateString()}</span>
                <span>{order.quote.total} ETH · <span className="capitalize">{order.status}</span></span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
