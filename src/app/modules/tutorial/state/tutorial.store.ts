import { computed, inject, Injectable, signal } from '@angular/core'
import { GoogleAnalyticsService } from 'ngx-google-analytics'
import { NgcCookieConsentService } from 'ngx-cookieconsent'
import { LocalStorageService, SessionStorageService } from '@services'
import {
  applyMutations,
  boardAtStep,
  cloneBoard,
} from './tutorial-board.reducer'
import { TUTORIAL_SCRIPT } from './tutorial-script.data'
import {
  TutorialBoardState,
  TutorialChapter,
  TutorialStep,
  TutorialTargetId,
} from './tutorial-script.model'

export interface TutorialProgress {
  chapterIndex: number
  stepIndex: number
  completedChapters: string[]
  finished: boolean
}

const DEFAULT_PROGRESS: TutorialProgress = {
  chapterIndex: 0,
  stepIndex: 0,
  completedChapters: [],
  finished: false,
}

@Injectable()
export class TutorialStore {
  private readonly localStorage = inject(LocalStorageService)
  private readonly sessionStorage = inject(SessionStorageService)
  private readonly cookieConsentService = inject(NgcCookieConsentService)
  private readonly googleAnalyticsService = inject(GoogleAnalyticsService)

  static readonly progressStoreName = 'tutorial_v1_progress'

  readonly script: TutorialChapter[] = TUTORIAL_SCRIPT

  private readonly progress = signal<TutorialProgress>(DEFAULT_PROGRESS)
  readonly progress$ = this.progress.asReadonly()

  private readonly board = signal<TutorialBoardState>(
    cloneBoard(this.script[0].initialBoard),
  )
  readonly board$ = this.board.asReadonly()

  /** Pending detour steps from a choice; head is the current step while non-empty. */
  private readonly branchQueue = signal<TutorialStep[]>([])

  /** Card selected as a tap-tap fallback for drag steps. */
  private readonly pendingDragRef = signal<string | undefined>(undefined)
  readonly pendingDragRef$ = this.pendingDragRef.asReadonly()

  /** Shown as an interstitial when a new chapter begins. */
  private readonly chapterIntro = signal(false)
  readonly chapterIntro$ = this.chapterIntro.asReadonly()

  readonly currentChapter$ = computed(
    () => this.script[this.progress().chapterIndex],
  )

  readonly currentStep$ = computed<TutorialStep>(() => {
    const branch = this.branchQueue()
    if (branch.length > 0) {
      return branch[0]
    }
    const { chapterIndex, stepIndex } = this.progress()
    return this.script[chapterIndex].steps[stepIndex]
  })

  readonly highlight$ = computed<Set<TutorialTargetId>>(
    () => new Set(this.currentStep$().highlight ?? []),
  )

  readonly hasSavedProgress$ = computed(() => {
    const { chapterIndex, stepIndex, finished } = this.progress()
    return finished || chapterIndex > 0 || stepIndex > 0
  })

  constructor() {
    const previous =
      this.localStorage.getValue<TutorialProgress>(
        TutorialStore.progressStoreName,
      ) ??
      this.sessionStorage.getValue<TutorialProgress>(
        TutorialStore.progressStoreName,
      )
    if (previous) {
      this.progress.set(this.rehydrate(previous))
    }
    this.rebuildBoard()
  }

  startOrResume(): void {
    if (!this.hasSavedProgress$()) {
      this.googleAnalyticsService.event('tutorial_start', 'tutorial')
    }
    if (this.progress().finished) {
      this.goToChapter(0)
    }
  }

  goToChapter(index: number): void {
    if (index < 0 || index >= this.script.length) {
      return
    }
    this.progress.update((progress) => ({
      ...progress,
      chapterIndex: index,
      stepIndex: 0,
      finished: false,
    }))
    this.branchQueue.set([])
    this.pendingDragRef.set(undefined)
    this.chapterIntro.set(false)
    this.rebuildBoard()
    this.updateStorage()
  }

  next(): void {
    if (this.currentStep$().advance.type !== 'next') {
      return
    }
    this.advance()
  }

  clickTarget(target: TutorialTargetId): void {
    const advance = this.currentStep$().advance
    if (advance.type === 'click' && advance.target === target) {
      this.advance()
      return
    }
    if (advance.type === 'drag') {
      // Tap-tap fallback: tap the card, then tap the destination.
      if (target === `card:${advance.ref}`) {
        this.pendingDragRef.set(advance.ref)
      } else if (this.pendingDragRef() === advance.ref && target === advance.to) {
        this.dropCard(advance.ref, advance.to)
      }
    }
  }

