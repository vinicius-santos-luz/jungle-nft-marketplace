import type { NFT } from '../lib/models'

const descriptors: Array<[string, string, string, NFT['category'], string, string, string, string, string]> = [
  ['Ethereal Bloom', 'Genesis Garden', 'Luna Nova', 'Art', '0.085', '✿', '#7744ea', '#eb66bb', 'A flower from a world that exists between dreams.'],
  ['Neon Samurai', 'Cyber Legends', 'Akira X', 'Gaming', '0.240', '⚔', '#33289c', '#ef4a97', 'A rare warrior ready for the next digital frontier.'],
  ['Cosmic Voyager', 'Beyond Orbit', 'Astra Labs', 'Art', '0.152', '✦', '#073b82', '#54e2d8', 'An explorer crossing the boundaries of imagination.'],
  ['Soundwave #08', 'Digital Frequencies', 'DJ Ether', 'Music', '0.048', '♫', '#8e3363', '#fca849', 'A collectible visualization of an original beat.'],
  ['Golden Horizon', 'Infinite Landscapes', 'Mia Chen', 'Photography', '0.115', '◒', '#a54d39', '#f1ca76', 'Golden light over an impossible horizon.'],
  ['Pixel Panther', 'Wild Pixels', 'Studio K', 'Gaming', '0.093', '◆', '#1d4b45', '#8ef6ab', 'A legendary guardian of the pixel jungle.'],
  ['Liquid Dreams', 'New Dimension', 'Luna Nova', 'Art', '0.128', '◉', '#3551bf', '#eb7efa', 'A fluid composition with a different shape for every viewer.'],
  ['Echoes of Earth', 'Digital Frequencies', 'DJ Ether', 'Music', '0.067', '♬', '#23606d', '#b0f6e5', 'An atmospheric sound collectible.'],
  ['Prism of Time', 'New Dimension', 'Astra Labs', 'Art', '0.310', '◇', '#543580', '#ffbc80', 'A prism preserving a moment in time.'],
  ['Urban Silence', 'Infinite Landscapes', 'Mia Chen', 'Photography', '0.072', '▣', '#303e56', '#9aafce', 'A quiet evening in a vibrant city.'],
  ['Arcade Runner', 'Cyber Legends', 'Akira X', 'Gaming', '0.180', '⌁', '#93227e', '#68dbe8', 'A high-speed character from a neon arcade.'],
  ['Stellar Notes', 'Beyond Orbit', 'Studio K', 'Music', '0.056', '✧', '#2c418d', '#d89cf5', 'A symphony composed beneath the stars.'],
]

export const seedNfts: NFT[] = descriptors.map((entry, index) => ({
  id: `nft-${index + 1}`,
  title: entry[0],
  collection: entry[1],
  creator: entry[2],
  category: entry[3],
  priceEth: entry[4],
  symbol: entry[5],
  colors: [entry[6], entry[7]],
  description: entry[8],
  available: index === 8 ? 0 : index % 3 === 0 ? 3 : 12,
  total: index % 3 === 0 ? 5 : 20,
  version: 1,
}))
