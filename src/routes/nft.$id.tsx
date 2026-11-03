import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, Mail, Minus, Plus, Star } from "lucide-react";
import { marketplaceApi, messageFromError } from "../lib/api";
import type { NFT } from "../lib/models";
import { useAuth } from "../lib/auth";
import { NftArtwork } from "../components/NftArtwork";

export const Route = createFileRoute("/nft/$id")({ component: NFTDetails });

// A token has one asset in the API fixture. Each gallery view is an honest
// crop of that asset, not an image belonging to another NFT.
const galleryViews = [
  { label: "Arte completa", transform: "scale-100" },
  { label: "Detalhe do rosto", transform: "scale-[1.3] -translate-x-[4%]" },
  {
    label: "Detalhe da composição",
    transform: "scale-[1.18] translate-x-[5%] translate-y-[5%]",
  },
  {
    label: "Detalhe do acabamento",
    transform: "scale-[1.4] translate-y-[-6%]",
  },
];

function ArtworkGallery({ nft }: { nft: NFT }) {
  const [active, setActive] = useState(0);
  return (
    <div className="grid gap-3 md:grid-cols-[64px_minmax(0,1fr)] md:gap-4">
      <div
        className="hidden flex-col gap-3 md:flex"
        aria-label="Vistas da obra"
      >
        {galleryViews.map((view, index) => (
          <button
            key={view.label}
            type="button"
            aria-label={view.label}
            aria-pressed={active === index}
            className={`aspect-square overflow-hidden rounded-lg border-2 transition-colors ${active === index ? "border-[#dd9551]" : "border-transparent hover:border-[#805133]"}`}
            onClick={() => setActive(index)}
          >
            <div className="h-full w-full overflow-hidden">
              <NftArtwork
                nft={nft}
                className={`h-full w-full transition-transform duration-300 ${view.transform}`}
              />
            </div>
          </button>
        ))}
      </div>
      <div className="aspect-[1.08] overflow-hidden rounded-[1.35rem] bg-[#34231a] md:aspect-square md:rounded-[1rem]">
        <NftArtwork
          nft={nft}
          className={`h-full w-full transition-transform duration-500 ${galleryViews[active].transform}`}
        />
      </div>
    </div>
  );
}

