import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Zap } from 'lucide-react'
import { marketplaceApi, messageFromError } from '../lib/api'
import { NftArtwork } from '../components/NftArtwork'

export const Route = createFileRoute('/cart')({ component: CartPage })

function CartPage() {
  const [draftCoupon, setDraftCoupon] = useState('')
  const [coupon, setCoupon] = useState<string | null>(() => sessionStorage.getItem('jungle-coupon'))
  const queryClient = useQueryClient()
  const cart = useQuery({ queryKey:['cart'], queryFn:marketplaceApi.cart })
  const quote = useQuery({queryKey:['quote',cart.data?.items,coupon,'Ethereum'], queryFn: () => marketplaceApi.quote(coupon,'Ethereum'), enabled: !!cart.data?.items.length, retry:false})
  const change = useMutation({mutationFn: ({id,qty}:{id:string;qty:number}) => qty===0 ? marketplaceApi.removeCart(id) : marketplaceApi.updateCart(id,qty), onSuccess: () => {queryClient.invalidateQueries({queryKey:['cart']});queryClient.invalidateQueries({queryKey:['quote']})}})
  const simulate = useMutation({mutationFn: (id:string) => marketplaceApi.simulatePriceChange(id), onSuccess: () => {queryClient.invalidateQueries({queryKey:['cart']});queryClient.invalidateQueries({queryKey:['quote']})}})
  const lines = cart.data?.lines ?? []

  return <main className="mx-auto max-w-7xl px-6 py-12 lg:px-8"><Link to="/" className="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={18}/> Continue exploring</Link>
    <h1 className="text-4xl font-extrabold">Shopping Cart <span className="text-violet-300">({lines.length})</span></h1><p className="mt-3 text-slate-400">Review your digital collectibles before checkout.</p>
    {cart.isPending ? <div className="skeleton mt-10 h-72 rounded-2xl"/> : cart.isError ? <div className="panel mt-10 p-8" role="alert">{messageFromError(cart.error)} <button onClick={() => cart.refetch()} className="btn-secondary ml-5">Retry</button></div> : !lines.length ? <div className="panel mt-10 flex flex-col items-center px-6 py-20 text-center"><ShoppingBag size={52} className="text-violet-400"/><h2 className="mt-5 text-2xl font-bold">Your cart is empty</h2><p className="mt-2 text-slate-400">Discover something remarkable.</p><Link to="/" className="btn-primary mt-6">Explore NFTs</Link></div> : <div className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <section className="space-y-4" aria-label="Itens no carrinho">{lines.map(({nft,quantity}) => <article key={nft.id} className="panel flex flex-col gap-5 p-5 sm:flex-row sm:items-center"><Link to="/nft/$id" params={{id:nft.id}} className="w-full shrink-0 sm:w-36"><NftArtwork nft={nft} className="rounded-xl"/></Link><div className="min-w-0 flex-1"><p className="text-xs uppercase tracking-wide text-violet-300">{nft.collection}</p><Link to="/nft/$id" params={{id:nft.id}} className="mt-1 block text-xl font-bold hover:text-violet-300">{nft.title}</Link><p className="mt-1 text-sm text-slate-400">{nft.priceEth} ETH per edition · {nft.available} available</p><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center rounded-xl border border-white/20"><button aria-label={`Diminuir ${nft.title}`} className="p-2.5" disabled={change.isPending} onClick={() => change.mutate({id:nft.id,qty:quantity-1})}><Minus size={16}/></button><span className="min-w-7 text-center">{quantity}</span><button aria-label={`Aumentar ${nft.title}`} className="p-2.5" disabled={quantity>=nft.available || change.isPending} onClick={() => change.mutate({id:nft.id,qty:quantity+1})}><Plus size={16}/></button></div><button className="text-sm text-rose-300 hover:underline" disabled={change.isPending} onClick={() => change.mutate({id:nft.id,qty:0})}><Trash2 size={16} className="mr-1 inline"/> Remove</button></div></div></article>)}
        <button className="inline-flex items-center gap-2 text-sm text-slate-400 underline hover:text-white" onClick={() => simulate.mutate(lines[0].nft.id)}><Zap size={16}/> Simulate price change in cart</button>
        {change.isError && <p role="alert" className="text-red-300">{messageFromError(change.error)}</p>}
      </section>
      <aside className="panel h-fit p-7"><h2 className="text-2xl font-bold">Order summary</h2><form className="mt-6 flex gap-2" onSubmit={event => {event.preventDefault();const code=draftCoupon.trim() || null;setCoupon(code);if(code)sessionStorage.setItem('jungle-coupon',code);else sessionStorage.removeItem('jungle-coupon')}}><input aria-label="Código do cupom" className="field min-w-0 flex-1" value={draftCoupon} onChange={event => setDraftCoupon(event.target.value)} placeholder="Coupon code"/><button className="btn-secondary" type="submit">Apply</button></form>{coupon && <button onClick={() => {setCoupon(null);setDraftCoupon('');sessionStorage.removeItem('jungle-coupon')}} className="mt-2 text-xs text-violet-300 underline">Remove coupon {coupon}</button>}
        {quote.isError && <p role="alert" className="mt-4 text-sm text-red-300">{messageFromError(quote.error)}</p>}
        <dl className="mt-7 space-y-4 text-sm"><div className="flex justify-between"><dt className="text-slate-400">Subtotal</dt><dd>{quote.data?.subtotal ?? '—'} ETH</dd></div><div className="flex justify-between"><dt className="text-slate-400">Discount</dt><dd>- {quote.data?.discount ?? '0.000000'} ETH</dd></div><div className="flex justify-between"><dt className="text-slate-400">Est. network fee</dt><dd>{quote.data?.networkFee ?? '—'} ETH</dd></div><div className="flex justify-between border-t border-white/10 pt-5 text-lg font-bold"><dt>Total</dt><dd>{quote.data?.total ?? '—'} ETH</dd></div></dl>
        <Link to="/checkout" className={`btn-primary mt-7 w-full ${quote.isError || !quote.data ? 'pointer-events-none opacity-50' : ''}`}>Proceed to checkout</Link><p className="mt-4 text-center text-xs text-slate-500">Simulated checkout · No funds transferred</p>
      </aside></div>}
  </main>
}
