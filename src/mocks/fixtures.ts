import type { NFT } from '../lib/models'

const descriptors: Array<[string, string, string, NFT['category'], string, string, string, string, string]> = [
  ['Emerald Ape #042', 'Coleção Gênesis', 'Kurio Studio', 'Art', '1.19', '◆', '#4c7055', '#f8ead0', 'Um colecionável de edição limitada, com estilo esmeralda e identidade marcante.'],
  ['Sage Nomad #009', 'Coleção Nomad', 'Kurio Studio', 'Art', '1.69', '◆', '#685671', '#e6dfc4', 'Arte digital de um viajante singular, parte da coleção Nomad.'],
  ['Neon Vessel #552', 'Coleção Vessel', 'Kurio Studio', 'Gaming', '1.99', '◆', '#35473c', '#bed7c0', 'Uma edição rara com estética clássica e personalidade própria.'],
  ['Cosmic Bloom #118', 'Coleção Nomad', 'Kurio Studio', 'Art', '1.29', '◆', '#685671', '#e6dfc4', 'Variação colecionável da série Nomad.'],
  ['Violet Nomad #314', 'Coleção Nomad', 'Kurio Studio', 'Photography', '1.39', '◆', '#685671', '#e6dfc4', 'Um retrato da coleção Nomad em tons de violeta.'],
  ['Ivory Baron #088', 'Coleção Vessel', 'Kurio Studio', 'Gaming', '1.79', '◆', '#35473c', '#bed7c0', 'Retrato de edição limitada com traje marfim.'],
  ['Golden Beat #207', 'Coleção Golden', 'Kurio Studio', 'Music', '0.99', '◆', '#c39f6c', '#f4e8c8', 'Uma edição musical com referências clássicas e acabamento dourado.'],
  ['Golden Signal #160', 'Coleção Golden', 'Kurio Studio', 'Music', '0.39', '◆', '#c39f6c', '#f4e8c8', 'Uma variação dourada para colecionadores de música digital.'],
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
