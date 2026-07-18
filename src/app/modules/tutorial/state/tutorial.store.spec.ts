import { TestBed } from '@angular/core/testing'
import { NgcCookieConsentService } from 'ngx-cookieconsent'
import { GoogleAnalyticsService } from 'ngx-google-analytics'
import { LocalStorageService, SessionStorageService } from '@services'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TutorialStore, TutorialProgress } from './tutorial.store'

describe('TutorialStore', () => {
  let localValues: Record<string, unknown>
  let sessionValues: Record<string, unknown>
  let hasConsented: boolean
  let gaEvent: ReturnType<typeof vi.fn>

  function storageMock(values: Record<string, unknown>) {
    return {
      getValue: (key: string) => values[key],
      setValue: (key: string, value: unknown) => {
        values[key] = value
      },
      clearValue: (key: string) => {
        delete values[key]
      },
    }
  }

  function setup(): TutorialStore {
    TestBed.configureTestingModule({
      providers: [
        TutorialStore,
        { provide: LocalStorageService, useValue: storageMock(localValues) },
        {
          provide: SessionStorageService,
          useValue: storageMock(sessionValues),
        },
        {
          provide: NgcCookieConsentService,
          useValue: { hasConsented: () => hasConsented },
        },
        { provide: GoogleAnalyticsService, useValue: { event: gaEvent } },
      ],
    })
    return TestBed.inject(TutorialStore)
  }

  beforeEach(() => {
    localValues = {}
    sessionValues = {}
    hasConsented = false
    gaEvent = vi.fn()
  })

  it('starts at chapter 1 step 1 with the initial board', () => {
    const store = setup()
    expect(store.progress$()).toEqual({
      chapterIndex: 0,
      stepIndex: 0,
      completedChapters: [],
      finished: false,
    })
    expect(store.board$().you.pool).toBe(30)
    expect(store.board$().you.hand).toHaveLength(7)
  })

  it('next() advances only next-steps', () => {
    const store = setup()
    store.next()
    expect(store.progress$().stepIndex).toBe(1)
    // ch1 s2 is also a next step; clickTarget should not advance it
    store.clickTarget('pool:you')
    expect(store.progress$().stepIndex).toBe(1)
  })

  it('click steps ignore wrong targets and advance on the right one', () => {
    const store = setup()
    store.goToChapter(2) // ch3 zone tour
    store.next() // s2: click your crypt
    const before = store.progress$().stepIndex
    store.clickTarget('zone:you:library')
    expect(store.progress$().stepIndex).toBe(before)
    store.clickTarget('zone:you:crypt')
    expect(store.progress$().stepIndex).toBe(before + 1)
  })

  it('drag steps support the tap-tap fallback', () => {
    const store = setup()
    store.goToChapter(4) // ch5
    store.next() // -> s2 drag blood doll onto Aline
    expect(store.currentStep$().id).toBe('s2')
    store.clickTarget('card:you.bloodDoll')
    expect(store.pendingDragRef$()).toBe('you.bloodDoll')
    store.clickTarget('card:you.aline')
    expect(store.currentStep$().id).toBe('s3')
    // Blood Doll is now attached to Aline
    expect(store.board$().you.ready[0].attachments).toHaveLength(1)
  })

  it('choices run their branch and converge to the next main step', () => {
    const store = setup()
    store.goToChapter(4) // ch5
    store.next() // s2 (drag)
    store.dropCard('you.bloodDoll', 'card:you.aline') // -> s3
    store.next() // -> s4 (click aline)
    store.clickTarget('card:you.aline') // -> s5 choice
    expect(store.currentStep$().id).toBe('s5')
    store.choose('hunt')
    expect(store.currentStep$().id).toBe('s5_hunt')
    store.next()
    expect(store.currentStep$().id).toBe('s6')
    expect(store.progress$().stepIndex).toBe(5)
  })

  it('branch pool mutations net to zero across the detour', () => {
    const store = setup()
    store.goToChapter(5) // ch6
    const poolBefore = store.board$().you.pool
    store.next() // s1 -> s2 choice
    store.choose('take')
    expect(store.board$().you.pool).toBe(poolBefore - 1)
    store.next() // rewind step restores the pool
    store.next() // converge to s3
    expect(store.board$().you.pool).toBe(poolBefore)
    expect(store.currentStep$().id).toBe('s3')
  })

  it('persists progress and resumes with a rebuilt board', () => {
    const store = setup()
    store.next()
    store.next()
    expect(sessionValues[TutorialStore.progressStoreName]).toMatchObject({
      chapterIndex: 0,
      stepIndex: 2,
    })

    // A fresh store (new page load) resumes from storage
    TestBed.resetTestingModule()
    const resumed = setup()
    expect(resumed.progress$().stepIndex).toBe(2)
    expect(resumed.board$().you.pool).toBe(30)
  })

  it('uses localStorage when the user consented', () => {
    hasConsented = true
    const store = setup()
    store.next()
    expect(localValues[TutorialStore.progressStoreName]).toBeDefined()
    expect(sessionValues[TutorialStore.progressStoreName]).toBeUndefined()
  })

  it('rehydrates corrupt progress safely', () => {
    sessionValues[TutorialStore.progressStoreName] = {
      chapterIndex: 99,
      stepIndex: 99,
      completedChapters: 'oops',
      finished: 'yes',
    } as unknown as TutorialProgress
    const store = setup()
    const progress = store.progress$()
    expect(progress.chapterIndex).toBe(store.script.length - 1)
    expect(progress.completedChapters).toEqual([])
    expect(progress.finished).toBe(false)
    expect(store.currentStep$()).toBeDefined()
  })

  it('completing the last step of a chapter moves to the next chapter', () => {
    const store = setup()
    for (let i = 0; i < 6; i++) {
      store.next() // ch1 has 6 next-steps
    }
    expect(store.progress$().chapterIndex).toBe(1)
    expect(store.progress$().stepIndex).toBe(0)
    expect(store.progress$().completedChapters).toEqual(['ch1'])
    expect(gaEvent).toHaveBeenCalledWith(
      'tutorial_chapter_complete',
      'tutorial',
      'ch1',
    )
  })

  it('goToChapter resets the board to the chapter initial state', () => {
    const store = setup()
    store.goToChapter(4)
    store.next()
    store.dropCard('you.bloodDoll', 'card:you.aline')
    expect(store.board$().you.ready[0].attachments).toHaveLength(1)
    store.goToChapter(4)
    expect(store.board$().you.ready[0].attachments).toBeUndefined()
    expect(store.progress$().stepIndex).toBe(0)
  })

  it('resetAll clears progress and storage', () => {
    const store = setup()
    store.next()
    store.resetAll()
    expect(store.progress$().stepIndex).toBe(0)
    expect(sessionValues[TutorialStore.progressStoreName]).toBeUndefined()
    expect(gaEvent).toHaveBeenCalledWith('tutorial_reset', 'tutorial')
  })

  it('walks the ch9 referendum with the Edge', () => {
    const store = setup()
    store.goToChapter(8)
    const walk: (() => void)[] = [
      () => store.next(), // s1 -> s2
      () => store.clickTarget('card:you.aline'), // -> s3 (Blood Doll)
      () => store.next(), // -> s4
      () => store.clickTarget('card:you.aline'), // Aline bleeds -> s5
      () => store.next(), // -> s6 (you seize the Edge)
      () => store.clickTarget('card:you.eatTheRich'), // -> s7 (announce)
      () => store.next(), // -> s8 (block chance, +1 stealth)
      () => store.next(), // -> s9 (terms: choose target)
      () => store.choose('rival'), // -> s10 (card vote 1-0)
      () => store.next(), // -> s11 (Nash votes 1-1)
      () => store.next(), // -> s12 (rival discards 1-2)
      () => store.next(), // -> s13
      () => store.clickTarget('card:you.aline'), // your titles vote -> s14
      () => store.next(), // -> s15 (burn the Edge prompt)
      () => store.clickTarget('edge:you'), // -> s16 (5-2)
      () => store.next(), // -> s17 (effect)
      () => store.next(), // -> s18
      () => store.clickTarget('card:you.voterCap'), // -> s19 (+2 pool)
      () => store.next(), // -> s20
      () => store.clickTarget('card:you.aline'), // Aline unlock ability -> s21
      () => store.next(), // -> s22 (wrap)
    ]
    walk.forEach((action) => action())
    expect(store.board$().rival.pool).toBe(17)
    expect(store.board$().you.pool).toBe(18)
    expect(store.board$().you.hand).toHaveLength(7)
    // The Edge was burned during the referendum
    expect(store.board$().you.hasEdge).toBe(false)
    // The rival's discarded political card sits in his ash heap
    expect(
      store.board$().rival.ashHeap.some(
        (c) => c.cardKey === 'anarchistUprising',
      ),
    ).toBe(true)
  })

  it('finishing the last chapter sets finished and fires analytics', () => {
    const store = setup()
    store.goToChapter(store.script.length - 1) // ch13: the oust
    const walk: (() => void)[] = [
      () => store.next(), // s1 -> s2
      () => store.next(), // -> s3
      () => store.clickTarget('card:you.troublemaker'), // -> s4
      () => store.next(), // -> s5
      () => store.next(), // -> s6
      () => store.clickTarget('card:you.legal1'), // -> s7
      () => store.next(), // -> s8 (oust)
      () => store.next(), // -> s9
      () => store.next(), // finish
    ]
    walk.forEach((action) => action())
    expect(store.progress$().finished).toBe(true)
    expect(store.board$().rival.pool).toBe(0)
    expect(store.board$().you.hand).toHaveLength(7)
    // The Troublemaker changed control to the rival
    expect(
      store.board$().rival.masters.some(
        (c) => c.cardKey === 'anarchTroublemaker',
      ),
    ).toBe(true)
    expect(gaEvent).toHaveBeenCalledWith('tutorial_complete', 'tutorial')
  })
})
