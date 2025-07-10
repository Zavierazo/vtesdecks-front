import { AsyncPipe, NgClass } from '@angular/common'
import { Component, Input, OnInit, inject } from '@angular/core'
import { TranslocoService } from '@jsverse/transloco'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { Observable } from 'rxjs'
import { ApiProxyCardOption } from '../../../models/api-proxy-card-option'
import { MediaService } from '../../../services/media.service'
import { ApiDataService } from './../../../services/api.data.service'

@UntilDestroy()
@Component({
  selector: 'app-set-tooltip',
  templateUrl: './set-tooltip.component.html',
  styleUrls: ['./set-tooltip.component.scss'],
  imports: [NgClass, AsyncPipe],
})
export class SetTooltipComponent implements OnInit {
  private readonly apiDataService = inject(ApiDataService)
  private readonly translocoService = inject(TranslocoService)
  private readonly mediaService = inject(MediaService)

  @Input() cardId!: number
  @Input() set!: string
  @Input() proxySetOption$!: Observable<ApiProxyCardOption>
  isMobile$ = this.mediaService.observeMobile()
  name!: string
  releaseYear?: number

  ngOnInit() {
    const setSplit = this.set.split(':')
    const abbrev = setSplit[0]
    const setInfo = setSplit[1] ?? undefined
    this.name = abbrev
    if (abbrev === 'POD') {
      this.name = this.translocoService.translate('deck_shared.print_on_demand')
    } else if (abbrev === 'Promo') {
      this.name = this.translocoService.translate('deck_shared.promo')
      if (setInfo) {
        this.releaseYear = Number(setInfo.substring(0, 4))
      }
    } else {
      this.apiDataService
        .getSet(abbrev)
        .pipe(untilDestroyed(this))
        .subscribe((setInfo) => {
          this.name = setInfo.fullName
          this.releaseYear = setInfo.releaseDate
            ? new Date(setInfo.releaseDate).getFullYear()
            : undefined
        })
    }

    this.proxySetOption$ = this.apiDataService
      .getProxyOption(this.cardId, abbrev)
      .pipe(untilDestroyed(this))
  }
}
