import { AsyncPipe, NgClass, NgFor, NgIf, NgStyle } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
} from '@angular/core'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { NgxSkeletonLoaderComponent } from 'ngx-skeleton-loader'
import { Observable } from 'rxjs'
import { ApiCard } from '../../../models/api-card'
import { ApiLibrary } from '../../../models/api-library'
import { MediaService } from '../../../services/media.service'
import { LibraryQuery } from '../../../state/library/library.query'
import { LibraryService } from '../../../state/library/library.service'
import drawProbability from '../../../utils/draw-probability'

@UntilDestroy()
@Component({
  selector: 'app-library',
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    NgIf,
    NgbPopover,
    NgStyle,
    NgClass,
    NgFor,
    NgxSkeletonLoaderComponent,
    AsyncPipe,
    TranslocoPipe,
  ],
})
export class LibraryComponent implements OnInit {
  @Input() card!: ApiCard

  @Input() librarySize?: number

  @Input() withDrawProbability = false

  @Input() withControls = false

  @Input() disablePopover = false

  @Output() cardAdded = new EventEmitter<number>()

  @Output() cardRemoved = new EventEmitter<number>()

  library$!: Observable<ApiLibrary | undefined>

  isMobile$!: Observable<boolean>

  constructor(
    private libraryQuery: LibraryQuery,
    private libraryService: LibraryService,
    private mediaService: MediaService,
  ) {}

  ngOnInit() {
    if (!this.libraryQuery.getEntity(this.card.id)) {
      this.libraryService
        .getLibrary(this.card.id)
        .pipe(untilDestroyed(this))
        .subscribe()
    }
    this.library$ = this.libraryQuery.selectEntity(this.card.id)
    this.isMobile$ = this.mediaService.observeMobile()
  }

  addCard() {
    this.cardAdded.emit(this.card.id)
  }

  removeCard() {
    this.cardRemoved.emit(this.card.id)
  }

  getDrawProbability(copy: number): number {
    const size =
      this.librarySize && this.librarySize > 60 ? this.librarySize : 60
    return Math.round(drawProbability(copy, size, 4, this.card.number))
  }

  // Avoid context menu on right click
  @HostListener('contextmenu', ['$event'])
  onRightClick(event: MouseEvent) {
    if (this.withControls) {
      event.preventDefault()
    }
  }

  // Detect double left&right click to add/remove card
  @HostListener('mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    if (this.withControls) {
      if (
        event.target instanceof HTMLElement &&
        event.target.classList.contains('btn-icon')
      ) {
        //Avoid run when btn icons clicked
        return
      }
      if (event.detail > 1) {
        if (event.button === 0) {
          this.addCard()
        }
        if (event.button === 2) {
          this.removeCard()
        }
      }
    }
  }
}
