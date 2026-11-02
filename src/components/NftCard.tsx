import { Heart, ArrowUpRight } from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { marketplaceApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { NFT } from '../lib/models'
import { NftArtwork } from './NftArtwork'

export function NftCard({ nft }: { nft: NFT }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const favorites = useQuery({ queryKey: ['favorites', user?.id], queryFn: marketplaceApi.favorites, enabled: !!user })
  const isFavorite = favorites.data?.includes(nft.id) ?? false
  const favorite = useMutation({
    mutationFn: () => isFavorite ? marketplaceApi.unfavorite(nft.id) : marketplaceApi.favorite(nft.id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['favorites', user?.id] })
      const previous = queryClient.getQueryData<string[]>(['favorites', user?.id])
      queryClient.setQueryData<string[]>(['favorites', user?.id], current => isFavorite ? (current ?? []).filter(id => id !== nft.id) : [...(current ?? []), nft.id])
      return { previous }
    },
    onError: (_err, _variables, context) => queryClient.setQueryData(['favorites', user?.id], context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] }),
  })

  return (
    <article className="group panel overflow-hidden transition hover:-translate-y-1 hover:border-violet-500/60">
      <div className="relative">
        <Link to="/nft/$id" params={{ id: nft.id }} aria-label={`Ver ${nft.title}`}><NftArtwork nft={nft} /></Link>
        <button type="button" className={`absolute right-4 top-4 rounded-full p-3 backdrop-blur ${isFavorite ? 'bg-rose-600' : 'bg-black/45'}`}
          aria-label={isFavorite ? `Remover ${nft.title} dos favoritos` : `Favoritar ${nft.title}`}
          aria-pressed={isFavorite} disabled={favorite.isPending}
          onClick={() => user ? favorite.mutate() : navigate({ to: '/login' })}><Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} /></button>
        {nft.available === 0 && <span className="absolute bottom-4 right-4 rounded-full bg-red-600 px-3 py-1 text-xs font-bold">Esgotado</span>}
      </div>
      <div className="p-5">
        <p className="text-xs uppercase tracking-wider text-violet-300">{nft.collection}</p>
        <div className="mt-2 flex items-start justify-between gap-2">
          <Link to="/nft/$id" params={{ id: nft.id }} className="text-lg font-bold hover:text-violet-300">{nft.title}</Link>
          <ArrowUpRight size={18} className="text-slate-500" />
        </div>
        <p className="mt-1 text-sm text-slate-400">by {nft.creator}</p>
        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-xs text-slate-400">Preço atual</span>
          <span className="font-semibold">{nft.priceEth} ETH</span>
        </div>
      </div>
    </article>
  )
}
