import { isDevMode, NgModule } from '@angular/core'
import { provideTransloco, TranslocoModule } from '@jsverse/transloco'
import {
  provideTranslocoLocale,
  TranslocoLocaleModule,
} from '@jsverse/transloco-locale'
import {
  cookiesStorage,
  provideTranslocoPersistLang,
} from '@jsverse/transloco-persist-lang'
import { TranslocoHttpLoader } from './transloco-loader'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', icon: 'assets/icons/lang/en.svg', title: 'English' },
  { code: 'es', icon: 'assets/icons/lang/es.svg', title: 'Español' },
  { code: 'fr', icon: 'assets/icons/lang/fr.svg', title: 'Français' },
  { code: 'pt', icon: 'assets/icons/lang/pt.svg', title: 'Português' },
]
export const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES[0]

@NgModule({
  exports: [TranslocoModule, TranslocoLocaleModule],
  providers: [
    provideTransloco({
      config: {
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        availableLangs: SUPPORTED_LANGUAGES.map((language) => language.code),
        defaultLang: DEFAULT_LANGUAGE.code,
        fallbackLang: DEFAULT_LANGUAGE.code,
        missingHandler: {
          allowEmpty: true,
          logMissingKey: true,
          useFallbackTranslation: true,
        },
      },
      loader: TranslocoHttpLoader,
    }),
    provideTranslocoLocale({
      langToLocaleMapping: { en: 'en-US', es: 'es-ES' },
    }),
    provideTranslocoPersistLang({ storage: { useValue: cookiesStorage() } }),
  ],
})
export class TranslocoRootModule {}
