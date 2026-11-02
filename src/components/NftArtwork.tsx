import type { NFT } from '../lib/models'
import emeraldApe from '../assets/emerald-ape.png'

export function NftArtwork({ nft, className = '' }: { nft: NFT; className?: string }) {
  if (nft.id === 'nft-1') {
    return <img src={emeraldApe} alt={`Arte digital ${nft.title}`} className={`aspect-square w-full object-cover ${className}`} />
  }
  return (
    <div className={`relative flex aspect-square items-center justify-center overflow-hidden ${className}`}
      role="img" aria-label={`Arte digital ${nft.title}`}
      style={{ background: `radial-gradient(circle at 35% 25%, ${nft.colors[1]}99, transparent 53%), linear-gradient(135deg, ${nft.colors[0]}, #281810 95%)` }}>
      <div className="absolute inset-7 rotate-12 rounded-[32%] border border-white/20" />
      <div className="absolute inset-12 -rotate-12 rounded-[38%] border border-white/20" />
      <div className="absolute inset-0 opacity-25" style={{background: 'repeating-linear-gradient(35deg, transparent 0px, transparent 35px, #fff 36px, transparent 37px)'}} />
      <span className="relative text-[clamp(5rem,10vw,10rem)] font-light leading-none text-white drop-shadow-[0_20px_45px_rgba(255,255,255,0.3)]">{nft.symbol}</span>
      <span className="absolute bottom-4 left-5 text-[10px] font-bold uppercase tracking-[.3em] text-white/65">KURIO / Colecionável</span>
    </div>
  )
}
