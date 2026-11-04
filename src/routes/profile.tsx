
import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, UserRound } from 'lucide-react'
import { RequireAuth, useAuth } from '../lib/auth'
import { marketplaceApi, messageFromError } from '../lib/api'
import { CollectorSidebar } from '../components/CollectorSidebar'

export const Route = createFileRoute('/profile')({
  component: () => (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  ),
})

const fieldClass =
  'h-[40px] w-full rounded-[5px] border border-[#493025] bg-[#261711] px-3 text-[13px] text-[#f5e6d7] outline-none placeholder:text-[#876b59] focus:border-[#d99551]'

const labelClass = 'mb-[10px] block text-[13px] text-[#e8d5c2]'

function ProfilePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const profile = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: marketplaceApi.profile,
  })

  const wallets = useQuery({
    queryKey: ['wallets', user?.id],
    queryFn: marketplaceApi.wallets,
  })

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [ensName, setEnsName] = useState('')
  const [walletLabel, setWalletLabel] = useState('')
  const [avatar, setAvatar] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const mainWallet = wallets.data?.find(wallet => wallet.primary)

  useEffect(() => {
    if (!profile.data) return
    setName(profile.data.name)
    setUsername(profile.data.username ?? '')
    setEmail(profile.data.email)
    setEnsName(profile.data.ensName ?? '')
    setAvatar(profile.data.avatar)
  }, [profile.data])

  useEffect(() => {
    if (mainWallet) setWalletLabel(mainWallet.label)
  }, [mainWallet])

  const edit = useMutation({
    mutationFn: async () => {
      await marketplaceApi.updateProfile({
        name,
        username,
        email,
        ensName,
        avatar,
      })

      if (mainWallet && walletLabel.trim() !== mainWallet.label) {
        await marketplaceApi.updateWallet(mainWallet.id, {
          label: walletLabel.trim(),
        })
      }

      if (currentPassword || newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error('As novas senhas não coincidem.')
        }

        if (newPassword.length < 8) {
          throw new Error('A nova senha deve ter pelo menos 8 caracteres.')
        }

        await marketplaceApi.updatePassword(currentPassword, newPassword)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
      void queryClient.invalidateQueries({ queryKey: ['session'] })
      void queryClient.invalidateQueries({ queryKey: ['wallets'] })

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setMessage('Dados salvos com sucesso.')
      setError('')
    },
    onError: cause => {
      setError(messageFromError(cause))
      setMessage('')
    },
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (newPassword !== confirmPassword) {
      setError('As novas senhas não coincidem.')
      return
    }

    edit.mutate()
  }

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-[28px] px-6 pt-[32px] lg:flex-row xl:px-0">
      <CollectorSidebar />

      <section className="min-w-0 flex-1">
        <h1 className="mb-[32px] text-[22px] font-bold leading-[28px] text-[#f5e9dd]">
          Perfil do colecionador
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-x-[28px] gap-y-[29px] md:grid-cols-2">
            <div>
              <label htmlFor="collector-name" className={labelClass}>
                Nome de exibição*
              </label>
              <input
                id="collector-name"
                className={fieldClass}
                required
                value={name}
                onChange={event => setName(event.target.value)}
              />
            </div>

            <div>
              <label htmlFor="collector-username" className={labelClass}>
                Nome de usuário*
              </label>
              <input
                id="collector-username"
                className={fieldClass}
                required
                value={username}
                onChange={event => setUsername(event.target.value)}
              />
            </div>

            <div>
              <label htmlFor="collector-email" className={labelClass}>
                E-mail*
              </label>
              <input
                id="collector-email"
                className={fieldClass}
                type="email"
                required
                value={email}
                onChange={event => setEmail(event.target.value)}
              />
            </div>

            <div>
              <label htmlFor="collector-ens" className={labelClass}>
                Nome ENS *
              </label>
              <div className="flex gap-[10px]">
                <span className="flex h-[40px] w-[78px] shrink-0 items-center justify-center rounded-[5px] border border-[#493025] bg-[#261711] text-[13px] text-[#e8d5c2]">
                  .eth
                </span>
                <input
                  id="collector-ens"
                  className={fieldClass}
                  value={ensName}
                  onChange={event => setEnsName(event.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="collector-wallet-label" className={labelClass}>
                Apelido da carteira*
              </label>
              <input
                id="collector-wallet-label"
                className={fieldClass}
                value={walletLabel}
                onChange={event => setWalletLabel(event.target.value)}
                disabled={!mainWallet}
              />
            </div>

            <div>
              <span className={labelClass}>Avatar</span>
              <div className="flex items-center gap-[24px]">
                <span className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border border-[#65432f] bg-[#392419] text-[#e8ad71]">
                  {avatar || <UserRound size={24} />}
                </span>
                <button
                  type="button"
                  className="h-[40px] rounded-[5px] bg-[#d99551] px-5 text-[13px] font-bold text-[#24140d]"
                  onClick={() => {
                    const initials = name
                      .trim()
                      .split(/\s+/)
                      .slice(0, 2)
                      .map(part => part[0]?.toUpperCase() ?? '')
                      .join('')
                    setAvatar(initials)
                  }}
                >
                  Alterar
                </button>
                <button
                  type="button"
                  className="text-[13px] text-[#d5ad8b] hover:text-white"
                  onClick={() => setAvatar('')}
                >
                  Remover
                </button>
              </div>
            </div>
          </div>

          <div className="mt-[31px] max-w-[417px]">
            <h2 className="mb-[18px] text-[19px] font-bold text-[#f5e9dd]">
              Alterar senha
            </h2>

            <div className="space-y-[24px]">
              {[
                {
                  id: 'current-password',
                  label: 'Senha atual',
                  value: currentPassword,
                  onChange: setCurrentPassword,
                  autocomplete: 'current-password',
                },
                {
                  id: 'new-password',
                  label: 'Nova senha',
                  value: newPassword,
                  onChange: setNewPassword,
                  autocomplete: 'new-password',
                },
                {
                  id: 'confirm-password',
                  label: 'Confirmar nova senha',
                  value: confirmPassword,
                  onChange: setConfirmPassword,
                  autocomplete: 'new-password',
                },
              ].map(field => (
                <div key={field.id}>
                  <label htmlFor={field.id} className={labelClass}>
                    {field.label}
                  </label>
                  <div className="relative">
                    <input
                      id={field.id}
                      type={showPasswords ? 'text' : 'password'}
                      autoComplete={field.autocomplete}
                      className={`${fieldClass} pr-11`}
                      value={field.value}
                      onChange={event => field.onChange(event.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={showPasswords ? 'Ocultar senhas' : 'Mostrar senhas'}
                      onClick={() => setShowPasswords(value => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bd9476]"
                    >
                      {showPasswords ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={edit.isPending || profile.isPending}
              className="mt-[32px] h-[40px] min-w-[131px] rounded-[5px] bg-[#d99551] px-6 text-[13px] font-bold text-[#24140d] hover:bg-[#e9a866]"
            >
              {edit.isPending ? 'Salvando...' : 'Salvar'}
            </button>

            {profile.isError && (
              <p role="alert" className="mt-4 text-[13px] text-red-300">
                {messageFromError(profile.error)}
              </p>
            )}

            {error && (
              <p role="alert" className="mt-4 text-[13px] text-red-300">
                {error}
              </p>
            )}

            {message && (
              <p role="status" className="mt-4 text-[13px] text-[#e8ad71]">
                {message}
              </p>
            )}
          </div>
        </form>
      </section>
    </main>
  )
}
