import Decimal from "decimal.js";
import type {
  CartItem,
  Network,
  NFT,
  Order,
  Quote,
  User,
  Wallet,
} from "../lib/models";
import { seedNfts } from "./fixtures";

export interface MockUser extends User {
  passwordHash: string;
}

export interface Store {
  users: MockUser[];
  session: { token: string; userId: string; expiresAt: number } | null;
  carts: Record<string, CartItem[]>;
  favorites: Record<string, string[]>;
  wallets: Record<string, Wallet[]>;
  nfts: NFT[];
  orders: Order[];
}

// Versioned fixtures keep the simulated catalog and detail metadata in sync.
const KEY = "jungle-nft-mock-v5";

export function initialStore(): Store {
  return {
    users: [
      {
        id: "user-demo",
        name: "Alex Morgan",
        email: "demo@jungle.test",
        avatar: "AM",
        passwordHash:
          "7dbb7f051b44d7d54584a7bc6c32f00da5a3b5e6973485b9fb176fe56346b3e3",
      },
      {
        id: "user-test",
        name: "Taylor Lee",
        email: "test@jungle.test",
        avatar: "TL",
        passwordHash:
          "40c68f7ae9b8bff1671fd4ef53162fb9ca49134e6a3e8dd2af33689318f09ffb",
      },
    ],
    session: null,
    carts: { guest: [], "user-demo": [], "user-test": [] },
    favorites: { "user-demo": [], "user-test": [] },
    wallets: {
      "user-demo": [
        {
          id: "wallet-demo",
          label: "Main Wallet",
          address: "0xA2C9...4b71",
          network: "Ethereum",
          primary: true,
        },
      ],
      "user-test": [
        {
          id: "wallet-test",
          label: "Primary Wallet",
          address: "0xD8E1...9a24",
          network: "Polygon",
          primary: true,
        },
      ],
    },
    nfts: structuredClone(seedNfts),
    orders: [],
  };
}

export function getStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);

    if (raw) {
      const store = JSON.parse(raw) as Store;

      let updated = false;

      store.nfts = store.nfts.map((nft) => {
        const seed = seedNfts.find((item) => item.id === nft.id);

        if (seed?.tokenNumber && nft.tokenNumber !== seed.tokenNumber) {
          updated = true;

          return {
            ...nft,
            tokenNumber: seed.tokenNumber,
          };
        }

        return nft;
      });

      if (updated) {
        saveStore(store);
      }

      return store;
    }
  } catch {
    /* Invalid local fixture state: restore the seed. */
  }

  const state = initialStore();
  saveStore(state);
  return state;
}

export function saveStore(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function resetStore() {
  saveStore(initialStore());
}

export function publicUser(user: MockUser): User {
  const { id, name, email, avatar } = user;
  return { id, name, email, avatar };
}

export async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function sessionUser(store: Store, request: Request): MockUser | null {
  const token = request.headers
    .get("Authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (
    !token ||
    token !== store.session?.token ||
    Date.now() >= store.session.expiresAt
  )
    return null;
  return store.users.find((user) => user.id === store.session?.userId) ?? null;
}

export function cartKey(user: MockUser | null) {
  return user?.id ?? "guest";
}

export function mergeGuestCart(store: Store, userId: string) {
  const existing = [...(store.carts[userId] ?? [])];
  for (const line of store.carts.guest ?? []) {
    const current = existing.find((item) => item.nftId === line.nftId);
    const available =
      store.nfts.find((nft) => nft.id === line.nftId)?.available ?? 0;
    if (current)
      current.quantity = Math.min(available, current.quantity + line.quantity);
    else if (available)
      existing.push({ ...line, quantity: Math.min(available, line.quantity) });
  }
  store.carts[userId] = existing;
  store.carts.guest = [];
}

export function makeQuote(
  store: Store,
  items: CartItem[],
  coupon: string | null,
  network: Network,
): Quote {
  if (coupon && !["JUNGLE10", "EXPIRED"].includes(coupon.toUpperCase()))
    throw new Error("Cupom inválido.");
  if (coupon?.toUpperCase() === "EXPIRED")
    throw new Error("Esse cupom expirou.");
  const lines = items.map((item) => {
    const nft = store.nfts.find((candidate) => candidate.id === item.nftId);
    if (
      !nft ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > nft.available
    ) {
      throw new Error("Um item está indisponível. Atualize seu carrinho.");
    }
    return { ...item, nft };
  });
  const subtotal = lines.reduce(
    (sum, line) =>
      sum.plus(new Decimal(line.nft.priceEth).times(line.quantity)),
    new Decimal(0),
  );
  const discount =
    coupon?.toUpperCase() === "JUNGLE10"
      ? subtotal.times("0.1")
      : new Decimal(0);
  const networkFee =
    network === "Ethereum" ? new Decimal("0.016") : new Decimal("0.001");
  new Decimal("0.001");
  new Decimal("0.001");
  const total = subtotal.minus(discount).plus(networkFee);
  const revision =
    JSON.stringify(
      lines.map((line) => [
        line.nft.id,
        line.nft.version,
        line.nft.priceEth,
        line.quantity,
      ]),
    ) + `|${coupon ?? ""}|${network}`;
  return {
    lines,
    subtotal: subtotal.toFixed(6),
    discount: discount.toFixed(6),
    networkFee: networkFee.toFixed(6),
    total: total.toFixed(6),
    coupon: coupon?.toUpperCase() ?? null,
    revision,
  };
}

export function settleOrders(store: Store): Order[] {
  const changed: Order[] = [];
  for (const order of store.orders) {
    if (
      order.status === "pending" &&
      Date.now() - Date.parse(order.createdAt) > 1800
    ) {
      order.status = order.txRef.includes("DECLINE") ? "declined" : "confirmed";
      order.version += 1;
      if (order.status === "confirmed") {
        for (const line of order.quote.lines) {
          const nft = store.nfts.find((item) => item.id === line.nftId);
          if (nft) {
            nft.available = Math.max(0, nft.available - line.quantity);
            nft.version += 1;
          }
        }
        const remaining = store.carts[order.userId] ?? [];
        for (const purchased of order.quote.lines) {
          const current = remaining.find(
            (item) => item.nftId === purchased.nftId,
          );
          if (current)
            current.quantity = Math.max(
              0,
              current.quantity - purchased.quantity,
            );
        }
        store.carts[order.userId] = remaining.filter(
          (item) => item.quantity > 0,
        );
      }
      changed.push(order);
    }
  }
  if (changed.length) saveStore(store);
  return changed;
}
