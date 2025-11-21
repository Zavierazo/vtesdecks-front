import { AsyncPipe, NgClass } from '@angular/common'
import { Component, Input, OnInit, inject } from '@angular/core'
import { TranslocoPipe } from '@jsverse/transloco'
import { ApiProxyCardOption } from '@models'
import { UntilDestroy } from '@ngneat/until-destroy'
import { Observable } from 'rxjs'
import { MediaService } from '../../../services/media.service'
import { CardImagePipe } from '../../../shared/pipes/card-image.pipe'
import { SetQuery } from '../../../state/set/set.query'

@UntilDestroy()
@Component({
  selector: 'app-set-tooltip',
  templateUrl: './set-tooltip.component.html',
  styleUrls: ['./set-tooltip.component.scss'],
  imports: [NgClass, AsyncPipe, CardImagePipe, TranslocoPipe],
})
export class SetTooltipComponent implements OnInit {
  private readonly setQuery = inject(SetQuery)
  private readonly mediaService = inject(MediaService)

  @Input() cardId!: number
  @Input() set!: string
  @Input() proxySetOption$!: Observable<ApiProxyCardOption>
  isMobile$ = this.mediaService.observeMobile()
  name!: string
  releaseYear?: number
  imageError = false

  ngOnInit() {
    const setSplit = this.set.split(':')
    const abbrev = setSplit[0]
    const setInfo = setSplit[1] ?? undefined
    this.name = abbrev
    const apiSet = this.setQuery.getEntityByAbbrev(abbrev)
    if (apiSet) {
      this.name = apiSet.fullName
      this.releaseYear = apiSet.releaseDate
        ? new Date(apiSet.releaseDate).getFullYear()
        : undefined
    }
    if (abbrev === 'Promo' && setInfo) {
      this.releaseYear = Number(setInfo.substring(0, 4))
    }
  }
}
