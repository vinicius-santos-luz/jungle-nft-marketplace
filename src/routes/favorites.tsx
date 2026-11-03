import { createFileRoute, Link } from '@tanstack/react-router'
import { useQueries, useQuery } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { RequireAuth, useAuth } from '../lib/auth'
import { marketplaceApi } from '../lib/api'
import { NftCard } from '../components/NftCard'

export const Route = createFileRoute('/favorites')({ component: () => <RequireAuth><FavoritesPage /></RequireAuth> })

function FavoritesPage() {
  const { user } = useAuth()
  const favorites = useQuery({ queryKey: ['favorites', user?.id], queryFn: marketplaceApi.favorites })
  const nfts = useQueries({ queries: (favorites.data ?? []).map(id => ({ queryKey: ['nft', id], queryFn: () => marketplaceApi.nft(id) })) })
  return <main className="mx-auto max-w-7xl px-6 py-14"><span className="pill"><Heart size={15} className="mr-2" /> Saved collection</span><h1 className="mt-5 text-4xl font-extrabold">My favorites</h1><p className="mt-3 text-slate-400">Your favorite NFTs are private to this collector profile.</p>
    {favorites.isPending ? <div className="skeleton mt-9 h-48 rounded-2xl" /> : !favorites.data?.length ? <div className="panel mt-9 p-14 text-center"><Heart size={42} className="mx-auto text-violet-300" /><h2 className="mt-4 text-xl font-bold">No favorites yet</h2><p className="mt-2 text-slate-400">Tap the heart on any NFT to save it here.</p><Link to="/" className="btn-primary mt-6">Browse marketplace</Link></div> : <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{nfts.map((query, index) => query.data ? <NftCard key={query.data.id} nft={query.data} /> : <div key={index} className="skeleton aspect-[.75] rounded-xl" />)}</div>}
  </main>
}
