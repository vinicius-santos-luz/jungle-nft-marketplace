import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, LockKeyhole } from 'lucide-react'
import { RequireAuth, useAuth } from '../lib/auth'
import { marketplaceApi, messageFromError } from '../lib/api'
import type { Network } from '../lib/models'

export const Route = createFileRoute('/checkout')({ component: () => <RequireAuth><CheckoutPage /></RequireAuth> })

function CheckoutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [network, setNetwork] = useState<Network>('Ethereum')
  const [coupon] = useState<string | null>(() => sessionStorage.getItem('jungle-coupon'))
  const [walletId, setWalletId] = useState('')
  const [decline, setDecline] = useState(false)
  const [acceptedRevision, setAcceptedRevision] = useState<string | null>(null)
  const wallets = useQuery({queryKey:['wallets',user?.id],queryFn:marketplaceApi.wallets})
  const cart = useQuery({queryKey:['cart',user?.id],queryFn:marketplaceApi.cart})
  const quote = useQuery({queryKey:['quote',user?.id,cart.data?.items,coupon,network],queryFn:()=>marketplaceApi.quote(coupon,network),enabled:!!cart.data?.items.length,retry:false,refetchInterval:1500})
  const selectedWallet = walletId || wallets.data?.find(wallet=>wallet.primary)?.id || wallets.data?.[0]?.id || ''
  const placeOrder = useMutation({
    mutationFn: async () => {
      if (!quote.data || !selectedWallet) throw new Error('Review your quote and select a wallet.')
      // A stable key survives retries/timeouts for an identical purchase attempt.
      const payload = { coupon, network, walletId:selectedWallet, quoteRevision:quote.data.revision, decline }
      const fingerprint = JSON.stringify(payload)
      const previous = JSON.parse(localStorage.getItem('jungle-checkout-attempt') || 'null') as {fingerprint:string;key:string}|null
      const attempt = previous?.fingerprint === fingerprint ? previous : { fingerprint, key: crypto.randomUUID() }
      localStorage.setItem('jungle-checkout-attempt',JSON.stringify(attempt))
      return marketplaceApi.createOrder(payload,attempt.key)
    },
    onSuccess: order => {
      queryClient.invalidateQueries({queryKey:['orders']})
      navigate({to:'/order/$id',params:{id:order.id}})
    },
    onError: () => { queryClient.invalidateQueries({queryKey:['quote']}) },
  })

  return <main className="mx-auto max-w-6xl px-6 py-12"><Link to="/cart" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={18}/> Back to cart</Link><h1 className="text-4xl font-extrabold">Secure checkout</h1><p className="mt-3 text-slate-400">Review your order. All actions are simulated.</p>
    <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_1fr]"><section className="space-y-6">
      <div className="panel p-7"><h2 className="text-xl font-bold">1. Collector information</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm">Collector<input className="field mt-2" value={user?.name ?? ''} readOnly/></label><label className="text-sm">Email<input className="field mt-2" value={user?.email ?? ''} readOnly/></label></div><Link to="/profile" className="mt-4 inline-block text-xs text-violet-300 underline">Edit profile</Link></div>
      <div className="panel p-7"><h2 className="text-xl font-bold">2. Wallet & network</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm">Network<select className="field mt-2" value={network} onChange={e=>{setNetwork(e.target.value as Network);setAcceptedRevision(null)}}><option>Ethereum</option><option>Polygon</option><option>Base</option></select></label><label className="text-sm">Saved wallet<select className="field mt-2" aria-label="Carteira" value={selectedWallet} onChange={e=>{setWalletId(e.target.value);setAcceptedRevision(null)}}>{!wallets.data?.length && <option value="">No wallet</option>}{wallets.data?.map(wallet=><option value={wallet.id} key={wallet.id}>{wallet.label} · {wallet.address.slice(0,7)}…</option>)}</select></label></div><Link to="/wallets" className="mt-4 inline-block text-xs text-violet-300 underline">Manage wallets</Link><p className="mt-3 text-sm text-slate-400">Wallet connection is simulated. No browser extension is accessed.</p></div>
      <div className="panel p-7"><h2 className="text-xl font-bold">3. Review & confirm</h2><label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 accent-violet-500" checked={!!quote.data && acceptedRevision === quote.data.revision} disabled={!quote.data} onChange={e=>setAcceptedRevision(e.target.checked ? quote.data?.revision ?? null : null)}/> I reviewed the NFT quantities, prices, discount, network fee and total.</label><label className="mt-4 flex items-start gap-3 text-sm text-slate-400"><input type="checkbox" className="mt-1 accent-violet-500" checked={decline} onChange={e=>{setDecline(e.target.checked);setAcceptedRevision(null)}}/> Simulate payment refusal (test scenario)</label></div>
    </section><aside className="panel h-fit p-7"><h2 className="text-2xl font-bold">Your order</h2>{cart.data?.lines.map(line=><div key={line.nft.id} className="mt-5 flex justify-between gap-4 border-b border-white/10 pb-4 text-sm"><span>{line.nft.title} × {line.quantity}</span><span>{line.nft.priceEth} ETH</span></div>)}
      {quote.isError && <div role="alert" className="mt-5 flex gap-2 text-sm text-red-300"><AlertTriangle size={18}/>{messageFromError(quote.error)} Please refresh the quote.</div>}
      <dl className="mt-6 space-y-4 text-sm"><div className="flex justify-between"><dt className="text-slate-400">Subtotal</dt><dd>{quote.data?.subtotal ?? '—'} ETH</dd></div><div className="flex justify-between"><dt className="text-slate-400">Discount</dt><dd>- {quote.data?.discount ?? '—'} ETH</dd></div><div className="flex justify-between"><dt className="text-slate-400">Network fee</dt><dd>{quote.data?.networkFee ?? '—'} ETH</dd></div><div className="flex justify-between border-t border-white/10 pt-5 text-lg font-bold"><dt>Total</dt><dd>{quote.data?.total ?? '—'} ETH</dd></div></dl>
      <button className="btn-primary mt-8 w-full" disabled={!quote.data || acceptedRevision !== quote.data.revision || !selectedWallet || quote.isFetching || placeOrder.isPending} onClick={()=>placeOrder.mutate()}><LockKeyhole size={18}/>{placeOrder.isPending ? 'Submitting…' : 'Place simulated order'}</button>
      {placeOrder.isError && <p role="alert" className="mt-4 text-sm text-red-300">{messageFromError(placeOrder.error)}</p>}
      <button className="mt-4 w-full text-xs text-violet-300 underline" onClick={()=>quote.refetch()}>Refresh latest quote</button><p className="mt-4 text-center text-xs text-slate-500">No real blockchain transaction or funds</p>
    </aside></div>
  </main>
}
