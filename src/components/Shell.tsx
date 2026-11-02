import { useEffect, useRef, useState } from 'react'
import { Link, Outlet } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { ShoppingBag, UserRound, Sparkles, Menu, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { marketplaceApi } from '../lib/api'

function useRealtime(userId: string | undefined) {
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)
  const versions = useRef(new Map<string, number>())

  useEffect(() => {
    const socket = io(window.location.origin, { transports: ['websocket'], path: '/socket.io/', reconnection: true })
    const reconcile = () => {
      setConnected(true)
      queryClient.invalidateQueries({ queryKey: ['nfts'] })
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    }
    socket.on('connect', reconcile)
    socket.on('disconnect', () => setConnected(false))
    socket.on('nft.updated', (event: { id: string; version: number }) => {
      const key = `nft:${event.id}`
      if (event.version <= (versions.current.get(key) ?? 0)) return
      versions.current.set(key, event.version)
      queryClient.invalidateQueries({ queryKey: ['nfts'] })
      queryClient.invalidateQueries({ queryKey: ['nft', event.id] })
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['quote'] })
    })
    socket.on('order.updated', (event: { id: string; userId: string; version: number }) => {
      if (event.userId !== userId) return
      const key = `order:${event.id}`
      if (event.version <= (versions.current.get(key) ?? 0)) return
      versions.current.set(key, event.version)
      queryClient.invalidateQueries({ queryKey: ['order', event.id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    })
    return () => { socket.removeAllListeners(); socket.disconnect(); versions.current.clear() }
  }, [queryClient, userId])

  return connected
}

export function Shell() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [networkMode, setNetworkMode] = useState(() => localStorage.getItem('jungle-network-mode') || 'normal')
  const connected = useRealtime(user?.id)
  const cart = useQuery({ queryKey: ['cart', user?.id ?? 'guest'], queryFn: marketplaceApi.cart })
  const count = cart.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0
  const queryClient = useQueryClient()

  async function resetDemo() {
    if (!window.confirm('Restaurar os dados fictícios e remover pedidos desta demonstração?')) return
    await marketplaceApi.reset()
    localStorage.removeItem('jungle-nft-token')
    localStorage.removeItem('jungle-checkout-attempt')
    queryClient.clear()
    window.location.replace('/')
  }

  return (
    <div className="min-h-screen bg-[#090914] text-white">
      <div className="border-b border-violet-500/20 bg-[#1b1534] px-4 py-2 text-center text-xs text-violet-200">✦ DEMO TÉCNICA — Transações, carteiras e dados são simulados. Nenhum pagamento real é realizado.</div>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0c0c1be8] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2 text-xl font-black tracking-tight"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600"><Sparkles size={21}/></span> JUNGLE<span className="text-violet-400">NFT</span></Link>
          <nav aria-label="Navegação principal" className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
            <Link to="/" className="hover:text-white [&.active]:text-violet-300">Discover</Link>
            <Link to="/favorites" className="hover:text-white [&.active]:text-violet-300">Favorites</Link>
            <Link to="/wallets" className="hover:text-white [&.active]:text-violet-300">Wallets</Link>
          </nav>
          <div className="flex items-center gap-3">
            <span title={connected ? 'Socket.IO conectado' : 'Reconectando ao Socket.IO'} className="hidden text-xs text-slate-500 lg:flex">{connected ? <Wifi size={15} className="text-emerald-400"/> : <WifiOff size={15}/>}</span>
            <Link to="/cart" className="relative rounded-xl border border-white/10 p-2.5 hover:bg-white/10" aria-label={`Carrinho, ${count} itens`}><ShoppingBag size={20}/>{count > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-violet-600 px-1.5 text-xs">{count}</span>}</Link>
            {user ? <Link to="/profile" className="hidden items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm sm:flex"><UserRound size={17}/>{user.name.split(' ')[0]}</Link> : <Link to="/login" className="btn-primary hidden text-sm sm:inline-flex">Sign in</Link>}
            <button type="button" className="rounded-lg border border-white/10 p-2 md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu" aria-expanded={menuOpen}><Menu/></button>
          </div>
        </div>
        {menuOpen && <nav className="flex flex-col gap-4 border-t border-white/10 bg-[#121123] px-6 py-5 text-sm md:hidden" aria-label="Menu móvel" onClick={() => setMenuOpen(false)}>
          <Link to="/">Discover</Link><Link to="/favorites">Favorites</Link><Link to="/wallets">Wallets</Link><Link to="/profile">Profile</Link><Link to="/login">Login</Link>
        </nav>}
      </header>
      <Outlet />
      <footer className="mt-20 border-t border-white/10 px-6 py-10 text-sm text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><span>© 2026 Jungle NFT · Frontend technical demonstration</span><div className="flex flex-wrap items-center gap-5"><label className="flex items-center gap-2">Network demo <select aria-label="Simular condição de rede" className="rounded-lg border border-white/20 bg-[#201d37] p-1 text-xs" value={networkMode} onChange={async event => { const mode=event.target.value;await marketplaceApi.setNetworkMode(mode);setNetworkMode(mode);await queryClient.resetQueries({queryKey:['nfts']}) }}><option value="normal">Normal</option><option value="slow">Slow</option><option value="empty">Empty</option><option value="error">HTTP 503</option><option value="offline">Offline</option></select></label><button onClick={resetDemo} className="underline hover:text-white">Reset demo</button>{user && <button onClick={() => {void logout()}} className="underline hover:text-white">Sign out</button>}<span>Mock API + React + Socket.IO</span></div></div>
      </footer>
    </div>
  )
}
