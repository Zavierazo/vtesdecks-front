import {
  enableProdMode,
  ErrorHandler,
  importProvidersFrom,
  inject,
  provideAppInitializer,
  SecurityContext,
} from '@angular/core'

import * as Sentry from '@sentry/angular'

import { CommonModule } from '@angular/common'
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http'
import { ReactiveFormsModule } from '@angular/forms'
import { bootstrapApplication } from '@angular/platform-browser'
import { provideAnimations } from '@angular/platform-browser/animations'
import {
  provideRouter,
  Router,
  Routes,
  withInMemoryScrolling,
} from '@angular/router'
import { ServiceWorkerModule } from '@angular/service-worker'
import { JWT_OPTIONS, JwtModule } from '@auth0/angular-jwt'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { GlobalErrorHandler } from '@services'
import { RECAPTCHA_V3_SITE_KEY, RecaptchaV3Module } from 'ng-recaptcha-2'
import {
  NgcCookieConsentConfig,
  NgcCookieConsentModule,
} from 'ngx-cookieconsent'
import {
  NgxGoogleAnalyticsModule,
  NgxGoogleAnalyticsRouterModule,
} from 'ngx-google-analytics'
import { AppComponent } from './app/app.component'
import { HttpMonitorInterceptor } from './app/http-monitor.interceptor'

import { AuthQuery } from '@state/auth/auth.query'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { MARKED_EXTENSIONS, provideMarkdown } from 'ngx-markdown'
import { bracketsExtension } from './app/marked-extension'
import { TranslocoRootModule } from './app/transloco-root.module'
import { environment } from './environments/environment'

const cookieConfig: NgcCookieConsentConfig = {
  cookie: {
    name: 'cookie_consent',
    domain: environment.domain,
  },
  palette: {
    popup: {
      background: '#000',
    },
    button: {
      background: '#f1d600',
    },
  },
  position: 'bottom-right',
  theme: 'edgeless',
  type: 'opt-in',
}
function jwtOptionsFactory(authQuery: AuthQuery) {
  return {
    tokenGetter: () => authQuery.getToken(),
    allowedDomains: [environment.apiDomain],
    headerName: 'Authorization',
    authScheme: '',
    skipWhenExpired: true,
  }
}
const routes: Routes = [
  { path: 'index', redirectTo: '', pathMatch: 'full' },
  {
    path: '',
    loadChildren: () =>
      import('./app/modules/home/home.routes').then((m) => m.HOME_ROUTES),
  },
  {
    path: 'decks',
    loadChildren: () =>
      import('./app/modules/decks/decks.routes').then((m) => m.DECKS_ROUTES),
  },
  {
    path: 'deck/:id',
    loadChildren: () =>
      import('./app/modules/deck/deck.routes').then((m) => m.DECK_ROUTES),
  },
  {
    path: 'decks/builder',
    loadChildren: () =>
      import('./app/modules/deck-builder/deck-builder.routes').then(
        (m) => m.DECK_BUILDER_ROUTES,
      ),
  },
  {
    path: 'cards',
    loadChildren: () =>
      import('./app/modules/deck-builder/deck-builder.routes').then(
        (m) => m.DECK_BUILDER_ROUTES,
      ),
  },
  {
    path: 'contact',
    loadChildren: () =>
      import('./app/modules/contact/contact.routes').then(
        (m) => m.CONTACT_ROUTES,
      ),
  },
  {
    path: 'user',
    loadChildren: () =>
      import('./app/modules/user/user.routes').then((m) => m.USER_ROUTES),
  },
  {
    path: 'terms',
    loadChildren: () =>
      import('./app/modules/terms/terms.routes').then((m) => m.TERMS_ROUTES),
  },
  {
    path: 'changelog',
    loadChildren: () =>
      import('./app/modules/changelog/changelog.routes').then(
        (m) => m.CHANGELOG_ROUTES,
      ),
  },
  {
    path: 'privacy-policy',
    loadChildren: () =>
      import('./app/modules/privacy-policy/privacy-policy.routes').then(
        (m) => m.PRIVACY_POLICY_ROUTES,
      ),
  },
  {
    path: 'verify',
    loadChildren: () =>
      import('./app/modules/verify-account/verify-account.routes').then(
        (m) => m.VERIFY_ACCOUNT_ROUTES,
      ),
  },
  {
    path: 'reset-password',
    loadChildren: () =>
      import('./app/modules/reset-password/reset-password.routes').then(
        (m) => m.RESET_PASSWORD_ROUTES,
      ),
  },
  {
    path: 'vtesdle',
    loadChildren: () =>
      import('./app/modules/vtesdle/vtesdle.routes').then(
        (m) => m.VTESDLE_ROUTES,
      ),
  },
  {
    path: 'statistics',
    loadChildren: () =>
      import('./app/modules/statistics/statistics.routes').then(
        (m) => m.STATISTICS_ROUTES,
      ),
  },
  {
    path: 'vtes-ai',
    loadChildren: () =>
      import('./app/modules/vtes-ai/vtes-ai.routes').then(
        (m) => m.VTES_AI_ROUTES,
      ),
  },
  {
    path: 'collection',
    loadChildren: () =>
      import('./app/modules/collection/collection.routes').then(
        (m) => m.COLLECTION_ROUTES,
      ),
  },
  {
    path: 'proxy-generator',
    loadChildren: () =>
      import('./app/modules/proxy-generator/proxy-generator.routes').then(
        (m) => m.PROXY_GENERATOR_ROUTES,
      ),
  },
  {
    path: 'advent',
    loadChildren: () =>
      import('./app/modules/advent/advent.routes').then((m) => m.ADVENT_ROUTES),
  },
  {
    path: '**',
    loadComponent: () =>
      import('@shared/components/page-not-found/page-not-found.component').then(
        (m) => m.PageNotFoundComponent,
      ),
  }, // Wildcard route for a 404 page
]

