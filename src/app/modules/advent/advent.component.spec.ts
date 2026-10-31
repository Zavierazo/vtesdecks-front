import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, provideRouter, Router } from '@angular/router'
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco'
import { NgbModal, NgbModalConfig } from '@ng-bootstrap/ng-bootstrap'
import { ApiDataService } from '@services'
import { AuthQuery } from '@state/auth/auth.query'
import { BehaviorSubject, of } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdventComponent } from './advent.component'
import { ADVENT_2026 } from './advent-2026.data'
import adventEn from '../../../assets/i18n/advent/en.json'
import adventEs from '../../../assets/i18n/advent/es.json'
import adventFr from '../../../assets/i18n/advent/fr.json'
import adventPt from '../../../assets/i18n/advent/pt.json'

const translations = () =>
  TranslocoTestingModule.forRoot({
    langs: {
      en: {},
      es: {},
      fr: {},
      pt: {},
      'advent/en': adventEn,
      'advent/es': adventEs,
      'advent/fr': adventFr,
      'advent/pt': adventPt,
    },
    translocoConfig: {
      availableLangs: ['en', 'es', 'fr', 'pt'],
      defaultLang: 'en',
      reRenderOnLangChange: true,
    },
  })

describe('Advent calendar dates', () => {
  let component: AdventComponent | undefined
  afterEach(() => {
    component?.ngOnDestroy()
    TestBed.resetTestingModule()
    vi.useRealTimers()
  })

  function setup(
    date: string,
    year?: number,
    admin = false,
    authenticated = admin,
  ) {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(date))
    const serverDate = signal(new Date(date))
    const router = { navigateByUrl: vi.fn() }
    const adminState = new BehaviorSubject(admin)
    const authenticatedState = new BehaviorSubject(authenticated)
    const closeModal = vi.fn()
    const getDecks = vi.fn(() => of({ decks: [] }))
    TestBed.configureTestingModule({
      imports: [translations()],
      providers: [
        {
          provide: AuthQuery,
          useValue: {
            serverDate: () => serverDate,
            selectAuthenticated: () => authenticatedState.asObservable(),
            selectAdmin: () => adminState.asObservable(),
          },
        },
        { provide: ApiDataService, useValue: { getDecks } },
        {
          provide: NgbModal,
          useValue: { open: vi.fn(() => ({ close: closeModal })) },
        },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { adventYear: year } } },
        },
      ],
    })
    component = TestBed.runInInjectionContext(() => new AdventComponent())
    component.ngOnInit()
    TestBed.tick()
    return {
      calendar: component,
      router,
      serverDate,
      adminState,
      authenticatedState,
      closeModal,
      getDecks,
    }
  }

  it.each([
    ['2026-11-30T23:59:59Z', 0, false],
    ['2026-12-01T00:00:00Z', 1, false],
    ['2026-12-23T23:59:59Z', 23, false],
    ['2026-12-24T00:00:00Z', 24, false],
    ['2026-12-31T23:59:59.999Z', 24, false],
    ['2027-01-01T00:00:00Z', 24, true],
  ] as const)(
    'shows the correct calendar at %s',
    (date, unlocked, finished) => {
      const { calendar, router } = setup(date)
      expect(calendar.adventData?.year).toBe(2026)
      expect(
        calendar.getAvailableDays().filter((day) => day.isAvailable),
      ).toHaveLength(unlocked)
      expect(calendar.isAdventFinished).toBe(finished)
      calendar.onOpenInBuilder(2026, 24)
      expect(router.navigateByUrl).toHaveBeenCalledTimes(
        unlocked === 24 && !finished ? 1 : 0,
      )
    },
  )

  it('opens the 2025 archive with all challenges readable and submissions closed', () => {
    const { calendar, router } = setup('2026-10-23T12:00:00Z', 2025)
    expect(calendar.adventData?.year).toBe(2025)
    expect(
      calendar.getAvailableDays().filter((day) => day.isAvailable),
    ).toHaveLength(24)
    expect(calendar.isAdventFinished).toBe(true)
    calendar.onOpenInBuilder(2025, 1)
    expect(router.navigateByUrl).not.toHaveBeenCalled()
    expect(calendar.countdown()).toBeNull()
  })

  it('unlocks a new day at UTC midnight without reloading the page', async () => {
    const { calendar } = setup('2026-12-01T23:59:59Z')
    expect(
      calendar.getAvailableDays().filter((day) => day.isAvailable),
    ).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(
      calendar.getAvailableDays().filter((day) => day.isAvailable),
    ).toHaveLength(2)
  })

  it('does not show a misleading daily countdown before the event or after day 24', () => {
    const { calendar } = setup('2026-11-15T12:00:00Z')
    expect(calendar.countdown()).toBeNull()
  })

  it.each([
    ['2026-11-30', 0, false],
    ['2026-12-01', 1, false],
    ['2026-12-12', 12, false],
    ['2026-12-24', 24, false],
    ['2026-12-31', 24, false],
    ['2027-01-01', 24, true],
  ] as const)(
    'lets admins preview %s without changing the edition or shared clock',
    (date, unlocked, finished) => {
      const { calendar, serverDate, getDecks } = setup(
        '2026-10-23T12:00:00Z',
        undefined,
        true,
      )
      calendar.setPreviewDate(date)
      expect(calendar.previewDate()).toBe(date)
      expect(calendar.today().toISOString()).toBe(date + 'T00:00:00.000Z')
      expect(
        calendar.getAvailableDays().filter((day) => day.isAvailable),
      ).toHaveLength(unlocked)
      expect(calendar.isAdventFinished).toBe(finished)
      expect(calendar.adventData?.year).toBe(2026)
      expect(serverDate().toISOString()).toBe('2026-10-23T12:00:00.000Z')
      expect(getDecks).toHaveBeenCalledTimes(1)
    },
  )

  it.each([
    [false, false],
    [false, true],
    [true, false],
  ])(
    'rejects preview without authenticated admin access (%s, %s)',
    (admin, authenticated) => {
      const { calendar } = setup(
        '2026-10-23T12:00:00Z',
        undefined,
        admin,
        authenticated,
      )
      calendar.setPreviewDate('2026-12-24')
      expect(calendar.canPreview()).toBe(false)
      expect(calendar.previewDate()).toBeNull()
      expect(calendar.getAvailableDays().some((day) => day.isAvailable)).toBe(
        false,
      )
    },
  )

  it('keeps the archive read-only even for admins', () => {
    const { calendar, router } = setup('2026-10-23T12:00:00Z', 2025, true)
    calendar.setPreviewDate('2025-12-01')
    expect(calendar.canPreview()).toBe(false)
    expect(calendar.previewDate()).toBeNull()
    expect(calendar.isAdventFinished).toBe(true)
    calendar.onOpenInBuilder(2025, 1)
    expect(router.navigateByUrl).not.toHaveBeenCalled()
  })

  it('updates the preview countdown and returns to the latest server date', async () => {
    const { calendar, serverDate } = setup(
      '2026-10-23T12:00:00Z',
      undefined,
      true,
    )
    calendar.setPreviewDate('2026-12-12')
    await vi.advanceTimersByTimeAsync(2000)
    expect(calendar.countdown()).toBe('23h 59min 58sec')
    serverDate.set(new Date('2026-10-24T14:00:00Z'))
    TestBed.tick()
    expect(calendar.today().toISOString()).toBe('2026-12-12T00:00:02.000Z')
    calendar.resetPreview()
    expect(calendar.previewDate()).toBeNull()
    expect(calendar.today().toISOString()).toBe('2026-10-24T14:00:00.000Z')
    expect(calendar.countdown()).toBeNull()
    expect(calendar.getAvailableDays().some((day) => day.isAvailable)).toBe(
      false,
    )
  })

  it.each(['admin', 'authenticated'])(
    'clears the preview when %s access is lost and does not restore it on login',
    (access) => {
      const { calendar, adminState, authenticatedState, closeModal } = setup(
        '2026-10-23T12:00:00Z',
        undefined,
        true,
      )
      calendar.setPreviewDate('2026-12-12')
      calendar.openChallenge(calendar.getAvailableDays()[11], {} as never)
      const state = access === 'admin' ? adminState : authenticatedState
      state.next(false)
      TestBed.tick()
      expect(calendar.canPreview()).toBe(false)
      expect(calendar.previewDate()).toBeNull()
      expect(calendar.selectedDay()).toBeNull()
      expect(closeModal).toHaveBeenCalled()
      expect(calendar.getAvailableDays().some((day) => day.isAvailable)).toBe(
        false,
      )
      state.next(true)
      TestBed.tick()
      expect(calendar.previewDate()).toBeNull()
    },
  )

  it('opens only unlocked preview days in the builder, with no simulated date in navigation state', () => {
    const { calendar, router } = setup('2026-10-23T12:00:00Z', undefined, true)
    calendar.setPreviewDate('2026-12-12')
    calendar.onOpenInBuilder(2026, 13)
    expect(router.navigateByUrl).not.toHaveBeenCalled()
    calendar.onOpenInBuilder(2026, 12)
    expect(router.navigateByUrl).toHaveBeenCalledWith('/decks/builder', {
      state: { advent: 2026, day: 12 },
    })
    calendar.setPreviewDate('2027-01-01')
    calendar.onOpenInBuilder(2026, 12)
    expect(router.navigateByUrl).toHaveBeenCalledTimes(1)
  })

  it('ignores invalid or out-of-edition preview dates and supports the real date option', () => {
    const { calendar } = setup('2026-10-23T12:00:00Z', undefined, true)
    calendar.setPreviewDate('2026-12-12')
    for (const date of [
      'invalid',
      '2026-12-32',
      '2026-02-30',
      '2025-12-01',
      '2027-01-02',
    ]) {
      calendar.setPreviewDate(date)
      expect(calendar.previewDate()).toBe('2026-12-12')
    }
    calendar.setPreviewDate('')
    expect(calendar.previewDate()).toBeNull()
  })
})

