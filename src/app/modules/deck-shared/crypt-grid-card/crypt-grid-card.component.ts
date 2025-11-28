import { AsyncPipe } from '@angular/common'
import {
  Component,
  HostListener,
  inject,
  input,
  OnInit,
  output,
} from '@angular/core'
import { ApiCard, ApiCrypt } from '@models'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { CardImagePipe } from '@shared/pipes/card-image.pipe'
import { CryptQuery } from '@state/crypt/crypt.query'
import { CryptService } from '@state/crypt/crypt.service'
import { drawProbability } from '@utils'
import { LazyLoadImageModule } from 'ng-lazyload-image'
import { Observable } from 'rxjs'
import { environment } from '../../../../environments/environment'
import { CollectionCardMiniStatsComponent } from '../collection-card-mini-stats/collection-card-mini-stats.component'
import { CollectionCardTrackerComponent } from '../collection-card-tracker/collection-card-tracker.component'

@UntilDestroy()
@Component({
  selector: 'app-crypt-grid-card',
  templateUrl: './crypt-grid-card.component.html',
  styleUrls: ['./crypt-grid-card.component.scss'],
  imports: [
    AsyncPipe,
    CardImagePipe,
    LazyLoadImageModule,
    CollectionCardTrackerComponent,
    CollectionCardMiniStatsComponent,
  ],
})
export class CryptGridCardComponent implements OnInit {
  private cryptQuery = inject(CryptQuery)
  private cryptService = inject(CryptService)

  card = input.required<ApiCard>()
  cryptSize = input<number>(12)
  withControls = input<boolean>(false)
  readonly cardAdded = output<number>()
  readonly cardRemoved = output<number>()

  cdnDomain = environment.cdnDomain
  crypt$!: Observable<ApiCrypt | undefined>

  ngOnInit(): void {
    if (!this.cryptQuery.getEntity(this.card().id)) {
      this.cryptService
        .getCrypt(this.card().id)
        .pipe(untilDestroyed(this))
        .subscribe()
    }
    this.crypt$ = this.cryptQuery.selectEntity(this.card().id)
  }

  get stackedShadow(): string {
    const count = this.card().number
    if (count <= 1) return 'none'

    const shadows: string[] = []
    for (let i = 1; i < Math.min(count, 5); i++) {
      const offset = i * 2
      shadows.push(`${offset}px ${offset}px 0px rgba(0,0,0,0.4)`)
    }
    return shadows.join(', ')
  }

  getDrawProbability(copy: number): number {
    return Math.round(
      drawProbability(copy, this.cryptSize(), 4, this.card().number),
    )
  }

  addCard(event: MouseEvent) {
    event.preventDefault()
    this.cardAdded.emit(this.card().id)
  }

  removeCard(event: MouseEvent) {
    event.preventDefault()
    this.cardRemoved.emit(this.card().id)
  }

  // Avoid context menu on right click
  @HostListener('contextmenu', ['$event'])
  onRightClick(event: MouseEvent) {
    if (this.withControls()) {
      event.preventDefault()
    }
  }

  // Detect double left&right click to add/remove card
  @HostListener('mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    if (this.withControls()) {
      if (
        event.target instanceof HTMLElement &&
        (event.target.classList.contains('btn') ||
          event.target.classList.contains('btn-group'))
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
