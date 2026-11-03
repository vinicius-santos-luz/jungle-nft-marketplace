import { useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, Clock3, XCircle } from 'lucide-react'
import { RequireAuth, useAuth } from '../lib/auth'
import { marketplaceApi, messageFromError } from '../lib/api'

export const Route = createFileRoute('/order/$id')({ component: () => <RequireAuth><OrderPage /></RequireAuth> })

function OrderPage() {
  const { id } = Route.useParams()
  const { user } = useAuth()
  const query = useQuery({ queryKey: ['order', id, user?.id], queryFn: () => marketplaceApi.order(id), refetchInterval: data => data.state.data?.status === 'pending' ? 800 : false })
  useEffect(() => {
    if (query.data && query.data.status !== 'pending') localStorage.removeItem('jungle-checkout-attempt')
  }, [query.data])
  if (query.isPending) return <main className="mx-auto max-w-3xl px-6 py-24 text-center">Retrieving your order…</main>
  if (query.isError) return <main className="mx-auto max-w-3xl px-6 py-24" role="alert">{messageFromError(query.error)}</main>
  const order = query.data
  return <main className="mx-auto max-w-3xl px-6 py-16"><div className="panel p-8 sm:p-12 text-center">{order.status === 'pending' ? <Clock3 size={64} className="mx-auto text-violet-300" /> : order.status === 'confirmed' ? <CheckCircle size={64} className="mx-auto text-emerald-400" /> : <XCircle size={64} className="mx-auto text-red-400" />}
    <h1 className="mt-6 text-3xl font-extrabold">{order.status === 'pending' ? 'Processing your order' : order.status === 'confirmed' ? 'Order confirmed!' : 'Payment declined'}</h1><p role="status" className="mt-3 text-slate-400">{order.status === 'pending' ? 'Your simulated transaction is pending. This page checks its state automatically, including after refresh.' : order.status === 'confirmed' ? 'Your digital collectibles were purchased in the simulation.' : 'No items were removed from your cart. You can try again.'}</p>
    <div className="mt-9 space-y-4 border-t border-white/10 pt-6 text-left"><div className="flex justify-between gap-4"><span className="text-slate-400">Order ID</span><strong>{order.id}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-400">Network</span><strong>{order.network}</strong></div><div className="flex justify-between gap-4"><span className="text-slate-400">Status</span><strong className="capitalize">{order.status}</strong></div><div className="break-all text-xs text-slate-400">Simulated reference: {order.txRef}</div></div>
    <div className="mt-7 border-t border-white/10 pt-6 text-left"><h2 className="text-xl font-bold">Receipt snapshot</h2>{order.quote.lines.map(line => <div key={line.nftId} className="mt-4 flex justify-between gap-4 text-sm"><span>{line.nft.title} × {line.quantity}</span><span>{line.nft.priceEth} ETH each</span></div>)}<dl className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>{order.quote.subtotal} ETH</dd></div><div className="flex justify-between"><dt>Discount</dt><dd>- {order.quote.discount} ETH</dd></div><div className="flex justify-between"><dt>Network fee</dt><dd>{order.quote.networkFee} ETH</dd></div><div className="flex justify-between pt-3 text-lg font-bold"><dt>Total</dt><dd>{order.quote.total} ETH</dd></div></dl></div>
    <Link to={order.status === 'declined' ? '/cart' : '/'} className="btn-primary mt-9 w-full">{order.status === 'declined' ? 'Return to cart' : 'Explore more NFTs'}</Link>
  </div></main>
}