describe('Advent admin preview controls', () => {
  afterEach(() => TestBed.resetTestingModule())

  it.each([false, true])(
    'renders preview controls only for an admin (%s)',
    async (admin) => {
      const adminState = new BehaviorSubject(admin)
      TestBed.configureTestingModule({
        imports: [translations()],
        providers: [
          provideRouter([]),
          {
            provide: AuthQuery,
            useValue: {
              serverDate: () => signal(new Date('2026-10-23T12:00:00Z')),
              selectAuthenticated: () => of(true),
              selectAdmin: () => adminState.asObservable(),
            },
          },
          {
            provide: ApiDataService,
            useValue: { getDecks: () => of({ decks: [] }) },
          },
        ],
      })
      const fixture = TestBed.createComponent(AdventComponent)
      await fixture.whenStable()
      const element: HTMLElement = fixture.nativeElement
      const select = element.querySelector<HTMLSelectElement>(
        '#advent-preview-date',
      )
      expect(Boolean(select)).toBe(admin)
      if (select) {
        select.value = '2026-12-12'
        select.dispatchEvent(new Event('change'))
        await fixture.whenStable()
        expect(element.querySelectorAll('.day-button')).toHaveLength(12)
        expect(element.querySelector('.preview-status')?.textContent).toContain(
          '2026-12-12',
        )
        adminState.next(false)
        await fixture.whenStable()
        expect(element.querySelector('.advent-preview')).toBeNull()
        expect(element.querySelectorAll('.day-button')).toHaveLength(0)
      }
    },
  )
})

