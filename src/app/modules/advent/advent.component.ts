import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ApiDataService } from '@services'
import { LoginComponent } from '@shared/components/login/login.component'
import { IsLoggedDirective } from '@shared/directives/is-logged.directive'
import { AuthQuery } from '@state/auth/auth.query'
import { distinctUntilChanged, filter, switchMap } from 'rxjs'
import { ADVENT_DATA } from './advent.data'

interface AdventDay {
  dayNumber: number
  isAvailable: boolean
  isCompleted: boolean
  deckId?: string
  data?: { title: string; content: string }
}

@UntilDestroy()
@Component({
  selector: 'app-advent',
  templateUrl: './advent.component.html',
  styleUrls: ['./advent.component.scss'],
  standalone: true,
  imports: [RouterLink, IsLoggedDirective, TranslocoDirective],
})
export class AdventComponent implements OnInit, OnDestroy {
  apiDataService = inject(ApiDataService)
  modalService = inject(NgbModal)
  authQuery = inject(AuthQuery)
  router = inject(Router)

  today = this.authQuery.serverDate()
  currentYear = new Date().getFullYear()
  adventData = this.getAdventData()
  completedDays = new Map<number, string>()

  private countdownInterval?: number
  private serverDateOffset = 0
  countdownTime = signal<{
    hours: number
    minutes: number
    seconds: number
  } | null>(null)

  countdown = computed(() => {
    const time = this.countdownTime()
    if (!time) return null

    return `${time.hours}h ${time.minutes}min ${time.seconds}sec`
  })

  ngOnInit(): void {
    if (this.adventData) {
      this.authQuery
        .selectAuthenticated()
        .pipe(
          untilDestroyed(this),
          distinctUntilChanged(),
          filter((isAuth) => isAuth),
          switchMap(() =>
            this.apiDataService.getDecks(0, 100, {
              type: 'USER',
              tags: 'advent' + this.adventData.year,
            }),
          ),
        )
        .subscribe((response) => {
          // Track completed days based on user's advent decks
          response.decks?.forEach((deck) => {
            if (
              deck.extra?.advent?.year === this.adventData.year &&
              deck.extra?.advent?.day
            ) {
              this.completedDays.set(deck.extra.advent.day, deck.id!)
            }
          })
        })
    }

    // Start countdown interval
    this.updateCountdown()
    this.countdownInterval = window.setInterval(() => {
      this.updateCountdown()
    }, 1000)

    // Calculate server date offset when we get the initial server date
    const initialServerDate = this.today()
    if (initialServerDate) {
      this.serverDateOffset = initialServerDate.getTime() - Date.now()
    }
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval)
    }
  }

  private getAdventData() {
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

  getAvailableDays(): AdventDay[] {
    const days: AdventDay[] = []
    const today = this.today()

    if (!this.adventData || !today) {
      return days
    }

    // Check if we're showing a past year's advent
    const isCurrentYear = this.adventData.year === this.currentYear
    const isAfterEndDate = today > this.adventData.endDate

    for (let dayNumber = 1; dayNumber <= 24; dayNumber++) {
      const dayDate = new Date(this.adventData.startDate)
      dayDate.setDate(dayDate.getDate() + dayNumber - 1)

      // For current year: show based on date
      // For past years: show all days as available
      const isAvailable = isCurrentYear
        ? dayDate <= today && !isAfterEndDate
        : true

      const dayData =
        this.adventData.days[dayNumber as keyof typeof this.adventData.days]

      days.push({
        dayNumber,
        isAvailable,
        isCompleted: this.completedDays.has(dayNumber),
        deckId: this.completedDays.get(dayNumber),
        data: dayData,
      })
    }

    return days
  }

  onPromptLogin(): void {
    this.modalService.open(LoginComponent)
  }

  onOpenInBuilder(year: number, day: number): void {
    this.router.navigateByUrl('/decks/builder', {
      state: { advent: year, day },
    })
  }

  private updateCountdown(): void {
    // Get current server time by adding the offset to local time
    const currentServerTime = new Date(Date.now() + this.serverDateOffset)

    if (!this.adventData || !currentServerTime || this.isAdventFinished) {
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
