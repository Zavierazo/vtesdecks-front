import { isDevMode, NgModule } from '@angular/core'
import {
  getBrowserLang,
  provideTransloco,
  TranslocoModule,
} from '@ngneat/transloco'
import { provideTranslocoLocale } from '@ngneat/transloco-locale'
import {
  cookiesStorage,
  provideTranslocoPersistLang,
} from '@ngneat/transloco-persist-lang'
import { TranslocoHttpLoader } from './transloco-loader'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', icon: 'assets/icons/lang/en.svg', title: 'English' },
  { code: 'es', icon: 'assets/icons/lang/es.svg', title: 'Español' },
]
export const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES[0]

function getDefaultLang(): string {
  const browserLang = getBrowserLang()
  if (
    browserLang &&
    SUPPORTED_LANGUAGES.some((language) => browserLang === language.code)
  ) {
    return browserLang
  }
  return DEFAULT_LANGUAGE.code
}

@NgModule({
  exports: [TranslocoModule],
  providers: [
    provideTransloco({
      config: {
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        availableLangs: SUPPORTED_LANGUAGES.map((language) => language.code),
        defaultLang: getDefaultLang(),
        fallbackLang: DEFAULT_LANGUAGE.code,
        missingHandler: {
          allowEmpty: true,
          logMissingKey: true,
          useFallbackTranslation: true,
        },
      },
      loader: TranslocoHttpLoader,
    }),
    provideTranslocoLocale(),
    provideTranslocoPersistLang({
      storage: {
        useValue: cookiesStorage(),
      },
    }),
  ],
})
export class TranslocoRootModule {}
