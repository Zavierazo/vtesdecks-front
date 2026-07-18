import { describe, expect, it } from 'vitest'
import {
  applyMutation,
  applyMutations,
  boardAtStep,
  findCard,
} from './tutorial-board.reducer'
import {
  TutorialBoardState,
  TutorialChapter,
} from './tutorial-script.model'

function board(): TutorialBoardState {
  return {
    you: {
      pool: 10,
      transfers: 0,
      hand: [{ ref: 'you.magnum', cardKey: 'magnum' }],
      uncontrolled: [
        { ref: 'you.aline', cardKey: 'aline', blood: 3, faceDown: true },
      ],
      ready: [],
      ashHeap: [],
      masters: [],
      torpor: [],
      libraryCount: 5,
      cryptCount: 5,
    },
    rival: {
      pool: 10,
      transfers: 0,
      hand: [],
      uncontrolled: [],
      ready: [{ ref: 'rival.nash', cardKey: 'nash', blood: 7 }],
      ashHeap: [],
      masters: [],
      torpor: [],
      libraryCount: 5,
      cryptCount: 5,
    },
  }
}

describe('tutorial board reducer', () => {
  it('does not modify the input board', () => {
    const input = board()
    const snapshot = JSON.parse(JSON.stringify(input))
    applyMutation(input, { type: 'pool', player: 'you', delta: -3 })
    applyMutation(input, {
      type: 'moveCard',
      ref: 'you.aline',
      player: 'you',
      from: 'uncontrolled',
      to: 'ready',
    })
    expect(input).toEqual(snapshot)
  })

  it('moveCard moves between zones and reveals cards entering ready', () => {
    const next = applyMutation(board(), {
      type: 'moveCard',
      ref: 'you.aline',
      player: 'you',
      from: 'uncontrolled',
      to: 'ready',
    })
    expect(next.you.uncontrolled).toHaveLength(0)
    expect(next.you.ready).toHaveLength(1)
    expect(next.you.ready[0].faceDown).toBe(false)
  })

  it('attach moves a card onto its host', () => {
    const next = applyMutation(board(), {
      type: 'attach',
      ref: 'you.magnum',
      hostRef: 'you.aline',
    })
    expect(next.you.hand).toHaveLength(0)
    expect(next.you.uncontrolled[0].attachments).toHaveLength(1)
    expect(next.you.uncontrolled[0].attachments![0].ref).toBe('you.magnum')
  })

  it('draw adds to hand and decrements the library', () => {
    const next = applyMutation(board(), {
      type: 'draw',
      player: 'you',
      card: { ref: 'you.extra', cardKey: 'bloodDoll' },
    })
    expect(next.you.hand).toHaveLength(2)
    expect(next.you.libraryCount).toBe(4)
  })

  it('pool and blood floor at zero', () => {
    let next = applyMutation(board(), {
      type: 'pool',
      player: 'rival',
      delta: -99,
    })
    expect(next.rival.pool).toBe(0)
    next = applyMutation(next, { type: 'blood', ref: 'rival.nash', delta: -99 })
    expect(findCard(next, 'rival.nash')?.blood).toBe(0)
  })

  it('lock, transfers and phase update state', () => {
    const next = applyMutations(board(), [
      { type: 'lock', ref: 'rival.nash', locked: true },
      { type: 'transfers', player: 'you', value: 4 },
      { type: 'phase', phase: 'minion', activePlayer: 'rival' },
    ])
    expect(findCard(next, 'rival.nash')?.locked).toBe(true)
    expect(next.you.transfers).toBe(4)
    expect(next.phase).toBe('minion')
    expect(next.activePlayer).toBe('rival')
  })

  it('boardAtStep folds main-line mutations up to the given step', () => {
    const chapter: TutorialChapter = {
      id: 'chX',
      icon: 'bi-x',
      initialBoard: board(),
      steps: [
        {
          id: 's1',
          mutations: [{ type: 'pool', player: 'you', delta: -1 }],
          advance: { type: 'next' },
        },
        {
          id: 's2',
          mutations: [{ type: 'pool', player: 'you', delta: -2 }],
          advance: { type: 'next' },
        },
        {
          id: 's3',
          mutations: [{ type: 'pool', player: 'you', delta: -3 }],
          advance: { type: 'next' },
        },
      ],
    }
    expect(boardAtStep(chapter, 0).you.pool).toBe(9)
    expect(boardAtStep(chapter, 1).you.pool).toBe(7)
    expect(boardAtStep(chapter, 2).you.pool).toBe(4)
  })
})
