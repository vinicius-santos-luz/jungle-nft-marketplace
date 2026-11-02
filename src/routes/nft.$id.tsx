import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Heart, Minus, Plus, ShoppingCart, Star, UserRound, Zap } from 'lucide-react'
import { marketplaceApi, messageFromError } from '../lib/api'
import type { NFT } from '../lib/models'
import { useAuth } from '../lib/auth'
import { NftArtwork } from '../components/NftArtwork'
import { NftCard } from '../components/NftCard'
import { Button } from '../components/ui/button'

export const Route = createFileRoute('/nft/$id')({ component: NFTDetails })

// A token has one asset in the API fixture. Each gallery view is an honest
// crop of that asset, not an image belonging to another NFT.
const galleryViews = [
  { label: 'Arte completa', transform: 'scale-100' },
  { label: 'Detalhe do rosto', transform: 'scale-[1.3] -translate-x-[4%]' },
  { label: 'Detalhe da composição', transform: 'scale-[1.18] translate-x-[5%] translate-y-[5%]' },
  { label: 'Detalhe do acabamento', transform: 'scale-[1.4] translate-y-[-6%]' },
]

function ArtworkGallery({ nft }: { nft: NFT }) {
  const [active, setActive] = useState(0)
  return (
    <div className="grid gap-3 md:grid-cols-[64px_minmax(0,1fr)] md:gap-4">
      <div className="hidden flex-col gap-3 md:flex" aria-label="Vistas da obra">
        {galleryViews.map((view, index) => (
          <button
            key={view.label}
            type="button"
            aria-label={view.label}
            aria-pressed={active === index}
            className={`aspect-square overflow-hidden rounded-lg border-2 transition-colors ${active === index ? 'border-[#dd9551]' : 'border-transparent hover:border-[#805133]'}`}
            onClick={() => setActive(index)}
          >
            <div className="h-full w-full overflow-hidden">
              <NftArtwork nft={nft} className={`h-full w-full transition-transform duration-300 ${view.transform}`} />
            </div>
          </button>
        ))}
      </div>
      <div className="aspect-[1.08] overflow-hidden rounded-[1.35rem] bg-[#34231a] md:aspect-square md:rounded-[1rem]">
        <NftArtwork nft={nft} className={`h-full w-full transition-transform duration-500 ${galleryViews[active].transform}`} />
      </div>
    </div>
  )
}

