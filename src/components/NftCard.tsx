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
    <article className="group overflow-hidden rounded-[1.25rem] bg-[#2a1a13] transition hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,.35)]">
      <div className="relative">
        <Link to="/nft/$id" params={{ id: nft.id }} aria-label={`Ver ${nft.title}`}><NftArtwork nft={nft} /></Link>
        <button type="button" className={`absolute right-2 top-2 rounded-full border border-[#db9955] p-2 backdrop-blur ${isFavorite ? 'bg-[#dc9650] text-[#28180d]' : 'bg-[#22120bcc] text-[#dc9650]'}`}
          aria-label={isFavorite ? `Remover ${nft.title} dos favoritos` : `Favoritar ${nft.title}`}
          aria-pressed={isFavorite} disabled={favorite.isPending}
          onClick={() => user ? favorite.mutate() : navigate({ to: '/login' })}><Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} /></button>
        {nft.available === 0 && <span className="absolute bottom-4 right-4 rounded-full bg-red-600 px-3 py-1 text-xs font-bold">Esgotado</span>}
      </div>
      <div className="p-3 md:p-4">
        <p className="text-[10px] uppercase tracking-wider text-[#b98b69]">{nft.collection}</p>
        <div className="mt-1 flex items-start justify-between gap-2">
          <Link to="/nft/$id" params={{ id: nft.id }} className="text-sm font-semibold leading-tight text-[#f0e8de] hover:text-[#dc9650] md:text-base">{nft.title}</Link>
          <ArrowUpRight size={15} className="hidden text-[#b68b6b] md:block" />
        </div>
        <p className="mt-1 hidden text-xs text-[#b69781] md:block">por {nft.creator}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="sr-only">Preço atual</span>
          <span className="text-sm font-black text-[#dc9650] md:text-base">{nft.priceEth} ETH</span>
        </div>
      </div>
    </article>
  )
}
