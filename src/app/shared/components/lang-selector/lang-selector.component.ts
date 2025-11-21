import { AsyncPipe, NgClass } from '@angular/common'
import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import {
  NgbDropdown,
  NgbDropdownButtonItem,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { MediaService } from '@services'
import { CryptService } from '../../../state/crypt/crypt.service'
import { LibraryService } from '../../../state/library/library.service'
import { SUPPORTED_LANGUAGES } from '../../../transloco-root.module'

@UntilDestroy()
@Component({
  selector: 'app-lang-selector',
  templateUrl: './lang-selector.component.html',
  styleUrls: ['./lang-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownButtonItem,
    NgbDropdownItem,
    NgClass,
    AsyncPipe,
  ],
})
export class LangSelectorComponent {
  private translocoService = inject(TranslocoService)
  private mediaService = inject(MediaService)
  private libraryService = inject(LibraryService)
  private cryptService = inject(CryptService)

  isMobile$ = this.mediaService.observeMobileOrTablet()

  languages = SUPPORTED_LANGUAGES

  isActive(code: string): boolean {
    return code === this.translocoService.getActiveLang()
  }

  switchLanguage(code: string) {
    this.translocoService.setActiveLang(code)
    this.libraryService.getLibraryCards().pipe(untilDestroyed(this)).subscribe()
    this.cryptService.getCryptCards().pipe(untilDestroyed(this)).subscribe()
  }
}
