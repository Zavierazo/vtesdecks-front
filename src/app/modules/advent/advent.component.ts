import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ChangeDetectionStrategy,
  effect,
  TemplateRef,
  untracked,
} from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { NgbModal, type NgbModalRef } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import { LoginComponent } from '@shared/components/login/login.component'
import { IsLoggedDirective } from '@shared/directives/is-logged.directive'
import { AuthQuery } from '@state/auth/auth.query'
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs'
import { ADVENT_DATA, type AdventDayData } from './advent.data'

interface AdventDay {
  dayNumber: number
  isAvailable: boolean
  isCompleted: boolean
  deckId?: string
  data?: AdventDayData
}

@UntilDestroy()
@Component({
  selector: 'app-advent',
  templateUrl: './advent.component.html',
  styleUrls: ['./advent.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IsLoggedDirective],
})
export class AdventComponent implements OnInit, OnDestroy {
  apiDataService = inject(ApiDataService)
  modalService = inject(NgbModal)
  authQuery = inject(AuthQuery)
  router = inject(Router)
  private readonly route = inject(ActivatedRoute)
  readonly canPreview = toSignal(
    combineLatest([
      this.authQuery.selectAuthenticated(),
      this.authQuery.selectAdmin(),
    ]).pipe(
      map(
        ([authenticated, admin]) =>
          authenticated && admin && !this.route.snapshot.data['adventYear'],
      ),
    ),
    { initialValue: false },
  )
  readonly previewDays = Array.from({ length: 31 }, (_, index) => ({
    day: index + 1,
    date: `12-${String(index + 1).padStart(2, '0')}`,
  }))
  private readonly previewClock = signal<{
    date: string
    startedAt: number
  } | null>(null)
  readonly previewDate = computed(() =>
    this.canPreview() ? (this.previewClock()?.date ?? null) : null,
  )
  private challengeModal?: NgbModalRef
  readonly selectedDay = signal<AdventDay | null>(null)
  readonly progressUnavailable = signal(false)

  private readonly clock = signal(Date.now())
  private readonly serverDateOffset = signal(0)
  private readonly realToday = computed(
    () => new Date(this.clock() + this.serverDateOffset()),
  )
  today = computed(() => {
    const preview = this.canPreview() ? this.previewClock() : null
    return preview
      ? new Date(
          Date.parse(preview.date + 'T00:00:00Z') +
            this.clock() -
            preview.startedAt,
        )
      : this.realToday()
  })
  get currentYear() {
    return this.realToday().getUTCFullYear()
  }
  get adventData() {
    return this.getAdventData()
  }
  completedDays = signal(new Map<number, string>())

  private countdownInterval?: number
  countdownTime = signal<{
    hours: number
    minutes: number
    seconds: number
  } | null>(null)

  countdown = computed(() => {
    const time = this.countdownTime()
    if (!time) {
      return null
    }

    return `${time.hours}h ${time.minutes}min ${time.seconds}sec`
  })

  constructor() {
    effect(() => {
      if (!this.canPreview()) {
        untracked(() => this.resetPreview())
      }
    })
    const serverDate = this.authQuery.serverDate()
    effect(() => {
      const date = serverDate()
      if (date) {
        this.serverDateOffset.set(date.getTime() - Date.now())
        this.clock.set(Date.now())
      }
    })
  }

  ngOnInit(): void {
    const edition = this.adventData
    if (edition) {
      this.authQuery
        .selectAuthenticated()
        .pipe(
          untilDestroyed(this),
          distinctUntilChanged(),
          tap(() => {
            this.completedDays.set(new Map())
            this.progressUnavailable.set(false)
          }),
          switchMap((isAuth) =>
            isAuth
              ? this.apiDataService
                  .getDecks(0, 100, {
                    type: 'USER',
                    tags: 'advent' + edition.year,
                  })
                  .pipe(
                    catchError(() => {
                      this.progressUnavailable.set(true)
                      return of({ decks: [] })
                    }),
                  )
              : of({ decks: [] }),
          ),
        )
        .subscribe((response) => {
          const completed = new Map<number, string>()
          // Track completed days based on user's advent decks
          response.decks?.forEach((deck) => {
            if (
              deck.extra?.advent?.year === edition.year &&
              deck.extra?.advent?.day
            ) {
              completed.set(deck.extra.advent.day, deck.id!)
            }
          })
          this.completedDays.set(completed)
        })
    }

    // Start countdown interval
    this.updateCountdown()
    this.countdownInterval = window.setInterval(() => {
      this.clock.set(Date.now())
      this.updateCountdown()
    }, 1000)
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval)
    }
    this.challengeModal?.close()
  }

  setPreviewDate(value: string): void {
    if (!this.canPreview()) {
      return
    }
    if (!value) {
      this.resetPreview()
      return
    }
    const edition = this.adventData
    const date = new Date(value + 'T00:00:00Z')
    if (
      !edition ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value ||
      date.getTime() < edition.startDate.getTime() - 86400000 ||
      date.getTime() > edition.endDate.getTime() + 1
    ) {
      return
    }
    this.challengeModal?.close()
    this.selectedDay.set(null)
    const now = Date.now()
    this.clock.set(now)
    this.previewClock.set({ date: value, startedAt: now })
    this.updateCountdown()
  }

  resetPreview(): void {
    if (!this.previewClock()) {
      return
    }
    this.challengeModal?.close()
    this.selectedDay.set(null)
    this.previewClock.set(null)
    this.clock.set(Date.now())
    this.updateCountdown()
  }

  private getAdventData() {
    const archiveYear = this.route.snapshot.data['adventYear']
    if (archiveYear) {
      return ADVENT_DATA.find((item) => item.year === archiveYear) ?? null
    }
    // First try current year
    const currentYearData = ADVENT_DATA.find(
      (item) => item.year === this.currentYear,
    )

    if (currentYearData) {
      return currentYearData
    }

    // If no current year data, find the most recent past year
    const pastYearData = ADVENT_DATA.filter(
      (item) => item.year < this.currentYear,
    ).sort((a, b) => b.year - a.year)[0] // Sort by year descending and get the most recent

    return pastYearData || null
  }

  get isAdventFinished(): boolean {
    const today = this.today()
    if (!this.adventData || !today) {
      return false
    }
    return today > this.adventData.endDate
  }

  get hasStarted(): boolean {
    return !!this.adventData && this.today() >= this.adventData.startDate
  }

  openChallenge(day: AdventDay, template: TemplateRef<unknown>): void {
    if (!day.isAvailable || !day.data) {
      return
    }
    this.selectedDay.set(day)
    this.challengeModal = this.modalService.open(template, {
      centered: true,
      scrollable: true,
      size: 'lg',
      ariaLabelledBy: 'advent-challenge-title',
      ariaDescribedBy: 'advent-challenge-description',
    })
  }

  getAvailableDays(): AdventDay[] {
    const days: AdventDay[] = []
    const today = this.today()

    if (!this.adventData || !today) {
      return days
    }

    // Check if we're showing a past year's advent

    for (let dayNumber = 1; dayNumber <= 24; dayNumber++) {
      const dayDate = new Date(this.adventData.startDate)
      dayDate.setUTCDate(dayDate.getUTCDate() + dayNumber - 1)

      // For current year: show based on date
      // For past years: show all days as available
      const isAvailable = dayDate <= today

      const dayData =
        this.adventData.days[dayNumber as keyof typeof this.adventData.days]

      days.push({
        dayNumber,
        isAvailable,
        isCompleted: this.completedDays().has(dayNumber),
        deckId: this.completedDays().get(dayNumber),
        data: dayData,
      })
    }

    return days
  }

  onPromptLogin(): void {
    this.modalService.open(LoginComponent)
  }

  onOpenInBuilder(year: number, day: number): void {
    if (
      year !== this.adventData?.year ||
      this.isAdventFinished ||
      !this.getAvailableDays().some(
        (item) => item.dayNumber === day && item.isAvailable,
      )
    ) {
      return
    }
    this.router.navigateByUrl('/decks/builder', {
      state: { advent: year, day },
    })
  }

  private updateCountdown(): void {
    // Get current server time by adding the offset to local time
    const currentServerTime = this.today()

    if (
      !this.adventData ||
      currentServerTime < this.adventData.startDate ||
      this.isAdventFinished
    ) {
      this.countdownTime.set(null)
      return
    }

    // Calculate current day number in UTC and check if next day has a challenge
    const currentDay = currentServerTime.getUTCDate()
    const nextDayNumber = currentDay + 1

    if (
      nextDayNumber > 24 ||
      !this.adventData.days[nextDayNumber as keyof typeof this.adventData.days]
    ) {
      this.countdownTime.set(null)
      return
    }

    // Calculate time until next midnight in UTC
    const nextMidnight = new Date(
      Date.UTC(
        currentServerTime.getUTCFullYear(),
        currentServerTime.getUTCMonth(),
        currentServerTime.getUTCDate() + 1,
        0,
        0,
        0,
        0,
      ),
    )
    const diff = nextMidnight.getTime() - currentServerTime.getTime()

    if (diff <= 0) {
      this.countdownTime.set(null)
      return
    }

    this.countdownTime.set({
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    })
  }
}
