import { AsyncPipe, NgClass } from '@angular/common'
import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { TranslocoDirective } from '@jsverse/transloco'
import { Theme } from '@models'
import { ColorThemeService } from '../../../services/color-theme.service'
import { MediaService } from '../../../services/media.service'

@Component({
  selector: 'app-theme-selector',
  templateUrl: './theme-selector.component.html',
  styleUrls: ['./theme-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, NgClass, AsyncPipe],
})
export class ThemeSelectorComponent {
  private readonly colorThemeService = inject(ColorThemeService)
  private readonly mediaService = inject(MediaService)

  isMobile$ = this.mediaService.observeMobileOrTablet()
  theme = this.colorThemeService.currentTheme()
  Theme = Theme

  toggleTheme(): void {
    if (this.colorThemeService.currentTheme() === Theme.Dark) {
      this.colorThemeService.update(Theme.Light)
    } else {
      this.colorThemeService.update(Theme.Dark)
    }
    this.theme = this.colorThemeService.currentTheme()
  }
}
