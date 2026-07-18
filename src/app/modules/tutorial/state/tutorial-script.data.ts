import { TutorialCardKey } from './tutorial-cards.data'
import {
  TutorialBoardState,
  TutorialCardInstance,
  TutorialChapter,
  TutorialPlayerBoard,
} from './tutorial-script.model'

/**
 * The scripted demo game: one continuous match across all 13 chapters.
 * The player (Anarch Brujah: Aline Gädeke + Leumeah) faces a scripted rival
 * (Sir Walter Nash, later joined by Timothy Crowley).
 *
 * Pool/blood ledger (you / rival):
 *   start 30/30 · ch4 ramp (1/2/3 then 4 transfers by game turn) → 23/23
 *   ch5 transfers -2 → 21, bleed rival -1 → 22 (you seize the Edge)
 *   ch6 Rooftop Shadow costs Aline 1 blood · ch7 combat: Nash -3, Aline -1
 *   ch8 doll +1, gun -2, transfers -4 → 15 after the rival bleed (Edge to him)
 *   ch9 doll +1 → 16, Aline bleeds → rival 21 + Edge back, Eat the Rich
 *   passes 5-2 (card 1 + titles 2 + Edge 2 vs Nash 1 + discard 1) → rival 17,
 *   Voter Captivation +2 pool → 18, Aline unlock ability -1 blood
 *   ch10 (rebuild montage → 20/17) full combat sends Nash to torpor
 *   ch11 Crowley enters (rival 10), rescues Nash, sends Leumeah to torpor;
 *   Aline rescues her (-2 blood), Leumeah hunts
 *   ch12 Procurer recruited (-2 pool), rival bleed -1 → 15
 *   ch13 montage → rival 3, Troublemaker locks both, Legal Manipulations
 *   bleed 3 → 0 → ousted, +6 pool bounty → 21.
 */

function card(
  ref: string,
  cardKey: TutorialCardKey,
  extra: Partial<TutorialCardInstance> = {},
): TutorialCardInstance {
  return { ref, cardKey, ...extra }
}

const RIVAL_HAND: TutorialCardInstance[] = Array.from(
  { length: 7 },
  (_, i) => card(`rival.h${i + 1}`, 'bloodDoll', { faceDown: true }),
)

function you(extra: Partial<TutorialPlayerBoard>): TutorialPlayerBoard {
  return {
    pool: 30,
    transfers: 0,
    hand: [],
    uncontrolled: [],
    ready: [],
    ashHeap: [],
    masters: [],
    torpor: [],
    libraryCount: 53,
    cryptCount: 8,
    ...extra,
  }
}

function rival(extra: Partial<TutorialPlayerBoard>): TutorialPlayerBoard {
  return {
    pool: 30,
    transfers: 0,
    hand: RIVAL_HAND,
    uncontrolled: [],
    ready: [],
    ashHeap: [],
    masters: [],
    torpor: [],
    libraryCount: 53,
    cryptCount: 8,
    ...extra,
  }
}

const FULL_HAND = (): TutorialCardInstance[] => [
  card('you.bloodDoll', 'bloodDoll'),
  card('you.magnum', 'magnum'),
  card('you.legal1', 'legalManipulations'),
  card('you.strength1', 'undeadStrength'),
  card('you.strength2', 'undeadStrength'),
  card('you.eatTheRich', 'eatTheRich'),
  card('you.otqv', 'onTheQuiVive'),
]

/** Your two extra setup draws: spare copies of your own vampires. */
const YOUR_SPARE_CRYPT = (): TutorialCardInstance[] => [
  card('you.aline2', 'aline', { blood: 0, faceDown: true }),
  card('you.leumeah2', 'leumeah', { blood: 0, faceDown: true }),
]

const RIVAL_SPARE_CRYPT = (): TutorialCardInstance[] => [
  card('rival.c1', 'nash', { blood: 0, faceDown: true }),
  card('rival.c2', 'nash', { blood: 0, faceDown: true }),
  card('rival.c3', 'nash', { blood: 0, faceDown: true }),
]

/** The very start of the game: full pools, 4 uncontrolled cards each. */
const START_BOARD = (): TutorialBoardState => ({
  you: you({
    hand: FULL_HAND(),
    uncontrolled: [
      card('you.aline', 'aline', { blood: 0, faceDown: true }),
      card('you.leumeah', 'leumeah', { blood: 0, faceDown: true }),
      ...YOUR_SPARE_CRYPT(),
    ],
  }),
  rival: rival({
    uncontrolled: [
      card('rival.nash', 'nash', { blood: 0, faceDown: true }),
      ...RIVAL_SPARE_CRYPT(),
    ],
  }),
})

const CH5_BOARD = (): TutorialBoardState => ({
  you: you({
    pool: 23,
    hand: FULL_HAND(),
    uncontrolled: [
      card('you.leumeah', 'leumeah', { blood: 0, faceDown: true }),
      ...YOUR_SPARE_CRYPT(),
    ],
    ready: [card('you.aline', 'aline', { blood: 7 })],
  }),
  rival: rival({
    pool: 23,
    uncontrolled: RIVAL_SPARE_CRYPT(),
    ready: [card('rival.nash', 'nash', { blood: 7 })],
  }),
})

const CH6_BOARD = (): TutorialBoardState => ({
  you: you({
    pool: 21,
    hasEdge: true,
    libraryCount: 52,
    hand: [
      card('you.magnum', 'magnum'),
      card('you.legal1', 'legalManipulations'),
      card('you.otqv', 'onTheQuiVive'),
      card('you.strength1', 'undeadStrength'),
      card('you.rooftop', 'rooftopShadow'),
      card('you.eatTheRich', 'eatTheRich'),
      card('you.troublemaker', 'anarchTroublemaker'),
    ],
    uncontrolled: [
      card('you.leumeah', 'leumeah', { blood: 2, faceDown: true }),
      ...YOUR_SPARE_CRYPT(),
    ],
    ready: [
      card('you.aline', 'aline', {
        blood: 7,
        locked: true,
        attachments: [card('you.bloodDoll', 'bloodDoll')],
      }),
    ],
  }),
  rival: rival({
    pool: 22,
    uncontrolled: RIVAL_SPARE_CRYPT(),
    ready: [card('rival.nash', 'nash', { blood: 7 })],
  }),
})