describe('Advent translations', () => {
  afterEach(() => TestBed.resetTestingModule())

  async function setup(year?: number, date = '2026-12-24T12:00:00Z') {
    const serverDate = signal(new Date(date))
    TestBed.configureTestingModule({
      imports: [translations()],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { adventYear: year } } },
        },
        {
          provide: AuthQuery,
          useValue: {
            serverDate: () => serverDate,
            selectAuthenticated: () => of(false),
            selectAdmin: () => of(false),
          },
        },
        {
          provide: ApiDataService,
          useValue: { getDecks: () => of({ decks: [] }) },
        },
      ],
    })
    TestBed.inject(NgbModalConfig).animation = false
    const fixture = TestBed.createComponent(AdventComponent)
    await fixture.whenStable()
    return { fixture, transloco: TestBed.inject(TranslocoService), serverDate }
  }

  it('uses only the shared cover for future days and reveals each image when its day opens', async () => {
    const { fixture, serverDate } = await setup(
      undefined,
      '2026-11-30T12:00:00Z',
    )
    const element: HTMLElement = fixture.nativeElement
    const images = () =>
      [...element.querySelectorAll<HTMLImageElement>('.calendar-grid img')].map(
        (image) => image.getAttribute('src'),
      )
    expect(images()).toEqual(Array(24).fill(ADVENT_2026.lockedImage))
    expect(element.querySelector('.day-button')).toBeNull()

    for (const opened of [1, 2]) {
      serverDate.set(new Date(`2026-12-0${opened}T00:00:00Z`))
      await fixture.whenStable()
      expect(images()).toEqual([
        ...Array.from(
          { length: opened },
          (_, index) => ADVENT_2026.days[index + 1].image,
        ),
        ...Array(24 - opened).fill(ADVENT_2026.lockedImage),
      ])
      expect(element.querySelectorAll('.day-button')).toHaveLength(opened)
    }
    fixture.destroy()
  })

  it('updates the calendar and an open challenge in every language, retaining its inline reference', async () => {
    const { fixture, transloco } = await setup()
    const element: HTMLElement = fixture.nativeElement
    element.querySelectorAll<HTMLButtonElement>('.day-button')[2].click()
    await fixture.whenStable()
    for (const [language, locale] of Object.entries({
      es: adventEs,
      fr: adventFr,
      pt: adventPt,
      en: adventEn,
    })) {
      transloco.setActiveLang(language)
      await fixture.whenStable()
      expect(element.querySelector('h1')?.textContent).toContain(
        locale.title.replace('{{year}}', '2026'),
      )
      expect(
        document.querySelector('#advent-challenge-title')?.textContent,
      ).toContain(locale.editions['2026'].days['3'].title)
      expect(
        document.querySelector('#advent-challenge-description')?.textContent,
      ).toContain(locale.editions['2026'].days['3'].content)
      expect(
        document
          .querySelector('.challenge-content .challenge-reference')
          ?.getAttribute('href'),
      ).toBe('/metagame/1')
      expect(
        document.querySelector('.challenge-view')?.getAttribute('lang'),
      ).toBe(language)
    }
    fixture.destroy()
  })

  it('translates the archive without exposing submission controls', async () => {
    const { fixture, transloco } = await setup(2025)
    transloco.setActiveLang('es')
    await fixture.whenStable()
    const element: HTMLElement = fixture.nativeElement
    const days = element.querySelectorAll<HTMLButtonElement>('.day-button')
    expect(days).toHaveLength(24)
    expect(days[23].textContent).toContain(
      adventEs.editions['2025'].days['24'].title,
    )
    days[23].click()
    await fixture.whenStable()
    expect(document.querySelector('.challenge-ended')?.textContent).toContain(
      adventEs.submissions_closed.replace('{{year}}', '2025'),
    )
    expect(document.querySelector('.challenge-actions .btn-primary')).toBeNull()
    fixture.destroy()
  })
})