if (environment.production) {
  enableProdMode()
}

Sentry.init({
  dsn: 'https://f8e1909b015ae47bde6da8890aefc4a9@o4508688066609152.ingest.de.sentry.io/4508688070541392',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  // Tracing
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: [
    'localhost',
    /^https:\/\/vtesdecks\.com/,
    /^https:\/\/api\.vtesdecks\.com/,
  ],
  // Session Replay
  replaysSessionSampleRate: 0.0, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
})

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      CommonModule,
      NgbModule,
      ReactiveFormsModule,
      RecaptchaV3Module,
      NgcCookieConsentModule.forRoot(cookieConfig),
      JwtModule.forRoot({
        jwtOptionsProvider: {
          provide: JWT_OPTIONS,
          useFactory: jwtOptionsFactory,
          deps: [AuthQuery],
        },
      }),
      NgxGoogleAnalyticsModule.forRoot(environment.googleAnalytics.trackingId, [
        {
          command: 'consent',
          values: [
            'default',
            {
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              analytics_storage: 'denied',
              wait_for_update: 500,
            },
          ],
        },
      ]),
      NgxGoogleAnalyticsRouterModule,
      ServiceWorkerModule.register('ngsw-worker.js', {
        enabled: environment.production,
        registrationStrategy: 'registerImmediately',
      }),
      TranslocoRootModule,
    ),
    {
      provide: Sentry.TraceService,
      deps: [Router],
    },
    provideAppInitializer(() => {
      inject(Sentry.TraceService)
    }),
    {
      provide: RECAPTCHA_V3_SITE_KEY,
      useValue: environment.recaptcha.siteKey,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpMonitorInterceptor,
      multi: true,
    },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'disabled' }),
    ),
    provideAnimations(),
    provideMarkdown({
      sanitize: SecurityContext.NONE,
      markedExtensions: [
        {
          provide: MARKED_EXTENSIONS,
          useFactory: bracketsExtension,
          deps: [CryptQuery, LibraryQuery],
          multi: true,
        },
      ],
    }),
  ],
}).catch((err) => console.error(err))
