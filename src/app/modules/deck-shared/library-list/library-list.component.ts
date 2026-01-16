import { AsyncPipe, NgClass, NgTemplateOutlet } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  inject,
  output,
} from '@angular/core'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiCard, DeckLibrarySortBy } from '@models'
import { NgbCollapseModule, NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy } from '@ngneat/until-destroy'
import { MediaService } from '@services'
import { LibraryQuery } from '@state/library/library.query'
import { getLibraryTypeIcons } from '@utils'
import { Observable } from 'rxjs'
import { LibraryCardComponent } from '../library-card/library-card.component'
import { LibraryGridCardComponent } from '../library-grid-card/library-grid-card.component'
import { LibraryTypeTranslocoPipe } from '../library-type-transloco/library-type-transloco.pipe'
import { LibraryComponent } from '../library/library.component'

@UntilDestroy()
@Component({
  selector: 'app-library-list',
  templateUrl: './library-list.component.html',
  styleUrls: ['./library-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgClass,
    NgbCollapseModule,
    NgTemplateOutlet,
    TranslocoDirective,
    LibraryComponent,
    AsyncPipe,
    TranslocoPipe,
    LibraryTypeTranslocoPipe,
    LibraryGridCardComponent,
  ],
})
export class LibraryListComponent implements OnInit {
  private libraryQuery = inject(LibraryQuery)
  private mediaService = inject(MediaService)
  private modalService = inject(NgbModal)

  static readonly libraryTypeOrder = [
    'Master',
    'Conviction',
    'Action',
    'Action/Combat',
    'Action/Reaction',
    'Political Action',
    'Power',
    'Equipment',
    'Ally',
    'Retainer',
    'Action Modifier',
    'Action Modifier/Combat',
    'Action Modifier/Reaction',
    'Combat',
    'Combat/Action Modifier',
    'Combat/Reaction',
    'Reaction',
    'Reaction/Combat',
    'Reaction/Action Modifier',
    'Event',
  ]
  @Input() libraryList!: ApiCard[]

  @Input() sortBy: DeckLibrarySortBy = 'quantity'

  @Input() withControls = false

  @Input() displayMode: 'list' | 'grid' = 'list'

  readonly cardAdded = output<number>()

  readonly cardRemoved = output<number>()

  isMobileOrTablet$!: Observable<boolean>

  collapsedStates = new Map<string, boolean>()

  ngOnInit() {
    this.isMobileOrTablet$ = this.mediaService.observeMobileOrTablet()
    this.libraryTypes.forEach((type) => {
      this.collapsedStates.set(type, false)
    })
  }

  isCollapsed(libraryType: string): boolean {
    return this.collapsedStates.get(libraryType) ?? false
  }

  toggleCollapsed(libraryType: string): void {
    const currentState = this.isCollapsed(libraryType)
    this.collapsedStates.set(libraryType, !currentState)
  }

  get libraryTypes(): string[] {
    return this.libraryList
      .reduce((acc, card) => {
        if (!acc.includes(card.type!)) {
          acc.push(card.type!)
        }
        return acc
      }, [] as string[])
      .sort((a, b) => this.libraryTypeOrder(a) - this.libraryTypeOrder(b))
  }

  libraryCards(type: string): ApiCard[] {
    return this.libraryList
      .filter((card) => card.type === type)
      .sort((a, b) => {
        if (this.sortBy === 'quantity') {
          return this.sort(b.number, a.number)
        } else {
          const cardA = this.libraryQuery.getEntity(a.id)
          const cardB = this.libraryQuery.getEntity(b.id)
          return this.sort(cardA![this.sortBy], cardB![this.sortBy])
        }
      })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sort(a: any, b: any, sortByOrder: 'asc' | 'desc' = 'asc'): number {
    if (a === b) {
      return 0
    }
    if (sortByOrder === 'asc') {
      if (a === undefined) return -1
      if (b === undefined) return 1
      return a > b ? 1 : -1
    } else {
      if (a === undefined) return 1
      if (b === undefined) return -1
      return a < b ? 1 : -1
    }
  }

  percentageSize(type: string): number {
    return Math.round((this.librarySizeByType(type) / this.librarySize) * 100)
  }

  librarySizeByType(type: string): number {
    return this.libraryList
      .filter((card) => card.type === type)
      .reduce((acc, card) => acc + card.number, 0)
  }

  trackByIndexFn(index: number, _: string) {
    return index
  }

  trackByFn(_: number, item: ApiCard) {
    return item.id
  }

  get librarySize(): number {
    return this.libraryList.reduce((acc, card) => acc + card.number, 0)
  }

  get masterTrifle(): number {
    return this.libraryList
      .filter((card) => card.type === 'Master')
      .filter((card) => this.libraryQuery.getEntity(card.id)?.trifle === true)
      .reduce((acc, card) => acc + card.number, 0)
  }

  private libraryTypeOrder(type: string): number {
    return LibraryListComponent.libraryTypeOrder.indexOf(type)
  }

  openLibraryCard(card: ApiCard, cardList: ApiCard[]): void {
    if (this.withControls) {
      return
    }
    if (!this.libraryQuery.getEntity(card.id)) {
      // Loading...
      return
    }
    const modalRef = this.modalService.open(LibraryCardComponent, {
      size: 'lg',
      centered: true,
      scrollable: true,
    })
    const libraryList = cardList
      .map((c) => this.libraryQuery.getEntity(c.id))
      .filter(Boolean)
    const current = libraryList.find((c) => c?.id === card.id)
    modalRef.componentInstance.cardList = libraryList
    modalRef.componentInstance.index = current
      ? libraryList.indexOf(current)
      : 0
  }

  getLibraryTypeIcons(libraryType: string): string[] | undefined {
    return getLibraryTypeIcons(libraryType)
  }
}
