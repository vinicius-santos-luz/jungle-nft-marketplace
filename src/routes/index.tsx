import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react'
import { marketplaceApi, messageFromError } from '../lib/api'
import type { CatalogParams, CatalogSort } from '../lib/models'
import { NftCard } from '../components/NftCard'
import emeraldApe from '../assets/emerald-ape.png'
import sageNomad from '../assets/sage-nomad.png'
import neonVessel from '../assets/neon-vessel.png'
import goldenBeat from '../assets/golden-beat.png'

const categories = ['all', 'Art', 'Gaming', 'Music', 'Photography']
const categoryLabels: Record<string, string> = {
  all: 'Todas as coleções', Art: 'Arte digital', Gaming: 'Jogos', Music: 'Música', Photography: 'Fotografia',
}
// The counts match this demo's 12 seeded NFTs, not the larger Figma catalog.
const sidebarCategories: { name: string; count: number; category?: string }[] = [
  { name: 'Arte digital', category: 'Art', count: 4 },
  { name: 'Fotografia', category: 'Photography', count: 2 },
  { name: 'Música', category: 'Music', count: 3 },
  { name: 'Arte 3D', count: 0 },
  { name: 'Colecionáveis', count: 0 },
  { name: 'Generativa', count: 0 },
  { name: 'Jogos', category: 'Gaming', count: 3 },
  { name: 'Assinaturas', count: 0 },
  { name: 'Utilidade', count: 0 },
]
const catalogTabs: { label: string; sort: CatalogSort }[] = [
  { label: 'Todos os NFTs', sort: 'featured' },
  { label: 'Novos lançamentos', sort: 'recent' },
  { label: 'Em alta', sort: 'trending' },
]
const sortOptions: { value: CatalogSort; label: string }[] = [
  { value: 'featured', label: 'Listados recentemente' },
  { value: 'recent', label: 'Mais novos' },
  { value: 'trending', label: 'Mais populares' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
  { value: 'name', label: 'Nome A–Z' },
]
const editorial = [
  { title: 'Como funciona a propriedade de NFTs', description: 'Aprenda a colecionar, negociar e verificar ativos digitais.', image: neonVessel, date: '12 de setembro' },
  { title: '10 artistas digitais para acompanhar', description: 'Conheça criadores que moldam a cultura digital.', image: emeraldApe, date: '13 de setembro' },
  { title: 'Raridade, atributos e procedência', description: 'Entenda raridade, procedência e utilidade.', image: sageNomad, date: '15 de setembro' },
  { title: 'Como proteger sua carteira', description: 'Proteja sua carteira, seus ativos e sua identidade.', image: goldenBeat, date: '15 de setembro' },
]

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): CatalogParams => ({
    q: typeof search.q === 'string' ? search.q : '',
    category: typeof search.category === 'string' && categories.includes(search.category) ? search.category : 'all',
    sort: sortOptions.some(option => option.value === search.sort) ? search.sort as CatalogSort : 'featured' as CatalogSort,
    page: Number.isInteger(Number(search.page)) && Number(search.page) > 0 ? Number(search.page) : 1,
    minPrice: typeof search.minPrice === 'string' && Number.isFinite(Number(search.minPrice)) ? search.minPrice : undefined,
    maxPrice: typeof search.maxPrice === 'string' && Number.isFinite(Number(search.maxPrice)) ? search.maxPrice : undefined,
  }),
  component: HomePage,
})

