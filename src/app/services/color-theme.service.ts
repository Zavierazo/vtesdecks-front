import { Injectable, Renderer2, RendererFactory2, inject } from '@angular/core'
import { Theme } from '../models/theme'

@Injectable({
  providedIn: 'root',
})
export class ColorThemeService {
  private static readonly THEME_STORAGE_KEY = 'user-color-theme'
  private renderer: Renderer2
  private colorTheme!: Theme
  enabled = true

  constructor() {
    const rendererFactory = inject(RendererFactory2)

    this.renderer = rendererFactory.createRenderer(null, null)
  }

  load() {
    if (this.enabled) {
      this.getColorTheme()
    } else {
      this.setColorTheme(Theme.Light)
    }
    this.updateTheme()
  }

  update(theme: Theme): void {
    this.setColorTheme(theme)
    this.updateTheme()
  }

  currentTheme(): Theme {
    return this.colorTheme
  }

  private updateTheme() {
    this.renderer.setAttribute(
      document.body,
      'data-bs-theme',
      this.currentTheme(),
    )
  }

  private setColorTheme(theme: Theme) {
    this.colorTheme = theme
    localStorage.setItem(ColorThemeService.THEME_STORAGE_KEY, theme)
  }

  private getColorTheme() {
    const localStorageColorTheme = localStorage.getItem(
      ColorThemeService.THEME_STORAGE_KEY,
    )
    if (
      localStorageColorTheme === Theme.Light ||
      localStorageColorTheme === Theme.Dark
    ) {
      this.colorTheme = localStorageColorTheme
    } else {
      this.detectPrefersColorTheme()
    }
  }

  private detectPrefersColorTheme() {
    if (window.matchMedia('(prefers-color-scheme)').media !== 'not all') {
      this.colorTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? Theme.Dark
        : Theme.Light
    } else {
      this.colorTheme = Theme.Light
    }
  }
}
