import { AsyncPipe } from '@angular/common'
import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { ApiChangelog } from '@models'
import { ApiDataService, SeoService } from '@services'
import { Observable } from 'rxjs'

@Component({
  selector: 'app-changelog',
  templateUrl: './changelog.component.html',
  styleUrls: ['./changelog.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TranslocoDirective, AsyncPipe],
})
export class ChangelogComponent implements OnInit {
  private readonly apiDataService = inject(ApiDataService)
  private readonly seoService = inject(SeoService)

  changelog$!: Observable<ApiChangelog[]>

  ngOnInit() {
    this.seoService.update({
      title: 'Changelog',
      description:
        "See what's new on VTES Decks. Latest features, bug fixes, and improvements.",
      canonicalUrl: 'https://vtesdecks.com/changelog',
    })
    this.changelog$ = this.apiDataService.getChangelog()
  }
}
