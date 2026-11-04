import { useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock3, X, XCircle } from 'lucide-react'
import { RequireAuth, useAuth } from '../lib/auth'
import { marketplaceApi, messageFromError } from '../lib/api'
import { NftArtwork } from '../components/NftArtwork'

export const Route = createFileRoute('/order/$id')({
  component: () => <RequireAuth><OrderPage /></RequireAuth>,
})

function OrderPage() {
  const { id } = Route.useParams()
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['order', id, user?.id],
    queryFn: () => marketplaceApi.order(id),
    refetchInterval: result => result.state.data?.status === 'pending' ? 800 : false,
  })

  useEffect(() => {
    if (query.data && query.data.status !== 'pending') {
      localStorage.removeItem('jungle-checkout-attempt')
    }
  }, [query.data])

  if (query.isPending) return <main className="mx-auto max-w-3xl px-6 py-24 text-center" role="status">Carregando pedido…</main>
  if (query.isError) return <main className="mx-auto max-w-3xl px-6 py-24" role="alert">{messageFromError(query.error)}</main>

  const order = query.data
  const confirmed = order.status === 'confirmed'
  const pending = order.status === 'pending'
  const total = Number(order.quote.total).toFixed(3)
  const date = new Date(order.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  const shortRef = `${order.txRef.slice(0, 6)}...${order.txRef.slice(-4)}`
  const wallet = order.collector.walletType || 'Carteira digital'

  return (
    <main className="fixed inset-0 z-50 overflow-y-auto bg-[#120a07] px-4 py-8 text-[#f7f0e8] sm:flex sm:items-center sm:justify-center sm:py-12">
      <section className="relative mx-auto w-full max-w-[464px] border-b-[7px] border-[#df9850] bg-[#261711] shadow-2xl" aria-label="Detalhes do pedido">
        <Link to={confirmed ? '/' : '/cart'} aria-label="Fechar confirmação" className="absolute right-3 top-3 z-10 p-1 text-[#c98542] hover:text-[#ffb96a]">
          <X size={17} strokeWidth={1.5} />
        </Link>

        <header className="border-b border-[#b97a3b] px-7 pb-4 pt-5 text-center">
          <div className="mx-auto flex h-[68px] w-[68px] items-center justify-center text-[#e59b4b]">
            {pending ? <Clock3 size={51} strokeWidth={1.5} /> : confirmed ? <CheckCircle2 size={51} strokeWidth={1.5} /> : <XCircle size={51} strokeWidth={1.5} />}
          </div>
          <h1 className="sr-only">{pending ? 'Processing your order' : confirmed ? 'Order confirmed!' : 'Payment declined'}</h1>
          <p className="mt-2 text-[13px] font-semibold tracking-wide text-[#e0c29d]">
            {pending ? 'Sua transação está sendo processada' : confirmed ? 'Seus NFTs agora estão na sua carteira' : 'Pagamento recusado'}
          </p>
          <p className="sr-only" role="status">
            {pending ? 'Aguardando confirmação do pedido simulado.' : confirmed ? 'Compra simulada confirmada.' : 'Os NFTs permanecem no carrinho.'}
          </p>
        </header>

        <div className="grid grid-cols-4 gap-0 border-b border-[#b97a3b] px-6 py-3 text-[11px] leading-tight text-[#e0c29d]">
          <div className="border-r border-[#7b4b2b] pr-2"><span className="block">ID da transação</span><strong className="mt-1 block truncate font-normal text-[#f3e5d6]" title={order.txRef}>{shortRef}</strong></div>
          <div className="border-r border-[#7b4b2b] px-2"><span className="block">Data</span><strong className="mt-1 block whitespace-nowrap font-normal text-[#f3e5d6]">{date}</strong></div>
          <div className="border-r border-[#7b4b2b] px-2"><span className="block">Total</span><strong className="mt-1 block whitespace-nowrap font-normal text-[#f3e5d6]">{total} ETH</strong></div>
          <div className="pl-2"><span className="block">Carteira</span><strong className="mt-1 block truncate font-normal text-[#f3e5d6]" title={wallet}>{wallet}</strong></div>
        </div>

        <div className="px-7 pb-8 pt-4">
          <h2 className="text-[13px] font-semibold">Detalhes da transação</h2>
          <h3 className="sr-only">Receipt snapshot</h3>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_56px_95px] border-b border-[#68402c] pb-2 text-[12px] font-semibold">
            <span>NFTs</span><span className="text-center">Edições</span><span className="text-right">Subtotal</span>
          </div>
          <div className="space-y-3 py-3">
            {order.quote.lines.map(line => (
              <div key={line.nftId} className="grid grid-cols-[minmax(0,1fr)_56px_95px] items-center gap-0">
                <div className="flex min-w-0 items-center gap-3">
                  <NftArtwork nft={line.nft} className="!h-14 !w-14 shrink-0 rounded-md" />
                  <div className="min-w-0"><p className="truncate text-[12px] font-semibold">{line.nft.title}</p><p className="mt-1 truncate text-[10px] text-[#c99a65]">ID do token: {line.nft.tokenNumber ? `#${line.nft.tokenNumber}` : line.nft.id}</p></div>
                </div>
                <span className="text-center text-[11px] text-[#d2a776]">(x {line.quantity})</span>
                <strong className="text-right text-[12px] text-[#e49a4e]">{(Number(line.nft.priceEth) * line.quantity).toFixed(2)} ETH</strong>
              </div>
            ))}
          </div>
          <div className="mt-1 space-y-2 border-b border-[#68402c] pb-3 text-[12px]">
            <div className="flex justify-end gap-8"><span>Taxa de rede</span><span className="w-[100px] text-right">{Number(order.quote.networkFee).toFixed(3)} ETH</span></div>
            <div className="flex justify-end gap-8 font-semibold"><span>Total</span><span className="w-[100px] text-right text-[#e49a4e]">{total} ETH</span></div>
          </div>
          <p className="mx-auto mt-3 max-w-[355px] text-center text-[11px] leading-[1.65] text-[#c9a77e]">
            {confirmed ? `Transação simulada confirmada na rede ${order.network}. Nenhuma transferência real foi realizada.` : pending ? 'Aguardando a confirmação da transação simulada.' : 'A transação simulada foi recusada. Os NFTs continuam no carrinho.'}
          </p>
          <div className="mt-4 flex justify-center">
            {confirmed ? (
              <button type="button" disabled title="Transação simulada: não existe registro no Etherscan" className="cursor-not-allowed rounded bg-[#dd9850] px-4 py-3 text-[12px] font-semibold text-[#1d120c] opacity-80">Ver no Etherscan</button>
            ) : (
              <Link to="/cart" className="rounded bg-[#dd9850] px-4 py-3 text-[12px] font-semibold text-[#1d120c]">Voltar ao carrinho</Link>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
