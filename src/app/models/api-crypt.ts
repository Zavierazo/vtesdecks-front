export interface ApiCrypt {
  id: number
  name: string
  aka: string
  type: string
  clan: string
  adv: boolean
  group: number
  capacity: number
  sets: string[]
  title: string
  banned: string
  artist: string
  image: string
  cropImage: string
  clanIcon: string
  disciplines: string[]
  superiorDisciplines: string[]
  disciplineIcons: string[]
  sect: string
  taints: string[]
  deckPopularity: number
  cardPopularity: number
  printOnDemand: boolean
  lastUpdate: Date
}
