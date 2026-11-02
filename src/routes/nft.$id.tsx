import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, Minus, Plus, ShoppingBag, Zap } from 'lucide-react'
import { marketplaceApi, messageFromError } from '../lib/api'
import { NftArtwork } from '../components/NftArtwork'
import { Button } from '../components/ui/button'

export const Route = createFileRoute('/nft/$id')({ component: NFTDetails })

function NFTDetails() {
  const { id } = Route.useParams()
  const [quantity, setQuantity] = useState(1)
  const [notice, setNotice] = useState('')
  const queryClient = useQueryClient()
  const nftQuery = useQuery({ queryKey: ['nft', id], queryFn: () => marketplaceApi.nft(id) })
  const add = useMutation({ mutationFn: () => marketplaceApi.addCart(id, quantity), onSuccess: () => { queryClient.invalidateQueries({queryKey:['cart']}); setNotice('NFT added to your cart.') }, onError: error => setNotice(messageFromError(error)) })
  const simulate = useMutation({ mutationFn: () => marketplaceApi.simulatePriceChange(id), onSuccess: () => { queryClient.invalidateQueries({queryKey:['nft',id]}); queryClient.invalidateQueries({queryKey:['nfts']}); setNotice('Live price change simulated through API + Socket.IO.') } })

  if (nftQuery.isPending) return <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2"><div className="skeleton aspect-square rounded-3xl"/><div className="space-y-6"><div className="skeleton h-12 rounded"/><div className="skeleton h-48 rounded"/></div></div>
  if (nftQuery.isError) return <div className="mx-auto max-w-5xl px-6 py-24" role="alert"><h1 className="text-3xl font-bold">NFT not found</h1><p className="mt-3 text-slate-400">{messageFromError(nftQuery.error)}</p><Link className="btn-secondary mt-6" to="/">Back to catalog</Link></div>
  const nft = nftQuery.data
  return <main className="mx-auto max-w-7xl px-6 py-12 lg:px-8"><Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft size={18}/> Back to marketplace</Link>
    <div className="grid gap-12 lg:grid-cols-2"><NftArtwork nft={nft} className="rounded-[2rem] border border-white/10"/>
      <div className="py-2"><span className="pill">{nft.category} · Edition {nft.total}</span><h1 className="mt-5 text-4xl font-black sm:text-5xl">{nft.title}</h1><p className="mt-4 text-slate-400">Created by <strong className="text-white">{nft.creator}</strong> · {nft.collection}</p><p className="mt-8 max-w-xl leading-relaxed text-slate-300">{nft.description}</p>
        <div className="panel mt-9 p-6"><p className="text-sm text-slate-400">Current price</p><p className="mt-1 text-4xl font-extrabold">{nft.priceEth} <span className="text-xl text-violet-300">ETH</span></p><div className="mt-5 flex items-center gap-2 text-sm"><CheckCircle size={17} className={nft.available ? 'text-emerald-400' : 'text-red-400'}/><span>{nft.available ? `${nft.available} editions available` : 'Sold out'}</span></div>
          <div className="mt-6 flex flex-wrap items-center gap-4"><div className="flex items-center rounded-xl border border-white/20"><button className="p-3" aria-label="Diminuir quantidade" disabled={quantity <= 1} onClick={() => setQuantity(Math.max(1,quantity-1))}><Minus size={16}/></button><span className="min-w-8 text-center">{quantity}</span><button className="p-3" aria-label="Aumentar quantidade" disabled={quantity >= nft.available} onClick={() => setQuantity(Math.min(nft.available,quantity+1))}><Plus size={16}/></button></div><button className="btn-primary flex-1" disabled={!nft.available || add.isPending} onClick={() => add.mutate()}><ShoppingBag size={18}/>{add.isPending ? 'Adding…' : 'Add to cart'}</button></div>
          {notice && <p role="status" className="mt-4 text-sm text-violet-200">{notice} <Link to="/cart" className="underline">View cart</Link></p>}
        </div>
        <Button variant="outline" className="mt-7" disabled={simulate.isPending} onClick={() => simulate.mutate()}><Zap size={16}/> Simulate live price update (demo)</Button>
      </div>
    </div></main>
}
