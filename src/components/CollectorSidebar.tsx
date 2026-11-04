import { Link, useRouterState } from '@tanstack/react-router'
import {
  UserRound,
  Wallet,
  Activity,
  Heart,
  Tag,
  Download,
  Headphones,
  LogOut,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'

export function CollectorSidebar() {
  const pathname = useRouterState({
    select: state => state.location.pathname,
  })
  const { logout } = useAuth()
  const queryClient = useQueryClient()

  async function handleLogout() {
    await logout()
    queryClient.clear()
    window.location.replace('/login')
  }

  const items = [
    { label: 'Dados do perfil', to: '/profile', icon: UserRound },
    { label: 'Carteiras', to: '/wallets', icon: Wallet },
    { label: 'Atividade', to: null, icon: Activity },
    { label: 'Lista de interesse', to: '/favorites', icon: Heart },
    { label: 'Ofertas', to: null, icon: Tag },
    { label: 'Arquivos baixados', to: null, icon: Download },
    { label: 'Suporte', to: null, icon: Headphones },
  ] as const

  return (
    <aside
      aria-label="Menu do colecionador"
      className="w-full shrink-0 border-r border-[#39271d] bg-[#1d120e] lg:min-h-[900px] lg:w-[310px]"
    >
      <div className="px-7 pb-5 pt-10">
        <h2 className="text-[21px] font-bold text-[#f3e4d4]">
          Meu perfil
        </h2>
      </div>

      <nav aria-label="Navegação do perfil" className="flex flex-col">
        {items.map(({ label, to, icon: Icon }) => {
          const active = to !== null && pathname === to

          const classes = [
            'relative flex min-h-[55px] items-center gap-4',
            'border-l-[4px] px-7 text-[14px] transition-colors',
            active
              ? 'border-[#df9955] bg-[#352116] font-bold text-[#e6a363]'
              : 'border-transparent text-[#d3b8a3] hover:bg-[#302017]',
          ].join(' ')

          return to ? (
            <Link key={label} to={to} className={classes} aria-current={active ? 'page' : undefined}>
              <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ) : (
            <span
              key={label}
              className={`${classes} cursor-not-allowed opacity-60`}
              aria-disabled="true"
              title="Funcionalidade ainda não disponível"
            >
              <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </span>
          )
        })}
      </nav>

      <div className="mx-7 mt-5 border-t border-[#483023] pt-4">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex min-h-[55px] w-full items-center gap-4 text-[14px] text-[#d3b8a3] hover:text-[#e6a363]"
        >
          <LogOut size={19} strokeWidth={1.8} aria-hidden="true" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
