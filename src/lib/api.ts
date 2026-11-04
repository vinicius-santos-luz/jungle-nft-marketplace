import axios from "axios";
import type { AxiosError } from "axios";
import type {
  ApiError,
  CartItem,
  CatalogParams,
  CatalogResponse,
  CollectorDetails,
  NFT,
  Network,
  Order,
  Quote,
  User,
  Wallet,
} from "./models";

const TOKEN_KEY = "jungle-nft-token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const api = axios.create({ baseURL: "/api", timeout: 10000 });
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function messageFromError(cause: unknown): string {
  const error = cause as AxiosError<ApiError>;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === "ECONNABORTED")
    return "Tempo limite excedido. Tente novamente.";
  return "Não foi possível concluir a operação. Tente novamente.";
}

export const marketplaceApi = {
  catalog: (params: CatalogParams) =>
    api.get<CatalogResponse>("/nfts", { params }).then((r) => r.data),
  nft: (id: string) => api.get<NFT>(`/nfts/${id}`).then((r) => r.data),
  session: () => api.get<User>("/auth/session").then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api
      .post<{ user: User; token: string }>("/auth/login", data)
      .then((r) => r.data),
  register: (data: { name: string; email: string; password: string }) =>
    api
      .post<{ user: User; token: string }>("/auth/register", data)
      .then((r) => r.data),
  logout: () => api.post("/auth/logout"),
  cart: () =>
    api
      .get<{ items: CartItem[]; lines: Array<CartItem & { nft: NFT }> }>(
        "/cart",
      )
      .then((r) => r.data),
  addCart: (nftId: string, quantity: number) =>
    api.post("/cart", { nftId, quantity }),
  updateCart: (nftId: string, quantity: number) =>
    api.patch(`/cart/${nftId}`, { quantity }),
  removeCart: (nftId: string) => api.delete(`/cart/${nftId}`),
  quote: (coupon: string | null, network: Network) =>
    api.post<Quote>("/quote", { coupon, network }).then((r) => r.data),
  favorites: () => api.get<string[]>("/favorites").then((r) => r.data),
  favorite: (id: string) => api.post(`/favorites/${id}`),
  unfavorite: (id: string) => api.delete(`/favorites/${id}`),
  profile: () => api.get<User>("/profile").then((r) => r.data),

  updateProfile: (
    data: Pick<User, "name" | "email" | "avatar"> &
      Partial<
        Pick<
          User,
          "username" | "ensName" | "profileName" | "walletType" | "referralCode"
        >
      >,
  ) => api.patch<User>("/profile", data).then((r) => r.data),

  updatePassword: (currentPassword: string, newPassword: string) =>
    api.patch("/profile/password", { currentPassword, newPassword }),
  wallets: () => api.get<Wallet[]>("/wallets").then((r) => r.data),
  addWallet: (
    wallet: Pick<Wallet, "label" | "address" | "network" | "primary">,
  ) => api.post("/wallets", wallet),
  updateWallet: (id: string, changes: Partial<Wallet>) =>
    api.patch(`/wallets/${id}`, changes),
  createOrder: (
    payload: {
      coupon: string | null;
      network: Network;
      walletId: string;
      quoteRevision: string;
      collector: CollectorDetails;
      decline?: boolean;
    },
    key: string,
  ) =>
    api
      .post<Order>("/orders", payload, { headers: { "Idempotency-Key": key } })
      .then((r) => r.data),
  order: (id: string) => api.get<Order>(`/orders/${id}`).then((r) => r.data),
  orders: () => api.get<Order[]>("/orders").then((r) => r.data),
  simulatePriceChange: (nftId: string) =>
    api.post("/scenarios/nft-update", { nftId }),
  setNetworkMode: (mode: string) => api.post("/scenarios/network", { mode }),
  expireSession: () => api.post("/scenarios/expire"),
  reset: () => api.post("/scenarios/reset"),
};
