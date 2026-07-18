export type TutorialCardKey =
  | 'aline'
  | 'leumeah'
  | 'nash'
  | 'bloodDoll'
  | 'magnum'
  | 'legalManipulations'
  | 'onTheQuiVive'
  | 'undeadStrength'
  | 'eatTheRich'
  | 'voterCaptivation'
  | 'anarchTroublemaker'
  | 'psyche'
  | 'burningWrath'
  | 'procurer'
  | 'bonding'
  | 'rooftopShadow'
  | 'majesty'
  | 'resilience'
  | 'anarchistUprising'
  | 'timothyCrowley'
  | 'mrWinthrop'
  | 'theUnmasking'
  | 'celerity'

export type TutorialCardType =
  | 'crypt'
  | 'master'
  | 'action'
  | 'political'
  | 'reaction'
  | 'combat'
  | 'equipment'
  | 'modifier'
  | 'ally'
  | 'retainer'
  | 'event'

export interface TutorialCard {
  id: number
  name: string
  type: TutorialCardType
  capacity?: number
  disciplines?: string[]
  clanIcon?: string
}

export const TUTORIAL_CARDS: Record<TutorialCardKey, TutorialCard> = {
  // Aline Gädeke (G6) — Brujah, cel POT PRE, Anarch Baron of Mannheim
  aline: {
    id: 201576,
    name: 'Aline Gädeke',
    type: 'crypt',
    capacity: 7,
    disciplines: ['cel', 'POT', 'PRE'],
    clanIcon: 'brujah',
  },
  // Leumeah (G6) — Brujah, cel for pot PRE, Anarch Baron of Canberra
  leumeah: {
    id: 201526,
    name: 'Leumeah',
    type: 'crypt',
    capacity: 6,
    disciplines: ['cel', 'for', 'pot', 'PRE'],
    clanIcon: 'brujah',
  },
  // Sir Walter Nash (G1) — Ventrue, DOM FOR PRE, Camarilla Prince of Chicago
  nash: {
    id: 201292,
    name: 'Sir Walter Nash',
    type: 'crypt',
    capacity: 7,
    disciplines: ['DOM', 'FOR', 'PRE'],
    clanIcon: 'ventrue',
  },
  bloodDoll: { id: 100199, name: 'Blood Doll', type: 'master' },
  magnum: { id: 100001, name: '.44 Magnum', type: 'equipment' },
  legalManipulations: {
    id: 101089,
    name: 'Legal Manipulations',
    type: 'action',
    disciplines: ['pre'],
  },
  onTheQuiVive: { id: 101321, name: 'On the Qui Vive', type: 'reaction' },
  undeadStrength: {
    id: 102061,
    name: 'Undead Strength',
    type: 'combat',
    disciplines: ['pot'],
  },
  eatTheRich: { id: 100605, name: 'Eat the Rich', type: 'political' },
  voterCaptivation: {
    id: 102131,
    name: 'Voter Captivation',
    type: 'modifier',
    disciplines: ['pre'],
  },
  anarchTroublemaker: {
    id: 100058,
    name: 'Anarch Troublemaker',
    type: 'master',
  },
  psyche: { id: 101507, name: 'Psyche!', type: 'combat', disciplines: ['cel'] },
  burningWrath: {
    id: 100271,
    name: 'Burning Wrath',
    type: 'combat',
    disciplines: ['pot'],
  },
  procurer: { id: 101491, name: 'Procurer', type: 'ally' },
  bonding: {
    id: 100236,
    name: 'Bonding',
    type: 'modifier',
    disciplines: ['dom'],
  },
  rooftopShadow: {
    id: 101651,
    name: 'Rooftop Shadow',
    type: 'reaction',
    disciplines: ['cel'],
  },
  majesty: {
    id: 101144,
    name: 'Majesty',
    type: 'combat',
    disciplines: ['pre'],
  },
  resilience: {
    id: 101608,
    name: 'Resilience',
    type: 'combat',
    disciplines: ['for'],
  },
  anarchistUprising: {
    id: 100059,
    name: 'Anarchist Uprising',
    type: 'political',
  },
  // Timothy Crowley (G1) — Ventrue, ani dom FOR PRE, Camarilla Prince of Dallas
  timothyCrowley: {
    id: 201372,
    name: 'Timothy Crowley',
    type: 'crypt',
    capacity: 7,
    disciplines: ['ani', 'dom', 'FOR', 'PRE'],
    clanIcon: 'ventrue',
  },
  mrWinthrop: { id: 101249, name: 'Mr. Winthrop', type: 'retainer' },
  theUnmasking: { id: 102079, name: 'The Unmasking', type: 'event' },
  // Celerity — master, +1 level of Celerity and +1 capacity on a vampire
  celerity: {
    id: 100312,
    name: 'Celerity',
    type: 'master',
    disciplines: ['cel'],
  },
}
