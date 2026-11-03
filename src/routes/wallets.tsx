import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { WalletCards, Plus, ShieldCheck } from 'lucide-react'
import { RequireAuth, useAuth } from '../lib/auth'
import { marketplaceApi, messageFromError } from '../lib/api'
import type { Network } from '../lib/models'

export const Route = createFileRoute('/wallets')({ component: () => <RequireAuth><WalletsPage /></RequireAuth> })

function WalletsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['wallets', user?.id], queryFn: marketplaceApi.wallets })
  const [label, setLabel] = useState('')
  const [address, setAddress] = useState('')
  const [network, setNetwork] = useState<Network>('Ethereum')
  const [notice, setNotice] = useState('')
  const add = useMutation({ mutationFn: () => marketplaceApi.addWallet({ label, address, network, primary: false }), onSuccess: () => { setLabel(''); setAddress(''); setNotice('Wallet added.'); queryClient.invalidateQueries({ queryKey: ['wallets'] }) }, onError: cause => setNotice(messageFromError(cause)) })
  const primary = useMutation({ mutationFn: (id: string) => marketplaceApi.updateWallet(id, { primary: true }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wallets'] }), onError: cause => setNotice(messageFromError(cause)) })

  return <main className="mx-auto max-w-5xl px-6 py-14"><span className="pill"><WalletCards size={15} className="mr-2" /> Collector account</span><h1 className="mt-5 text-4xl font-extrabold">My wallets</h1><p className="mt-3 text-slate-400">Wallet addresses below are only saved in this local simulation.</p>
    <div className="mt-9 grid gap-8 lg:grid-cols-2"><section><h2 className="mb-5 text-xl font-bold">Saved wallets</h2><div className="space-y-4">{query.isPending ? <div className="skeleton h-32 rounded-xl" /> : query.data?.length ? query.data.map(wallet => <article className="panel p-6" key={wallet.id}><div className="flex items-center justify-between"><span className="flex items-center gap-2 font-bold"><WalletCards size={18} />{wallet.label}</span>{wallet.primary && <span className="pill">Primary</span>}</div><p className="mt-3 break-all text-sm text-slate-400">{wallet.address}</p><div className="mt-4 flex items-center justify-between"><span className="text-xs text-violet-300">{wallet.network}</span>{!wallet.primary && <button className="text-sm underline" disabled={primary.isPending} onClick={() => primary.mutate(wallet.id)}>Make primary</button>}</div></article>) : <div className="panel p-7 text-slate-400">No wallets yet.</div>}</div></section>
      <form className="panel h-fit space-y-5 p-7" onSubmit={event => { event.preventDefault(); add.mutate() }}><h2 className="flex items-center gap-2 text-xl font-bold"><Plus size={20} /> Add wallet</h2><label className="block text-sm">Wallet label<input className="field mt-2" required value={label} onChange={e => setLabel(e.target.value)} placeholder="My secondary wallet" /></label><label className="block text-sm">Address (fictional)<input className="field mt-2" required pattern="0x[a-fA-F0-9]{40}" title="0x followed by 40 hexadecimal characters" value={address} onChange={e => setAddress(e.target.value)} placeholder="0x... (40 hexadecimal characters)" /></label><label className="block text-sm">Network<select className="field mt-2" value={network} onChange={e => setNetwork(e.target.value as Network)}><option>Ethereum</option><option>Polygon</option><option>Base</option></select></label><button type="submit" className="btn-primary w-full" disabled={add.isPending}>Save simulated wallet</button>{notice && <p role="status" className="text-sm text-violet-300">{notice}</p>}<p className="flex gap-2 text-xs text-slate-500"><ShieldCheck size={16} className="shrink-0" /> Never enter a private key or seed phrase. Only fictional public addresses are needed.</p></form></div>
  </main>
}
