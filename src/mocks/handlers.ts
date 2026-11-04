import { delay, http, HttpResponse, ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import type {
  CartItem,
  CatalogSort,
  CollectorDetails,
  Network,
  Order,
  Wallet,
} from "../lib/models";
import {
  cartKey,
  getStore,
  hashPassword,
  makeQuote,
  mergeGuestCart,
  publicUser,
  resetStore,
  saveStore,
  sessionUser,
  settleOrders,
} from "./store";

const error = (message: string, status = 400, code = "BAD_REQUEST") =>
  HttpResponse.json({ message, code }, { status });
const unauthorized = () =>
  error("Faça login para continuar.", 401, "UNAUTHORIZED");
const VALID_NETWORKS: Network[] = ["Ethereum", "Polygon", "Base"];

function validateCollector(
  collector: CollectorDetails | undefined,
  wallet: Wallet,
  network: Network,
  email: string,
): string | null {
  if (!collector || typeof collector !== "object") {
    return "Preencha os dados do colecionador.";
  }

  const requiredFields: Array<[string, unknown]> = [
    ["Nome de exibição", collector.displayName],
    ["Nome de usuário", collector.username],
    ["Nome do perfil", collector.profileName],
    ["Endereço da carteira", collector.walletAddress],
    ["Tipo de carteira", collector.walletType],
    ["Código de indicação", collector.referralCode],
    ["E-mail", collector.email],
    ["Nome ENS", collector.ensName],
  ];

  for (const [label, value] of requiredFields) {
    if (typeof value !== "string" || !value.trim()) {
      return `${label} é obrigatório.`;
    }
  }

  if (!VALID_NETWORKS.includes(network)) {
    return "Selecione uma rede válida.";
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(collector.walletAddress)) {
    return "Informe um endereço de carteira válido.";
  }

  if (collector.walletAddress.toLowerCase() !== wallet.address.toLowerCase()) {
    return "O endereço informado não corresponde à carteira selecionada.";
  }

  if (wallet.network !== network) {
    return "A carteira selecionada pertence a outra rede.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(collector.email)) {
    return "Informe um e-mail válido.";
  }

  if (collector.email.toLowerCase() !== email.toLowerCase()) {
    return "O e-mail deve corresponder à conta autenticada.";
  }

  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(collector.username)) {
    return "O nome de usuário deve ter entre 3 e 30 caracteres.";
  }

  if (!/^[a-z0-9-]+\.eth$/i.test(collector.ensName)) {
    return "Informe um nome ENS no formato nome.eth.";
  }

  return null;
}

// The Socket.IO codec completes the handshake and emits actual Socket.IO frames.
// The client uses socket.io-client with WebSocket transport, not React callbacks.
// MSW normalizes Socket.IO's /socket.io/ transport path to / when matching WebSockets.
const socketUrl = `${window.location.origin.replace(/^http/, "ws")}/`;
const socketLink = ws.link(socketUrl);
const clients = new Set<(event: string, payload: unknown) => void>();
const socketHandler = socketLink.addEventListener(
  "connection",
  (connection) => {
    const socket = toSocketIo(connection);
    const send = (event: string, payload: unknown) =>
      socket.client.emit(event, payload);
    clients.add(send);
    connection.client.addEventListener("close", () => clients.delete(send));
  },
);

function broadcast(event: string, payload: unknown) {
  for (const send of clients) send(event, payload);
}

function settleAndNotify() {
  const store = getStore();
  const changed = settleOrders(store);
  for (const order of changed) {
    broadcast("order.updated", {
      id: order.id,
      userId: order.userId,
      status: order.status,
      version: order.version,
    });
    for (const line of order.quote.lines) {
      const nft = store.nfts.find((item) => item.id === line.nftId);
      if (nft)
        broadcast("nft.updated", {
          id: nft.id,
          priceEth: nft.priceEth,
          available: nft.available,
          version: nft.version,
        });
    }
  }
}

