import { ChangeDetectionStrategy, Component } from '@angular/core'
import { TranslocoService, TranslocoDirective } from '@jsverse/transloco'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { MediaService } from '../../../services/media.service'
import { CryptService } from '../../../state/crypt/crypt.service'
import { LibraryService } from '../../../state/library/library.service'
import { SUPPORTED_LANGUAGES } from '../../../transloco-root.module'
import { NgbDropdown, NgbDropdownToggle, NgbDropdownMenu, NgbDropdownButtonItem, NgbDropdownItem } from '@ng-bootstrap/ng-bootstrap';
import { NgClass, AsyncPipe } from '@angular/common';

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
    AsyncPipe
],
})
export class LangSelectorComponent {
  isMobile$ = this.mediaService.observeMobileOrTablet()

  languages = SUPPORTED_LANGUAGES

  constructor(
    private translocoService: TranslocoService,
    private mediaService: MediaService,
    private libraryService: LibraryService,
    private cryptService: CryptService,
  ) {}

  isActive(code: string): boolean {
    return code === this.translocoService.getActiveLang()
  }

  switchLanguage(code: string) {
    this.translocoService.setActiveLang(code)
    this.libraryService.getLibraryCards().pipe(untilDestroyed(this)).subscribe()
    this.cryptService.getCryptCards().pipe(untilDestroyed(this)).subscribe()
  }
}