function NFTDetails() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  const [detailTab, setDetailTab] = useState<"description" | "reviews">(
    "description",
  );
  const queryClient = useQueryClient();
  const nftQuery = useQuery({
    queryKey: ["nft", id],
    queryFn: () => marketplaceApi.nft(id),
  });
  const relatedQuery = useQuery({
    queryKey: ["nfts", "related", id],
    queryFn: () => marketplaceApi.catalog({ page: 1, sort: "featured" }),
    enabled: nftQuery.isSuccess,
  });
  const favorites = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: marketplaceApi.favorites,
    enabled: !!user,
  });
  const isFavorite = favorites.data?.includes(id) ?? false;

  const favorite = useMutation({
    mutationFn: () =>
      isFavorite ? marketplaceApi.unfavorite(id) : marketplaceApi.favorite(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["favorites", user?.id] });
      const previous = queryClient.getQueryData<string[]>([
        "favorites",
        user?.id,
      ]);
      queryClient.setQueryData<string[]>(["favorites", user?.id], (current) =>
        isFavorite
          ? (current ?? []).filter((item) => item !== id)
          : [...(current ?? []), id],
      );
      return { previous };
    },
    onError: (_error, _variables, context) =>
      queryClient.setQueryData(["favorites", user?.id], context?.previous),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] }),
  });
  const toggleFavorite = () => {
    if (user) favorite.mutate();
    else void navigate({ to: "/login" });
  };

  const add = useMutation({
    mutationFn: (intent: "cart" | "buy") =>
      marketplaceApi.addCart(id, quantity).then(() => intent),
    onSuccess: (intent) => {
      void queryClient.invalidateQueries({ queryKey: ["cart"] });
      if (intent === "buy") void navigate({ to: "/checkout" });
      else setNotice("NFT added to your cart.");
    },
    onError: (error) => setNotice(messageFromError(error)),
  });

  if (nftQuery.isPending)
    return (
      <main
        className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:grid-cols-2"
        aria-label="Carregando detalhes do NFT"
      >
        <div className="skeleton aspect-square rounded-3xl" />
        <div className="space-y-6">
          <div className="skeleton h-12 rounded-lg" />
          <div className="skeleton h-48 rounded-lg" />
          <div className="skeleton h-20 rounded-lg" />
        </div>
      </main>
    );
  if (nftQuery.isError)
    return (
      <main className="mx-auto max-w-5xl px-6 py-24" role="alert">
        <h1 className="text-3xl font-bold">NFT not found</h1>
        <p className="mt-3 text-[#c8a88c]">
          {messageFromError(nftQuery.error)}
        </p>
        <Link className="btn-secondary mt-6" to="/">
          Back to catalog
        </Link>
      </main>
    );

  const nft = nftQuery.data;
  const relatedOrder = [
    "Cosmic Bloom #118",
    "Violet Nomad #314",
    "Ivory Baron #088",
    "Golden Beat #207",
    "Golden Signal #160",
  ];

  const related = (relatedQuery.data?.items ?? [])
    .filter((item) => item.id !== nft.id && item.collection === nft.collection)
    .sort((a, b) => {
      const aIndex = relatedOrder.indexOf(a.title);
      const bIndex = relatedOrder.indexOf(b.title);

      return (
        (aIndex === -1 ? Infinity : aIndex) -
        (bIndex === -1 ? Infinity : bIndex)
      );
    })
    .slice(0, 5);
  const editions = nft.editions ?? [
    `1/${nft.total}`,
    nft.available > 0 ? "ABERTA" : "ESGOTADA",
  ];
  const tokenNumber =
    nft.tokenNumber ?? nft.id.replace(/[^0-9]/g, "").padStart(4, "0");
  const attributes = nft.attributes ?? [nft.category];
  const canPurchase = nft.available > 0 && quantity <= nft.available;

  return (
    <main className="mx-auto max-w-7xl pb-2 md:px-8 md:pt-6 lg:px-10">
      <div className="mb-6 hidden items-center gap-2 text-xs text-[#d3a16e] md:flex">
        <Link to="/" className="hover:text-white">
          Início
        </Link>
        <span>/</span>
        <Link to="/" hash="explore" className="hover:text-white">
          Mercado
        </Link>
        <span>/</span>
        <span className="text-[#f5e7d9]">{nft.title}</span>
      </div>

      <section
        className="mx-auto max-w-[440px] overflow-hidden rounded-[1.8rem] bg-[#281810] md:grid md:max-w-none md:grid-cols-[1.04fr_.96fr] md:items-start md:gap-10 md:overflow-visible md:rounded-none md:bg-transparent lg:gap-14"
        aria-label={`Detalhes de ${nft.title}`}
      >
        <div className="relative px-5 pt-[58px] md:p-0">
          <div className="absolute left-5 right-5 top-4 flex items-center justify-between md:hidden">
            <Link
              to="/"
              aria-label="Voltar ao mercado"
              className="flex size-9 items-center justify-center rounded-full bg-[#382219] text-[#e4a463]"
            >
              <ArrowLeft size={18} />
            </Link>
            <button
              type="button"
              aria-label={
                isFavorite
                  ? `Remover ${nft.title} dos favoritos`
                  : `Favoritar ${nft.title}`
              }
              aria-pressed={isFavorite}
              disabled={favorite.isPending}
              onClick={toggleFavorite}
              className={`flex size-9 items-center justify-center rounded-full bg-[#382219] ${isFavorite ? "text-[#f0a758]" : "text-[#d68a43]"}`}
            >
              <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
            </button>
          </div>
          <ArtworkGallery nft={nft} />
        </div>

        <div className="relative -mt-3 rounded-t-[1.7rem] bg-[#281810] px-5 pb-6 pt-6 md:mt-0 md:rounded-none md:bg-transparent md:px-0 md:py-0">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-[1.05rem] font-bold leading-snug tracking-tight text-[#f8eee5] md:text-[1.9rem]">
              {nft.title}
            </h1>
            {typeof nft.rating === "number" && (
              <div className="flex shrink-0 items-center gap-1 rounded-full border border-[#ca8c47] px-2 py-1 text-[11px] leading-none text-[#f2b168] md:hidden">
                <Star size={11} fill="currentColor" /> {nft.rating.toFixed(1)}{" "}
                <span className="text-[#e7d4c1]">({nft.reviewCount ?? 0})</span>
              </div>
            )}
          </div>
          <div className="mt-2 hidden flex-wrap items-center gap-4 md:flex">
            <strong className="text-xl text-[#e49b4d]">
              {nft.priceEth} ETH
            </strong>
            {typeof nft.rating === "number" && (
              <span className="flex items-center gap-2 text-xs text-[#e9a455]">
                <span
                  className="flex gap-0.5"
                  aria-label={`Avaliação ${nft.rating} de 5`}
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star size={12} key={i} fill="currentColor" />
                  ))}
                </span>
                <span className="text-[#cfb8a5]">
                  {nft.reviewCount ?? 0} avaliações de colecionadores
                </span>
              </span>
            )}
          </div>
          <div className="flex flex-col">
            <p className="order-1 mt-4 hidden text-xs font-bold text-[#f1e5d9] md:mt-2 md:block">
              Sobre este NFT:
            </p>
            <p className="order-1 mt-3 text-[11px] leading-[1.9] text-[#cda681] md:mt-1 md:max-w-lg md:text-[13px] md:leading-[1.6]">
              {nft.description}
            </p>

            <div className="order-2 mt-4 md:mt-2">
              <h2 className="text-xs font-semibold text-[#f5e5d6] md:mb-2">
                Edição:
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {editions.map((edition, index) => (
                  <span
                    key={`${edition}-${index}`}
                    className={`rounded-full border px-2.5 py-1 text-[10px] leading-none ${edition === "1/50" || (editions.length <= 2 && index === 0) ? "border-[#e6a15a] text-[#e6a15a]" : "border-[#573526] text-[#b18a6c]"}`}
                  >
                    {edition}
                  </span>
                ))}
              </div>
            </div>
            <dl className="order-4 mt-4 space-y-2.5 text-[11px] leading-snug text-[#cda681] md:order-6 md:mt-4 md:text-xs">
              <div className="flex flex-wrap gap-2">
                <dt>ID do token:</dt>
                <dd>#{tokenNumber}</dd>
              </div>
              <div className="flex flex-wrap gap-2">
                <dt>Coleção:</dt>
                <dd>{nft.collection}</dd>
              </div>
              <div className="flex flex-wrap gap-2">
                <dt>Atributos:</dt>
                <dd>{attributes.join(", ")}</dd>
              </div>
            </dl>

            <div className="order-5 mt-7 flex flex-col gap-4 border-t border-[#3c291f] pt-4 md:order-4 md:mt-5 md:border-0 md:pt-0 xl:flex-row xl:items-center xl:justify-between xl:gap-4">
              {/* Quantidade */}
              <div className="flex items-center justify-between gap-3 xl:shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Diminuir quantidade"
                    disabled={quantity <= 1}
                    onClick={() =>
                      setQuantity((current) => Math.max(1, current - 1))
                    }
                    className="flex h-[64px] w-[48px] items-center justify-center rounded-full bg-[#D58B4B] text-[#160D09] transition-colors hover:bg-[#E9A260] disabled:opacity-50 md:h-[60px] md:w-[52px]"
                  >
                    <Minus size={20} strokeWidth={2.5} />
                  </button>

                  <span className="min-w-[28px] text-center text-2xl font-medium text-[#F7F3EC] md:text-xl">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    aria-label="Aumentar quantidade"
                    disabled={quantity >= nft.available}
                    onClick={() =>
                      setQuantity((current) =>
                        Math.min(nft.available, current + 1),
                      )
                    }
                    className="flex h-[64px] w-[48px] items-center justify-center rounded-full bg-[#D58B4B] text-[#160D09] transition-colors hover:bg-[#E9A260] disabled:opacity-50 md:h-[60px] md:w-[52px]"
                  >
                    <Plus size={20} strokeWidth={2.5} />
                  </button>
                </div>

                <strong className="text-[1.1rem] font-bold text-[#e49a4b] md:hidden">
                  {nft.priceEth} ETH
                </strong>
              </div>

              {/* Ações */}
              <div className="flex min-w-0 flex-wrap items-center gap-2 xl:flex-1 xl:flex-nowrap xl:justify-end">
                <button
                  type="button"
                  aria-label="Comprar NFT"
                  disabled={!canPurchase || add.isPending}
                  onClick={() => add.mutate("buy")}
                  className="flex min-h-[64px] min-w-0 flex-1 items-center justify-center rounded-xl bg-[#D58B4B] px-4 font-mono text-lg font-bold uppercase text-[#160D09] transition-colors hover:bg-[#E9A260] disabled:cursor-not-allowed disabled:opacity-50 md:min-h-[60px] xl:flex-[2]"
                >
                  {add.isPending ? "Adicionando…" : "COMPRAR"}
                </button>
                <button
                  type="button"
                  aria-label={
                    isFavorite
                      ? `Remover ${nft.title} dos favoritos`
                      : `Favoritar ${nft.title}`
                  }
                  aria-pressed={isFavorite}
                  disabled={favorite.isPending}
                  onClick={toggleFavorite}
                  className="flex min-h-[64px] w-full items-center justify-center gap-2 rounded-xl border-2 border-[#D58B4B] bg-[#160D09] px-4 font-mono text-lg font-semibold text-[#D58B4B] transition-colors hover:bg-[#39231A] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto md:min-h-[60px] xl:flex-1"
                >
                  <Heart
                    size={28}
                    strokeWidth={1.8}
                    fill={isFavorite ? "currentColor" : "none"}
                  />
                  <span>{isFavorite ? "Favoritado" : "Favoritar"}</span>
                </button>
              </div>
            </div>

            {notice && (
              <p role="status" className="order-7 mt-3 text-xs text-[#e2af79]">
                {notice}{" "}
                <Link to="/cart" className="underline">
                  Ver carrinho
                </Link>
              </p>
            )}

            <div className="order-8 mt-5 hidden flex-wrap items-center gap-3 md:flex">
              <span className="text-[15px] text-[#F7F3EC]">
                Compartilhe este NFT:
              </span>

              {/* Compartilhar no LinkedIn */}
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartilhar NFT no LinkedIn"
                title="Compartilhar no LinkedIn"
                className="text-[#F7F3EC] transition-colors hover:text-[#D58B4B]"
              >
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.35V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124Zm1.782 13.019H3.555V9h3.564v11.452ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003Z" />
                </svg>
              </a>

              {/* Compartilhar por e-mail */}
              <a
                href={`mailto:?subject=${encodeURIComponent(nft.title)}&body=${encodeURIComponent(`Confira este NFT no KURIO: ${window.location.href}`)}`}
                aria-label="Compartilhar NFT por e-mail"
                title="Compartilhar por e-mail"
                className="text-[#F7F3EC] transition-colors hover:text-[#D58B4B]"
              >
                <Mail size={19} strokeWidth={1.8} />
              </a>

              {/* Compartilhar no X */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Confira ${nft.title} no KURIO`)}&url=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartilhar NFT no X"
                title="Compartilhar no X"
                className="text-[#F7F3EC] transition-colors hover:text-[#D58B4B]"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.847h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.153h7.594l5.243 6.932 6.064-6.932Zm-1.29 19.49h2.039L6.486 3.24H4.298l13.313 17.403Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section
        className="mt-16 hidden md:block"
        aria-label="Informações adicionais do NFT"
      >
        <div
          className="flex gap-7 border-b border-[#6b4027]"
          role="tablist"
          aria-label="Conteúdo do NFT"
        >
          <button
            type="button"
            role="tab"
            aria-selected={detailTab === "description"}
            onClick={() => setDetailTab("description")}
            className={`pb-3 text-sm font-bold ${detailTab === "description" ? "border-b-2 border-[#e4a05a] text-[#e9ad6d]" : "text-[#ad8b75]"}`}
          >
            Detalhes do NFT
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={detailTab === "reviews"}
            onClick={() => setDetailTab("reviews")}
            className={`pb-3 text-sm font-bold ${detailTab === "reviews" ? "border-b-2 border-[#e4a05a] text-[#e9ad6d]" : "text-[#F5F1EB]"}`}
          >
            Avaliações de colecionadores ({nft.reviewCount ?? 0})
          </button>
        </div>
        <div
          className="max-w-5xl space-y-4 pt-5 text-xs leading-7 text-[#b79880]"
          role="tabpanel"
        >
          {detailTab === "description" ? (
            <>
              <p>
                Emerald Ape #042 é uma obra digital 1/50 finalizada à mão da
                coleção Kurio Editions. Cada atributo fica armazenado nos
                metadados do token e verificado na Ethereum. A obra explora
                identidade, movimento e luz em um mundo digital sem fronteiras.
              </p>
              <p>
                A propriedade inclui a arte em alta resolução. lançamentos
                exclusivos para colecionadores e um registro permanente de
                procedência registrada na rede. Nova Sato recebe 5% de direitos
                autorais nas venda secundárias, apoiando novos trabalhos e
                lançamentos da comunidade.
              </p>
              <h3 className="font-bold text-[#F5F1EB]">Rede</h3>
              <p>
                Cunhado na Ethereum com procedência imutável e metadados
                armazenados no IPFS.
              </p>
              <h3 className="font-bold text-[#F5F1EB]">Contrato</h3>
              <p>
                Direitos autorais do criador: 5% nas vendas secundárias, pagos
                automaticamente eplos mercados compatíveis.
              </p>
              <h3 className="font-bold text-[#F5F1EB]">Direitos Autorais</h3>
              <p>0x7A42....19E8 · Contrato inteligente ERC-721 verificado.</p>
            </>
          ) : (
            <p>
              {nft.reviewCount
                ? `Este NFT apresenta uma avaliação de ${nft.rating?.toFixed(1) ?? "—"} de 5 em ${nft.reviewCount} avaliações simuladas. Comentários individuais não estão disponíveis.`
                : "Este NFT ainda não possui avaliações na demonstração."}
            </p>
          )}
        </div>
      </section>

      <section
        className="mt-16 hidden md:block"
        aria-labelledby="related-heading"
      >
        <div className="mb-6 flex items-center justify-between border-b border-[#64402b] pb-3">
          <h2 id="related-heading" className="text-lg font-bold text-[#e6a465]">
            Mais desta coleção
          </h2>
        </div>
        {relatedQuery.isPending ? (
          <div
            className="grid grid-cols-5 gap-4"
            aria-label="Carregando outros NFTs da coleção"
          >
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="skeleton aspect-[.76] rounded-xl" />
            ))}
          </div>
        ) : relatedQuery.isError ? (
          <p role="alert" className="text-sm text-[#ceaa8b]">
            Não foi possível carregar mais NFTs.{" "}
            <button
              type="button"
              onClick={() => relatedQuery.refetch()}
              className="underline"
            >
              Tentar novamente
            </button>
          </p>
        ) : related.length ? (
          <>
            <div className="grid grid-cols-5 gap-4 lg:gap-6">
              {related.map((item) => (
                <article key={item.id} className="min-w-0">
                  <div className="bg-[#241611] px-3 pb-4 pt-4">
                    <Link
                      to="/nft/$id"
                      params={{ id: item.id }}
                      aria-label={`Ver ${item.title}`}
                      className="block overflow-hidden rounded-xl"
                    >
                      <NftArtwork nft={item} />
                    </Link>
                  </div>
                  <div className="pt-3">
                    <Link
                      to="/nft/$id"
                      params={{ id: item.id }}
                      className="block text-[13px] leading-5 text-[#F7F3EC] hover:text-[#D58B4B]"
                    >
                      {item.title}
                    </Link>
                    <span className="block text-[15px] font-bold text-[#D58B4B]">
                      {item.priceEth} ETH
                    </span>
                  </div>
                </article>
              ))}
            </div>
            {/* Indicadores visuais da referência; não são paginação funcional. */}
            <div
              className="mt-7 flex items-center justify-center gap-2"
              aria-hidden="true"
            >
              <span className="size-3 rounded-full border border-[#D58B4B]" />
              <span className="size-3 rounded-full bg-[#D58B4B]" />
              <span className="size-3 rounded-full border border-[#D58B4B]" />
            </div>
          </>
        ) : (
          <p className="text-sm text-[#b79b83]">
            Nenhuma outra obra desta coleção está disponível.
          </p>
        )}
      </section>
    </main>
  );
}
