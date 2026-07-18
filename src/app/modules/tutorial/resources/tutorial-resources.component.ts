import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core'
import { RouterLink } from '@angular/router'
import { TranslocoDirective } from '@jsverse/transloco'
import { NgxGoogleAnalyticsModule } from 'ngx-google-analytics'
import { SeoService } from '@services'

interface TutorialResource {
  key: string
  url: string
  icon: string
}

const RESOURCES: TutorialResource[] = [
  {
    key: 'rulebook',
    url: 'https://blackchantry.com/Vampire%20The%20Eternal%20Struggle%20Fifth%20Edition%20rulebook%20ENG.pdf',
    icon: 'bi-book',
  },
  {
    key: 'what_to_buy',
    url: 'https://codex-of-the-damned.org/en/strategy/articles/basic/what-should-i-buy.html',
    icon: 'bi-bag',
  },
  {
    key: 'codex',
    url: 'https://codex-of-the-damned.org/en/index.html',
    icon: 'bi-mortarboard',
  },
  {
    key: 'vekn',
    url: 'https://www.vekn.net/',
    icon: 'bi-globe',
  },
  {
    key: 'discord',
    url: 'https://discord.gg/4nPXtPvWyD',
    icon: 'bi-discord',
  },
  {
    key: 'succubus',
    url: 'https://succubus-club.net/',
    icon: 'bi-controller',
  },
]

/** After the tutorial: where to go next. */
@Component({
  selector: 'app-tutorial-resources',
  templateUrl: './tutorial-resources.component.html',
  styleUrls: ['./tutorial-resources.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, RouterLink, NgxGoogleAnalyticsModule],
})
export class TutorialResourcesComponent implements OnInit {
  private readonly seoService = inject(SeoService)

  readonly resources = RESOURCES

  ngOnInit(): void {
    this.seoService.update({
      title: 'VTES Resources for New Players',
      description:
        'Rulebook, buying guide, community links and starter decks: everything a new Vampire: The Eternal Struggle player needs.',
      canonicalUrl: 'https://vtesdecks.com/tutorial/resources',
    })
  }
}
