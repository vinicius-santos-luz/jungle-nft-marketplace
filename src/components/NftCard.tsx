import { Heart } from 'lucide-react'
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
    <article className="group min-w-0 transition-transform duration-200 hover:-translate-y-1">
      <div className="relative rounded-[1.35rem] bg-[#2a1913] px-1 pb-4 pt-2.5 md:rounded-md md:pt-8">
        <Link to="/nft/$id" params={{ id: nft.id }} aria-label={`Ver ${nft.title}`} className="block overflow-hidden rounded-[1.05rem] md:rounded-sm"><NftArtwork nft={nft} /></Link>
        <button type="button" className={`absolute right-2 top-2 flex size-8 items-center justify-center rounded-full border border-[#db9955] backdrop-blur md:size-9 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100 ${isFavorite ? 'bg-[#dc9650] text-[#28180d] md:opacity-100' : 'bg-[#22120bcc] text-[#dc9650]'}`}
          aria-label={isFavorite ? `Remover ${nft.title} dos favoritos` : `Favoritar ${nft.title}`}
          aria-pressed={isFavorite} disabled={favorite.isPending}
          onClick={() => user ? favorite.mutate() : navigate({ to: '/login' })}><Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} /></button>
        {nft.rarity && <span className="absolute left-0 top-4 bg-[#db9654] px-3 py-1 text-[10px] font-bold text-[#21120a] md:hidden">{nft.rarity}</span>}
        {nft.available === 0 && <span className="absolute bottom-4 right-4 rounded-full bg-red-600 px-3 py-1 text-xs font-bold">Esgotado</span>}
      </div>
      <div className="px-1 pt-4">
        <Link to="/nft/$id" params={{ id: nft.id }} className="block text-[12px] font-normal leading-5 text-[#f2e9de] hover:text-[#dc9650] sm:text-sm md:text-[16px]">{nft.title}</Link>
        <span className="sr-only">Preço atual</span>
        <span className="mt-0.5 block text-[14px] font-bold text-[#dc9650] md:text-lg">{nft.priceEth} ETH</span>
      </div>
    </article>
  )
}
