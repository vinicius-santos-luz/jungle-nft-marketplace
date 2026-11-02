import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import { marketplaceApi, messageFromError } from '../lib/api'
import type { CatalogSort } from '../lib/models'
import { NftCard } from '../components/NftCard'

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
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(ellipse_at_75%_30%,#44216f_0%,#141328_42%,#090914_75%)]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div>
            <span className="pill"><Sparkles size={14} className="mr-2"/> Discover the extraordinary</span>
            <h1 className="mt-6 text-5xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">Discover, collect & <span className="bg-gradient-to-r from-violet-300 to-fuchsia-400 bg-clip-text text-transparent">own</span> digital art.</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">Explore unique creations, limited editions and worlds beyond imagination. Your next favorite NFT is waiting.</p>
            <a href="#explore" className="btn-primary mt-8">Explore collection <ArrowRight size={18}/></a>
            <div className="mt-11 flex gap-10 text-sm"><div><strong className="block text-2xl text-white">12+</strong><span className="text-slate-400">Digital collectibles</span></div><div><strong className="block text-2xl text-white">4</strong><span className="text-slate-400">Categories</span></div><div><strong className="block text-2xl text-white">100%</strong><span className="text-slate-400">Simulated demo</span></div></div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-md"><div className="absolute inset-6 rotate-6 rounded-[2rem] bg-gradient-to-br from-violet-600 to-fuchsia-600 blur-[3px]"/><div className="absolute inset-6 -rotate-6 rounded-[2rem] border border-violet-400/50 bg-[#1f1745]"/><div className="absolute inset-9 flex flex-col items-center justify-center overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_35%_30%,#f474c9,#5436b7_45%,#15132c_80%)]"><span className="text-[12rem] leading-none drop-shadow-2xl">✦</span><div className="absolute bottom-6 left-6 right-6 flex justify-between rounded-xl border border-white/20 bg-black/35 p-4 backdrop-blur"><div><p className="text-xs text-white/70">Featured drop</p><p className="font-bold">Ethereal Bloom</p></div><span className="font-bold">0.085 ETH</span></div></div></div>
        </div>
      </section>

      <section id="explore" className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><span className="text-sm font-semibold uppercase tracking-widest text-violet-300">Curated marketplace</span><h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">Explore NFTs</h2><p className="mt-2 text-slate-400">Find your next digital collectible.</p></div><span className="text-sm text-slate-400">{catalog.data?.total ?? '—'} results</span></div>
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form className="relative w-full max-w-md" role="search" onSubmit={event => { event.preventDefault(); update({ q: draft }) }}>
            <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="search" aria-label="Pesquisar NFTs" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Search NFTs, artists, collections..." className="field pl-12 pr-20"/>
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-violet-300 hover:text-white" type="submit">Search</button>
          </form>
          <div className="flex items-center gap-3"><SlidersHorizontal className="hidden text-slate-500 sm:block" size={18}/><label htmlFor="catalog-sort" className="sr-only">Ordenar NFTs</label><select id="catalog-sort" value={search.sort ?? 'featured'} onChange={event => update({ sort: event.target.value as CatalogSort })} className="field min-w-52"><option value="featured">Featured</option>{sortOptions.slice(1).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
        </div>
        <div className="mb-9 flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoria">{categories.map(category => <button key={category} className={search.category === category ? 'btn-primary !px-4 !py-2 text-sm' : 'btn-secondary !px-4 !py-2 text-sm'} onClick={() => update({ category })}>{category === 'all' ? 'All categories' : category}</button>)}</div>

        {catalog.isRefetchError && <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-200" role="alert">{messageFromError(catalog.error)} <button className="ml-3 underline" onClick={() => catalog.refetch()}>Try again</button></div>}

        {catalog.isPending ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-label="Carregando catálogo">{Array.from({length:8}, (_, i) => <div key={i} className="panel overflow-hidden"><div className="skeleton aspect-square"/><div className="space-y-3 p-5"><div className="skeleton h-4 w-2/3 rounded"/><div className="skeleton h-7 rounded"/><div className="skeleton h-4 w-1/2 rounded"/></div></div>)}</div> : catalog.isError ? <div className="panel p-10 text-center" role="alert"><p>{messageFromError(catalog.error)}</p><button className="btn-secondary mt-4" onClick={() => catalog.refetch()}>Try again</button></div> : !catalog.data?.items.length ? <div className="panel p-16 text-center"><h3 className="text-xl font-bold">No NFTs found</h3><p className="mt-2 text-slate-400">Try other keywords or categories.</p><button className="btn-secondary mt-5" onClick={() => { setDraft(''); update({ q:'', category:'all', sort:'featured' }) }}>Clear filters</button></div> : <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">{catalog.data.items.map(nft => <NftCard key={nft.id} nft={nft}/>)}</div>}

        {!!catalog.data?.pages && catalog.data.pages > 1 && <nav aria-label="Paginação" className="mt-10 flex items-center justify-center gap-4"><button className="btn-secondary" disabled={(search.page ?? 1) <= 1} onClick={() => update({page:(search.page ?? 1)-1})}>Previous</button><span className="text-sm text-slate-400">Page {search.page ?? 1} / {catalog.data.pages}</span><button className="btn-secondary" disabled={(search.page ?? 1) >= catalog.data.pages} onClick={() => update({page:(search.page ?? 1)+1})}>Next</button></nav>}
      </section>
    </main>
  )
}
