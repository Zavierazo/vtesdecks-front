import { ApiClanStat } from './api-clan-stat'
import { ApiDisciplineStat } from './api-discipline-stat'

export interface ApiDeckStats {
  crypt: number
  library: number
  event: number
  master: number
  action: number
  politicalAction: number
  equipment: number
  retainer: number
  ally: number
  actionModifier: number
  combat: number
  reaction: number
  masterTrifle: number
  poolCost: number
  bloodCost: number
  avgCrypt: number
  minCrypt: number
  maxCrypt: number
  price?: number
  currency?: string
  cryptDisciplines: ApiDisciplineStat[]
  libraryDisciplines: ApiDisciplineStat[]
  libraryClans: ApiClanStat[]
}
