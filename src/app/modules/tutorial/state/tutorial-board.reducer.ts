import {
  TutorialBoardMutation,
  TutorialBoardState,
  TutorialCardInstance,
  TutorialChapter,
  TutorialPlayerBoard,
  TutorialZoneId,
} from './tutorial-script.model'

const CARD_ZONES: TutorialZoneId[] = [
  'hand',
  'uncontrolled',
  'ready',
  'ashHeap',
  'masters',
  'torpor',
]

function cloneCard(card: TutorialCardInstance): TutorialCardInstance {
  return {
    ...card,
    attachments: card.attachments?.map((attachment) => cloneCard(attachment)),
  }
}

function clonePlayer(player: TutorialPlayerBoard): TutorialPlayerBoard {
  return {
    ...player,
    hand: player.hand.map(cloneCard),
    uncontrolled: player.uncontrolled.map(cloneCard),
    ready: player.ready.map(cloneCard),
    ashHeap: player.ashHeap.map(cloneCard),
    masters: player.masters.map(cloneCard),
    torpor: player.torpor.map(cloneCard),
  }
}

export function cloneBoard(board: TutorialBoardState): TutorialBoardState {
  return {
    ...board,
    you: clonePlayer(board.you),
    rival: clonePlayer(board.rival),
  }
}

function isCardZone(zone: TutorialZoneId): zone is Exclude<TutorialZoneId, 'library' | 'crypt'> {
  return CARD_ZONES.includes(zone)
}

function takeCard(
  board: TutorialBoardState,
  ref: string,
): TutorialCardInstance | undefined {
  for (const player of [board.you, board.rival]) {
    for (const zone of CARD_ZONES) {
      if (!isCardZone(zone)) {
        continue
      }
      const cards = player[zone]
      const index = cards.findIndex((card) => card.ref === ref)
      if (index >= 0) {
        return cards.splice(index, 1)[0]
      }
    }
  }
  return undefined
}

export function findCard(
  board: TutorialBoardState,
  ref: string,
): TutorialCardInstance | undefined {
  for (const player of [board.you, board.rival]) {
    for (const zone of CARD_ZONES) {
      if (!isCardZone(zone)) {
        continue
      }
      const card = player[zone].find((instance) => instance.ref === ref)
      if (card) {
        return card
      }
    }
  }
  return undefined
}

/** Applies a single mutation, returning a new board (input is not modified). */
export function applyMutation(
  board: TutorialBoardState,
  mutation: TutorialBoardMutation,
): TutorialBoardState {
  const next = cloneBoard(board)
  switch (mutation.type) {
    case 'moveCard': {
      if (!isCardZone(mutation.from) || !isCardZone(mutation.to)) {
        break
      }
      const player = next[mutation.player]
      const index = player[mutation.from].findIndex(
        (card) => card.ref === mutation.ref,
      )
      if (index < 0) {
        break
      }
      const [card] = player[mutation.from].splice(index, 1)
      if (mutation.to === 'ready') {
        card.faceDown = false
      }
      next[mutation.toPlayer ?? mutation.player][mutation.to].push(card)
      break
    }
    case 'attach': {
      const card = takeCard(next, mutation.ref)
      const host = findCard(next, mutation.hostRef)
      if (card && host) {
        host.attachments = [...(host.attachments ?? []), card]
      }
      break
    }
    case 'draw': {
      const player = next[mutation.player]
      player.hand.push(cloneCard(mutation.card))
      player.libraryCount = Math.max(0, player.libraryCount - 1)
      break
    }
    case 'pool': {
      const player = next[mutation.player]
      player.pool = Math.max(0, player.pool + mutation.delta)
      break
    }
    case 'blood': {
      const card = findCard(next, mutation.ref)
      if (card) {
        card.blood = Math.max(0, (card.blood ?? 0) + mutation.delta)
      }
      break
    }
    case 'lock': {
      const card = findCard(next, mutation.ref)
      if (card) {
        card.locked = mutation.locked
      }
      break
    }
    case 'transfers': {
      next[mutation.player].transfers = mutation.value
      break
    }
    case 'edge': {
      next.you.hasEdge = mutation.player === 'you'
      next.rival.hasEdge = mutation.player === 'rival'
      break
    }
    case 'phase': {
      next.phase = mutation.phase
      next.activePlayer = mutation.activePlayer
      break
    }
  }
  return next
}

export function applyMutations(
  board: TutorialBoardState,
  mutations: TutorialBoardMutation[] | undefined,
): TutorialBoardState {
  return (mutations ?? []).reduce(applyMutation, board)
}

/**
 * Board after entering main-line step `stepIndex`: fold of steps[0..stepIndex]
 * mutations over the chapter's initial board. Branch steps are excluded by
 * design (their pool deltas net to zero — see TutorialChoiceOption).
 */
export function boardAtStep(
  chapter: TutorialChapter,
  stepIndex: number,
): TutorialBoardState {
  let board = cloneBoard(chapter.initialBoard)
  for (let i = 0; i <= stepIndex && i < chapter.steps.length; i++) {
    board = applyMutations(board, chapter.steps[i].mutations)
  }
  return board
}