function NFTDetails() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [quantity, setQuantity] = useState(1)
  const [notice, setNotice] = useState('')
  const [detailTab, setDetailTab] = useState<'description' | 'reviews'>('description')
  const queryClient = useQueryClient()
  const nftQuery = useQuery({ queryKey: ['nft', id], queryFn: () => marketplaceApi.nft(id) })
  const relatedQuery = useQuery({
    queryKey: ['nfts', 'related', id],
    queryFn: () => marketplaceApi.catalog({ page: 1, sort: 'featured' }),
    enabled: nftQuery.isSuccess,
  })
  const favorites = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: marketplaceApi.favorites,
    enabled: !!user,
  })
  const isFavorite = favorites.data?.includes(id) ?? false

  const favorite = useMutation({
    mutationFn: () => isFavorite ? marketplaceApi.unfavorite(id) : marketplaceApi.favorite(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['favorites', user?.id] })
      const previous = queryClient.getQueryData<string[]>(['favorites', user?.id])
      queryClient.setQueryData<string[]>(['favorites', user?.id], current =>
        isFavorite ? (current ?? []).filter(item => item !== id) : [...(current ?? []), id],
      )
      return { previous }
    },
    onError: (_error, _variables, context) =>
      queryClient.setQueryData(['favorites', user?.id], context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] }),
  })
  const toggleFavorite = () => {
    if (user) favorite.mutate()
    else void navigate({ to: '/login' })
  }

  const add = useMutation({
    mutationFn: (intent: 'cart' | 'buy') => marketplaceApi.addCart(id, quantity).then(() => intent),
    onSuccess: intent => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      if (intent === 'buy') void navigate({ to: '/checkout' })
      else setNotice('NFT added to your cart.')
    },
    onError: error => setNotice(messageFromError(error)),
  })
  const simulate = useMutation({
    mutationFn: () => marketplaceApi.simulatePriceChange(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['nft', id] })
      void queryClient.invalidateQueries({ queryKey: ['nfts'] })
      setNotice('Live price change simulated through API + Socket.IO.')
    },
    onError: error => setNotice(messageFromError(error)),
  })

  if (nftQuery.isPending) return (
    <main className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-2" aria-label="Carregando detalhes do NFT">
      <div className="skeleton aspect-square rounded-3xl" />
      <div className="space-y-6">
        <div className="skeleton h-12 rounded-lg" />
        <div className="skeleton h-48 rounded-lg" />
        <div className="skeleton h-20 rounded-lg" />
      </div>
    </main>
  )
  if (nftQuery.isError) return (
    <main className="mx-auto max-w-5xl px-6 py-24" role="alert">
      <h1 className="text-3xl font-bold">NFT not found</h1>
      <p className="mt-3 text-[#c8a88c]">{messageFromError(nftQuery.error)}</p>
      <Link className="btn-secondary mt-6" to="/">Back to catalog</Link>
    </main>
  )

  const nft = nftQuery.data
  const related = (relatedQuery.data?.items ?? []).filter(item => item.id !== nft.id && item.collection === nft.collection).slice(0, 5)
  const editions = nft.editions ?? [`1/${nft.total}`, nft.available > 0 ? 'ABERTA' : 'ESGOTADA']
  const tokenNumber = nft.tokenNumber ?? nft.id.replace(/[^0-9]/g, '').padStart(4, '0')
  const attributes = nft.attributes ?? [nft.category]
  const canPurchase = nft.available > 0 && quantity <= nft.available

  return (
    <main className="mx-auto max-w-7xl pb-2 md:px-8 md:pt-6 lg:px-10">
      <div className="mb-6 hidden items-center gap-2 text-xs text-[#d3a16e] md:flex">
        <Link to="/" className="hover:text-white">Início</Link>
        <span>/</span>
        <Link to="/" hash="explore" className="hover:text-white">Mercado</Link>
        <span>/</span>
        <span className="text-[#f5e7d9]">{nft.title}</span>
      </div>

      <section className="mx-auto max-w-[440px] overflow-hidden rounded-[1.8rem] bg-[#281810] md:grid md:max-w-none md:grid-cols-[1.04fr_.96fr] md:items-start md:gap-10 md:overflow-visible md:rounded-none md:bg-transparent lg:gap-14" aria-label={`Detalhes de ${nft.title}`}>
        <div className="relative px-5 pt-[58px] md:p-0">
          <div className="absolute left-5 right-5 top-4 flex items-center justify-between md:hidden">
            <Link to="/" aria-label="Voltar ao mercado" className="flex size-9 items-center justify-center rounded-full bg-[#382219] text-[#e4a463]">
              <ArrowLeft size={18} />
            </Link>
            <button
              type="button"
              aria-label={isFavorite ? `Remover ${nft.title} dos favoritos` : `Favoritar ${nft.title}`}
              aria-pressed={isFavorite}
              disabled={favorite.isPending}
              onClick={toggleFavorite}
              className={`flex size-9 items-center justify-center rounded-full bg-[#382219] ${isFavorite ? 'text-[#f0a758]' : 'text-[#d68a43]'}`}
            >
              <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          </div>
          <ArtworkGallery nft={nft} />
        </div>

        <div className="relative -mt-3 rounded-t-[1.7rem] bg-[#281810] px-5 pb-6 pt-6 md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:py-0">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-[1.05rem] font-bold leading-snug tracking-tight text-[#f8eee5] md:text-[1.9rem]">{nft.title}</h1>
            {typeof nft.rating === 'number' && (
              <div className="flex shrink-0 items-center gap-1 rounded-full border border-[#ca8c47] px-2 py-1 text-[11px] leading-none text-[#f2b168] md:hidden">
                <Star size={11} fill="currentColor" /> {nft.rating.toFixed(1)} <span className="text-[#e7d4c1]">({nft.reviewCount ?? 0})</span>
              </div>
            )}
          </div>
          <div className="mt-2 hidden flex-wrap items-center gap-4 md:flex">
            <strong className="text-xl text-[#e49b4d]">{nft.priceEth} ETH</strong>
            {typeof nft.rating === 'number' && (
              <span className="flex items-center gap-2 text-xs text-[#e9a455]">
                <span className="flex gap-0.5" aria-label={`Avaliação ${nft.rating} de 5`}>{Array.from({ length: 5 }, (_, i) => <Star size={12} key={i} fill="currentColor" />)}</span>
                <span className="text-[#cfb8a5]">{nft.reviewCount ?? 0} avaliações de colecionadores</span>
              </span>
            )}
          </div>
          <div className="flex flex-col">
          <p className="order-1 mt-4 hidden text-xs font-bold text-[#f1e5d9] md:mt-2 md:block">Sobre este NFT:</p>
          <p className="order-1 mt-3 text-[11px] leading-[1.9] text-[#cda681] md:mt-1 md:max-w-lg md:text-[13px] md:leading-[1.6]">
            {nft.description}
          </p>

          <div className="order-2 mt-4 md:mt-2">
            <h2 className="text-xs font-semibold text-[#f5e5d6] md:mb-2">Edição:</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {editions.map((edition, index) => (
                <span key={`${edition}-${index}`} className={`rounded-full border px-2.5 py-1 text-[10px] leading-none ${edition === '1/50' || (editions.length <= 2 && index === 0) ? 'border-[#e6a15a] text-[#e6a15a]' : 'border-[#573526] text-[#b18a6c]'}`}>
                  {edition}
                </span>
              ))}
            </div>
          </div>

          <div className="order-3 mt-4 hidden items-center gap-3 md:mt-2 md:flex">
            <div className="flex size-11 items-center justify-center rounded-full border border-[#82563a] bg-[#3b2b21] text-[#e4b085]"><UserRound size={21} /></div>
            <div className="text-xs leading-relaxed text-[#bc987d]">Criado por <strong className="block text-[#f5e5d7]">{nft.creator}</strong></div>
            <Check size={15} className="text-[#d99e57]" aria-label="Identidade da coleção verificada na simulação" />
          </div>

          <dl className="order-4 mt-4 space-y-2.5 text-[11px] leading-snug text-[#cda681] md:order-6 md:mt-4 md:text-xs">
            <div className="flex flex-wrap gap-2"><dt>ID do token:</dt><dd>#{tokenNumber}</dd></div>
            <div className="flex flex-wrap gap-2"><dt>Coleção:</dt><dd>{nft.collection}</dd></div>
            <div className="flex flex-wrap gap-2"><dt>Atributos:</dt><dd>{attributes.join(', ')}</dd></div>
          </dl>

          <div className="order-5 mt-7 flex items-center justify-between gap-3 border-t border-[#3c291f] pt-4 md:order-4 md:mt-3 md:border-0 md:pt-0">
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-[#f4e5d5]">Qtd.</span>
              <button type="button" aria-label="Diminuir quantidade" disabled={quantity <= 1} onClick={() => setQuantity(current => Math.max(1, current - 1))} className="flex size-7 items-center justify-center rounded-full bg-[#d48d46] text-[#26150e]"><Minus size={15} /></button>
              <span className="w-5 text-center text-sm text-[#f3e3d4]">{quantity}</span>
              <button type="button" aria-label="Aumentar quantidade" disabled={quantity >= nft.available} onClick={() => setQuantity(current => Math.min(nft.available, current + 1))} className="flex size-7 items-center justify-center rounded-full bg-[#d48d46] text-[#26150e]"><Plus size={15} /></button>
            </div>
            <strong className="text-[1.1rem] font-bold text-[#e49a4b] md:hidden">{nft.priceEth} ETH</strong>
            <span className="hidden text-xs text-[#c4a082] md:inline">{nft.available ? `${nft.available} disponíveis` : 'Esgotado'}</span>
          </div>

          <div className="order-6 mt-4 flex items-center gap-3 md:order-5 md:mt-2">
            <button type="button" disabled={!canPurchase || add.isPending} onClick={() => add.mutate('buy')} className="btn-primary min-h-12 flex-1 !rounded-full !px-4 text-xs md:max-w-[190px] md:!rounded-md md:text-sm">
              {add.isPending ? 'Adicionando…' : 'Comprar NFT'}
            </button>
            <button type="button" aria-label="Add to cart" title="Adicionar ao carrinho" disabled={!canPurchase || add.isPending} onClick={() => add.mutate('cart')} className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[#523322] bg-[#362117] text-[#dfa05b] transition-colors hover:bg-[#4a2e1c]">
              <ShoppingCart size={19} />
            </button>
            <button type="button" aria-label={isFavorite ? `Remover ${nft.title} dos favoritos` : `Favoritar ${nft.title}`} aria-pressed={isFavorite} disabled={favorite.isPending} onClick={toggleFavorite} className="hidden min-h-11 items-center gap-2 rounded-md border border-[#bc8041] px-4 text-xs text-[#e5a260] hover:bg-[#39231a] md:inline-flex">
              <Heart size={15} fill={isFavorite ? 'currentColor' : 'none'} />{isFavorite ? 'Favoritado' : 'Favoritar'}
            </button>
          </div>
          {notice && <p role="status" className="order-7 mt-3 text-xs text-[#e2af79]">{notice} <Link to="/cart" className="underline">Ver carrinho</Link></p>}
          <div className="order-8 mt-5 hidden flex-wrap items-center justify-between gap-4 md:flex">
            <span className="text-[11px] text-[#bea083]">Transações e carteiras simuladas. Nenhum pagamento real.</span>
            <Button variant="outline" className="!border-[#58402e] !bg-transparent !text-[#c89a74]" disabled={simulate.isPending} onClick={() => simulate.mutate()}>
              <Zap size={15} /> Simulate live price update (demo)
            </Button>
          </div>
          </div>
        </div>
      </section>

      <section className="mt-16 hidden md:block" aria-label="Informações adicionais do NFT">
        <div className="flex gap-7 border-b border-[#6b4027]" role="tablist" aria-label="Conteúdo do NFT">
          <button type="button" role="tab" aria-selected={detailTab === 'description'} onClick={() => setDetailTab('description')} className={`pb-3 text-sm font-bold ${detailTab === 'description' ? 'border-b-2 border-[#e4a05a] text-[#e9ad6d]' : 'text-[#ad8b75]'}`}>Detalhes do NFT</button>
          <button type="button" role="tab" aria-selected={detailTab === 'reviews'} onClick={() => setDetailTab('reviews')} className={`pb-3 text-sm font-bold ${detailTab === 'reviews' ? 'border-b-2 border-[#e4a05a] text-[#e9ad6d]' : 'text-[#ad8b75]'}`}>Avaliações de colecionadores ({nft.reviewCount ?? 0})</button>
        </div>
        <div className="max-w-5xl space-y-4 pt-5 text-xs leading-7 text-[#b79880]" role="tabpanel">
          {detailTab === 'description' ? (
            <>
              <p>{nft.description} Cada token representa uma obra digital identificada no catálogo da demonstração KURIO.</p>
              <p>A propriedade, os dados de coleção e as operações exibidas nesta página são simulados e não registram transações em blockchain.</p>
              <h3 className="font-bold text-[#e6ad74]">Rede</h3>
              <p>Ethereum (simulada) · Coleção {nft.collection} · Disponibilidade de {nft.available} de {nft.total} edições.</p>
              <h3 className="font-bold text-[#e6ad74]">Contrato</h3>
              <p>Identificação de contrato e transações ilustrativas para a avaliação técnica.</p>
            </>
          ) : (
            <p>{nft.reviewCount ? `Este NFT apresenta uma avaliação de ${nft.rating?.toFixed(1) ?? '—'} de 5 em ${nft.reviewCount} avaliações simuladas. Comentários individuais não estão disponíveis.` : 'Este NFT ainda não possui avaliações na demonstração.'}</p>
          )}
        </div>
      </section>

      <section className="mt-16 hidden md:block" aria-labelledby="related-heading">
        <div className="mb-6 flex items-center justify-between border-b border-[#64402b] pb-3">
          <h2 id="related-heading" className="text-lg font-bold text-[#e6a465]">Mais desta coleção</h2>
          <Link to="/" hash="explore" className="text-xs text-[#b38c6f] hover:text-[#f5dbba]">Ver mercado</Link>
        </div>
        {relatedQuery.isPending ? (
          <div className="grid grid-cols-5 gap-4" aria-label="Carregando outros NFTs da coleção">
            {Array.from({ length: 5 }, (_, index) => <div key={index} className="skeleton aspect-[.76] rounded-xl" />)}
          </div>
        ) : relatedQuery.isError ? (
          <p role="alert" className="text-sm text-[#ceaa8b]">Não foi possível carregar mais NFTs. <button type="button" onClick={() => relatedQuery.refetch()} className="underline">Tentar novamente</button></p>
        ) : related.length ? (
          <div className="grid grid-cols-5 gap-4 lg:gap-6">{related.map(item => <NftCard key={item.id} nft={item} />)}</div>
        ) : (
          <p className="text-sm text-[#b79b83]">Nenhuma outra obra desta coleção está disponível.</p>
        )}
      </section>
    </main>
  )
}
