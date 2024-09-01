import { provideTransloco, TranslocoModule } from '@ngneat/transloco';
import { isDevMode, NgModule } from '@angular/core';
import { TranslocoHttpLoader } from './transloco-loader';
import {
  cookiesStorage,
  provideTranslocoPersistLang,
} from '@ngneat/transloco-persist-lang';
import { provideTranslocoLocale } from '@ngneat/transloco-locale';

@NgModule({
  exports: [TranslocoModule],
  providers: [
    provideTransloco({
      config: {
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        availableLangs: ['en'],
        defaultLang: 'en',
        fallbackLang: 'en',
        missingHandler: {
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
