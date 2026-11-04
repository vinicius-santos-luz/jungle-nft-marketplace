import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { RequireAuth, useAuth } from '../lib/auth'
import { marketplaceApi, messageFromError } from '../lib/api'
import { NftArtwork } from '../components/NftArtwork'
import type { CollectorDetails, Network } from '../lib/models'
export const Route = createFileRoute('/checkout')({
  component: () => <RequireAuth><CheckoutPage /></RequireAuth>,
})
const formatEth = (value: string | number | undefined) => {
  if (value === undefined) return '—'
  return Number(value).toFixed(6).replace(/\.?0+$/, '')
}
const fieldClass =
  'mt-1.5 h-10 w-full min-w-0 rounded-sm border border-[#4c2c20] bg-[#180e0b] px-3 text-sm text-[#f5e9dc] outline-offset-2 placeholder:text-[#9d795c] focus:border-[#d58b4b]'
function CheckoutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [network, setNetwork] = useState<Network>('Ethereum')
  const [coupon] = useState<string | null>(
    () => sessionStorage.getItem('jungle-coupon')
  )
  const [walletId, setWalletId] = useState('')
  const [collector, setCollector] = useState<CollectorDetails>({
    displayName: '',
    username: '',
    profileName: '',
    walletAddress: '',
    walletType: '',
    referralCode: '',
    email: '',
    ensName: '',
    secondaryWallet: '',
    notes: '',
  })
  const updateCollector = (
    field: keyof CollectorDetails,
    value: string
  ) => {
    setCollector(previous => ({
      ...previous,
      [field]: value,
    }))
  }
  const [useOtherWallet, setUseOtherWallet] = useState(false)
  const wallets = useQuery({
    queryKey: ['wallets', user?.id],
    queryFn: marketplaceApi.wallets,
  })
  const cart = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: marketplaceApi.cart,
  })
  const quote = useQuery({
    queryKey: ['quote', user?.id, cart.data?.items, coupon, network],
    queryFn: () => marketplaceApi.quote(coupon, network),
    enabled: !!cart.data?.items.length,
    retry: false,
    refetchInterval: 1500,
  })
  const selectedWallet =
    walletId ||
    wallets.data?.find(wallet => wallet.primary)?.id ||
    wallets.data?.[0]?.id ||
    ''
  const activeWallet = wallets.data?.find(
    wallet => wallet.id === selectedWallet
  )
  const collectorIsValid =
    collector.displayName.trim().length > 0 &&
    /^[a-zA-Z0-9_-]{3,30}$/.test(collector.username) &&
    collector.profileName.trim().length > 0 &&
    !!activeWallet &&
    /^0x[a-fA-F0-9]{40}$/.test(activeWallet.address) &&
    activeWallet.network === network &&
    collector.walletType.trim().length > 0 &&
    collector.referralCode.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(collector.email) &&
    collector.email.trim().toLowerCase() ===
    (user?.email ?? '').trim().toLowerCase() &&
    /^[a-z0-9-]+\.eth$/i.test(collector.ensName.trim())
  const placeOrder = useMutation({
    mutationFn: async () => {
      if (!quote.data || !activeWallet) {
        throw new Error('Revise os valores e selecione uma carteira.')
      }
      if (!collectorIsValid) {
        throw new Error(
          'Preencha corretamente todos os campos obrigatórios do colecionador.'
        )
      }
      if (activeWallet.network !== network) {
        throw new Error('A carteira selecionada não pertence à rede escolhida.')
      }
      const collectorPayload: CollectorDetails = {
        ...collector,
        displayName: collector.displayName.trim(),
        username: collector.username.trim(),
        profileName: collector.profileName.trim(),
        walletAddress: activeWallet.address,
        walletType: collector.walletType.trim(),
        referralCode: collector.referralCode.trim(),
        email: collector.email.trim(),
        ensName: collector.ensName.trim(),
        secondaryWallet: collector.secondaryWallet?.trim(),
        notes: collector.notes?.trim(),
      }
      const payload = {
        coupon,
        network,
        walletId: activeWallet.id,
        quoteRevision: quote.data.revision,
        collector: collectorPayload,
        decline: false,
      }
      const fingerprint = JSON.stringify(payload)
      const previous = JSON.parse(
        localStorage.getItem('jungle-checkout-attempt') || 'null'
      ) as { fingerprint: string; key: string } | null
      const attempt =
        previous?.fingerprint === fingerprint
          ? previous
          : { fingerprint, key: crypto.randomUUID() }
      localStorage.setItem(
        'jungle-checkout-attempt',
        JSON.stringify(attempt)
      )
      return marketplaceApi.createOrder(payload, attempt.key)
    },
    onSuccess: order => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void navigate({
        to: '/order/$id',
        params: { id: order.id },
      })
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ['quote'] })
    },
  })
  const lines = cart.data?.lines ?? []
  return (
    <main className="mx-auto max-w-[1300px] px-5 pb-20 pt-5 text-[#f5eee7] sm:px-8 lg:px-10 xl:px-12">
      <nav
        aria-label="Caminho de navegação"
        className="mb-7 flex flex-wrap gap-2 text-sm font-bold"
      >
        <Link to="/" className="hover:text-[#d58b4b]">Início</Link>
        <span>/</span>
        <Link to="/" className="hover:text-[#d58b4b]">Mercado</Link>
        <span>/</span>
        <span aria-current="page">Pagamento</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
        <section aria-labelledby="collector-title">
          <h1
            id="collector-title"
            className="mb-4 text-lg font-bold"
          >
            Perfil do colecionador
          </h1>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <label className="text-sm">
              Nome de exibição <span className="text-[#d58b4b]">*</span>
              <input
                className={fieldClass}
                required
                value={collector.displayName}
                onChange={event =>
                  updateCollector('displayName', event.target.value)
                }
                placeholder="Nome de exibição"
              />
            </label>
            <label className="text-sm">
              Nome de usuário <span className="text-[#d58b4b]">*</span>
              <input
                className={fieldClass}
                placeholder="Nome de usuário"
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_-]{3,30}"
                value={collector.username}
                onChange={event =>
                  updateCollector('username', event.target.value)
                }
              />
            </label>
            <label className="text-sm">
              Rede <span className="text-[#d58b4b]">*</span>
              <select
                className={fieldClass}
                value={network}
                onChange={event => {
                  setNetwork(event.target.value as Network)
                }}
              >
                <option value="Ethereum">Ethereum</option>
                <option value="Polygon">Polygon</option>
                <option value="Base">Base</option>
              </select>
            </label>
            <label className="text-sm">
              Nome do perfil <span className="text-[#d58b4b]">*</span>
              <input
                className={fieldClass}
                placeholder="Nome do perfil"
                required
                value={collector.profileName}
                onChange={event =>
                  updateCollector('profileName', event.target.value)
                }
              />
            </label>
            <label className="text-sm">
              Endereço da carteira <span className="text-[#d58b4b]">*</span>
              <select
                className={fieldClass}
                aria-label="Carteira"
                required
                value={selectedWallet}
                onChange={event => {
                  setWalletId(event.target.value)
                }}
              >
                {!wallets.data?.length && (
                  <option value="">Nenhuma carteira cadastrada</option>
                )}
                {wallets.data?.map(wallet => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.label} · {wallet.address}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Carteira secundária
              <input
                className={fieldClass}
                placeholder="ENS ou carteira secundária (opcional)"
                value={collector.secondaryWallet ?? ''}
                onChange={event =>
                  updateCollector('secondaryWallet', event.target.value)
                }
              />
            </label>
            <label className="text-sm">
              Tipo de carteira <span className="text-[#d58b4b]">*</span>
              <select
                className={fieldClass}
                required
                value={collector.walletType}
                onChange={event =>
                  updateCollector('walletType', event.target.value)
                }
              >
                <option value="">Selecione uma carteira</option>
                <option value="MetaMask">MetaMask</option>
                <option value="Coinbase Wallet">Coinbase Wallet</option>
                <option value="WalletConnect">WalletConnect</option>
              </select>
            </label>
            <label className="text-sm">
              Código de indicação <span className="text-[#d58b4b]">*</span>
              <input
                className={fieldClass}
                placeholder="Código de indicação"
                required
                value={collector.referralCode}
                onChange={event =>
                  updateCollector('referralCode', event.target.value)
                }
              />
            </label>
            <label className="text-sm">
              E-mail <span className="text-[#d58b4b]">*</span>
              <input
                type="email"
                className={fieldClass}
                required
                value={collector.email}
                onChange={event =>
                  updateCollector('email', event.target.value)
                }
              />
            </label>
            <label className="text-sm">
              Nome ENS <span className="text-[#d58b4b]">*</span>
              <input
                className={fieldClass}
                placeholder="nome.eth (opcional)"
                required
                value={collector.ensName}
                onChange={event =>
                  updateCollector('ensName', event.target.value)
                }
              />
            </label>
          </div>
          <label className="mt-5 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-[#d58b4b]"
              checked={useOtherWallet}
              onChange={event => setUseOtherWallet(event.target.checked)}
            />
            Usar outra carteira?
          </label>
          {useOtherWallet && (
            <p className="mt-2 text-xs text-[#c7a48b]">
              Para utilizar outra carteira na compra, cadastre-a em{' '}
              <Link to="/wallets" className="underline text-[#d58b4b]">
                Gerenciar carteiras
              </Link>.
            </p>
          )}
          <div className="mt-6">
            <label
              htmlFor="collector-notes"
              className="block text-sm text-[#f5eee7]"
            >
              Observação do colecionador (opcional)
            </label>
            <textarea
              id="collector-notes"
              rows={6}
              className="mt-3 block h-[166px] w-full max-w-[350px] resize-none rounded-sm border border-[#4c2c20] bg-[#180e0b] p-3 text-sm text-[#f5eee7] outline-offset-2 focus:border-[#d58b4b]"
              value={collector.notes ?? ''}
              onChange={event =>
                updateCollector('notes', event.target.value)
              }
            />
          </div>
        </section>
        <aside aria-labelledby="order-title" className="min-w-0">
          <h2 id="order-title" className="text-lg font-bold">
            Seus NFTs
          </h2>
          <div className="mt-2 flex justify-between border-b border-[#69402a] pb-2 text-sm font-bold">
            <span>NFTs</span>
            <span>Subtotal</span>
          </div>
          <div className="mt-3 space-y-2">
            {lines.map(line => (
              <article
                key={line.nft.id}
                className="flex items-center gap-2 bg-[#281813] p-1.5"
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-sm">
                  <NftArtwork
                    nft={line.nft}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{line.nft.title}</p>
                  <p className="mt-1 text-xs text-[#aa835e]">
                    ID do token: #{line.nft.tokenNumber ?? '—'}
                    <span className="ml-2">× {line.quantity}</span>
                  </p>
                </div>
                <strong className="shrink-0 text-sm text-[#d58b4b]">
                  {formatEth(
                    Number(line.nft.priceEth) * line.quantity
                  )} ETH
                </strong>
              </article>
            ))}
          </div>
          {quote.isError && (
            <div role="alert" className="mt-4 flex gap-2 text-sm text-red-300">
              <AlertTriangle size={18} />
              {messageFromError(quote.error)}
            </div>
          )}
          <p className="mt-4 text-xs text-[#c5a48e]">
            Tem um código promocional?{' '}
            <Link to="/cart" className="underline hover:text-[#d58b4b]">
              Aplique aqui
            </Link>
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt>Subtotal</dt>
              <dd>{formatEth(quote.data?.subtotal)} ETH</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Desconto do lançamento</dt>
              <dd>(-) {formatEth(quote.data?.discount)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Taxa de rede</dt>
              <dd>{formatEth(quote.data?.networkFee)} ETH</dd>
            </div>
            <p className="text-right text-xs text-[#d58b4b]">
              Taxa estimada
            </p>
            <div className="flex justify-between gap-3 border-t border-[#69402a] pt-3 text-base font-bold">
              <dt>Total</dt>
              <dd className="text-[#d58b4b]">
                {formatEth(quote.data?.total)} ETH
              </dd>
            </div>
          </dl>
          <h3 className="mt-5 text-center text-base font-bold">
            Carteira e rede
          </h3>
          <div className="mt-3 space-y-3">
            <div className="rounded-sm border border-[#69402a] p-3 text-xs text-[#d58b4b]">
              Rede selecionada: {network}
            </div>
            <button
              type="button"
              onClick={() => updateCollector('walletType', 'MetaMask')}
              aria-pressed={collector.walletType === 'MetaMask'}
              className={`w-full rounded-sm border p-3 text-left text-sm ${collector.walletType === 'MetaMask'
                ? 'border-[#d58b4b] bg-[#281813]'
                : 'border-[#69402a]'
            }`}
            >
            ◯ MetaMask
          </button>
          <button
            type="button"
            onClick={() => updateCollector('walletType', 'Coinbase Wallet')}
            aria-pressed={collector.walletType === 'Coinbase Wallet'}
            className={`w-full rounded-sm border p-3 text-left text-sm ${collector.walletType === 'Coinbase Wallet'
              ? 'border-[#d58b4b] bg-[#281813]'
              : 'border-[#69402a]'
          }`}
            >
          ◯ Coinbase Wallet
        </button>
      </div>
      <button
        type="button"
        className="mt-5 flex min-h-11 w-full items-center justify-center rounded-md bg-[#d58b4b] px-4 font-bold text-[#1a100b] hover:bg-[#e9a260] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={
          !quote.data ||
          !collectorIsValid ||
          quote.isFetching ||
          placeOrder.isPending
        }
        onClick={() => placeOrder.mutate()}
      >
        {placeOrder.isPending
          ? 'Processando...'
          : 'Confirmar compra'}
      </button>
      {placeOrder.isError && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {messageFromError(placeOrder.error)}
        </p>
      )}
    </aside>
      </div >
    </main >
  )
}
