import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MediaService } from '../../../services/media.service';
import { ColorThemeService } from '../../../services/color-theme.service';
import { Theme } from '../../../models/theme';

@Component({
  selector: 'app-theme-selector',
  templateUrl: './theme-selector.component.html',
  styleUrls: ['./theme-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeSelectorComponent {
  isMobile$ = this.mediaService.observeMobileOrTablet();
  theme = this.colorThemeService.currentTheme();
  Theme = Theme;

  constructor(
    private colorThemeService: ColorThemeService,
    private mediaService: MediaService
  ) {}

  toggleTheme(): void {
    if (this.colorThemeService.currentTheme() === Theme.Dark) {
      this.colorThemeService.update(Theme.Light);
    } else {
      this.colorThemeService.update(Theme.Dark);
    }
    this.theme = this.colorThemeService.currentTheme();
  }
}
