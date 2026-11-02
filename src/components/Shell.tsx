import { useEffect, useRef, useState } from 'react'
import { Link, Outlet } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { ShoppingBag, UserRound, Heart, House, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { marketplaceApi } from '../lib/api'

function useRealtime(userId: string | undefined) {
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)
  const versions = useRef(new Map<string, number>())

  useEffect(() => {
    let disposed = false
    let socket: Socket | undefined
    setConnected(false)
    const reconcile = () => {
      setConnected(true)
      queryClient.invalidateQueries({ queryKey: ['nfts'] })
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    }
    // socket.io-client captures WebSocket on import; load it only after MSW starts.
    void import('socket.io-client').then(({ io }) => {
      if (disposed) return
      socket = io(window.location.origin, { transports: ['websocket'], path: '/socket.io/', reconnection: true })
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
    }).catch(() => { if (!disposed) setConnected(false) })
    return () => { disposed = true; socket?.removeAllListeners(); socket?.disconnect(); versions.current.clear() }
  }, [queryClient, userId])

  return connected
}

export function Shell() {
  const { user, logout } = useAuth()
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
    <div className="min-h-screen bg-[#130c09] pb-20 text-[#f8eee5] md:pb-0">
      <div className="border-b border-[#453024] bg-[#2b1a13] px-4 py-1.5 text-center text-[10px] text-[#d6ac7d]">DEMONSTRAÇÃO TÉCNICA — Dados e pagamentos simulados. Nenhuma transação real é realizada.</div>
      <header className="sticky top-0 z-30 hidden border-b border-[#52301e] bg-[#130c09ef] backdrop-blur-xl md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
          <Link to="/" className="text-base font-black tracking-[.16em]">KURIO</Link>
          <nav aria-label="Navegação principal" className="flex items-center gap-9 text-sm font-semibold text-[#d3c5bb]">
            <Link to="/" className="border-b-2 border-transparent py-3 hover:text-[#df9b55] [&.active]:border-[#df9b55] [&.active]:text-[#df9b55]">Início</Link>
            <Link to="/" hash="explore" className="border-b-2 border-transparent py-3 hover:text-[#df9b55]">Mercado</Link>
            <Link to="/favorites" className="border-b-2 border-transparent py-3 hover:text-[#df9b55]">Favoritos</Link>
            <Link to="/wallets" className="border-b-2 border-transparent py-3 hover:text-[#df9b55]">Carteiras</Link>
          </nav>
          <div className="flex items-center gap-4">
            <span title={connected ? 'Socket.IO conectado' : 'Reconectando ao Socket.IO'} className="text-xs text-[#bba48f]">{connected ? <Wifi size={16} className="text-emerald-400"/> : <WifiOff size={16}/>}</span>
            <Link to="/cart" className="relative rounded p-2 hover:bg-[#392216]" aria-label={`Carrinho, ${count} itens`}><ShoppingBag size={21}/>{count > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-[#dd9650] px-1.5 text-xs text-[#1b100a]">{count}</span>}</Link>
            {user ? <Link to="/profile" className="flex items-center gap-2 rounded px-3 py-2 text-sm"><UserRound size={17}/>{user.name.split(' ')[0]}</Link> : <Link to="/login" className="btn-primary text-sm">Entrar</Link>}
          </div>
        </div>
      </header>
      <Outlet />
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 rounded-t-[2rem] border-t border-[#523524] bg-[#25150f] px-5 py-4 text-[#ddb085] shadow-2xl md:hidden" aria-label="Navegação móvel">
        <Link to="/" aria-label="Início" className="mx-auto"><House size={24}/></Link>
        <Link to="/favorites" aria-label="Favoritos" className="mx-auto"><Heart size={24}/></Link>
        <Link to="/cart" aria-label={`Carrinho, ${count} itens`} className="relative mx-auto"><ShoppingBag size={24}/>{count > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-[#dc9650] px-1.5 text-xs text-[#21130d]">{count}</span>}</Link>
        <Link to={user ? '/profile' : '/login'} aria-label={user ? 'Perfil' : 'Entrar'} className="mx-auto"><UserRound size={24}/></Link>
      </nav>
      <footer className="mt-16 border-t border-[#3f291c] px-6 py-9 text-sm text-[#c1a48b]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4"><span>© 2026 KURIO · Demonstração técnica de marketplace NFT</span><div className="flex flex-wrap items-center gap-5"><label className="flex items-center gap-2">Simulação de rede <select aria-label="Simular condição de rede" className="rounded border border-[#66422a] bg-[#2d1b14] p-1 text-xs" value={networkMode} onChange={async event => { const mode=event.target.value;await marketplaceApi.setNetworkMode(mode);setNetworkMode(mode);await queryClient.resetQueries({queryKey:['nfts']}) }}><option value="normal">Normal</option><option value="slow">Slow</option><option value="empty">Empty</option><option value="error">HTTP 503</option><option value="offline">Offline</option></select></label><button onClick={resetDemo} className="underline hover:text-white">Restaurar demonstração</button>{user && <button onClick={() => {void logout()}} className="underline hover:text-white">Sign out</button>}<span>MSW + React + Socket.IO</span></div></div>
      </footer>
    </div>
  )
}
