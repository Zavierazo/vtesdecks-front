import { TutorialCardKey } from './tutorial-cards.data'

export type TutorialPlayerId = 'you' | 'rival'

export type TutorialZoneId =
  | 'hand'
  | 'uncontrolled'
  | 'ready'
  | 'ashHeap'
  | 'library'
  | 'crypt'
  | 'masters'
  | 'torpor'

export type TutorialPhase =
  | 'unlock'
  | 'master'
  | 'minion'
  | 'influence'
  | 'discard'

/**
 * Anything the spotlight/click system can point at. Rendered elements
 * register themselves under these ids via TutorialTargetDirective.
 */
export type TutorialTargetId =
  | `zone:${TutorialPlayerId}:${TutorialZoneId}`
  | `pool:${TutorialPlayerId}`
  | `edge:${TutorialPlayerId}`
  | `card:${string}`
  | `anatomy:${string}`
  | 'narrator'
  | 'phase-tracker'

export interface TutorialCardInstance {
  /** Unique instance id referenced by mutations and targets (e.g. 'you.aline'). */
  ref: string
  cardKey: TutorialCardKey
  blood?: number
  locked?: boolean
  faceDown?: boolean
  attachments?: TutorialCardInstance[]
}

export interface TutorialPlayerBoard {
  pool: number
  transfers: number
  hand: TutorialCardInstance[]
  uncontrolled: TutorialCardInstance[]
  ready: TutorialCardInstance[]
  ashHeap: TutorialCardInstance[]
  /** Master cards in play that are not attached to a minion. */
  masters: TutorialCardInstance[]
  torpor: TutorialCardInstance[]
  /** Holds the Edge token (seized by landing the last successful bleed). */
  hasEdge?: boolean
  libraryCount: number
  cryptCount: number
}

export interface TutorialBoardState {
  you: TutorialPlayerBoard
  rival: TutorialPlayerBoard
  phase?: TutorialPhase
  activePlayer?: TutorialPlayerId
}

export type TutorialBoardMutation =
  | {
      type: 'moveCard'
      ref: string
      player: TutorialPlayerId
      from: TutorialZoneId
      to: TutorialZoneId
      /** Destination owner when the card changes control (defaults to player). */
      toPlayer?: TutorialPlayerId
    }
  | { type: 'attach'; ref: string; hostRef: string }
  | { type: 'draw'; player: TutorialPlayerId; card: TutorialCardInstance }
  | { type: 'pool'; player: TutorialPlayerId; delta: number }
  | { type: 'blood'; ref: string; delta: number }
  | { type: 'lock'; ref: string; locked: boolean }
  | { type: 'transfers'; player: TutorialPlayerId; value: number }
  /** Gives the Edge to one player (null burns it: nobody holds it). */
  | { type: 'edge'; player: TutorialPlayerId | null }
  | {
      type: 'phase'
      phase: TutorialPhase | undefined
      activePlayer: TutorialPlayerId
    }

export interface TutorialChoiceOption {
  /** Label key derived as tutorial.<chapterId>.<stepId>.opt_<id>. */
  id: string
  /**
   * Short detour played before converging back to the next main-line step.
   * Branch steps must not change the board permanently: only 'pool'
   * mutations are allowed and their deltas must sum to zero per branch
   * (enforced by the script integrity spec) so that resume — which folds
   * main-line mutations only — stays consistent.
   */
  branch?: TutorialStep[]
}

export type TutorialAdvance =
  | { type: 'next' }
  | { type: 'click'; target: TutorialTargetId }
  | { type: 'drag'; ref: string; to: TutorialTargetId }
  | { type: 'choice'; options: TutorialChoiceOption[] }

export type TutorialView =
  | 'board'
  | 'anatomy-crypt'
  | 'anatomy-library'
  | 'anatomy-types'

export interface TutorialStep {
  /** Narration key derived as tutorial.<chapterId>.<stepId>. */
  id: string
  mutations?: TutorialBoardMutation[]
  advance: TutorialAdvance
  highlight?: TutorialTargetId[]
  /** Shows a "rival's turn" treatment on the narrator. */
  rivalThinking?: boolean
  /** Temporarily shows the player's uncontrolled cards face up. */
  revealUncontrolled?: boolean
  /** Shows the combat tracker (round number + current combat stage). */
  combat?: { round: number; stage: 'range' | 'strike' | 'press' }
  /** What the play area displays; defaults to the game board. */
  view?: TutorialView
}

export interface TutorialChapter {
  id: string
  icon: string
  /** Chapter-start snapshot: makes chapters replayable and resume a pure fold. */
  initialBoard: TutorialBoardState
  steps: TutorialStep[]
}

export function tutorialStepTextKey(
  chapterId: string,
  step: TutorialStep,
): string {
  return `${chapterId}.${step.id}`
}
