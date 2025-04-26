import { AsyncPipe, NgClass } from '@angular/common'
import { Component, Input, OnInit } from '@angular/core'
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
  @Input() cardId!: number
  @Input() set!: string
  @Input() proxySetOption$!: Observable<ApiProxyCardOption>
  isMobile$ = this.mediaService.observeMobile()
  name!: string
  releaseYear!: number

  constructor(
    private readonly apiDataService: ApiDataService,
    private readonly translocoService: TranslocoService,
    private readonly mediaService: MediaService,
  ) {}

  ngOnInit() {
    const abbrev = this.set.split(':')[0]
    this.name = abbrev
    if (abbrev === 'POD') {
      this.name = this.translocoService.translate('deck_shared.print_on_demand')
    } else if (abbrev.startsWith('Promo')) {
      this.name = this.translocoService.translate('deck_shared.promo')
      this.releaseYear = Number(abbrev.substring(6, 10))
    } else {
      this.apiDataService
        .getSet(abbrev)
        .pipe(untilDestroyed(this))
        .subscribe((setInfo) => {
          this.name = setInfo.fullName
          this.releaseYear = new Date(setInfo.releaseDate).getFullYear()
        })
    }

    this.proxySetOption$ = this.apiDataService
      .getProxyOption(
        this.cardId,
        abbrev.startsWith('Promo-') ? 'Promo' : abbrev,
      )
      .pipe(untilDestroyed(this))
  }
}