const CH7_BOARD = (): TutorialBoardState => ({
  you: you({
    pool: 21,
    hasEdge: true,
    libraryCount: 50,
    hand: [
      card('you.magnum', 'magnum'),
      card('you.legal1', 'legalManipulations'),
      card('you.strength1', 'undeadStrength'),
      card('you.eatTheRich', 'eatTheRich'),
      card('you.troublemaker', 'anarchTroublemaker'),
      card('you.voterCap', 'voterCaptivation'),
      card('you.bw', 'burningWrath'),
    ],
    uncontrolled: [
      card('you.leumeah', 'leumeah', { blood: 2, faceDown: true }),
      ...YOUR_SPARE_CRYPT(),
    ],
    ready: [
      card('you.aline', 'aline', {
        blood: 6,
        locked: true,
        attachments: [card('you.bloodDoll', 'bloodDoll')],
      }),
    ],
    ashHeap: [
      card('you.otqv', 'onTheQuiVive'),
      card('you.rooftop', 'rooftopShadow'),
    ],
  }),
  rival: rival({
    pool: 22,
    uncontrolled: RIVAL_SPARE_CRYPT(),
    ready: [card('rival.nash', 'nash', { blood: 7, locked: true })],
    ashHeap: [card('rival.bonding', 'bonding')],
  }),
})

const CH8_BOARD = (): TutorialBoardState => ({
  you: you({
    pool: 21,
    hasEdge: true,
    libraryCount: 49,
    hand: [
      card('you.magnum', 'magnum'),
      card('you.legal1', 'legalManipulations'),
      card('you.eatTheRich', 'eatTheRich'),
      card('you.troublemaker', 'anarchTroublemaker'),
      card('you.voterCap', 'voterCaptivation'),
      card('you.bw', 'burningWrath'),
      card('you.psyche', 'psyche'),
    ],
    uncontrolled: [
      card('you.leumeah', 'leumeah', { blood: 2, faceDown: true }),
      ...YOUR_SPARE_CRYPT(),
    ],
    ready: [
      card('you.aline', 'aline', {
        blood: 5,
        locked: true,
        attachments: [card('you.bloodDoll', 'bloodDoll')],
      }),
    ],
    ashHeap: [
      card('you.otqv', 'onTheQuiVive'),
      card('you.rooftop', 'rooftopShadow'),
      card('you.strength1', 'undeadStrength'),
    ],
  }),
  rival: rival({
    pool: 22,
    uncontrolled: RIVAL_SPARE_CRYPT(),
    ready: [card('rival.nash', 'nash', { blood: 4, locked: true })],
    ashHeap: [card('rival.bonding', 'bonding')],
  }),
})

const CH9_BOARD = (): TutorialBoardState => ({
  you: you({
    pool: 15,
    libraryCount: 47,
    hand: [
      card('you.legal1', 'legalManipulations'),
      card('you.eatTheRich', 'eatTheRich'),
      card('you.voterCap', 'voterCaptivation'),
      card('you.bw', 'burningWrath'),
      card('you.psyche', 'psyche'),
      card('you.psyche2', 'psyche'),
      card('you.strength2', 'undeadStrength'),
    ],
    uncontrolled: YOUR_SPARE_CRYPT(),
    ready: [
      card('you.aline', 'aline', {
        blood: 4,
        locked: true,
        attachments: [
          card('you.bloodDoll', 'bloodDoll'),
          card('you.magnum', 'magnum'),
        ],
      }),
      card('you.leumeah', 'leumeah', { blood: 6 }),
    ],
    masters: [card('you.troublemaker', 'anarchTroublemaker')],
    ashHeap: [
      card('you.otqv', 'onTheQuiVive'),
      card('you.rooftop', 'rooftopShadow'),
      card('you.strength1', 'undeadStrength'),
    ],
  }),
  rival: rival({
    pool: 22,
    hasEdge: true,
    uncontrolled: RIVAL_SPARE_CRYPT(),
    ready: [card('rival.nash', 'nash', { blood: 4, locked: true })],
    ashHeap: [card('rival.bonding', 'bonding')],
  }),
})

/** Your next turn, after a rebuilding montage: time to remove Nash. */
const CH10_BOARD = (): TutorialBoardState => ({
  you: you({
    pool: 20,
    libraryCount: 45,
    hand: [
      card('you.legal1', 'legalManipulations'),
      card('you.bw', 'burningWrath'),
      card('you.psyche', 'psyche'),
      card('you.psyche2', 'psyche'),
      card('you.celerity', 'celerity'),
      card('you.strength2', 'undeadStrength'),
      card('you.otqv2', 'onTheQuiVive'),
    ],
    uncontrolled: YOUR_SPARE_CRYPT(),
    ready: [
      card('you.aline', 'aline', {
        blood: 6,
        attachments: [
          card('you.bloodDoll', 'bloodDoll'),
          card('you.magnum', 'magnum'),
        ],
      }),
      card('you.leumeah', 'leumeah', { blood: 6 }),
    ],
    masters: [card('you.troublemaker', 'anarchTroublemaker')],
    ashHeap: [
      card('you.otqv', 'onTheQuiVive'),
      card('you.rooftop', 'rooftopShadow'),
      card('you.strength1', 'undeadStrength'),
      card('you.eatTheRich', 'eatTheRich'),
      card('you.voterCap', 'voterCaptivation'),
    ],
  }),
  rival: rival({
    pool: 17,
    uncontrolled: RIVAL_SPARE_CRYPT(),
    ready: [card('rival.nash', 'nash', { blood: 6 })],
    ashHeap: [
      card('rival.bonding', 'bonding'),
      card('rival.pol1', 'anarchistUprising'),
    ],
  }),
})

/** The rival rebuilt: Crowley is out, Nash rescued, Leumeah in torpor. */
const CH11_BOARD = (): TutorialBoardState => ({
  you: you({
    pool: 19,
    libraryCount: 42,
    hand: [
      card('you.legal1', 'legalManipulations'),
      card('you.strength2', 'undeadStrength'),
      card('you.doll2', 'bloodDoll'),
      card('you.otqv2', 'onTheQuiVive'),
      card('you.legal2', 'legalManipulations'),
      card('you.strength3', 'undeadStrength'),
      card('you.procurer', 'procurer', { blood: 1 }),
    ],
    uncontrolled: YOUR_SPARE_CRYPT(),
    ready: [
      card('you.aline', 'aline', {
        blood: 5,
        attachments: [
          card('you.bloodDoll', 'bloodDoll'),
          card('you.magnum', 'magnum'),
          card('you.celerity', 'celerity'),
        ],
      }),
    ],
    torpor: [card('you.leumeah', 'leumeah', { blood: 0 })],
    masters: [card('you.troublemaker', 'anarchTroublemaker')],
    ashHeap: [
      card('you.otqv', 'onTheQuiVive'),
      card('you.rooftop', 'rooftopShadow'),
      card('you.strength1', 'undeadStrength'),
      card('you.eatTheRich', 'eatTheRich'),
      card('you.voterCap', 'voterCaptivation'),
      card('you.psyche', 'psyche'),
      card('you.psyche2', 'psyche'),
      card('you.bw', 'burningWrath'),
    ],
  }),
  rival: rival({
    pool: 10,
    uncontrolled: RIVAL_SPARE_CRYPT(),
    ready: [
      card('rival.crowley', 'timothyCrowley', { blood: 5 }),
      card('rival.nash', 'nash', { blood: 1 }),
    ],
    ashHeap: [
      card('rival.bonding', 'bonding'),
      card('rival.pol1', 'anarchistUprising'),
      card('rival.majesty', 'majesty'),
      card('rival.resilience', 'resilience'),
    ],
  }),
})

