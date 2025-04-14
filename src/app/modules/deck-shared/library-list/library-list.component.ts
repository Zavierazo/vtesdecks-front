import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy } from '@ngneat/until-destroy'
import { Observable } from 'rxjs'
import { ApiCard } from '../../../models/api-card'
import { MediaService } from '../../../services/media.service'
import { LibraryQuery } from '../../../state/library/library.query'
import { LibraryCardComponent } from '../library-card/library-card.component'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco';
import { NgFor, NgIf, AsyncPipe } from '@angular/common';
import { LibraryComponent } from '../library/library.component';
import { LibraryTypeTranslocoPipe } from '../library-type-transloco/library-type-transloco.pipe';

@UntilDestroy()
@Component({
    selector: 'app-library-list',
    templateUrl: './library-list.component.html',
    styleUrls: ['./library-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TranslocoDirective, NgFor, NgIf, LibraryComponent, AsyncPipe, TranslocoPipe, LibraryTypeTranslocoPipe]
})
export class LibraryListComponent implements OnInit {
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

  @Input() withControls = false

  @Output() cardAdded = new EventEmitter<number>()

  @Output() cardRemoved = new EventEmitter<number>()

  isMobileOrTablet$!: Observable<boolean>

  constructor(
    private libraryQuery: LibraryQuery,
    private mediaService: MediaService,
    private modalService: NgbModal,
  ) {}

  ngOnInit() {
    this.isMobileOrTablet$ = this.mediaService.observeMobileOrTablet()
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
    return this.libraryList.filter((card) => card.type === type)
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

  openCryptCard(card: ApiCard, cardList: ApiCard[]): void {
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
}
