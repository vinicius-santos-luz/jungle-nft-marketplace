
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CollectorSidebar } from '../components/CollectorSidebar'
import { RequireAuth, useAuth } from '../lib/auth'
import { marketplaceApi, messageFromError } from '../lib/api'
import type { Network, Wallet } from '../lib/models'

export const Route = createFileRoute('/wallets')({
  component: () => (
    <RequireAuth>
      <WalletsPage />
    </RequireAuth>
  ),
})

const inputClass =
  'h-[40px] w-full rounded-[5px] border border-[#493025] bg-[#261711] px-3 text-[13px] text-[#f5e6d7] outline-none placeholder:text-[#876b59] focus:border-[#d99551] disabled:opacity-60'

const labelClass = 'mb-[10px] block text-[13px] text-[#e8d5c2]'

function WalletsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const walletsQuery = useQuery({
    queryKey: ['wallets', user?.id],
    queryFn: marketplaceApi.wallets,
  })

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: marketplaceApi.profile,
  })

  const wallets = walletsQuery.data ?? []
  const mainWallet = wallets.find(wallet => wallet.primary)
  const secondaryWallets = wallets.filter(wallet => !wallet.primary)

  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [walletLabel, setWalletLabel] = useState('')
  const [network, setNetwork] = useState<Network>('Ethereum')
  const [profileName, setProfileName] = useState('')
  const [address, setAddress] = useState('')
  const [walletType, setWalletType] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [email, setEmail] = useState('')
  const [ensName, setEnsName] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const selectedWallet =
    wallets.find(wallet => wallet.id === selectedWalletId) ??
    mainWallet

  useEffect(() => {
    if (!profileQuery.data) return
    const profile = profileQuery.data
    setDisplayName(profile.name)
    setProfileName(profile.profileName ?? '')
    setWalletType(profile.walletType ?? '')
    setReferralCode(profile.referralCode ?? '')
    setEmail(profile.email)
    setEnsName(profile.ensName ?? '')
  }, [profileQuery.data])

  useEffect(() => {
    if (isAdding) return
    if (!selectedWallet) return
    setWalletLabel(selectedWallet.label)
    setNetwork(selectedWallet.network)
    setAddress(selectedWallet.address)
  }, [selectedWallet, isAdding])

  function startAdding() {
    setIsAdding(true)
    setSelectedWalletId(null)
    setWalletLabel('')
    setNetwork('Ethereum')
    setAddress('')
    setNotice('')
    setError('')
  }

  function selectWallet(wallet: Wallet) {
    setIsAdding(false)
    setSelectedWalletId(wallet.id)
    setWalletLabel(wallet.label)
    setNetwork(wallet.network)
    setAddress(wallet.address)
    setNotice('')
    setError('')
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!/^0x[a-fA-F0-9]{40}$/.test(address.trim())) {
        throw new Error(
          'Informe um endereço público válido: 0x seguido de 40 caracteres hexadecimais.',
        )
      }

      if (!walletLabel.trim()) {
        throw new Error('Informe o apelido da carteira.')
      }

      if (isAdding || !selectedWallet) {
        await marketplaceApi.addWallet({
          label: walletLabel.trim(),
          address: address.trim(),
          network,
          primary: wallets.length === 0,
        })
      } else {
        await marketplaceApi.updateWallet(selectedWallet.id, {
          label: walletLabel.trim(),
          network,
        })
      }

      await marketplaceApi.updateProfile({
        name: displayName,
        email,
        avatar: profileQuery.data?.avatar ?? user?.avatar ?? '',
        profileName,
        walletType,
        referralCode,
        ensName,
      })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wallets'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['session'] }),
      ])
      setIsAdding(false)
      setSelectedWalletId(null)
      setError('')
      setNotice('Carteira salva com sucesso.')
    },
    onError: cause => {
      setNotice('')
      setError(messageFromError(cause))
    },
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    save.mutate()
  }

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-[28px] px-6 pt-[32px] lg:flex-row xl:px-0">
      <CollectorSidebar />

      <div className="min-w-0 flex-1">
        <section aria-labelledby="main-wallet-heading">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1
                id="main-wallet-heading"
                className="text-[22px] font-bold leading-[28px] text-[#f5e9dd]"
              >
                Carteira principal
              </h1>
              <p className="mt-[3px] text-[12px] leading-[18px] text-[#c6a992]">
                Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
              </p>
            </div>

            <button
              type="button"
              onClick={startAdding}
              className="shrink-0 pt-[3px] text-[13px] font-bold text-[#df9955] hover:text-[#f0b778]"
            >
              Adicionar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-[30px]">
            <div className="grid grid-cols-1 gap-x-[28px] gap-y-[29px] md:grid-cols-2">
              <div>
                <label htmlFor="wallet-display-name" className={labelClass}>
                  Nome de exibição*
                </label>
                <input
                  id="wallet-display-name"
                  className={inputClass}
                  required
                  value={displayName}
                  onChange={event => setDisplayName(event.target.value)}
                />
              </div>

              <div>
                <label htmlFor="wallet-label" className={labelClass}>
                  Apelido da carteira*
                </label>
                <input
                  id="wallet-label"
                  className={inputClass}
                  required
                  value={walletLabel}
                  onChange={event => setWalletLabel(event.target.value)}
                />
              </div>

              <div>
                <label htmlFor="wallet-network" className={labelClass}>
                  Rede *
                </label>
                <select
                  id="wallet-network"
                  className={inputClass}
                  value={network}
                  onChange={event => setNetwork(event.target.value as Network)}
                >
                  <option value="Ethereum">Ethereum</option>
                  <option value="Polygon">Polygon</option>
                  <option value="Base">Base</option>
                </select>
              </div>

              <div>
                <label htmlFor="wallet-profile-name" className={labelClass}>
                  Nome do perfil*
                </label>
                <input
                  id="wallet-profile-name"
                  className={inputClass}
                  required
                  value={profileName}
                  onChange={event => setProfileName(event.target.value)}
                />
              </div>

              <div>
                <label htmlFor="wallet-address" className={labelClass}>
                  Endereço da carteira*
                </label>
                <input
                  id="wallet-address"
                  className={inputClass}
                  required
                  pattern="0x[a-fA-F0-9]{40}"
                  title="0x seguido de 40 caracteres hexadecimais"
                  value={address}
                  readOnly={!isAdding && !!selectedWallet}
                  onChange={event => setAddress(event.target.value)}
                />
              </div>

              <div>
                <label htmlFor="wallet-optional-name" className={labelClass}>
                  Nome ENS ou carteira secundária (opcional)
                </label>
                <input
                  id="wallet-optional-name"
                  className={inputClass}
                  placeholder="Nome ou identificação adicional"
                  value={ensName}
                  onChange={event => setEnsName(event.target.value)}
                />
              </div>

              <div>
                <label htmlFor="wallet-type" className={labelClass}>
                  Tipo de carteira*
                </label>
                <select
                  id="wallet-type"
                  className={inputClass}
                  required
                  value={walletType}
                  onChange={event => setWalletType(event.target.value)}
                >
                  <option value="">Selecione</option>
                  <option value="MetaMask">MetaMask</option>
                  <option value="Coinbase Wallet">Coinbase Wallet</option>
                  <option value="WalletConnect">WalletConnect</option>
                  <option value="Outra">Outra</option>
                </select>
              </div>

              <div>
                <label htmlFor="wallet-referral" className={labelClass}>
                  Código de indicação*
                </label>
                <input
                  id="wallet-referral"
                  className={inputClass}
                  required
                  value={referralCode}
                  onChange={event => setReferralCode(event.target.value)}
                />
              </div>

              <div>
                <label htmlFor="wallet-email" className={labelClass}>
                  E-mail*
                </label>
                <input
                  id="wallet-email"
                  type="email"
                  className={inputClass}
                  required
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                />
              </div>

              <div>
                <label htmlFor="wallet-ens" className={labelClass}>
                  Nome ENS *
                </label>
                <div className="flex gap-[10px]">
                  <span className="flex h-[40px] w-[78px] shrink-0 items-center justify-center rounded-[5px] border border-[#493025] bg-[#261711] text-[13px] text-[#e8d5c2]">
                    .eth
                  </span>
                  <input
                    id="wallet-ens"
                    className={inputClass}
                    value={ensName}
                    onChange={event => setEnsName(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={
                save.isPending ||
                walletsQuery.isPending ||
                profileQuery.isPending
              }
              className="mt-[32px] h-[40px] min-w-[131px] rounded-[5px] bg-[#d99551] px-5 text-[13px] font-bold text-[#24140d] hover:bg-[#e9a866] disabled:opacity-60"
            >
              {save.isPending ? 'Salvando...' : 'Salvar carteira'}
            </button>

            {error && (
              <p role="alert" className="mt-4 text-[13px] text-red-300">
                {error}
              </p>
            )}

            {notice && (
              <p role="status" className="mt-4 text-[13px] text-[#e8ad71]">
                {notice}
              </p>
            )}

            {(walletsQuery.isError || profileQuery.isError) && (
              <p role="alert" className="mt-4 text-[13px] text-red-300">
                {walletsQuery.isError
                  ? messageFromError(walletsQuery.error)
                  : messageFromError(profileQuery.error)}
              </p>
            )}
          </form>
        </section>

        <section className="mt-[31px]" aria-labelledby="secondary-wallet-heading">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2
                id="secondary-wallet-heading"
                className="text-[22px] font-bold leading-[28px] text-[#f5e9dd]"
              >
                Carteira secundária
              </h2>
              <p className="mt-[3px] text-[12px] leading-[18px] text-[#c6a992]">
                Adicione outras carteiras para utilizar no pagamento ou recebimento de NFTs.
              </p>
            </div>

            <div className="flex items-center gap-4 pt-[3px]">
              <span className="text-[12px] text-[#c6a992]">
                Igual à carteira principal
              </span>
              <button
                type="button"
                onClick={startAdding}
                className="text-[13px] font-bold text-[#df9955] hover:text-[#f0b778]"
              >
                Adicionar
              </button>
            </div>
          </div>

          {secondaryWallets.length > 0 && (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {secondaryWallets.map(wallet => (
                <button
                  key={wallet.id}
                  type="button"
                  onClick={() => selectWallet(wallet)}
                  className="rounded-[5px] border border-[#493025] bg-[#261711] p-4 text-left hover:border-[#d99551]"
                >
                  <span className="block text-[13px] font-bold text-[#f5e6d7]">
                    {wallet.label}
                  </span>
                  <span className="mt-2 block break-all text-[11px] text-[#c6a992]">
                    {wallet.address}
                  </span>
                  <span className="mt-2 block text-[11px] text-[#df9955]">
                    {wallet.network}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!isAdding && selectedWalletId && (
            <button
              type="button"
              onClick={() => {
                setSelectedWalletId(null)
                setNotice('')
                setError('')
              }}
              className="mt-4 text-[12px] text-[#df9955] underline"
            >
              Voltar à carteira principal
            </button>
          )}
        </section>
      </div>
    </main>
  )
}