export const handlers = [
  socketHandler,

  http.get("/api/nfts", async ({ request }) => {
    const mode = localStorage.getItem("jungle-network-mode") || "normal";
    if (mode === "offline") return HttpResponse.error();
    if (mode === "error")
      return error(
        "Serviço temporariamente indisponível (cenário 503).",
        503,
        "TRANSIENT_ERROR",
      );
    await delay(mode === "slow" ? 1400 : 180);
    const state = getStore();
    const params = new URL(request.url).searchParams;
    const q = (params.get("q") ?? "").toLowerCase();
    const category = params.get("category") ?? "all";
    const sort = (params.get("sort") ?? "featured") as CatalogSort;
    const minPrice = params.get("minPrice");
    const maxPrice = params.get("maxPrice");
    const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
    let items = (mode === "empty" ? [] : state.nfts).filter(
      (nft) =>
        (nft.title.toLowerCase().includes(q) ||
          nft.collection.toLowerCase().includes(q) ||
          nft.creator.toLowerCase().includes(q)) &&
        (category === "all" || nft.category === category) &&
        (!minPrice || Number(nft.priceEth) >= Number(minPrice)) &&
        (!maxPrice || Number(nft.priceEth) <= Number(maxPrice)),
    );
    if (sort === "recent")
      items = items.sort(
        (a, b) =>
          Number(b.id.split("-").at(-1)) - Number(a.id.split("-").at(-1)),
      );
    if (sort === "trending")
      items = items.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    if (sort === "price-asc")
      items = items.sort((a, b) => Number(a.priceEth) - Number(b.priceEth));
    if (sort === "price-desc")
      items = items.sort((a, b) => Number(b.priceEth) - Number(a.priceEth));
    if (sort === "name")
      items = items.sort((a, b) => a.title.localeCompare(b.title));
    const pageSize = 8;
    return HttpResponse.json({
      items: items.slice((page - 1) * pageSize, page * pageSize),
      total: items.length,
      page,
      pageSize,
      pages: Math.ceil(items.length / pageSize),
    });
  }),

  http.get("/api/nfts/:id", ({ params }) => {
    const nft = getStore().nfts.find((item) => item.id === params.id);
    return nft
      ? HttpResponse.json(nft)
      : error("NFT não encontrado.", 404, "NOT_FOUND");
  }),

  http.post("/api/auth/login", async ({ request }) => {
    const { email, password } = (await request.json()) as {
      email: string;
      password: string;
    };
    const store = getStore();
    const hashed = await hashPassword(password ?? "");
    const user = store.users.find(
      (item) =>
        item.email.toLowerCase() === (email ?? "").trim().toLowerCase() &&
        item.passwordHash === hashed,
    );
    if (!user)
      return error("Email ou senha incorretos.", 401, "INVALID_CREDENTIALS");
    store.session = {
      token: crypto.randomUUID(),
      userId: user.id,
      expiresAt: Date.now() + 60 * 60 * 1000,
    };
    mergeGuestCart(store, user.id);
    saveStore(store);
    return HttpResponse.json({
      user: publicUser(user),
      token: store.session.token,
    });
  }),

  http.post("/api/auth/register", async ({ request }) => {
    const { name, email, password } = (await request.json()) as {
      name: string;
      email: string;
      password: string;
    };
    if (
      !name?.trim() ||
      !email?.includes("@") ||
      !password ||
      password.length < 8
    )
      return error(
        "Informe nome, email e senha com pelo menos 8 caracteres.",
        422,
        "VALIDATION",
      );
    const store = getStore();
    if (
      store.users.some(
        (user) => user.email.toLowerCase() === email.toLowerCase(),
      )
    )
      return error("Este email já está cadastrado.", 409, "CONFLICT");
    const user = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim(),
      avatar: name.slice(0, 2).toUpperCase(),
      passwordHash: await hashPassword(password),
    };
    store.users.push(user);
    store.carts[user.id] = [];
    store.favorites[user.id] = [];
    store.wallets[user.id] = [];
    store.session = {
      token: crypto.randomUUID(),
      userId: user.id,
      expiresAt: Date.now() + 60 * 60 * 1000,
    };
    mergeGuestCart(store, user.id);
    saveStore(store);
    return HttpResponse.json(
      { user: publicUser(user), token: store.session.token },
      { status: 201 },
    );
  }),

  http.get("/api/auth/session", ({ request }) => {
    const store = getStore();
    const user = sessionUser(store, request);
    return user ? HttpResponse.json(publicUser(user)) : unauthorized();
  }),

  http.post("/api/auth/logout", () => {
    const store = getStore();
    store.session = null;
    saveStore(store);
    return HttpResponse.json({ ok: true });
  }),

  http.get("/api/cart", ({ request }) => {
    const store = getStore();
    const key = cartKey(sessionUser(store, request));
    const items = store.carts[key] ?? [];
    return HttpResponse.json({
      items,
      lines: items
        .map((item) => ({
          ...item,
          nft: store.nfts.find((nft) => nft.id === item.nftId),
        }))
        .filter((item) => item.nft),
    });
  }),

  http.post("/api/cart", async ({ request }) => {
    const { nftId, quantity } = (await request.json()) as CartItem;
    const store = getStore();
    const nft = store.nfts.find((item) => item.id === nftId);
    const qty = Number(quantity);
    if (!nft) return error("NFT não encontrado.", 404, "NOT_FOUND");
    if (!Number.isInteger(qty) || qty < 1)
      return error("Quantidade inválida.", 422, "VALIDATION");
    const key = cartKey(sessionUser(store, request));
    const items = store.carts[key] ?? [];
    const existing = items.find((item) => item.nftId === nftId);
    if ((existing?.quantity ?? 0) + qty > nft.available)
      return error("Quantidade superior ao estoque.", 409, "STOCK_CONFLICT");
    if (existing) existing.quantity += qty;
    else items.push({ nftId, quantity: qty });
    store.carts[key] = items;
    saveStore(store);
    return HttpResponse.json({ items });
  }),

  http.patch("/api/cart/:id", async ({ request, params }) => {
    const { quantity } = (await request.json()) as { quantity: number };
    const store = getStore();
    const key = cartKey(sessionUser(store, request));
    const line = (store.carts[key] ?? []).find(
      (item) => item.nftId === params.id,
    );
    const nft = store.nfts.find((item) => item.id === params.id);
    if (!line || !nft) return error("Item não encontrado.", 404, "NOT_FOUND");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > nft.available)
      return error("Quantidade indisponível.", 409, "STOCK_CONFLICT");
    line.quantity = quantity;
    saveStore(store);
    return HttpResponse.json({ items: store.carts[key] });
  }),

  http.delete("/api/cart/:id", ({ request, params }) => {
    const store = getStore();
    const key = cartKey(sessionUser(store, request));
    store.carts[key] = (store.carts[key] ?? []).filter(
      (item) => item.nftId !== params.id,
    );
    saveStore(store);
    return HttpResponse.json({ items: store.carts[key] });
  }),

  http.post("/api/quote", async ({ request }) => {
    const { coupon = null, network = "Ethereum" } = (await request.json()) as {
      coupon?: string | null;
      network?: Network;
    };
    const store = getStore();
    const items = store.carts[cartKey(sessionUser(store, request))] ?? [];
    if (!items.length)
      return error("O carrinho está vazio.", 409, "EMPTY_CART");
    try {
      return HttpResponse.json(makeQuote(store, items, coupon, network));
    } catch (cause) {
      return error((cause as Error).message, 409, "QUOTE_CONFLICT");
    }
  }),

  http.get("/api/favorites", ({ request }) => {
    const store = getStore();
    const user = sessionUser(store, request);
    return user
      ? HttpResponse.json(store.favorites[user.id] ?? [])
      : unauthorized();
  }),

  http.post("/api/favorites/:id", ({ request, params }) => {
    const store = getStore();
    const user = sessionUser(store, request);
    if (!user) return unauthorized();
    if (!store.nfts.some((nft) => nft.id === params.id))
      return error("NFT não encontrado.", 404, "NOT_FOUND");
    store.favorites[user.id] = [
      ...new Set([...(store.favorites[user.id] ?? []), String(params.id)]),
    ];
    saveStore(store);
    return HttpResponse.json(store.favorites[user.id]);
  }),

  http.delete("/api/favorites/:id", ({ request, params }) => {
    const store = getStore();
    const user = sessionUser(store, request);
    if (!user) return unauthorized();
    store.favorites[user.id] = (store.favorites[user.id] ?? []).filter(
      (id) => id !== params.id,
    );
    saveStore(store);
    return HttpResponse.json(store.favorites[user.id]);
  }),

  http.get("/api/profile", ({ request }) => {
    const store = getStore();
    const user = sessionUser(store, request);
    return user ? HttpResponse.json(publicUser(user)) : unauthorized();
  }),

  http.patch("/api/profile", async ({ request }) => {
    const store = getStore();
    const user = sessionUser(store, request);
    if (!user) return unauthorized();
    const { name, email, avatar } = (await request.json()) as {
      name: string;
      email: string;
      avatar?: string;
    };
    if (!name?.trim() || !email?.includes("@"))
      return error("Nome ou email inválido.", 422, "VALIDATION");
    if (
      store.users.some(
        (item) =>
          item.id !== user.id &&
          item.email.toLowerCase() === email.toLowerCase(),
      )
    )
      return error("Email já utilizado.", 409, "CONFLICT");
    user.name = name.trim();
    user.email = email.trim();
    user.avatar = avatar?.slice(0, 12) || user.avatar;
    saveStore(store);
    return HttpResponse.json(publicUser(user));
  }),

  http.patch("/api/profile/password", async ({ request }) => {
    const store = getStore();
    const user = sessionUser(store, request);
    if (!user) return unauthorized();
    const { currentPassword, newPassword } = (await request.json()) as {
      currentPassword: string;
      newPassword: string;
    };
    if ((await hashPassword(currentPassword ?? "")) !== user.passwordHash)
      return error("Senha atual incorreta.", 422, "VALIDATION");
    if (!newPassword || newPassword.length < 8)
      return error(
        "Nova senha deve ter pelo menos 8 caracteres.",
        422,
        "VALIDATION",
      );
    user.passwordHash = await hashPassword(newPassword);
    saveStore(store);
    return HttpResponse.json({ ok: true });
  }),

  http.get("/api/wallets", ({ request }) => {
    const store = getStore();
    const user = sessionUser(store, request);
    return user
      ? HttpResponse.json(store.wallets[user.id] ?? [])
      : unauthorized();
  }),

  http.post("/api/wallets", async ({ request }) => {
    const store = getStore();
    const user = sessionUser(store, request);
    if (!user) return unauthorized();
    const body = (await request.json()) as Pick<
      Wallet,
      "label" | "address" | "network" | "primary"
    >;
    if (!body.label?.trim() || !/^0x[a-f\d]{40}$/i.test(body.address ?? ""))
      return error(
        "Use um nome e endereço hexadecimal de 42 caracteres.",
        422,
        "VALIDATION",
      );
    const wallets = store.wallets[user.id] ?? [];
    const wallet: Wallet = {
      id: crypto.randomUUID(),
      label: body.label.trim(),
      address: body.address,
      network: body.network,
      primary: !!body.primary || !wallets.length,
    };
    if (wallet.primary)
      wallets.forEach((item) => {
        item.primary = false;
      });
    wallets.push(wallet);
    store.wallets[user.id] = wallets;
    saveStore(store);
    return HttpResponse.json(wallet, { status: 201 });
  }),

  http.patch("/api/wallets/:id", async ({ request, params }) => {
    const store = getStore();
    const user = sessionUser(store, request);
    if (!user) return unauthorized();
    const body = (await request.json()) as Partial<Wallet>;
    const wallets = store.wallets[user.id] ?? [];
    const wallet = wallets.find((item) => item.id === params.id);
    if (!wallet) return error("Carteira não encontrada.", 404, "NOT_FOUND");
    if (body.primary)
      wallets.forEach((item) => {
        item.primary = false;
      });
    if (body.label) wallet.label = body.label.trim();
    if (body.network) wallet.network = body.network;
    if (body.primary !== undefined) wallet.primary = body.primary;
    saveStore(store);
    return HttpResponse.json(wallet);
  }),

  http.get("/api/orders", ({ request }) => {
    settleAndNotify();
    const store = getStore();
    const user = sessionUser(store, request);
    return user
      ? HttpResponse.json(
          store.orders.filter((order) => order.userId === user.id),
        )
      : unauthorized();
  }),

  http.get("/api/orders/:id", ({ request, params }) => {
    settleAndNotify();
    const store = getStore();
    const user = sessionUser(store, request);
    if (!user) return unauthorized();
    const order = store.orders.find(
      (item) => item.id === params.id && item.userId === user.id,
    );
    return order
      ? HttpResponse.json(order)
      : error("Pedido não encontrado.", 404, "NOT_FOUND");
  }),

  http.post("/api/orders", async ({ request }) => {
    const store = getStore();
    const user = sessionUser(store, request);
    if (!user) return unauthorized();
    const key = request.headers.get("Idempotency-Key");
    if (!key)
      return error("Chave de idempotência obrigatória.", 422, "VALIDATION");
    const body = (await request.json()) as {
      coupon: string | null;
      network: Network;
      walletId: string;
      quoteRevision: string;
      collector: CollectorDetails;
      decline?: boolean;
    };
    const forceDecline =
      import.meta.env.DEV &&
      sessionStorage.getItem("jungle-test-decline-next-order") === "1";

    sessionStorage.removeItem("jungle-test-decline-next-order");

    if (forceDecline) {
      body.decline = true;
    }
    const fingerprint = JSON.stringify(body);
    const previous = store.orders.find(
      (order) => order.userId === user.id && order.idempotencyKey === key,
    );
    if (previous)
      return previous.fingerprint === fingerprint
        ? HttpResponse.json(previous)
        : error(
            "Chave reutilizada com dados diferentes.",
            409,
            "IDEMPOTENCY_CONFLICT",
          );
    const wallet = (store.wallets[user.id] ?? []).find(
      (item) => item.id === body.walletId,
    );
    if (!wallet) return error("Carteira inválida.", 422, "VALIDATION");
    let quote;
    const collectorError = validateCollector(
      body.collector,
      wallet,
      body.network,
      user.email,
    );

    if (collectorError) {
      return error(collectorError, 422, "VALIDATION");
    }
    try {
      quote = makeQuote(
        store,
        store.carts[user.id] ?? [],
        body.coupon,
        body.network,
      );
    } catch (cause) {
      return error((cause as Error).message, 409, "QUOTE_CONFLICT");
    }
    if (!quote.lines.length || body.quoteRevision !== quote.revision)
      return error(
        "A cotação mudou. Revise antes de confirmar.",
        409,
        "STALE_QUOTE",
      );
    const order: Order = {
      id: `JG-${Date.now().toString(36).toUpperCase()}`,
      userId: user.id,
      idempotencyKey: key,
      fingerprint,
      status: "pending",
      version: 1,
      network: body.network,
      walletId: wallet.id,
      collector: structuredClone(body.collector),
      quote: structuredClone(quote),
      createdAt: new Date().toISOString(),
      txRef: body.decline
        ? `DECLINE-${crypto.randomUUID()}`
        : `0x${crypto.randomUUID().replaceAll("-", "")}`,
    };
    store.orders.push(order);
    saveStore(store);
    setTimeout(settleAndNotify, 2100);
    return HttpResponse.json(order, { status: 201 });
  }),

  http.post("/api/scenarios/nft-update", async ({ request }) => {
    const { nftId } = (await request.json()) as { nftId: string };
    const store = getStore();
    const nft = store.nfts.find((item) => item.id === nftId) ?? store.nfts[0];
    nft.priceEth = (Number(nft.priceEth) + 0.015).toFixed(3);
    nft.version += 1;
    saveStore(store);
    broadcast("nft.updated", {
      id: nft.id,
      priceEth: nft.priceEth,
      available: nft.available,
      version: nft.version,
    });
    return HttpResponse.json(nft);
  }),

  http.post("/api/scenarios/network", async ({ request }) => {
    const { mode } = (await request.json()) as { mode: string };
    if (!["normal", "slow", "empty", "error", "offline"].includes(mode))
      return error("Cenário desconhecido.", 422, "VALIDATION");
    localStorage.setItem("jungle-network-mode", mode);
    return HttpResponse.json({ mode });
  }),

  http.post("/api/scenarios/expire", () => {
    const store = getStore();
    if (store.session) store.session.expiresAt = Date.now() - 1;
    saveStore(store);
    return HttpResponse.json({ ok: true });
  }),

  http.post("/api/scenarios/reset", () => {
    resetStore();
    localStorage.setItem("jungle-network-mode", "normal");
    return HttpResponse.json({ ok: true });
  }),
];
