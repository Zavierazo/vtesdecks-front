import { Component, inject, OnInit } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { ApiDataService } from '@services'
import { LoginComponent } from '@shared/components/login/login.component'
import { IsLoggedDirective } from '@shared/directives/is-logged.directive'
import { AuthQuery } from '@state/auth/auth.query'
import { isChristmas } from '@utils'
import { ADVENT_DATA } from './advent.data'

interface AdventDay {
  dayNumber: number
  isAvailable: boolean
  isCompleted: boolean
  deckId?: string
  data?: { title: string; content: string }
}

@Component({
  selector: 'app-advent',
  templateUrl: './advent.component.html',
  styleUrls: ['./advent.component.scss'],
  standalone: true,
  imports: [RouterLink, IsLoggedDirective],
})
export class AdventComponent implements OnInit {
  apiDataService = inject(ApiDataService)
  modalService = inject(NgbModal)
  authQuery = inject(AuthQuery)
  router = inject(Router)

  today = new Date()
  currentYear = this.today.getFullYear()
  adventData = this.getAdventData()
  completedDays = new Map<number, string>()

  ngOnInit(): void {
    if (this.adventData) {
      // Add christmas effect if isn't christmas time
      if (!isChristmas()) {
        const node = document.createElement('script')
        node.src = 'https://app.embed.im/snow.js'
        node.defer = true
        document.getElementsByTagName('head')[0].appendChild(node)
      }
      this.apiDataService
        .getDecks(0, 100, {
          type: 'USER',
          tags: 'advent' + this.adventData.year,
        })
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
    if (!this.adventData) {
      return false
    }
    return this.today > this.adventData.endDate
  }

  get isShowingPastYear(): boolean {
    return this.adventData ? this.adventData.year < this.currentYear : false
  }

  getAvailableDays(): AdventDay[] {
    const days: AdventDay[] = []

    if (!this.adventData) {
      return days
    }

    // Check if we're showing a past year's advent
    const isCurrentYear = this.adventData.year === this.currentYear
    const isAfterEndDate = this.today > this.adventData.endDate

    for (let dayNumber = 1; dayNumber <= 24; dayNumber++) {
      const dayDate = new Date(this.adventData.startDate)
      dayDate.setDate(dayDate.getDate() + dayNumber - 1)

      // For current year: show based on date
      // For past years: show all days as available
      const isAvailable = isCurrentYear
        ? dayDate <= this.today && !isAfterEndDate
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
}