const CH12_BOARD = (): TutorialBoardState => {
  const board = CH11_BOARD()
  board.you.pool = 18
  board.you.ready = [
    card('you.aline', 'aline', {
      blood: 3,
      attachments: [
        card('you.bloodDoll', 'bloodDoll'),
        card('you.magnum', 'magnum'),
        card('you.celerity', 'celerity'),
      ],
    }),
    card('you.leumeah', 'leumeah', { blood: 1 }),
  ]
  board.you.torpor = []
  board.rival.ready = [
    card('rival.crowley', 'timothyCrowley', { blood: 5 }),
    card('rival.nash', 'nash', { blood: 2 }),
  ]
  return board
}

const CH13_BOARD = (): TutorialBoardState => ({
  you: you({
    pool: 15,
    libraryCount: 41,
    hand: [
      card('you.legal1', 'legalManipulations'),
      card('you.strength2', 'undeadStrength'),
      card('you.doll2', 'bloodDoll'),
      card('you.otqv2', 'onTheQuiVive'),
      card('you.legal2', 'legalManipulations'),
      card('you.strength3', 'undeadStrength'),
      card('you.magnum2', 'magnum'),
    ],
    uncontrolled: YOUR_SPARE_CRYPT(),
    ready: [
      card('you.aline', 'aline', {
        blood: 6,
        attachments: [
          card('you.bloodDoll', 'bloodDoll'),
          card('you.magnum', 'magnum'),
          card('you.celerity', 'celerity'),
        ],
      }),
      card('you.leumeah', 'leumeah', { blood: 4 }),
      card('you.procurer', 'procurer', { blood: 1 }),
    ],
    masters: [card('you.troublemaker', 'anarchTroublemaker')],
    ashHeap: [
      card('you.otqv', 'onTheQuiVive'),
      card('you.rooftop', 'rooftopShadow'),
      card('you.strength1', 'undeadStrength'),
      card('you.eatTheRich', 'eatTheRich'),
      card('you.voterCap', 'voterCaptivation'),
      card('you.psyche', 'psyche'),
      card('you.psyche2', 'psyche'),
      card('you.bw', 'burningWrath'),
    ],
  }),
  rival: rival({
    pool: 3,
    uncontrolled: RIVAL_SPARE_CRYPT(),
    ready: [
      card('rival.crowley', 'timothyCrowley', { blood: 4 }),
      card('rival.nash', 'nash', { blood: 2 }),
    ],
    ashHeap: [
      card('rival.bonding', 'bonding'),
      card('rival.pol1', 'anarchistUprising'),
      card('rival.majesty', 'majesty'),
      card('rival.resilience', 'resilience'),
    ],
  }),
})

