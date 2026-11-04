import { HomePage } from '../routes/index'
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { useEffect, useRef, useState } from "react";
import {
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Socket } from "socket.io-client";
import {
  ShoppingCart,
  UserRound,
  Heart,
  House,
  Search,
  X,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { LogOut } from 'lucide-react';
import { marketplaceApi } from "../lib/api";
function useRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const versions = useRef(new Map<string, number>());
  useEffect(() => {
    let disposed = false;
    let socket: Socket | undefined;
    setConnected(false);
    const reconcile = () => {
      setConnected(true);
      queryClient.invalidateQueries({ queryKey: ["nfts"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    };
    // socket.io-client captures WebSocket on import; load it only after MSW starts.
    void import("socket.io-client")
      .then(({ io }) => {
        if (disposed) return;
        socket = io(window.location.origin, {
          transports: ["websocket"],
          path: "/socket.io/",
          reconnection: true,
        });
        socket.on("connect", reconcile);
        socket.on("disconnect", () => setConnected(false));
        socket.on("nft.updated", (event: { id: string; version: number }) => {
          const key = `nft:${event.id}`;
          if (event.version <= (versions.current.get(key) ?? 0)) return;
          versions.current.set(key, event.version);
          queryClient.invalidateQueries({ queryKey: ["nfts"] });
          queryClient.invalidateQueries({ queryKey: ["nft", event.id] });
          queryClient.invalidateQueries({ queryKey: ["cart"] });
          queryClient.invalidateQueries({ queryKey: ["quote"] });
        });
        socket.on(
          "order.updated",
          (event: { id: string; userId: string; version: number }) => {
            if (event.userId !== userId) return;
            const key = `order:${event.id}`;
            if (event.version <= (versions.current.get(key) ?? 0)) return;
            versions.current.set(key, event.version);
            queryClient.invalidateQueries({ queryKey: ["order", event.id] });
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["cart"] });
          },
        );
      })
      .catch(() => {
        if (!disposed) setConnected(false);
      });
    return () => {
      disposed = true;
      socket?.removeAllListeners();
      socket?.disconnect();
      versions.current.clear();
    };
  }, [queryClient, userId]);
  return connected;
}
export function Shell() {
  const { user } = useAuth();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isNftDetail = pathname.startsWith("/nft/");
  const isHome = pathname === "/";
  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const isMarketActive = isNftDetail || pathname === "/cart";
  const navigate = useNavigate();
  const [headerSearchOpen, setHeaderSearchOpen] = useState(false);
  const [headerDraft, setHeaderDraft] = useState("");
  const [networkMode, setNetworkMode] = useState(
    () => localStorage.getItem("jungle-network-mode") || "normal",
  );
  const queryClient = useQueryClient();
  function changeNetworkMode(mode: string) {
    localStorage.setItem("jungle-network-mode", mode);
    setNetworkMode(mode);
    void queryClient.invalidateQueries({ queryKey: ["nfts"] });
  }

  useRealtime(user?.id);
  const cart = useQuery({
    queryKey: ["cart", user?.id ?? "guest"],
    queryFn: marketplaceApi.cart,
  });
  const count =
    cart.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  return (
    <div
      className={`min-h-screen bg-[#130c09] text-[#f8eee5] md:pb-0 ${isMarketActive ? "pb-0" : "pb-24"} py-3`}
    >
      <header className="relative z-30 hidden bg-[#140D0A] md:block">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 border-b border-[#563a29] px-6 xl:px-0">
          <Link to="/" className="text-base font-bold tracking-[.14em]">
            KURIO
          </Link>
          <nav
            aria-label="Navegação principal"
            className="flex items-center self-stretch gap-4 text-sm text-[#F5F1EB] lg:gap-10"
          >
            <Link
              to="/"
              className={`flex self-stretch items-center border-b-2 ${isHome
                ? "border-[#df9b55] font-bold text-[#df9b55]"
                : "border-transparent hover:text-[#df9b55]"
                }`}
            >
              Início
            </Link>
            <Link
              to="/"
              hash="explore"
              className={`flex self-stretch items-center border-b-2 ${isMarketActive
                ? "border-[#df9b55] font-bold text-[#df9b55]"
                : "border-transparent hover:text-[#df9b55]"
                }`}
            >
              Mercado
            </Link>
            <span
              aria-disabled="true"
              title="Página fora do escopo do desafio"
              className="flex self-stretch cursor-default items-center"
            >
              Criadores
            </span>
            <span
              aria-disabled="true"
              title="Página fora do escopo do desafio"
              className="flex self-stretch cursor-default items-center"
            >
              Aprenda
            </span>
          </nav>
          <div className="flex items-center gap-2 lg:gap-5">
            <button
              type="button"
              aria-label="Abrir busca"
              aria-expanded={headerSearchOpen}
              onClick={() => setHeaderSearchOpen((open) => !open)}
              className="p-1 text-[#efe5d7] hover:text-[#e7a05f]"
            >
              {headerSearchOpen ? <X size={21} /> : <Search size={21} />}
            </button>
            <Link
              to="/cart"
              className="relative rounded p-1 hover:bg-[#392216]"
              aria-label={`Carrinho, ${count} itens`}
            >
              <ShoppingCart size={23} />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 rounded-full bg-[#dd9650] px-1.5 text-xs text-[#1b100a]">
                  {count}
                </span>
              )}
            </Link>
            {user ? (
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded px-3 py-2 text-sm"
              >
                <UserRound size={17} />
                {user.name.split(" ")[0]}
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex h-11 items-center justify-center gap-2.5 rounded-xl bg-[#D88B4A] px-5 text-sm font-semibold text-[#1A100B] transition-colors hover:bg-[#E9A260]"
              >
                <LogOut size={20} strokeWidth={2.5} aria-hidden="true" />
                <span>Entrar</span>
              </Link>
            )}
          </div>
        </div>
        {headerSearchOpen && (
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              void navigate({
                to: "/",
                hash: "explore",
                search: (prev) => ({ ...prev, q: headerDraft, page: 1 }),
              });
              setHeaderSearchOpen(false);
            }}
            className="absolute right-[max(24px,calc((100vw-1200px)/2))] top-full z-40 flex w-[360px] gap-2 rounded-b-xl border border-[#65412c] bg-[#291913] p-3 shadow-2xl"
          >
            <input
              type="search"
              autoFocus
              aria-label="Pesquisar NFTs"
              placeholder="Buscar NFTs, artistas, coleções..."
              className="field !py-2 text-xs"
              value={headerDraft}
              onChange={(event) => setHeaderDraft(event.target.value)}
            />
            <button
              type="submit"
              aria-label="Search"
              className="btn-primary !px-4 !py-2 text-xs"
            >
              Buscar
            </button>
          </form>
        )}
      </header>
      <div className="fixed bottom-[92px] left-2 z-50 opacity-70 hover:opacity-100 md:bottom-2">
        <label className="text-[11px] text-[#c1a48b]">
          <span className="sr-only">Simular condição de rede</span>
          <select
            aria-label="Simular condição de rede"
            value={networkMode}
            onChange={(event) => changeNetworkMode(event.target.value)}
            className="rounded border border-[#563a29] bg-[#291913] px-2 py-1 text-[11px] text-[#c1a48b]"
          >
            <option value="normal">Rede normal</option>
            <option value="error">Simular erro HTTP 503</option>
          </select>
        </label>
      </div>
      {isAuthRoute ? (
        <>
          <div aria-hidden="true" inert>
            <HomePage
              search={{
                q: '',
                category: 'all',
                sort: 'featured',
                page: 1,
              }}
            />
          </div>
          <Outlet />
        </>
      ) : (
        <Outlet />
      )}
      <nav
        className={`fixed inset-x-0 bottom-0 z-40 h-[88px] grid-cols-4 items-center rounded-t-[2rem] border-t border-[#523524] bg-[#25150f] px-5 text-[#ddb085] shadow-2xl md:hidden ${isNftDetail ? "hidden" : "grid"}`}
        aria-label="Navegação móvel"
      >
        <Link to="/" aria-label="Início" className="mx-auto">
          <House size={24} fill={isHome ? "currentColor" : "none"} />
        </Link>
        <Link to="/favorites" aria-label="Favoritos" className="mx-auto">
          <Heart size={24} fill="currentColor" />
        </Link>
        <Link
          to="/cart"
          aria-label={`Carrinho, ${count} itens`}
          className="relative mx-auto"
        >
          <ShoppingCart size={24} />
          {count > 0 && (
            <span className="absolute -right-2 -top-2 rounded-full bg-[#dc9650] px-1.5 text-xs text-[#21130d]">
              {count}
            </span>
          )}
        </Link>
        <Link
          to={user ? "/profile" : "/login"}
          aria-label={user ? "Perfil" : "Entrar"}
          className="mx-auto"
        >
          <UserRound size={24} />
        </Link>
      </nav>
      <footer
        className={`mt-16 border-t border-[#563622] bg-[#180e0a] text-sm text-[#c1a48b] ${isNftDetail ? "hidden md:block" : ""}`}
      >
        <div className="mx-auto max-w-[1200px] px-6 py-8 xl:px-0">
          <div className="grid gap-8 bg-[#291913] px-6 py-9 md:grid-cols-4 md:gap-0 md:px-8 md:py-8">
            <div className="md:border-r md:border-[#704530] md:pr-6">
              <div className="flex size-[58px] items-center justify-center rounded-full bg-[#da9653] text-xl font-bold text-[#24150e]">
                W
              </div>
              <h3 className="mt-3 text-[14px] font-bold text-[#f0dfce]">
                Segurança da carteira
              </h3>
              <p className="mt-2 text-[12px] leading-relaxed">
                Proteja sal carteira e colecione arte digital verificada com confiança.
              </p>
            </div>
            <div className="md:border-r md:border-[#704530] md:px-6">
              <div className="flex size-[58px] items-center justify-center rounded-full bg-[#da9653] text-xl font-bold text-[#24150e]">
                C
              </div>
              <h3 className="mt-3 text-[14px] font-bold text-[#f0dfce]">
                Criadores em destaque
              </h3>
              <p className="mt-2 text-[12px] leading-relaxed">
                Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.
              </p>
            </div>
            <div className="md:border-r md:border-[#704530] md:px-6">
              <div className="flex size-[58px] items-center justify-center rounded-full bg-[#da9653] text-xl font-bold text-[#24150e]">
                D
              </div>
              <h3 className="mt-3 text-[14px] font-bold text-[#f0dfce]">
                Alertas de lançamentos
              </h3>
              <p className="mt-2 text-[12px] leading-relaxed">
                Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado
              </p>
            </div>
            <div className="md:pl-6">
              <h3 className="flex items-center gap-2 text-[13px] font-bold text-[#f0dfce]">
                Antecipe-se ao próximo lançamento
              </h3>
              <div className="mt-4 flex min-w-0 gap-1.5">
                <input
                  type="email"
                  aria-label="Email para newsletter ilustrativa"
                  disabled
                  placeholder="Digite seu e-mail..."
                  className="min-w-0 flex-1 rounded border border-[#67432f] bg-[#3d2519] px-2 py-2 text-[11px]"
                />
                <button
                  type="button"
                  disabled
                  className="rounded bg-[#db9450] px-3 py-2 text-[12px] font-bold text-[#1c110b]"
                >
                  Enviar
                </button>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed">
                Receba lançamento selecionados, histórias de criadores e novidades do mercado.
              </p>
            </div>
          </div>
          <div className="hidden grid-cols-4 items-center gap-5 bg-[#452817] px-8 py-5 text-[12px] text-[#f2ddc7] md:grid">
            <Link to="/" className="font-black tracking-[.19em]">
              KURIO
            </Link>
            <span>Feito para colecionadores, criadores e cultura digital.</span>
            <span>contato@email.com</span>
            <span>+55 11 4002 8922</span>
          </div>
          <div className="grid gap-9 bg-[#291913] px-6 py-10 sm:grid-cols-2 md:grid-cols-4 md:px-8 md:py-10">
            <div>
              <h3 className="mb-5 text-[14px] font-bold text-[#f0dfce]">
                Meu perfil
              </h3>
              <div className="flex flex-col gap-3 text-[12px]">
                <Link to="/profile" className="hover:text-white">
                  Meu perfil
                </Link>
                <Link to="/favorites" className="hover:text-white">
                  Minha coleção
                </Link>
                <Link to="/wallets" className="hover:text-white">
                  Atividade
                </Link>
                <Link to="/cart" className="hover:text-white">
                  Estudio do criador
                </Link>
                <Link to="/cart" className="hover:text-white">
                  lista de Interesse
                </Link>
              </div>
            </div>
            <div>
              <h3 className="mb-5 text-[14px] font-bold text-[#f0dfce]">
                Central de ajuda
              </h3>
              <p className="text-[12px] leading-7 text-[#ad8b73]">
                Central de ajuda
                <br />
                Como comprar NFTs
                <br />
                Carteira e segurança
                <br />
                Politica do mercado
                <br />
                Denunciar item
              </p>
            </div>
            <div>
              <h3 className="mb-5 text-[14px] font-bold text-[#f0dfce]">
                Coleções
              </h3>
              <div className="flex flex-col gap-3 text-[12px]">
                <Link to="/" hash="explore" className="hover:text-white">
                  Arte digital
                </Link>
                <Link to="/" hash="explore" className="hover:text-white">
                  Fotografia
                </Link>
                <Link to="/" hash="explore" className="hover:text-white">
                  Música
                </Link>
                <Link to="/" hash="explore" className="hover:text-white">
                  Artes 3D
                </Link>
                <Link to="/" hash="explore" className="hover:text-white">
                  Utilidade
                </Link>
              </div>
            </div>
            <div>
              <h3 className="mb-5 text-[14px] font-bold text-[#f0dfce]">
                Redes sociais
              </h3>
              <div
                className="flex gap-2 text-[#d99756]"
                aria-label="Ícones ilustrativos de redes sociais (não conectadas)"
              >
                {[
                  { name: "Facebook", Icon: FaFacebookF },
                  { name: "Instagram", Icon: FaInstagram },
                  { name: "X", Icon: FaXTwitter },
                  { name: "LinkedIn", Icon: FaLinkedinIn },
                  { name: "YouTube", Icon: FaYoutube },
                ].map(({ name, Icon }) => (
                  <span
                    key={name}
                    className="flex size-6 items-center justify-center rounded-sm border border-[#a76c3b] text-[12px]"
                    role="img"
                    aria-label={name}
                  >
                    <Icon size={13} aria-hidden="true" />
                  </span>
                ))}
              </div>
              <h3 className="mt-7 text-[14px] font-bold text-[#f0dfce]">
                Carteiras compatíveis
              </h3>
              <p className="mt-2 text-[11px] text-[#cda27a]">
                METAMASK · WALLETCONNECT · COINBASE
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 border-t border-[#563622] px-2 py-5 text-center text-[11px]">
            <span>© 2026 KURIO · Propriedade digital para todos.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
