import { AsyncPipe, NgClass, NgStyle } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  Input,
  OnInit,
  inject,
  output,
} from '@angular/core'
import { TranslocoDirective, TranslocoPipe } from '@jsverse/transloco'
import { ApiCard, ApiLibrary } from '@models'
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { MediaService } from '@services'
import { CardImagePipe } from '@shared/pipes/card-image.pipe'
import { LibraryQuery } from '@state/library/library.query'
import { LibraryService } from '@state/library/library.service'
import { drawProbability } from '@utils'
import { NgxSkeletonLoaderComponent } from 'ngx-skeleton-loader'
import { Observable } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { CollectionCardMiniStatsComponent } from '../collection-card-mini-stats/collection-card-mini-stats.component'
import { CollectionCardTrackerComponent } from '../collection-card-tracker/collection-card-tracker.component'

@UntilDestroy()
@Component({
  selector: 'app-library',
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    NgbPopover,
    NgStyle,
    NgClass,
    NgxSkeletonLoaderComponent,
    AsyncPipe,
    TranslocoPipe,
    CardImagePipe,
    CollectionCardTrackerComponent,
    CollectionCardMiniStatsComponent,
  ],
})
export class LibraryComponent implements OnInit {
  private readonly libraryQuery = inject(LibraryQuery)
  private readonly libraryService = inject(LibraryService)
  private readonly mediaService = inject(MediaService)

  @Input() card!: ApiCard

  @Input() librarySize?: number

  @Input() withDrawProbability = false

  @Input() withControls = false

  @Input() disablePopover = false

  @Input() disableClickPopover = false

  @Input() background = true

  @Input() maxNumber?: number

  @Input() overrideImage?: string

  @Input() setAbbrev?: string

  readonly cardAdded = output<number>()

  readonly cardRemoved = output<number>()

  library$!: Observable<ApiLibrary | undefined>

  isMobile$!: Observable<boolean>

  cdnDomain = environment.cdnDomain

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

  addCard(event: MouseEvent) {
    event.preventDefault()
    this.cardAdded.emit(this.card.id)
  }

  removeCard(event: MouseEvent) {
    event.preventDefault()
    this.cardRemoved.emit(this.card.id)
  }

  getDrawProbability(copy: number): number {
    const size =
      this.librarySize && this.librarySize > 60 ? this.librarySize : 60
    return Math.round(drawProbability(copy, size, 7, this.card.number))
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
          this.addCard(event)
        }
        if (event.button === 2) {
          this.removeCard(event)
        }
      }
    }
  }
}
