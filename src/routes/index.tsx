import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Search, SlidersHorizontal } from 'lucide-react'
import { marketplaceApi, messageFromError } from '../lib/api'
import type { CatalogSort } from '../lib/models'
import { NftCard } from '../components/NftCard'
import emeraldApe from '../assets/emerald-ape.png'

const categories = ['all', 'Art', 'Gaming', 'Music', 'Photography']
const sortOptions: { value: CatalogSort; label: string }[] = [
  { value: 'featured', label: 'Featured' }, { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' }, { value: 'name', label: 'Name A-Z' },
]

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { q?: string; category?: string; sort?: CatalogSort; page?: number } => ({
    q: typeof search.q === 'string' ? search.q : '',
    category: typeof search.category === 'string' && categories.includes(search.category) ? search.category : 'all',
    sort: sortOptions.some(option => option.value === search.sort) ? search.sort as CatalogSort : 'featured' as CatalogSort,
    page: Number.isInteger(Number(search.page)) && Number(search.page) > 0 ? Number(search.page) : 1,
  }),
  component: HomePage,
})

function HomePage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/' })
  const [draft, setDraft] = useState(search.q ?? '')
  const catalog = useQuery({ queryKey: ['nfts', search], queryFn: () => marketplaceApi.catalog(search), placeholderData: previous => previous, retry: false })
  const update = (changes: Partial<typeof search>) => navigate({ search: prev => ({ ...prev, ...changes, page: changes.page ?? 1 }) })

  return (
    <main>
      <div className="mx-auto max-w-7xl px-6 pt-5 md:hidden">
        <form className="flex gap-2" role="search" onSubmit={event => { event.preventDefault(); update({ q: draft }); document.getElementById('explore')?.scrollIntoView() }}>
          <div className="relative min-w-0 flex-1"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#dc9650]"/><input type="search" aria-label="Pesquisar NFTs" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Explorar coleções" className="field !rounded-xl !pl-10"/></div>
          <button type="submit" aria-label="Search" className="btn-primary !rounded-xl !px-4"><SlidersHorizontal size={20}/></button>
        </form>
      </div>
      <section className="mx-auto max-w-7xl px-6 pt-5 md:px-8 md:py-12">
        <div className="relative grid grid-cols-[minmax(0,1fr)_42%] items-center gap-3 overflow-hidden rounded-[2rem] bg-[#4f2f1d] p-4 md:min-h-[480px] md:grid-cols-[1.35fr_1fr] md:gap-16 md:rounded-none md:bg-transparent md:p-0">
          <div className="relative z-10 max-w-[45rem]">
            <span className="text-[11px] font-semibold tracking-wider text-[#f5dfc8] md:text-sm">Bem-vindo à Kurio</span>
            <h1 className="mt-3 text-[clamp(1.25rem,3.8vw,3.1rem)] font-black uppercase leading-[1.36] tracking-[.025em] text-[#fff8f0] md:mt-6"><span className="hidden md:inline">SEJA DONO DO FUTURO DA ARTE DIGITAL</span><span className="md:hidden">SEJA DONO DA CULTURA DIGITAL</span></h1>
            <p className="mt-3 max-w-xl text-[11px] leading-relaxed text-[#d9af84] md:mt-5 md:text-base">Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e faça parte da cultura da internet.</p>
            <a href="#explore" className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase text-[#e7a05b] md:mt-9 md:rounded-md md:bg-[#dc9650] md:px-7 md:py-3 md:text-base md:text-[#21130d]">EXPLORAR <ArrowRight size={16}/></a>
            <div className="mt-5 flex gap-2 md:mt-12"><span className="h-2 w-2 rounded-full bg-[#e6a05e]"/><span className="h-2 w-2 rounded-full bg-[#e6a05e]"/><span className="h-2 w-2 rounded-full bg-[#e6a05e]"/></div>
          </div>
          <div className="relative h-full min-h-[205px] md:min-h-0"><img src={emeraldApe} alt="NFT de macaco com óculos verdes e jaqueta esmeralda" className="absolute right-0 top-0 h-full max-h-[440px] w-full rounded-[1.2rem] object-cover md:relative md:ml-auto md:aspect-square md:h-auto md:max-w-[430px]"/></div>
        </div>
      </section>

      <section id="explore" className="mx-auto max-w-7xl px-6 py-9 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[245px_minmax(0,1fr)]">
          <aside className="hidden h-max space-y-8 bg-[#281812] p-6 text-[#d0a783] lg:block">
            <div><h3 className="mb-4 text-lg font-bold text-[#faf0e6]">Coleções</h3><div className="space-y-3">{categories.map(category => <button key={category} onClick={() => update({ category })} className={`block w-full text-left text-sm hover:text-[#e4a260] ${search.category === category ? 'font-bold text-[#e4a260]' : ''}`}>{({ all: 'Todas as coleções', Art: 'Arte digital', Gaming: 'Jogos', Music: 'Música', Photography: 'Fotografia' } as Record<string, string>)[category]}</button>)}</div></div>
            <div className="border-t border-[#4f3020] pt-5"><h3 className="text-lg font-bold text-[#faf0e6]">Faixa de preço</h3><p className="mt-3 text-xs">Preço, 0,02 – 12,30 ETH</p><p className="mt-2 text-xs text-[#b68b6b]">Os preços são simulados e exibidos nos cartões.</p></div>
            <div className="border-t border-[#4f3020] pt-5"><h3 className="text-lg font-bold text-[#faf0e6]">Rede</h3><p className="mt-3 text-sm">Ethereum · Polygon · Solana</p></div>
          </aside>
          <div className="min-w-0">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><span className="text-xs font-semibold uppercase tracking-widest text-[#dc9650]">Todos os NFTs · Novos lançamentos · Em alta</span><h2 className="mt-2 text-lg font-extrabold">Explore NFTs</h2></div><span className="text-xs text-[#c19b7b]">{catalog.data?.total ?? '—'} resultados</span></div>
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form className="relative hidden w-full max-w-md md:block" role="search" onSubmit={event => { event.preventDefault(); update({ q: draft }) }}>
            <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#dc9650]"/>
            <input type="search" aria-label="Pesquisar NFTs" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Buscar NFTs, artistas, coleções..." className="field pl-12 pr-20"/>
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#dc9650] hover:text-white" type="submit">Search</button>
          </form>
          <div className="flex items-center gap-3"><SlidersHorizontal className="hidden text-slate-500 sm:block" size={18}/><label htmlFor="catalog-sort" className="sr-only">Ordenar NFTs</label><select id="catalog-sort" value={search.sort ?? 'featured'} onChange={event => update({ sort: event.target.value as CatalogSort })} className="field min-w-52"><option value="featured">Featured</option>{sortOptions.slice(1).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        </div>
        <div className="mb-8 flex flex-nowrap gap-2 overflow-x-auto pb-2" role="group" aria-label="Filtrar por categoria">{categories.map(category => <button key={category} className={search.category === category ? 'btn-primary !px-3 !py-2 text-xs' : 'btn-secondary !px-3 !py-2 text-xs'} onClick={() => update({ category })}>{category === 'all' ? 'Todos os NFTs' : category}</button>)}</div>

        {catalog.isRefetchError && <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-200" role="alert">{messageFromError(catalog.error)} <button className="ml-3 underline" onClick={() => catalog.refetch()}>Try again</button></div>}

        {catalog.isPending ? <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-7" aria-label="Carregando catálogo">{Array.from({length:8}, (_, i) => <div key={i} className="panel overflow-hidden"><div className="skeleton aspect-square"/><div className="space-y-3 p-3"><div className="skeleton h-4 w-2/3 rounded"/><div className="skeleton h-7 rounded"/><div className="skeleton h-4 w-1/2 rounded"/></div></div>)}</div> : catalog.isError ? <div className="panel p-10 text-center" role="alert"><p>{messageFromError(catalog.error)}</p><button className="btn-secondary mt-4" onClick={() => catalog.refetch()}>Try again</button></div> : !catalog.data?.items.length ? <div className="panel p-12 text-center"><h3 className="text-xl font-bold">Nenhum NFT encontrado</h3><p className="mt-2 text-[#c69e7d]">Tente outras palavras-chave ou categorias.</p><button className="btn-secondary mt-5" onClick={() => { setDraft(''); update({ q:'', category:'all', sort:'featured' }) }}>Limpar filtros</button></div> : <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-7">{catalog.data.items.map(nft => <NftCard key={nft.id} nft={nft}/>)}</div>}

        {!!catalog.data?.pages && catalog.data.pages > 1 && <nav aria-label="Paginação" className="mt-10 flex items-center justify-center gap-4"><button className="btn-secondary" disabled={(search.page ?? 1) <= 1} onClick={() => update({page:(search.page ?? 1)-1})}>Previous</button><span className="text-sm text-slate-400">Page {search.page ?? 1} / {catalog.data.pages}</span><button className="btn-secondary" disabled={(search.page ?? 1) >= catalog.data.pages} onClick={() => update({page:(search.page ?? 1)+1})}>Next</button></nav>}
          </div>
        </div>
      </section>
    </main>
  )
}
