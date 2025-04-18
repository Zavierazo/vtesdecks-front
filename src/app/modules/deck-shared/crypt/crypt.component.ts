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
import { TranslocoPipe } from '@jsverse/transloco'
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { NgxSkeletonLoaderComponent } from 'ngx-skeleton-loader'
import { Observable } from 'rxjs'
import { ApiCard } from '../../../models/api-card'
import { ApiCrypt } from '../../../models/api-crypt'
import { MediaService } from '../../../services/media.service'
import { CryptQuery } from '../../../state/crypt/crypt.query'
import { CryptService } from '../../../state/crypt/crypt.service'
import drawProbability from '../../../utils/draw-probability'

@UntilDestroy()
@Component({
  selector: 'app-crypt',
  templateUrl: './crypt.component.html',
  styleUrls: ['./crypt.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
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
export class CryptComponent implements OnInit {
  @Input() card!: ApiCard

  @Input() cryptSize?: number

  @Input() withDrawProbability = false

  @Input() withControls = false

  @Input() disablePopover = false

  @Output() cardAdded = new EventEmitter<number>()

  @Output() cardRemoved = new EventEmitter<number>()

  crypt$!: Observable<ApiCrypt | undefined>

  isMobile$!: Observable<boolean>

  constructor(
    private cryptQuery: CryptQuery,
    private cryptService: CryptService,
    private mediaService: MediaService,
  ) {}

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

  addCard() {
    this.cardAdded.emit(this.card.id)
  }

  removeCard() {
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
          this.addCard()
        }
        if (event.button === 2) {
          this.removeCard()
        }
      }
    }
  }
}
