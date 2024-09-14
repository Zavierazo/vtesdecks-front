import { MediaService } from './../../../services/media.service'
import { ApiLibrary } from './../../../models/api-library'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core'
import { EMPTY, Observable } from 'rxjs'
import { ApiKrcgCard } from '../../../models/krcg/api-krcg-card'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ApiDataService } from '../../../services/api.data.service'
import { formatRulingText } from '../../../utils/vtes-utils'
import { ApiShop } from '../../../models/api-shop'
import { ApiDecks } from '../../../models/api-decks'
import { Shop, getShop } from '../../../utils/shops'

@UntilDestroy()
@Component({
  selector: 'app-library-card',
  templateUrl: './library-card.component.html',
  styleUrls: ['./library-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryCardComponent implements OnInit, OnDestroy {
  @Input() cardList!: ApiLibrary[]
  @Input() index!: number
  isMobile$!: Observable<boolean>
  krcgCard$!: Observable<ApiKrcgCard>
  preconstructedDecks$!: Observable<ApiDecks>
  shops$!: Observable<ApiShop[]>
  defaultTouch = { x: 0, y: 0, time: 0 }

  constructor(
    public modal: NgbActiveModal,
    private apiDataService: ApiDataService,
    private mediaService: MediaService,
    private changeDetectorRef: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.isMobile$ = this.mediaService.observeMobile()
    this.fetchRulings()
    this.fetchShops()
    this.fetchPreconstructedDecks()
    // Push fake state to capture dismiss modal on back button
    history.pushState(
      {
        modal: true,
        desc: 'fake state for modal',
      },
      '',
    )
  }

  ngOnDestroy() {
    if (window.history.state.modal) {
      history.back()
    }
  }

  @HostListener('window:popstate')
  dismissModal() {
    this.modal.dismiss()
  }

  get hasMore(): boolean {
    return this.cardList.length > 1
  }

  @HostListener('touchstart', ['$event'])
  @HostListener('touchend', ['$event'])
  @HostListener('touchcancel', ['$event'])
  handleTouch(event: TouchEvent): void {
    let touch = event.touches[0] || event.changedTouches[0]
    if (event.type === 'touchstart') {
      this.defaultTouch.x = touch.pageX
      this.defaultTouch.y = touch.pageY
      this.defaultTouch.time = event.timeStamp
    } else if (event.type === 'touchend') {
      let deltaX = touch.pageX - this.defaultTouch.x
      let deltaTime = event.timeStamp - this.defaultTouch.time
      if (deltaTime < 500) {
        if (Math.abs(deltaX) > 100) {
          if (deltaX > 0) {
            this.previousCard()
          } else {
            this.nextCard()
          }
        }
      }
    }
  }

  @HostListener('window:keydown.ArrowRight')
  @HostListener('window:keydown.ArrowDown')
  nextCard() {
    this.index = (this.index + 1) % this.cardList.length
    this.fetchRulings()
    this.fetchShops()
    this.fetchPreconstructedDecks()
  }

  @HostListener('window:keydown.ArrowLeft')
  @HostListener('window:keydown.ArrowUp')
  previousCard() {
    if (this.index === 0) {
      this.index = this.cardList.length - 1
    } else {
      this.index--
    }
    this.fetchRulings()
    this.fetchShops()
    this.fetchPreconstructedDecks()
  }

  private fetchShops(): void {
    if (this.cardList[this.index].printOnDemand) {
      this.shops$ = this.apiDataService
        .getCardShops(this.cardList[this.index].id)
        .pipe(untilDestroyed(this))
    } else {
      this.shops$ = EMPTY
    }
    this.changeDetectorRef.markForCheck()
  }

  private fetchRulings(): void {
    this.krcgCard$ = this.apiDataService
      .getKrcgCard(this.cardList[this.index].id)
      .pipe(untilDestroyed(this))
    this.changeDetectorRef.markForCheck()
  }

  private fetchPreconstructedDecks(): void {
    this.preconstructedDecks$ = this.apiDataService
      .getDecks(0, 10, {
        type: 'PRECONSTRUCTED',
        cards: `${this.cardList[this.index].id}=1`,
      })
      .pipe(untilDestroyed(this))
    this.changeDetectorRef.markForCheck()
  }

  formatText(text: string, links: any): string {
    return formatRulingText(text, links)
  }

  getShopInfo(code: string): Shop | undefined {
    return getShop(code)
  }
}
