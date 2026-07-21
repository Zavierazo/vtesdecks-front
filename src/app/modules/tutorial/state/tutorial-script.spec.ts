import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { applyMutations, cloneBoard, findCard } from './tutorial-board.reducer'
import { TUTORIAL_SCRIPT } from './tutorial-script.data'
import {
  TutorialStep,
  tutorialStepTextKey,
} from './tutorial-script.model'

/**
 * Integrity guards for the 70-step script data file: every derived narration
 * key must exist in the English scope file, every mutation must reference a
 * reachable card, and branches must not permanently change the board.
 */

const en = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src/assets/i18n/tutorial/en.json'),
    'utf8',
  ),
)

function flatten(obj: object, prefix = '', acc: Record<string, unknown> = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object') {
      flatten(value, full, acc)
    } else {
      acc[full] = value
    }
  }
  return acc
}

const enKeys = flatten(en)

const TARGET_PATTERN =
  /^(zone:(you|rival):(hand|uncontrolled|ready|ashHeap|library|crypt|masters|torpor)|(pool|edge):(you|rival)|card:[a-z]+\.[a-zA-Z0-9]+|anatomy:[a-z-]+|narrator|phase-tracker)$/

function branchSteps(step: TutorialStep): TutorialStep[] {
  if (step.advance.type !== 'choice') {
    return []
  }
  return step.advance.options.flatMap((option) => option.branch ?? [])
}

describe('tutorial script integrity', () => {
  it('has a title and narration key for every chapter and step', () => {
    const missing: string[] = []
    for (const chapter of TUTORIAL_SCRIPT) {
      if (!enKeys[`chapters.${chapter.id}.title`]) {
        missing.push(`chapters.${chapter.id}.title`)
      }
      for (const step of [...chapter.steps, ...chapter.steps.flatMap(branchSteps)]) {
        const key = tutorialStepTextKey(chapter.id, step)
        if (!enKeys[key]) {
          missing.push(key)
        }
        if (step.advance.type === 'choice') {
          for (const option of step.advance.options) {
            const optionKey = `${key}_opt_${option.id}`
            if (!enKeys[optionKey]) {
              missing.push(optionKey)
            }
          }
        }
      }
    }
    expect(missing).toEqual([])
  })

  it('uses well-formed targets everywhere', () => {
    for (const chapter of TUTORIAL_SCRIPT) {
      for (const step of [...chapter.steps, ...chapter.steps.flatMap(branchSteps)]) {
        const targets = [...(step.highlight ?? [])]
        if (step.advance.type === 'click') {
          targets.push(step.advance.target)
        }
        if (step.advance.type === 'drag') {
          targets.push(`card:${step.advance.ref}`, step.advance.to)
        }
        for (const target of targets) {
          expect(target, `${chapter.id}.${step.id}`).toMatch(TARGET_PATTERN)
        }
      }
    }
  })

  it('only references reachable cards in mutations', () => {
    for (const chapter of TUTORIAL_SCRIPT) {
      let board = cloneBoard(chapter.initialBoard)
      for (const step of chapter.steps) {
        // Check each mutation against the board as it stands at that point
        // of the step (a draw earlier in the array makes its card reachable).
        for (const mutation of step.mutations ?? []) {
          const context = `${chapter.id}.${step.id} ${mutation.type}`
          switch (mutation.type) {
            case 'moveCard': {
              const zone = board[mutation.player][
                mutation.from as
                  | 'hand'
                  | 'uncontrolled'
                  | 'ready'
                  | 'ashHeap'
                  | 'masters'
                  | 'torpor'
              ]
              expect(
                zone.some((card) => card.ref === mutation.ref),
                context,
              ).toBe(true)
              break
            }
            case 'attach':
              expect(findCard(board, mutation.ref), context).toBeDefined()
              expect(findCard(board, mutation.hostRef), context).toBeDefined()
              break
            case 'blood':
            case 'lock':
              expect(findCard(board, mutation.ref), context).toBeDefined()
              break
          }
          board = applyMutations(board, [mutation])
        }
      }
    }
  })

  it('keeps branches free of permanent board changes', () => {
    for (const chapter of TUTORIAL_SCRIPT) {
      for (const step of chapter.steps) {
        if (step.advance.type !== 'choice') {
          continue
        }
        for (const option of step.advance.options) {
          const context = `${chapter.id}.${step.id} opt_${option.id}`
          let poolDelta = 0
          for (const branchStep of option.branch ?? []) {
            for (const mutation of branchStep.mutations ?? []) {
              // Only transient pool mutations are allowed in branches so
              // resume (which folds main-line mutations only) stays sound.
              expect(mutation.type, context).toBe('pool')
              if (mutation.type === 'pool') {
                poolDelta += mutation.delta
              }
            }
            // No nested branches.
            expect(branchStep.advance.type, context).not.toBe('choice')
          }
          expect(poolDelta, context).toBe(0)
        }
      }
    }
  })

  it('keeps the player hand at exactly 7 cards after every step', () => {
    for (const chapter of TUTORIAL_SCRIPT) {
      let board = cloneBoard(chapter.initialBoard)
      expect(board.you.hand, `${chapter.id} initial board`).toHaveLength(7)
      for (const step of chapter.steps) {
        board = applyMutations(board, step.mutations)
        expect(board.you.hand, `${chapter.id}.${step.id}`).toHaveLength(7)
      }
    }
  })

  it('interactive steps highlight what the player must use', () => {
    for (const chapter of TUTORIAL_SCRIPT) {
      for (const step of chapter.steps) {
        if (step.advance.type === 'click') {
          expect(
            step.highlight?.length,
            `${chapter.id}.${step.id} should highlight its click target`,
          ).toBeGreaterThan(0)
        }
      }
    }
  })
})
