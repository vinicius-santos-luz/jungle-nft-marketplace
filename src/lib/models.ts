export type Network = "Ethereum" | "Polygon" | "Base";

export interface NFT {
  id: string;
  title: string;
  collection: string;
  creator: string;
  category: "Art" | "Gaming" | "Music" | "Photography";
  description: string;
  priceEth: string;
  available: number;
  total: number;
  version: number;
  symbol: string;
  colors: [string, string];
  tokenNumber?: string;
  attributes?: string[];
  rating?: number;
  reviewCount?: number;
  editions?: string[];
  rarity?: string;
  popularity?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface Wallet {
  id: string;
  label: string;
  address: string;
  network: Network;
  primary: boolean;
}
export interface CollectorDetails {
  displayName: string;
  username: string;
  profileName: string;
  walletAddress: string;
  walletType: string;
  referralCode: string;
  email: string;
  ensName: string;
  secondaryWallet?: string;
  notes?: string;
}

export interface CartItem {
  nftId: string;
  quantity: number;
}

export interface CartLine extends CartItem {
  nft: NFT;
}

export interface Quote {
  lines: CartLine[];
  subtotal: string;
  discount: string;
  networkFee: string;
  total: string;
  coupon: string | null;
  revision: string;
}

export interface Order {
  id: string;
  userId: string;
  idempotencyKey: string;
  fingerprint: string;
  status: "pending" | "confirmed" | "declined";
  version: number;
  network: Network;
  walletId: string;
  quote: Quote;
  createdAt: string;
  txRef: string;
  collector: CollectorDetails;
}

export interface ApiError {
  message: string;
  code: string;
}

export type CatalogSort =
  "featured" | "recent" | "trending" | "price-asc" | "price-desc" | "name";

export interface CatalogParams {
  q?: string;
  category?: string;
  sort?: CatalogSort;
  page?: number;
  minPrice?: string;
  maxPrice?: string;
}

export interface CatalogResponse {
  items: NFT[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}
