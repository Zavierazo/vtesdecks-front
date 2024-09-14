import { ChangeDetectionStrategy, Component } from '@angular/core'
import { TranslocoService } from '@ngneat/transloco'
import { MediaService } from '../../../services/media.service'
import { SUPPORTED_LANGUAGES } from '../../../transloco-root.module'

@Component({
  selector: 'app-lang-selector',
  templateUrl: './lang-selector.component.html',
  styleUrls: ['./lang-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LangSelectorComponent {
  isMobile$ = this.mediaService.observeMobileOrTablet()

  languages = SUPPORTED_LANGUAGES

  constructor(
    private translocoService: TranslocoService,
    private mediaService: MediaService,
  ) {}

  isActive(code: string): boolean {
    return code === this.translocoService.getActiveLang()
  }

  switchLanguage(code: string) {
    this.translocoService.setActiveLang(code)
  }
}