export const TUTORIAL_SCRIPT: TutorialChapter[] = [
  // Ch1 - Welcome to the game
  {
    id: 'ch1',
    icon: 'bi-moon-stars-fill',
    initialBoard: START_BOARD(),
    steps: [
      { id: 's0', advance: { type: 'next' }, mobileWarning: true },
      { id: 's1', advance: { type: 'next' } },
      { id: 's2', advance: { type: 'next' }, highlight: ['pool:you'] },
      { id: 's3', advance: { type: 'next' }, highlight: ['pool:rival'] },
      { id: 's4', advance: { type: 'next' } },
      { id: 's5', advance: { type: 'next' } },
    ],
  },
  // Ch2 - Reading the cards
  {
    id: 'ch2',
    icon: 'bi-search',
    initialBoard: START_BOARD(),
    steps: [
      { id: 's1', advance: { type: 'next' }, view: 'anatomy-crypt' },
      {
        id: 's2',
        advance: { type: 'click', target: 'anatomy:name' },
        highlight: ['anatomy:name'],
        view: 'anatomy-crypt',
      },
      {
        id: 's3',
        advance: { type: 'click', target: 'anatomy:capacity' },
        highlight: ['anatomy:capacity'],
        view: 'anatomy-crypt',
      },
      {
        id: 's4',
        advance: { type: 'click', target: 'anatomy:disciplines' },
        highlight: ['anatomy:disciplines'],
        view: 'anatomy-crypt',
      },
      {
        id: 's5',
        advance: { type: 'click', target: 'anatomy:clan' },
        highlight: ['anatomy:clan'],
        view: 'anatomy-crypt',
      },
      {
        id: 's5b',
        advance: { type: 'click', target: 'anatomy:text' },
        highlight: ['anatomy:text'],
        view: 'anatomy-crypt',
      },
      { id: 's6', advance: { type: 'next' }, view: 'anatomy-library' },
      {
        id: 's7',
        advance: { type: 'click', target: 'anatomy:type' },
        highlight: ['anatomy:type'],
        view: 'anatomy-library',
      },
      { id: 's7b', advance: { type: 'next' }, view: 'anatomy-types' },
      {
        id: 's8',
        advance: { type: 'click', target: 'anatomy:cost' },
        highlight: ['anatomy:cost'],
        view: 'anatomy-library',
      },
      {
        id: 's9',
        advance: { type: 'click', target: 'anatomy:requirement' },
        highlight: ['anatomy:requirement'],
        view: 'anatomy-library',
      },
      { id: 's10', advance: { type: 'next' }, view: 'anatomy-library' },
    ],
  },
  // Ch3 - Your side of the table
  {
    id: 'ch3',
    icon: 'bi-grid-1x2',
    initialBoard: START_BOARD(),
    steps: [
      { id: 's1', advance: { type: 'next' } },
      {
        id: 's2',
        advance: { type: 'click', target: 'zone:you:crypt' },
        highlight: ['zone:you:crypt'],
      },
      {
        id: 's3',
        advance: { type: 'click', target: 'zone:you:library' },
        highlight: ['zone:you:library'],
      },
      {
        id: 's4',
        advance: { type: 'click', target: 'zone:you:hand' },
        highlight: ['zone:you:hand'],
      },
      {
        id: 's5',
        advance: { type: 'click', target: 'zone:you:uncontrolled' },
        highlight: ['zone:you:uncontrolled'],
      },
      {
        id: 's6',
        advance: { type: 'click', target: 'zone:you:ready' },
        highlight: ['zone:you:ready'],
      },
      {
        id: 's7',
        advance: { type: 'click', target: 'zone:you:ashHeap' },
        highlight: ['zone:you:ashHeap'],
      },
      { id: 's8', advance: { type: 'next' }, highlight: ['pool:you'] },
    ],
  },
  // Ch4 - Phases & influence: transfers ramp by game turn (1 / 2 / 3, then 4)
  {
    id: 'ch4',
    icon: 'bi-arrow-repeat',
    initialBoard: START_BOARD(),
    steps: [
      { id: 's1', advance: { type: 'next' }, highlight: ['phase-tracker'] },
      {
        id: 's2',
        mutations: [{ type: 'phase', phase: 'unlock', activePlayer: 'you' }],
        advance: { type: 'next' },
        highlight: ['phase-tracker'],
      },
      {
        id: 's3',
        mutations: [{ type: 'phase', phase: 'master', activePlayer: 'you' }],
        advance: { type: 'next' },
      },
      {
        id: 's4',
        mutations: [{ type: 'phase', phase: 'minion', activePlayer: 'you' }],
        advance: { type: 'next' },
      },
      {
        id: 's4b',
        revealUncontrolled: true,
        advance: { type: 'next' },
        highlight: ['zone:you:uncontrolled'],
      },
      {
        id: 's5',
        mutations: [
          { type: 'phase', phase: 'influence', activePlayer: 'you' },
          { type: 'transfers', player: 'you', value: 1 },
        ],
        advance: { type: 'click', target: 'card:you.aline' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's6',
        mutations: [
          { type: 'blood', ref: 'you.aline', delta: 1 },
          { type: 'pool', player: 'you', delta: -1 },
          { type: 'transfers', player: 'you', value: 0 },
          { type: 'phase', phase: 'discard', activePlayer: 'you' },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's7',
        rivalThinking: true,
        mutations: [
          { type: 'phase', phase: 'influence', activePlayer: 'rival' },
          { type: 'blood', ref: 'rival.nash', delta: 2 },
          { type: 'pool', player: 'rival', delta: -2 },
        ],
        advance: { type: 'next' },
        highlight: ['card:rival.nash'],
      },
      {
        id: 's8',
        mutations: [
          { type: 'phase', phase: 'influence', activePlayer: 'you' },
          { type: 'transfers', player: 'you', value: 3 },
        ],
        advance: { type: 'click', target: 'card:you.aline' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's9',
        mutations: [
          { type: 'blood', ref: 'you.aline', delta: 1 },
          { type: 'pool', player: 'you', delta: -1 },
          { type: 'transfers', player: 'you', value: 2 },
        ],
        advance: { type: 'click', target: 'card:you.aline' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's10',
        mutations: [
          { type: 'blood', ref: 'you.aline', delta: 1 },
          { type: 'pool', player: 'you', delta: -1 },
          { type: 'transfers', player: 'you', value: 1 },
        ],
        advance: { type: 'click', target: 'card:you.aline' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's11',
        mutations: [
          { type: 'blood', ref: 'you.aline', delta: 1 },
          { type: 'pool', player: 'you', delta: -1 },
          { type: 'transfers', player: 'you', value: 0 },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's12',
        rivalThinking: true,
        mutations: [
          { type: 'phase', phase: 'influence', activePlayer: 'rival' },
          { type: 'blood', ref: 'rival.nash', delta: 4 },
          { type: 'pool', player: 'rival', delta: -4 },
        ],
        advance: { type: 'next' },
        highlight: ['card:rival.nash'],
      },
      {
        id: 's13',
        mutations: [
          { type: 'phase', phase: 'influence', activePlayer: 'you' },
          { type: 'transfers', player: 'you', value: 4 },
        ],
        advance: { type: 'click', target: 'card:you.aline' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's14',
        mutations: [
          { type: 'blood', ref: 'you.aline', delta: 1 },
          { type: 'pool', player: 'you', delta: -1 },
          { type: 'transfers', player: 'you', value: 3 },
        ],
        advance: { type: 'click', target: 'card:you.aline' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's15',
        mutations: [
          { type: 'blood', ref: 'you.aline', delta: 1 },
          { type: 'pool', player: 'you', delta: -1 },
          { type: 'transfers', player: 'you', value: 2 },
        ],
        advance: { type: 'click', target: 'card:you.aline' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's16',
        mutations: [
          { type: 'blood', ref: 'you.aline', delta: 1 },
          { type: 'pool', player: 'you', delta: -1 },
          { type: 'transfers', player: 'you', value: 1 },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's17',
        mutations: [
          {
            type: 'moveCard',
            ref: 'you.aline',
            player: 'you',
            from: 'uncontrolled',
            to: 'ready',
          },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's17b',
        mutations: [{ type: 'phase', phase: 'discard', activePlayer: 'you' }],
        advance: { type: 'click', target: 'card:you.strength2' },
        highlight: ['card:you.strength2'],
      },
      {
        id: 's17c',
        mutations: [
          {
            type: 'moveCard',
            ref: 'you.strength2',
            player: 'you',
            from: 'hand',
            to: 'ashHeap',
          },
          {
            type: 'draw',
            player: 'you',
            card: card('you.rooftop', 'rooftopShadow'),
          },
        ],
        advance: { type: 'next' },
        highlight: ['zone:you:hand'],
      },
      {
        id: 's18',
        rivalThinking: true,
        mutations: [
          { type: 'phase', phase: 'influence', activePlayer: 'rival' },
          { type: 'transfers', player: 'you', value: 0 },
          { type: 'blood', ref: 'rival.nash', delta: 1 },
          { type: 'pool', player: 'rival', delta: -1 },
          {
            type: 'moveCard',
            ref: 'rival.nash',
            player: 'rival',
            from: 'uncontrolled',
            to: 'ready',
          },
        ],
        advance: { type: 'next' },
        highlight: ['card:rival.nash'],
      },
      { id: 's19', advance: { type: 'next' } },
    ],
  },
  // Ch5 - Taking actions: the bleed
  {
    id: 'ch5',
    icon: 'bi-droplet-fill',
    initialBoard: CH5_BOARD(),
    steps: [
      {
        id: 's1',
        mutations: [{ type: 'phase', phase: 'unlock', activePlayer: 'you' }],
        advance: { type: 'next' },
      },
      {
        id: 's2',
        mutations: [{ type: 'phase', phase: 'master', activePlayer: 'you' }],
        advance: { type: 'drag', ref: 'you.bloodDoll', to: 'card:you.aline' },
        highlight: ['card:you.bloodDoll', 'card:you.aline'],
      },
      {
        id: 's3',
        mutations: [
          { type: 'attach', ref: 'you.bloodDoll', hostRef: 'you.aline' },
          {
            type: 'draw',
            player: 'you',
            card: card('you.troublemaker', 'anarchTroublemaker'),
          },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's4',
        mutations: [{ type: 'phase', phase: 'minion', activePlayer: 'you' }],
        advance: { type: 'click', target: 'card:you.aline' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's5',
        advance: {
          type: 'choice',
          options: [
            { id: 'bleed' },
            {
              id: 'hunt',
              branch: [{ id: 's5_hunt', advance: { type: 'next' } }],
            },
          ],
        },
      },
      {
        id: 's6',
        mutations: [{ type: 'lock', ref: 'you.aline', locked: true }],
        advance: { type: 'next' },
        highlight: ['card:you.aline'],
      },
      { id: 's7', rivalThinking: true, advance: { type: 'next' } },
      {
        id: 's8',
        mutations: [
          { type: 'pool', player: 'rival', delta: -1 },
          { type: 'edge', player: 'you' },
        ],
        advance: { type: 'next' },
        highlight: ['pool:rival'],
      },
      {
        id: 's9',
        mutations: [
          { type: 'phase', phase: 'influence', activePlayer: 'you' },
          { type: 'transfers', player: 'you', value: 4 },
        ],
        advance: { type: 'click', target: 'card:you.leumeah' },
        highlight: ['card:you.leumeah'],
      },
      {
        id: 's10',
        mutations: [
          { type: 'blood', ref: 'you.leumeah', delta: 1 },
          { type: 'pool', player: 'you', delta: -1 },
          { type: 'transfers', player: 'you', value: 3 },
        ],
        advance: { type: 'click', target: 'card:you.leumeah' },
        highlight: ['card:you.leumeah'],
      },
      {
        id: 's11',
        mutations: [
          { type: 'blood', ref: 'you.leumeah', delta: 1 },
          { type: 'pool', player: 'you', delta: -1 },
          { type: 'transfers', player: 'you', value: 2 },
          { type: 'phase', phase: 'discard', activePlayer: 'you' },
        ],
        advance: { type: 'next' },
      },
      { id: 's12', advance: { type: 'next' } },
    ],
  },
  // Ch6 - Defense: blocking, stealth & intercept
  {
    id: 'ch6',
    icon: 'bi-shield-fill',
    initialBoard: CH6_BOARD(),
    steps: [
      {
        id: 's1',
        rivalThinking: true,
        mutations: [
          { type: 'phase', phase: 'minion', activePlayer: 'rival' },
          { type: 'lock', ref: 'rival.nash', locked: true },
        ],
        advance: { type: 'next' },
        highlight: ['card:rival.nash'],
      },
      {
        id: 's2',
        advance: {
          type: 'choice',
          options: [
            { id: 'block' },
            {
              id: 'take',
              branch: [
                {
                  id: 's2_take',
                  mutations: [{ type: 'pool', player: 'you', delta: -1 }],
                  advance: { type: 'next' },
                  highlight: ['pool:you'],
                },
                {
                  id: 's2_rewind',
                  mutations: [{ type: 'pool', player: 'you', delta: 1 }],
                  advance: { type: 'next' },
                },
              ],
            },
          ],
        },
      },
      {
        id: 's3',
        advance: { type: 'click', target: 'card:you.otqv' },
        highlight: ['card:you.otqv'],
      },
      {
        id: 's3b',
        mutations: [
          {
            type: 'moveCard',
            ref: 'you.otqv',
            player: 'you',
            from: 'hand',
            to: 'ashHeap',
          },
          {
            type: 'draw',
            player: 'you',
            card: card('you.voterCap', 'voterCaptivation'),
          },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's3c',
        rivalThinking: true,
        mutations: [
          { type: 'draw', player: 'rival', card: card('rival.bonding', 'bonding') },
          {
            type: 'moveCard',
            ref: 'rival.bonding',
            player: 'rival',
            from: 'hand',
            to: 'ashHeap',
          },
        ],
        advance: { type: 'next' },
        highlight: ['zone:rival:ashHeap'],
      },
      {
        id: 's3d',
        advance: { type: 'click', target: 'card:you.rooftop' },
        highlight: ['card:you.rooftop'],
      },
      {
        id: 's4',
        mutations: [
          {
            type: 'moveCard',
            ref: 'you.rooftop',
            player: 'you',
            from: 'hand',
            to: 'ashHeap',
          },
          { type: 'blood', ref: 'you.aline', delta: -1 },
          {
            type: 'draw',
            player: 'you',
            card: card('you.bw', 'burningWrath'),
          },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.aline'],
      },
      { id: 's5', advance: { type: 'next' } },
    ],
  },
  // Ch7 - Combat basics
  {
    id: 'ch7',
    icon: 'bi-fire',
    initialBoard: CH7_BOARD(),
    steps: [
      {
        id: 's1',
        advance: { type: 'next' },
        highlight: ['card:you.aline', 'card:rival.nash'],
      },
      {
        id: 's2',
        advance: { type: 'click', target: 'card:you.strength1' },
        highlight: ['card:you.strength1'],
      },
      {
        id: 's3',
        mutations: [
          {
            type: 'moveCard',
            ref: 'you.strength1',
            player: 'you',
            from: 'hand',
            to: 'ashHeap',
          },
          { type: 'draw', player: 'you', card: card('you.psyche', 'psyche') },
        ],
        advance: { type: 'next' },
      },
      {
        id: 's4',
        mutations: [
          { type: 'blood', ref: 'rival.nash', delta: -3 },
          { type: 'blood', ref: 'you.aline', delta: -1 },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.aline', 'card:rival.nash'],
      },
      { id: 's5', advance: { type: 'next' } },
      { id: 's6', advance: { type: 'next' } },
    ],
  },
  // Ch8 - Masters & equipment
  {
    id: 'ch8',
    icon: 'bi-crosshair',
    initialBoard: CH8_BOARD(),
    steps: [
      {
        id: 's1',
        mutations: [
          { type: 'phase', phase: 'unlock', activePlayer: 'you' },
          { type: 'lock', ref: 'you.aline', locked: false },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's2',
        mutations: [{ type: 'phase', phase: 'master', activePlayer: 'you' }],
        advance: { type: 'click', target: 'card:you.aline' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's3',
        mutations: [
          { type: 'blood', ref: 'you.aline', delta: -1 },
          { type: 'pool', player: 'you', delta: 1 },
        ],
        advance: { type: 'next' },
        highlight: ['pool:you'],
      },
      {
        id: 's3b',
        advance: { type: 'click', target: 'card:you.troublemaker' },
        highlight: ['card:you.troublemaker'],
      },
      {
        id: 's3c',
        mutations: [
          {
            type: 'moveCard',
            ref: 'you.troublemaker',
            player: 'you',
            from: 'hand',
            to: 'masters',
          },
          { type: 'draw', player: 'you', card: card('you.psyche2', 'psyche') },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.troublemaker'],
      },
      {
        id: 's4',
        mutations: [{ type: 'phase', phase: 'minion', activePlayer: 'you' }],
        advance: { type: 'drag', ref: 'you.magnum', to: 'card:you.aline' },
        highlight: ['card:you.magnum', 'card:you.aline'],
      },
      {
        id: 's5',
        mutations: [
          { type: 'attach', ref: 'you.magnum', hostRef: 'you.aline' },
          { type: 'pool', player: 'you', delta: -2 },
          { type: 'lock', ref: 'you.aline', locked: true },
          {
            type: 'draw',
            player: 'you',
            card: card('you.strength2', 'undeadStrength'),
          },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.aline'],
      },
      { id: 's6', advance: { type: 'next' } },
      {
        id: 's7',
        mutations: [
          { type: 'phase', phase: 'influence', activePlayer: 'you' },
          { type: 'transfers', player: 'you', value: 4 },
        ],
        advance: { type: 'click', target: 'card:you.leumeah' },
        highlight: ['card:you.leumeah'],
      },
      {
        id: 's8',
        mutations: [
          { type: 'blood', ref: 'you.leumeah', delta: 1 },
          { type: 'pool', player: 'you', delta: -1 },
          { type: 'transfers', player: 'you', value: 3 },
        ],
        advance: { type: 'click', target: 'card:you.leumeah' },
        highlight: ['card:you.leumeah'],
      },
      {
        id: 's9',
        mutations: [
          { type: 'blood', ref: 'you.leumeah', delta: 1 },
          { type: 'pool', player: 'you', delta: -1 },
          { type: 'transfers', player: 'you', value: 2 },
        ],
        advance: { type: 'click', target: 'card:you.leumeah' },
        highlight: ['card:you.leumeah'],
      },
      {
        id: 's10',
        mutations: [
          { type: 'blood', ref: 'you.leumeah', delta: 1 },
          { type: 'pool', player: 'you', delta: -1 },
          { type: 'transfers', player: 'you', value: 1 },
        ],
        advance: { type: 'click', target: 'card:you.leumeah' },
        highlight: ['card:you.leumeah'],
      },
      {
        id: 's11',
        mutations: [
          { type: 'blood', ref: 'you.leumeah', delta: 1 },
          { type: 'pool', player: 'you', delta: -1 },
          { type: 'transfers', player: 'you', value: 0 },
          {
            type: 'moveCard',
            ref: 'you.leumeah',
            player: 'you',
            from: 'uncontrolled',
            to: 'ready',
          },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.leumeah'],
      },
      {
        id: 's12',
        rivalThinking: true,
        mutations: [
          { type: 'phase', phase: 'minion', activePlayer: 'rival' },
          { type: 'pool', player: 'you', delta: -1 },
          { type: 'edge', player: 'rival' },
        ],
        advance: { type: 'next' },
        highlight: ['pool:you'],
      },
    ],
  },
  // Ch9 - Politics: gradual referendum, the Edge, Voter Captivation
  {
    id: 'ch9',
    icon: 'bi-megaphone-fill',
    initialBoard: CH9_BOARD(),
    steps: [
      {
        id: 's1',
        mutations: [
          { type: 'phase', phase: 'unlock', activePlayer: 'you' },
          { type: 'lock', ref: 'you.aline', locked: false },
        ],
        advance: { type: 'next' },
      },
      {
        id: 's2',
        mutations: [{ type: 'phase', phase: 'master', activePlayer: 'you' }],
        advance: { type: 'click', target: 'card:you.aline' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's3',
        mutations: [
          { type: 'blood', ref: 'you.aline', delta: -1 },
          { type: 'pool', player: 'you', delta: 1 },
        ],
        advance: { type: 'next' },
      },
      {
        id: 's4',
        mutations: [{ type: 'phase', phase: 'minion', activePlayer: 'you' }],
        advance: { type: 'click', target: 'card:you.aline' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's5',
        mutations: [
          { type: 'lock', ref: 'you.aline', locked: true },
          { type: 'pool', player: 'rival', delta: -1 },
          { type: 'edge', player: 'you' },
        ],
        advance: { type: 'next' },
        highlight: ['edge:you'],
      },
      {
        id: 's6',
        advance: { type: 'click', target: 'card:you.eatTheRich' },
        highlight: ['card:you.eatTheRich'],
      },
      {
        id: 's7',
        mutations: [
          {
            type: 'moveCard',
            ref: 'you.eatTheRich',
            player: 'you',
            from: 'hand',
            to: 'ashHeap',
          },
          {
            type: 'draw',
            player: 'you',
            card: card('you.doll2', 'bloodDoll'),
          },
          { type: 'lock', ref: 'you.leumeah', locked: true },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.leumeah'],
      },
      {
        id: 's8',
        advance: { type: 'next' },
        highlight: ['card:rival.nash'],
      },
      {
        id: 's9',
        advance: {
          type: 'choice',
          options: [
            { id: 'rival' },
            {
              id: 'self',
              branch: [{ id: 's9_self', advance: { type: 'next' } }],
            },
          ],
        },
        highlight: ['card:you.leumeah'],
      },
      {
        id: 's10',
        advance: { type: 'next' },
        highlight: ['card:you.leumeah'],
      },
      {
        id: 's11',
        rivalThinking: true,
        advance: { type: 'next' },
        highlight: ['card:rival.nash'],
      },
      {
        id: 's12',
        rivalThinking: true,
        mutations: [
          {
            type: 'draw',
            player: 'rival',
            card: card('rival.pol1', 'anarchistUprising'),
          },
          {
            type: 'moveCard',
            ref: 'rival.pol1',
            player: 'rival',
            from: 'hand',
            to: 'ashHeap',
          },
        ],
        advance: { type: 'next' },
        highlight: ['zone:rival:ashHeap'],
      },
      {
        id: 's13',
        advance: { type: 'click', target: 'card:you.aline' },
        highlight: ['card:you.aline'],
      },
      { id: 's14', advance: { type: 'next' } },
      {
        id: 's15',
        advance: { type: 'click', target: 'edge:you' },
        highlight: ['edge:you'],
      },
      {
        id: 's16',
        mutations: [{ type: 'edge', player: null }],
        advance: { type: 'next' },
      },
      {
        id: 's17',
        mutations: [{ type: 'pool', player: 'rival', delta: -4 }],
        advance: { type: 'next' },
        highlight: ['pool:rival'],
      },
      {
        id: 's18',
        advance: { type: 'click', target: 'card:you.voterCap' },
        highlight: ['card:you.voterCap'],
      },
      {
        id: 's19',
        mutations: [
          {
            type: 'moveCard',
            ref: 'you.voterCap',
            player: 'you',
            from: 'hand',
            to: 'ashHeap',
          },
          {
            type: 'draw',
            player: 'you',
            card: card('you.otqv2', 'onTheQuiVive'),
          },
          { type: 'pool', player: 'you', delta: 2 },
        ],
        advance: { type: 'next' },
        highlight: ['pool:you'],
      },
      {
        id: 's20',
        advance: { type: 'click', target: 'card:you.aline' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's21',
        mutations: [
          { type: 'blood', ref: 'you.aline', delta: -1 },
          { type: 'lock', ref: 'you.aline', locked: false },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.aline'],
      },
      { id: 's22', advance: { type: 'next' } },
    ],
  },
  // Ch10 - A full combat: Majesty, superior Psyche!, Resilience, torpor
  {
    id: 'ch10',
    icon: 'bi-lightning-charge-fill',
    initialBoard: CH10_BOARD(),
    steps: [
      { id: 's1', advance: { type: 'next' } },
      {
        id: 's1b',
        mutations: [{ type: 'phase', phase: 'master', activePlayer: 'you' }],
        advance: { type: 'drag', ref: 'you.celerity', to: 'card:you.aline' },
        highlight: ['card:you.celerity', 'card:you.aline'],
      },
      {
        id: 's1c',
        mutations: [
          { type: 'attach', ref: 'you.celerity', hostRef: 'you.aline' },
          { type: 'draw', player: 'you', card: card('you.doll2', 'bloodDoll') },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's2',
        mutations: [{ type: 'phase', phase: 'minion', activePlayer: 'you' }],
        advance: { type: 'click', target: 'card:you.aline' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's3',
        rivalThinking: true,
        mutations: [
          { type: 'lock', ref: 'you.aline', locked: true },
          { type: 'lock', ref: 'rival.nash', locked: true },
        ],
        advance: { type: 'next' },
        highlight: ['card:rival.nash'],
        combat: { round: 1, stage: 'range' },
      },
      {
        id: 's4',
        advance: { type: 'next' },
        combat: { round: 1, stage: 'range' },
      },
      {
        id: 's5',
        advance: {
          type: 'choice',
          options: [
            { id: 'long' },
            {
              id: 'close',
              branch: [
                {
                  id: 's5_close',
                  advance: { type: 'next' },
                  combat: { round: 1, stage: 'range' },
                },
              ],
            },
          ],
        },
        combat: { round: 1, stage: 'range' },
      },
      {
        id: 's6',
        advance: { type: 'next' },
        combat: { round: 1, stage: 'range' },
      },
      {
        id: 's7',
        advance: { type: 'click', target: 'card:you.aline' },
        highlight: ['card:you.aline'],
        combat: { round: 1, stage: 'strike' },
      },
      {
        id: 's8',
        mutations: [{ type: 'blood', ref: 'rival.nash', delta: -2 }],
        advance: { type: 'next' },
        highlight: ['card:rival.nash'],
        combat: { round: 1, stage: 'strike' },
      },
      {
        id: 's9',
        rivalThinking: true,
        mutations: [
          {
            type: 'draw',
            player: 'rival',
            card: card('rival.majesty', 'majesty'),
          },
          {
            type: 'moveCard',
            ref: 'rival.majesty',
            player: 'rival',
            from: 'hand',
            to: 'ashHeap',
          },
        ],
        advance: { type: 'next' },
        highlight: ['zone:rival:ashHeap'],
        combat: { round: 1, stage: 'strike' },
      },
      {
        id: 's10',
        advance: { type: 'click', target: 'card:you.psyche' },
        highlight: ['card:you.psyche'],
        combat: { round: 1, stage: 'press' },
      },
      {
        id: 's11',
        mutations: [
          {
            type: 'moveCard',
            ref: 'you.psyche',
            player: 'you',
            from: 'hand',
            to: 'ashHeap',
          },
          {
            type: 'draw',
            player: 'you',
            card: card('you.legal2', 'legalManipulations'),
          },
        ],
        advance: { type: 'next' },
        combat: { round: 2, stage: 'range' },
      },
      {
        id: 's12',
        advance: { type: 'next' },
        combat: { round: 2, stage: 'range' },
      },
      {
        id: 's13',
        advance: { type: 'click', target: 'card:you.aline' },
        highlight: ['card:you.aline'],
        combat: { round: 2, stage: 'strike' },
      },
      {
        id: 's14',
        mutations: [{ type: 'blood', ref: 'rival.nash', delta: -2 }],
        advance: { type: 'next' },
        highlight: ['card:rival.nash'],
        combat: { round: 2, stage: 'strike' },
      },
      {
        id: 's15',
        advance: { type: 'click', target: 'card:you.psyche2' },
        highlight: ['card:you.psyche2'],
        combat: { round: 2, stage: 'press' },
      },
      {
        id: 's16',
        mutations: [
          {
            type: 'moveCard',
            ref: 'you.psyche2',
            player: 'you',
            from: 'hand',
            to: 'ashHeap',
          },
          {
            type: 'draw',
            player: 'you',
            card: card('you.strength3', 'undeadStrength'),
          },
        ],
        advance: { type: 'next' },
        combat: { round: 3, stage: 'range' },
      },
      {
        id: 's17',
        advance: { type: 'click', target: 'card:you.bw' },
        highlight: ['card:you.bw'],
        combat: { round: 3, stage: 'strike' },
      },
      {
        id: 's18',
        rivalThinking: true,
        mutations: [
          {
            type: 'moveCard',
            ref: 'you.bw',
            player: 'you',
            from: 'hand',
            to: 'ashHeap',
          },
          {
            type: 'draw',
            player: 'you',
            card: card('you.procurer', 'procurer', { blood: 1 }),
          },
          { type: 'blood', ref: 'you.aline', delta: -4 },
          {
            type: 'draw',
            player: 'rival',
            card: card('rival.resilience', 'resilience'),
          },
          {
            type: 'moveCard',
            ref: 'rival.resilience',
            player: 'rival',
            from: 'hand',
            to: 'ashHeap',
          },
        ],
        advance: { type: 'next' },
        highlight: ['zone:rival:ashHeap'],
        combat: { round: 3, stage: 'strike' },
      },
      {
        id: 's19',
        mutations: [{ type: 'blood', ref: 'rival.nash', delta: -1 }],
        advance: { type: 'next' },
        highlight: ['card:rival.nash'],
        combat: { round: 3, stage: 'strike' },
      },
      {
        id: 's20',
        mutations: [
          {
            type: 'moveCard',
            ref: 'rival.nash',
            player: 'rival',
            from: 'ready',
            to: 'torpor',
          },
        ],
        advance: { type: 'next' },
        highlight: ['zone:rival:torpor'],
      },
      { id: 's21', advance: { type: 'next' } },
    ],
  },
  // Ch11 - Rescue from torpor: Crowley strikes back, Aline saves Leumeah
  {
    id: 'ch11',
    icon: 'bi-heart-pulse-fill',
    initialBoard: CH11_BOARD(),
    steps: [
      {
        id: 's1',
        advance: { type: 'next' },
        highlight: ['card:rival.crowley'],
      },
      {
        id: 's2',
        mutations: [{ type: 'phase', phase: 'unlock', activePlayer: 'you' }],
        advance: { type: 'next' },
        highlight: ['zone:you:torpor'],
      },
      {
        id: 's3',
        mutations: [{ type: 'phase', phase: 'minion', activePlayer: 'you' }],
        advance: { type: 'click', target: 'card:you.aline' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's4',
        mutations: [{ type: 'lock', ref: 'you.aline', locked: true }],
        advance: { type: 'next' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's5',
        advance: {
          type: 'choice',
          options: [
            { id: 'aline' },
            {
              id: 'split',
              branch: [{ id: 's5_split', advance: { type: 'next' } }],
            },
          ],
        },
      },
      {
        id: 's6',
        mutations: [
          { type: 'blood', ref: 'you.aline', delta: -2 },
          {
            type: 'moveCard',
            ref: 'you.leumeah',
            player: 'you',
            from: 'torpor',
            to: 'ready',
          },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.leumeah'],
      },
      {
        id: 's7',
        advance: { type: 'click', target: 'card:you.leumeah' },
        highlight: ['card:you.leumeah'],
      },
      {
        id: 's8',
        mutations: [
          { type: 'lock', ref: 'you.leumeah', locked: true },
          { type: 'blood', ref: 'you.leumeah', delta: 1 },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.leumeah'],
      },
      { id: 's9', advance: { type: 'next' } },
    ],
  },
  // Ch12 - Allies: recruit the Procurer
  {
    id: 'ch12',
    icon: 'bi-people-fill',
    initialBoard: CH12_BOARD(),
    steps: [
      {
        id: 's1',
        mutations: [{ type: 'phase', phase: 'unlock', activePlayer: 'you' }],
        advance: { type: 'next' },
      },
      {
        id: 's2',
        mutations: [{ type: 'phase', phase: 'minion', activePlayer: 'you' }],
        advance: { type: 'click', target: 'card:you.procurer' },
        highlight: ['card:you.procurer'],
      },
      {
        id: 's3',
        mutations: [
          { type: 'lock', ref: 'you.aline', locked: true },
          {
            type: 'moveCard',
            ref: 'you.procurer',
            player: 'you',
            from: 'hand',
            to: 'ready',
          },
          { type: 'blood', ref: 'you.aline', delta: -2 },
          { type: 'draw', player: 'you', card: card('you.magnum2', 'magnum') },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.procurer'],
      },
      { id: 's4', advance: { type: 'next' } },
      {
        id: 's5',
        rivalThinking: true,
        mutations: [
          { type: 'phase', phase: 'minion', activePlayer: 'rival' },
          { type: 'lock', ref: 'rival.crowley', locked: true },
          { type: 'pool', player: 'you', delta: -1 },
        ],
        advance: { type: 'next' },
        highlight: ['card:rival.crowley'],
      },
      {
        id: 's6',
        mutations: [
          { type: 'phase', phase: 'unlock', activePlayer: 'you' },
          { type: 'lock', ref: 'you.aline', locked: false },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.aline'],
      },
      {
        id: 's6b',
        mutations: [
          { type: 'phase', phase: 'minion', activePlayer: 'you' },
          { type: 'lock', ref: 'you.procurer', locked: true },
          { type: 'blood', ref: 'you.aline', delta: 1 },
        ],
        advance: { type: 'next' },
        highlight: ['card:you.procurer'],
      },
      { id: 's7', advance: { type: 'next' } },
    ],
  },
  // Ch13 - The oust
  {
    id: 'ch13',
    icon: 'bi-trophy-fill',
    initialBoard: CH13_BOARD(),
    steps: [
      { id: 's1', advance: { type: 'next' }, highlight: ['pool:rival'] },
      {
        id: 's2',
        mutations: [{ type: 'phase', phase: 'unlock', activePlayer: 'you' }],
        advance: { type: 'next' },
      },
      {
        id: 's3',
        advance: { type: 'click', target: 'card:you.troublemaker' },
        highlight: ['card:you.troublemaker'],
      },
      {
        id: 's4',
        mutations: [
          {
            type: 'moveCard',
            ref: 'you.troublemaker',
            player: 'you',
            from: 'masters',
            to: 'masters',
            toPlayer: 'rival',
          },
          { type: 'lock', ref: 'rival.crowley', locked: true },
          { type: 'lock', ref: 'rival.nash', locked: true },
        ],
        advance: { type: 'next' },
        highlight: ['card:rival.crowley', 'card:rival.nash'],
      },
      {
        id: 's5',
        mutations: [{ type: 'phase', phase: 'minion', activePlayer: 'you' }],
        advance: { type: 'next' },
      },
      {
        id: 's6',
        advance: { type: 'click', target: 'card:you.legal1' },
        highlight: ['card:you.legal1'],
      },
      {
        id: 's7',
        mutations: [
          {
            type: 'moveCard',
            ref: 'you.legal1',
            player: 'you',
            from: 'hand',
            to: 'ashHeap',
          },
          {
            type: 'draw',
            player: 'you',
            card: card('you.otqv3', 'onTheQuiVive'),
          },
          { type: 'lock', ref: 'you.aline', locked: true },
          { type: 'blood', ref: 'you.aline', delta: -1 },
        ],
        advance: { type: 'next' },
      },
      {
        id: 's8',
        mutations: [
          { type: 'pool', player: 'rival', delta: -3 },
          { type: 'pool', player: 'you', delta: 6 },
        ],
        advance: { type: 'next' },
        highlight: ['pool:rival'],
      },
      { id: 's9', advance: { type: 'next' } },
    ],
  },
]