function HomePage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/' })
  const [draft, setDraft] = useState(search.q ?? '')
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [priceRange, setPriceRange] = useState({
    min: Number(search.minPrice ?? '0.02'),
    max: Number(search.maxPrice ?? '12.30'),
  })
  const catalog = useQuery({
    queryKey: ['nfts', search],
    queryFn: () => marketplaceApi.catalog(search),
    placeholderData: previous => previous,
    retry: false,
  })
  const update = (changes: Partial<typeof search>) =>
    navigate({ search: prev => ({ ...prev, ...changes, page: changes.page ?? 1 }) })
  const submitSearch = () => void update({ q: draft })
  const chooseCategory = (category: string) => {
    void update({ category })
    setMobileFiltersOpen(false)
  }
  const selectPrice = () => {
    void update({ minPrice: priceRange.min.toFixed(2), maxPrice: priceRange.max.toFixed(2) })
    setMobileFiltersOpen(false)
  }

  return (
    <main className="bg-[#130c09]">
      {/* Figma uses a search-led top bar on mobile and the full navigation on desktop. */}
      <div className="relative mx-auto max-w-[1200px] px-6 pt-10 md:hidden">
        <div className="flex items-center gap-2">
          <form className="relative min-w-0 flex-1" role="search" onSubmit={event => { event.preventDefault(); submitSearch() }}>
            <Search size={19} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c69054]" />
            <input type="search" aria-label="Pesquisar NFTs" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Explorar coleções" className="field !h-[46px] !rounded-xl !border-0 !bg-[#291a15] !pl-11 !text-[13px] !font-bold !text-[#d8aa79] placeholder:!text-[#b28c66]" />
          </form>
          <button type="button" aria-label="Abrir filtros" aria-controls="mobile-market-filters" aria-expanded={mobileFiltersOpen} onClick={() => setMobileFiltersOpen(open => !open)} className="flex size-[46px] shrink-0 items-center justify-center rounded-xl bg-[#dc9650] text-[#25160d]">
            {mobileFiltersOpen ? <X size={20} /> : <SlidersHorizontal size={20} />}
          </button>
        </div>
        {mobileFiltersOpen && (
          <div id="mobile-market-filters" className="absolute left-6 right-6 top-[96px] z-30 rounded-2xl border border-[#734a2c] bg-[#291913] p-5 shadow-2xl">
            <h2 className="mb-3 text-sm font-bold">Filtrar coleções</h2>
            <div className="grid grid-cols-2 gap-2">
              {categories.map(category => <button key={category} type="button" onClick={() => chooseCategory(category)} className={`rounded-lg px-3 py-2 text-left text-xs ${search.category === category ? 'bg-[#dc9650] text-[#20130d]' : 'bg-[#38241b] text-[#efdbc5]'}`}>{categoryLabels[category]}</button>)}
            </div>
            <h3 className="mt-5 text-xs font-bold text-[#f0dfce]">Faixa de preço (ETH)</h3>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="text-[11px] text-[#bd9673]">Mínimo<input aria-label="Preço mínimo" type="number" min="0.02" max={priceRange.max} step="0.01" value={priceRange.min} onChange={event => setPriceRange(current => ({ ...current, min: Math.min(Number(event.target.value), current.max) }))} className="field mt-1 !py-2" /></label>
              <label className="text-[11px] text-[#bd9673]">Máximo<input aria-label="Preço máximo" type="number" min={priceRange.min} max="12.30" step="0.01" value={priceRange.max} onChange={event => setPriceRange(current => ({ ...current, max: Math.max(Number(event.target.value), current.min) }))} className="field mt-1 !py-2" /></label>
            </div>
            <button type="button" className="btn-primary mt-4 w-full text-xs" onClick={selectPrice}>Aplicar faixa de preço</button>
          </div>
        )}
      </div>

      <section className="mx-auto max-w-[1200px] px-6 pt-4 md:hidden" aria-label="Destaque KURIO">
        <div className="relative h-[200px] overflow-hidden rounded-[1.7rem] bg-[radial-gradient(circle_at_24%_46%,#765038_0%,#4a3021_47%,#281911_100%)] p-4">
          <span aria-hidden="true" className="pointer-events-none absolute -left-12 -top-16 size-[245px] rounded-full border-[28px] border-[#a16d44]/15" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 right-0 size-[215px] rounded-full border-[28px] border-[#9f6c46]/10" />
          <div className="relative z-10 max-w-[52%]">
            <p className="text-[10px] font-bold text-[#fff0dc]">Bem-vindo à Kurio</p>
            <h1 className="mt-2 text-[17px] font-bold uppercase leading-[1.65] tracking-tight text-[#fff6ee]">SEJA DONO DA CULTURA DIGITAL</h1>
            <p className="mt-2 max-w-[170px] text-[10px] leading-[1.65] text-[#d3b394]">Descubra NFTs selecionados de criadores do mundo todo.</p>
            <a href="#explore" className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#e8a05b]">EXPLORAR <ArrowRight size={13}/></a>
          </div>
          <img src={emeraldApe} alt="Emerald Ape, macaco com óculos verdes" className="absolute right-4 top-3 size-[138px] rounded-[1rem] object-cover" />
          <img src={sageNomad} alt="Prévia Sage Nomad" className="absolute bottom-[35px] right-[100px] size-[59px] rounded-2xl border border-[#ead5ba] object-cover" />
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5" aria-hidden="true">{[0, 1, 2].map(item => <span key={item} className="size-1.5 rounded-full bg-[#e6a15b]"/>)}</div>
        </div>
      </section>

      <section className="mx-auto hidden max-w-[1200px] grid-cols-[minmax(0,1fr)_minmax(330px,450px)] items-center gap-10 pt-6 pb-0 md:grid md:px-6 lg:gap-[100px] xl:px-0" aria-label="Destaque KURIO">
        <div className="relative flex h-full min-h-[450px] flex-col justify-center pb-10 pl-10">
          <p className="text-[15px] font-bold tracking-wide text-[#f5e8da]">Bem-vindo à Kurio</p>
          <h1 className="mt-4 text-[clamp(1.3rem,2.9vw,2.5rem)] font-bold uppercase leading-[1.72] tracking-tight text-[#f7eee5]">
            <span className="block">SEJA DONO DO FUTURO</span>
            <span className="block">DA ARTE DIGITAL</span>
          </h1>
          <p className="mt-3 max-w-[545px] text-[14px] leading-[1.6] text-[#cba987]">Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.</p>
          <a href="#explore" className="btn-primary mt-8 w-fit !rounded-md !px-7 !py-3 text-sm">EXPLORAR</a>
          <div className="absolute bottom-10 right-2 flex gap-2" aria-hidden="true">{[0, 1, 2].map(item => <span key={item} className="size-2 rounded-full bg-[#d9934b]"/>)}</div>
        </div>
        <img src={emeraldApe} alt="Emerald Ape, NFT em destaque da coleção Kurio" className="aspect-square w-full max-w-[450px] rounded-[1.4rem] object-cover" />
      </section>

      <section id="explore" className="mx-auto max-w-[1200px] px-6 pb-12 pt-2 md:pt-[96px] xl:px-0">
        <div className="grid gap-12 lg:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="hidden self-start lg:block">
            <div className="bg-[#291913] px-5 py-6">
              <h2 className="text-lg font-bold text-[#f7e9db]">Coleções</h2>
              <div className="mt-5 space-y-2">
                {sidebarCategories.map(({ name, category, count }) => (
                  <button key={name} type="button" disabled={!category} title={!category ? 'Sem obras nesta demonstração' : undefined} onClick={() => category && chooseCategory(category)} className={`flex w-full items-center justify-between py-1 text-left text-sm disabled:cursor-default disabled:opacity-50 ${category && search.category === category ? 'font-bold text-[#df9750]' : 'text-[#c5a182] hover:text-[#e8ac72]'}`}>
                    <span>{name}</span><span className="text-[12px] tabular-nums text-[#bd9270]">({count})</span>
                  </button>
                ))}
              </div>
              {search.category !== 'all' && <button type="button" className="mt-3 text-xs text-[#e5a05d] underline" onClick={() => chooseCategory('all')}>Limpar coleção</button>}
              <div className="mt-9 border-t border-[#5b3625] pt-7">
                <h3 className="text-base font-bold text-[#f4e4d3]">Faixa de preço</h3>
                <div className="relative mt-4 h-8">
                  <div className="absolute inset-x-0 top-[14px] h-1 rounded-full bg-[#6b4b32]" />
                  <div className="absolute top-[14px] h-1 bg-[#dc9955]" style={{ left: `${((priceRange.min - 0.02) / 12.28) * 100}%`, right: `${100 - ((priceRange.max - 0.02) / 12.28) * 100}%` }} />
                  <input type="range" min="0.02" max="12.30" step="0.01" aria-label="Preço mínimo" value={priceRange.min} onChange={event => setPriceRange(current => ({ ...current, min: Math.min(Number(event.target.value), current.max) }))} className="price-range-input z-10" />
                  <input type="range" min="0.02" max="12.30" step="0.01" aria-label="Preço máximo" value={priceRange.max} onChange={event => setPriceRange(current => ({ ...current, max: Math.max(Number(event.target.value), current.min) }))} className="price-range-input z-20" />
                </div>
                <p className="mt-2 text-xs text-[#c3a184]">Preço: {priceRange.min.toFixed(2).replace('.', ',')} – {priceRange.max.toFixed(2).replace('.', ',')} ETH</p>
                <button type="button" className="btn-primary mt-3 !px-4 !py-2 text-xs" onClick={selectPrice}>Aplicar</button>
              </div>
              <div className="mt-8 border-t border-[#5b3625] pt-7">
                <h3 className="text-base font-bold text-[#f4e4d3]">Rede</h3>
                <p className="mt-4 text-sm leading-9 text-[#c4a17e]">Ethereum<br/>Polygon<br/>Solana</p>
                <p className="mt-3 text-[10px] leading-4 text-[#977358]">Redes ilustrativas nesta demonstração.</p>
              </div>
            </div>
            <div className="mt-6 overflow-hidden rounded-lg bg-[#2a1b14]">
              <div className="px-5 pt-6 text-center"><h3 className="text-xl font-bold text-[#de954e]">NFT EM DESTAQUE</h3><p className="mt-2 text-base font-bold text-[#f2e5d6]">OFERTA LIMITADA</p></div>
              <Link to="/nft/$id" params={{ id: 'nft-2' }} aria-label="Ver NFT Sage Nomad em destaque"><img src={sageNomad} alt="Sage Nomad, NFT em destaque" className="mt-2 aspect-square w-full rounded-t-2xl object-cover" /></Link>
            </div>
          </aside>

          <div className="min-w-0">
            <h2 className="sr-only">Explore NFTs</h2>
            <div className="flex items-start justify-between gap-4 md:items-center">
              <div role="tablist" aria-label="Explorar o catálogo" className="flex min-w-0 gap-3 overflow-x-auto whitespace-nowrap border-b border-[#533421] text-[12px] md:gap-6 md:text-sm">
                {catalogTabs.map(tab => {
                  const active = (search.sort === tab.sort) || (tab.sort === 'featured' && !['recent', 'trending'].includes(search.sort ?? 'featured'))
                  return <button type="button" role="tab" aria-selected={active} key={tab.sort} onClick={() => void update({ sort: tab.sort })} className={`shrink-0 border-b-2 pb-2 transition-colors ${active ? 'border-[#e29a53] font-bold text-[#e29a53]' : 'border-transparent text-[#e3d4c6] hover:text-white'}`}>{tab.label}</button>
                })}
              </div>
              <div className="hidden shrink-0 items-center gap-2 md:flex">
                <label htmlFor="catalog-sort" className="flex items-center gap-1 text-xs text-[#e5d6c6]">Ordenar por:
                  <select id="catalog-sort" aria-label="Ordenar NFTs" value={search.sort ?? 'featured'} onChange={event => void update({ sort: event.target.value as CatalogSort })} className="max-w-[185px] bg-transparent py-1 text-xs text-[#e7c5a4] outline-[#e09a55]">
                    {sortOptions.map(option => <option key={option.value} value={option.value} className="bg-[#291913]">{option.label}</option>)}
                  </select>
                </label>
              </div>
            </div>
            {search.q && <div className="mt-3 text-xs text-[#c9a583]">Busca por “{search.q}” <button type="button" onClick={() => { setDraft(''); void update({ q: '' }) }} className="ml-2 text-[#e29c5d] underline">Limpar</button></div>}
            <div className="sr-only" role="status">{catalog.data?.total ?? 0} resultados</div>

            {catalog.isRefetchError && <div className="mt-5 rounded-lg border border-red-500/40 p-4 text-xs text-red-200" role="alert">{messageFromError(catalog.error)} <button className="ml-2 underline" onClick={() => catalog.refetch()}>Tentar novamente</button></div>}
            {catalog.isPending ? (
              <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-7" aria-label="Carregando catálogo">
                {Array.from({ length: 8 }, (_, index) => <div key={index} className="space-y-3"><div className="skeleton aspect-square rounded-2xl"/><div className="skeleton h-4 w-2/3 rounded"/><div className="skeleton h-4 w-1/2 rounded"/></div>)}
              </div>
            ) : catalog.isError ? (
              <div className="panel mt-5 p-8 text-center" role="alert">{messageFromError(catalog.error)} <button className="btn-secondary mt-3" onClick={() => catalog.refetch()}>Tentar novamente</button></div>
            ) : !catalog.data?.items.length ? (
              <div className="panel mt-6 p-10 text-center"><h3 className="text-lg font-bold">Nenhum NFT encontrado</h3><p className="mt-2 text-[#c69e7d]">Tente outras palavras-chave ou categorias.</p><button className="btn-secondary mt-4" onClick={() => { setDraft(''); void update({ q: '', category: 'all', sort: 'featured', minPrice: undefined, maxPrice: undefined }) }}>Limpar filtros</button></div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-6 md:mt-6 md:grid-cols-3 md:gap-x-[34px] md:gap-y-[70px]">
                {catalog.data.items.map((nft, index) => <div key={nft.id} className={index % 2 === 1 ? 'translate-y-7 md:translate-y-0' : ''}><NftCard nft={nft}/></div>)}
              </div>
            )}

            {!!catalog.data?.pages && catalog.data.pages > 1 && (
              <nav aria-label="Paginação" className="mt-16 flex items-center justify-center gap-2 md:justify-end">
                {Array.from({ length: Math.min(catalog.data.pages, 6) }, (_, index) => <button key={index} type="button" aria-label={`Página ${index + 1}`} aria-current={(search.page ?? 1) === index + 1 ? 'page' : undefined} onClick={() => void update({ page: index + 1 })} className={`flex size-9 items-center justify-center rounded-md border text-sm ${(search.page ?? 1) === index + 1 ? 'border-[#db9450] bg-[#db9450] text-[#26160d]' : 'border-[#5e3c29] bg-[#291913] text-[#e6d0b8]'}`}>{index + 1}</button>)}
                <button type="button" aria-label="Próxima página" disabled={(search.page ?? 1) >= catalog.data.pages} onClick={() => void update({ page: (search.page ?? 1) + 1 })} className="flex size-9 items-center justify-center rounded-md border border-[#5e3c29] bg-[#291913] text-[#e6d0b8]"><ChevronRight size={18}/></button>
              </nav>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 hidden max-w-[1200px] grid-cols-2 gap-7 px-6 md:grid xl:px-0" aria-label="Descubra mais sobre o marketplace">
        <div className="grid min-h-[240px] grid-cols-2 overflow-hidden rounded-xl bg-[#291913]">
          <img src={emeraldApe} alt="Emerald Ape da coleção Kurio" className="h-full w-full object-cover"/>
          <div className="flex flex-col items-end justify-center p-5 text-right"><h2 className="text-lg font-bold text-[#f1e7db]">Lançamentos gênesis de edição limitada</h2><p className="mt-3 text-xs leading-5 text-[#d2a77f]">Colecione edições escassas diretamente dos criadores antes da revelação pública.</p><Link to="/" hash="explore" className="btn-primary mt-4 !py-2 text-xs">Explorar <ArrowRight size={15}/></Link></div>
        </div>
        <div className="grid min-h-[240px] grid-cols-2 overflow-hidden rounded-xl bg-[#291913]">
          <img src={neonVessel} alt="Neon Vessel da coleção Kurio" className="h-full w-full object-cover"/>
          <div className="flex flex-col items-end justify-center p-5 text-right"><h2 className="text-lg font-bold text-[#f1e7db]">Arte digital selecionada e muito mais</h2><p className="mt-3 text-xs leading-5 text-[#d2a77f]">Explore novos artistas, coleções e obras digitais.</p><Link to="/" hash="explore" className="btn-primary mt-4 !py-2 text-xs">Explorar <ArrowRight size={15}/></Link></div>
        </div>
      </section>

      <section className="mx-auto mt-24 hidden max-w-[1200px] px-6 md:block xl:px-0" aria-labelledby="editorial-heading">
        <h2 id="editorial-heading" className="text-center text-3xl font-bold">Diário da Cunhagem</h2>
        <p className="mt-4 text-center text-xs text-[#cda77f]">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
        <div className="mt-10 grid grid-cols-4 gap-6">
          {editorial.map(article => <article key={article.title} className="overflow-hidden rounded-xl bg-[#2a1913]">
            <img src={article.image} alt="" className="aspect-[1.3] w-full object-cover"/>
            <div className="p-4"><p className="text-[11px] text-[#dcaa7d]">{article.date} · Leitura de 3 min</p><h3 className="mt-2 text-base font-bold">{article.title}</h3><p className="mt-2 text-xs leading-5 text-[#cda77f]">{article.description}</p><p className="mt-3 text-xs font-bold text-[#e39a51]">Prévia editorial</p></div>
          </article>)}
        </div>
      </section>
    </main>
  )
}