  dropCard(ref: string, to: TutorialTargetId): void {
    const advance = this.currentStep$().advance
    if (advance.type === 'drag' && advance.ref === ref && advance.to === to) {
      this.advance()
    }
  }

  choose(optionId: string): void {
    const advance = this.currentStep$().advance
    if (advance.type !== 'choice') {
      return
    }
    const option = advance.options.find((candidate) => candidate.id === optionId)
    if (!option) {
      return
    }
    if (option.branch && option.branch.length > 0) {
      this.branchQueue.set(option.branch)
      this.board.update((board) =>
        applyMutations(board, option.branch![0].mutations),
      )
    } else {
      this.advance()
    }
  }

  dismissChapterIntro(): void {
    this.chapterIntro.set(false)
  }

  resetAll(): void {
    this.googleAnalyticsService.event('tutorial_reset', 'tutorial')
    this.progress.set(DEFAULT_PROGRESS)
    this.branchQueue.set([])
    this.pendingDragRef.set(undefined)
    this.rebuildBoard()
    this.localStorage.clearValue(TutorialStore.progressStoreName)
    this.sessionStorage.clearValue(TutorialStore.progressStoreName)
  }

  /** Whether the given target advances (or partially advances) the current step. */
  canInteract(target: TutorialTargetId): boolean {
    const advance = this.currentStep$().advance
    switch (advance.type) {
      case 'click':
        return advance.target === target
      case 'drag':
        return target === `card:${advance.ref}` || target === advance.to
      default:
        return false
    }
  }

  private advance(): void {
    this.pendingDragRef.set(undefined)
    const branch = this.branchQueue()
    if (branch.length > 1) {
      const [, ...rest] = branch
      this.branchQueue.set([...rest])
      this.board.update((board) => applyMutations(board, rest[0].mutations))
      return
    }
    if (branch.length === 1) {
      this.branchQueue.set([])
    }
    const { chapterIndex, stepIndex } = this.progress()
    const chapter = this.script[chapterIndex]
    if (stepIndex + 1 < chapter.steps.length) {
      const nextStep = chapter.steps[stepIndex + 1]
      this.board.update((board) => applyMutations(board, nextStep.mutations))
      this.progress.update((progress) => ({
        ...progress,
        stepIndex: stepIndex + 1,
      }))
    } else {
      this.completeChapter(chapter, chapterIndex)
    }
    this.updateStorage()
  }

  private completeChapter(chapter: TutorialChapter, chapterIndex: number): void {
    this.googleAnalyticsService.event(
      'tutorial_chapter_complete',
      'tutorial',
      chapter.id,
    )
    const completedChapters = this.progress().completedChapters.includes(
      chapter.id,
    )
      ? this.progress().completedChapters
      : [...this.progress().completedChapters, chapter.id]
    if (chapterIndex + 1 < this.script.length) {
      this.progress.update((progress) => ({
        ...progress,
        chapterIndex: chapterIndex + 1,
        stepIndex: 0,
        completedChapters,
      }))
      this.rebuildBoard()
      this.chapterIntro.set(true)
    } else {
      this.googleAnalyticsService.event('tutorial_complete', 'tutorial')
      this.progress.update((progress) => ({
        ...progress,
        completedChapters,
        finished: true,
      }))
    }
  }

  private rebuildBoard(): void {
    const { chapterIndex, stepIndex } = this.progress()
    this.board.set(boardAtStep(this.script[chapterIndex], stepIndex))
  }

  private rehydrate(progress: TutorialProgress): TutorialProgress {
    const chapterIndex = Math.min(
      Math.max(0, progress.chapterIndex ?? 0),
      this.script.length - 1,
    )
    const stepIndex = Math.min(
      Math.max(0, progress.stepIndex ?? 0),
      this.script[chapterIndex].steps.length - 1,
    )
    return {
      chapterIndex,
      stepIndex,
      completedChapters: Array.isArray(progress.completedChapters)
        ? progress.completedChapters
        : [],
      finished: progress.finished === true,
    }
  }

  private updateStorage(): void {
    const progress = this.progress()
    if (this.cookieConsentService.hasConsented()) {
      this.localStorage.setValue(TutorialStore.progressStoreName, progress)
    } else {
      this.localStorage.clearValue(TutorialStore.progressStoreName)
      this.sessionStorage.setValue(TutorialStore.progressStoreName, progress)
    }
  }
}
