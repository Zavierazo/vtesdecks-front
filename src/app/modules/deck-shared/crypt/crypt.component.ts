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
import { TranslocoPipe } from '@jsverse/transloco'
import { ApiCard, ApiCrypt } from '@models'
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { MediaService } from '@services'
import { CardImagePipe } from '@shared/pipes/card-image.pipe'
import { CryptQuery } from '@state/crypt/crypt.query'
import { CryptService } from '@state/crypt/crypt.service'
import { drawProbability } from '@utils'
import { NgxSkeletonLoaderComponent } from 'ngx-skeleton-loader'
import { Observable } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { CollectionCardMiniStatsComponent } from '../collection-card-mini-stats/collection-card-mini-stats.component'
import { CollectionCardTrackerComponent } from '../collection-card-tracker/collection-card-tracker.component'

@UntilDestroy()
@Component({
  selector: 'app-crypt',
  templateUrl: './crypt.component.html',
  styleUrls: ['./crypt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
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
export class CryptComponent implements OnInit {
  private cryptQuery = inject(CryptQuery)
  private cryptService = inject(CryptService)
  private mediaService = inject(MediaService)

  @Input() card!: ApiCard

  @Input() cryptSize?: number

  @Input() withDrawProbability = false

  @Input() withControls = false

  @Input() disablePopover = false

  @Input() disableClickPopover = false

  @Input() background = true

  @Input() maxNumber?: number

  @Input() overrideImage?: string | null

  @Input() setAbbrev?: string

  readonly cardAdded = output<number>()

  readonly cardRemoved = output<number>()

  crypt$!: Observable<ApiCrypt | undefined>

  isMobile$!: Observable<boolean>

  cdnDomain = environment.cdnDomain

  ngOnInit() {
    if (!this.cryptQuery.getEntity(this.card.id)) {
      this.cryptService
        .getCrypt(this.card.id)
        .pipe(untilDestroyed(this))
        .subscribe()
    }
    this.crypt$ = this.cryptQuery.selectEntity(this.card.id)
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
    const size = this.cryptSize && this.cryptSize > 12 ? this.cryptSize : 12
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
          this.addCard(event)
        }
        if (event.button === 2) {
          this.removeCard(event)
        }
      }
    }
  }
}
