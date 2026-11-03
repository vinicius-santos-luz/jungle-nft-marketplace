import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { marketplaceApi, messageFromError } from '../lib/api'
import { NftArtwork } from '../components/NftArtwork'

const formatEth = (value: string | number | undefined) => {
  if (value === undefined) return '—'
  return Number(value).toFixed(6).replace(/\.?0+$/, '')
}

export const Route = createFileRoute('/cart')({ component: CartPage })

function CartPage() {
  const [draftCoupon, setDraftCoupon] = useState('')
  const [coupon, setCoupon] = useState<string | null>(() => sessionStorage.getItem('jungle-coupon'))
  const queryClient = useQueryClient()
  const cart = useQuery({ queryKey: ['cart'], queryFn: marketplaceApi.cart })
  const recommendations = useQuery({
    queryKey: ['cart-recommendations'],
    queryFn: () => marketplaceApi.catalog({ page: 1 }),
  })

  const recommendedTitles = [
    'Cosmic Bloom #118',
    'Violet Nomad #314',
    'Ivory Baron #088',
    'Golden Beat #207',
    'Golden Signal #160',
  ]

  const recommendedNfts = recommendedTitles
    .map(title => recommendations.data?.items.find(nft => nft.title === title))
    .filter((nft): nft is NonNullable<typeof nft> => nft !== undefined)
  const quote = useQuery({
    queryKey: ['quote', cart.data?.items, coupon, 'Ethereum'],
    queryFn: () => marketplaceApi.quote(coupon, 'Ethereum'),
    enabled: !!cart.data?.items.length,
    retry: false,
  })
  const change = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) =>
      qty === 0 ? marketplaceApi.removeCart(id) : marketplaceApi.updateCart(id, qty),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
    },
  })
  const lines = cart.data?.lines ?? []
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0)

  const applyCoupon = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = draftCoupon.trim() || null
    setCoupon(code)
    if (code) sessionStorage.setItem('jungle-coupon', code)
    else sessionStorage.removeItem('jungle-coupon')
  }

  const removeCoupon = () => {
    setCoupon(null)
    setDraftCoupon('')
    sessionStorage.removeItem('jungle-coupon')
  }

  return (
    <main className="mx-auto max-w-[1300px] px-5 pb-20 pt-9 text-[#f5eee7] sm:px-8 lg:px-10 xl:px-12">
      <nav aria-label="Caminho de navegação" className="mb-5 flex flex-wrap items-center gap-2 text-sm font-bold text-[#f4e9de]">
        <Link to="/" className="hover:text-[#dc9650]">Início</Link>
        <span>/</span>
        <Link to="/" hash="explore" className="hover:text-[#dc9650]">Mercado</Link>
        <span>/</span>
        <span aria-current="page">Carrinho</span>
      </nav>

      {cart.isPending ? (
        <div className="skeleton h-72 rounded-xl" aria-label="Carregando carrinho" />
      ) : cart.isError ? (
        <div className="panel p-8" role="alert">
          {messageFromError(cart.error)}
          <button type="button" onClick={() => void cart.refetch()} className="btn-secondary ml-5">Retry</button>
        </div>
      ) : !lines.length ? (
        <div className="flex min-h-[330px] flex-col items-center justify-center rounded-xl border border-[#44291b] bg-[#241611] px-6 py-14 text-center">
          <ShoppingBag size={48} className="text-[#dc9650]" aria-hidden="true" />
          <h1 className="mt-5 text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-2 text-sm text-[#c4a18a]">Discover something remarkable.</p>
          <Link to="/" className="btn-primary mt-6">Explore NFTs</Link>
        </div>
      ) : (
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.85fr)_minmax(320px,0.88fr)] xl:gap-16">
          <section aria-label="Itens no carrinho" className="min-w-0">
            <div className="mb-3 grid grid-cols-[minmax(0,1fr)_105px_120px_105px_30px] gap-3 border-b border-[#69402a] pb-3 text-sm font-bold max-md:hidden xl:grid-cols-[minmax(0,1fr)_115px_130px_125px_32px]">
              <span>NFTs</span><span>Preço</span><span>Edições</span><span>Total</span><span />
            </div>
            <div className="space-y-3">
              {lines.map(({ nft, quantity }) => {
                const lineTotal = (Number(nft.priceEth) * quantity).toFixed(2)
                const tokenNumber = nft.tokenNumber
                return (
                  <article key={nft.id} className="rounded-sm bg-[#281813] px-3 py-3 md:grid md:grid-cols-[minmax(0,1fr)_105px_120px_105px_30px] md:items-center md:gap-3 xl:grid-cols-[minmax(0,1fr)_115px_130px_125px_32px]">
                    <div className="flex min-w-0 items-center gap-3">
                      <Link to="/nft/$id" params={{ id: nft.id }} className="block size-[76px] shrink-0 overflow-hidden rounded-lg sm:size-[84px]">
                        <NftArtwork nft={nft} className="h-full w-full object-cover" />
                      </Link>
                      <div className="min-w-0">
                        <Link to="/nft/$id" params={{ id: nft.id }} className="block truncate text-sm font-bold hover:text-[#dc9650] xl:text-base">{nft.title}</Link>
                        <p className="mt-1 text-xs text-[#aa835e]">ID do token: {tokenNumber ? `#${tokenNumber}` : 'Não informado'}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2 md:mt-0">
                      <span className="text-xs text-[#a58b78] md:hidden">Preço</span>
                      <span className="whitespace-nowrap text-sm font-semibold text-[#cda983]">{nft.priceEth} ETH</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 md:mt-0">
                      <span className="text-xs text-[#a58b78] md:hidden">Edições</span>
                      <div className="flex items-center gap-2">
                        <button type="button" aria-label={`Diminuir ${nft.title}`} disabled={change.isPending} onClick={() => change.mutate({ id: nft.id, qty: quantity - 1 })} className="flex size-7 items-center justify-center rounded-full bg-[#d58b4b] text-[#1a100b] hover:bg-[#efad6a] disabled:opacity-50"><Minus size={15} /></button>
                        <span className="min-w-5 text-center text-sm">{quantity}</span>
                        <button type="button" aria-label={`Aumentar ${nft.title}`} disabled={quantity >= nft.available || change.isPending} onClick={() => change.mutate({ id: nft.id, qty: quantity + 1 })} className="flex size-7 items-center justify-center rounded-full bg-[#d58b4b] text-[#1a100b] hover:bg-[#efad6a] disabled:opacity-50"><Plus size={15} /></button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 md:mt-0">
                      <span className="text-xs text-[#a58b78] md:hidden">Total</span>
                      <strong className="whitespace-nowrap text-sm text-[#df9a4f]">{lineTotal} ETH</strong>
                    </div>
                    <div className="mt-3 flex justify-end md:mt-0">
                      <button type="button" aria-label="Remove" title={`Remover ${nft.title}`} disabled={change.isPending} onClick={() => change.mutate({ id: nft.id, qty: 0 })} className="text-[#ac885d] hover:text-[#efad6a]"><Trash2 size={19} /></button>
                    </div>
                  </article>
                )
              })}
            </div>
            {change.isError && <p role="alert" className="mt-3 text-sm text-red-300">{messageFromError(change.error)}</p>}
          </section>

          <aside className="min-w-0" aria-label="Resumo da carteira">
            <h2 className="border-b border-[#69402a] pb-3 text-lg font-bold">Resumo da carteira</h2>
            <form className="mt-6" onSubmit={applyCoupon}>
              <label htmlFor="cart-coupon" className="mb-2 block text-sm font-bold">Código promocional</label>
              <div className="flex min-w-0">
                <input id="cart-coupon" aria-label="Código do cupom" className="min-w-0 flex-1 rounded-l-md border border-[#bd7d3e] bg-[#1a100c] px-3 py-3 text-xs text-[#f5e6d7] outline-offset-2 placeholder:text-[#a17d58]" value={draftCoupon} onChange={event => setDraftCoupon(event.target.value)} placeholder="Digite o código promocional..." />
                <button type="submit" className="shrink-0 rounded-r-md bg-[#d58b4b] px-4 font-bold text-[#1a100b] hover:bg-[#e9a260]" aria-label="Apply">Aplicar</button>
              </div>
            </form>
            {coupon && <button type="button" onClick={removeCoupon} className="mt-2 text-xs text-[#dca061] underline" aria-label={`Remove coupon ${coupon}`}>Remover cupom {coupon}</button>}
            {quote.isError && <p role="alert" className="mt-4 text-sm text-red-300">{messageFromError(quote.error)}</p>}
            <dl className="mt-7 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#d1c1b5]">Subtotal</dt>
                <dd className="whitespace-nowrap">{formatEth(quote.data?.subtotal)} ETH</dd>
              </div>

              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#d1c1b5]">Desconto do lançamento</dt>
                <dd className="whitespace-nowrap">
                  (-) {Number(quote.data?.discount ?? 0).toFixed(2)}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#d1c1b5]">Taxa de rede</dt>
                <dd className="whitespace-nowrap">{formatEth(quote.data?.networkFee)} ETH</dd>
              </div>

              <p className="text-right text-xs text-[#d58b4b]">Taxa estimada</p>

              <div className="flex items-center justify-between gap-3 pt-3 text-lg font-bold">
                <dt>Total</dt>
                <dd className="whitespace-nowrap text-[#df9a4f]">
                  {formatEth(quote.data?.total)} ETH
                </dd>
              </div>
            </dl>
            <Link to="/checkout" aria-disabled={quote.isError || !quote.data} tabIndex={quote.isError || !quote.data ? -1 : undefined} className={`mt-7 flex min-h-12 w-full items-center justify-center rounded-md bg-[#d58b4b] px-4 text-center text-sm font-bold text-[#1a100b] hover:bg-[#e9a260] ${quote.isError || !quote.data ? 'pointer-events-none opacity-50' : ''}`}>Conectar e finalizar</Link>
            <Link to="/" hash="explore" className="mt-4 block text-center text-sm text-[#d58b4b] hover:underline">Continuar explorando</Link>
            <span className="sr-only">{itemCount} edições no carrinho</span>
          </aside>
        </div>
      )}

      <section
        aria-labelledby="cart-recommendations-title"
        className="mt-20"
      >
        <h2
          id="cart-recommendations-title"
          className="border-b border-[#69402a] pb-2 text-base font-bold text-[#d58b4b]"
        >
          Colecionadores também viram
        </h2>

        <div className="mt-7 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
          {recommendedNfts.map(nft => (
            <article key={nft.id} className="min-w-0">
              <Link
                to="/nft/$id"
                params={{ id: nft.id }}
                className="block"
                aria-label={`Ver ${nft.title}`}
              >
                <div className="bg-[#281813] p-3">
                  <div className="aspect-square overflow-hidden rounded-xl">
                    <NftArtwork
                      nft={nft}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                <h3 className="mt-2 text-sm text-[#f5eee7]">
                  {nft.title}
                </h3>

                <p className="mt-1 text-sm font-bold text-[#d58b4b]">
                  {nft.priceEth} ETH
                </p>
              </Link>
            </article>
          ))}
        </div>

        <div
          className="mt-7 flex justify-center gap-2"
          aria-label="Indicadores de recomendações"
        >
          <span className="h-2.5 w-2.5 rounded-full border border-[#d58b4b]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#d58b4b]" />
          <span className="h-2.5 w-2.5 rounded-full border border-[#d58b4b]" />
        </div>
      </section>
    </main>
  )
}
