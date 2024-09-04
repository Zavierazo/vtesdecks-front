import { GlobalErrorHandler } from './services/global-error.handler';
import { AuthQuery } from './state/auth/auth.query';
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { NgModule, ErrorHandler } from '@angular/core';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NG_ENTITY_SERVICE_CONFIG } from '@datorama/akita-ng-entity-service';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import { AkitaNgRouterStoreModule } from '@datorama/akita-ng-router-store';
import { environment } from '../environments/environment';
import { ReactiveFormsModule } from '@angular/forms';
import { RecaptchaV3Module, RECAPTCHA_V3_SITE_KEY } from 'ng-recaptcha-2';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { HttpMonitorInterceptor } from './http-monitor.interceptor';
import {
  NgcCookieConsentModule,
  NgcCookieConsentConfig,
} from 'ngx-cookieconsent';
import { JwtModule, JWT_OPTIONS } from '@auth0/angular-jwt';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  NgxGoogleAnalyticsModule,
  NgxGoogleAnalyticsRouterModule,
} from 'ngx-google-analytics';
import { SharedModule } from './shared/shared.module';
import { PageNotFoundComponent } from './shared/components/page-not-found/page-not-found.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { persistState } from '@datorama/akita';
import { TranslocoRootModule } from './transloco-root.module';
import { NotificationListComponent } from './shared/components/notification-list/notification-list.component';

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
};

function jwtOptionsFactory(authQuery: AuthQuery) {
  return {
    tokenGetter: () => authQuery.getToken(),
    allowedDomains: [environment.apiDomain],
    headerName: 'Authorization',
    authScheme: '',
    skipWhenExpired: true,
  };
}

const routes: Routes = [
  { path: 'index', redirectTo: '', pathMatch: 'full' },
  {
    path: '',
    loadChildren: () =>
      import('./modules/home/home.module').then((m) => m.HomeModule),
  },
  {
    path: 'decks',
    loadChildren: () =>
      import('./modules/decks/decks.module').then((m) => m.DecksModule),
  },
  {
    path: 'deck/:id',
    loadChildren: () =>
      import('./modules/deck/deck.module').then((m) => m.DeckModule),
  },
  {
    path: 'decks/builder',
    loadChildren: () =>
      import('./modules/deck-builder/deck-builder.module').then(
        (m) => m.DeckBuilderModule
      ),
  },
  {
    path: 'cards',
    loadChildren: () =>
      import('./modules/deck-builder/deck-builder.module').then(
        (m) => m.DeckBuilderModule
      ),
  },
  {
    path: 'contact',
    loadChildren: () =>
      import('./modules/contact/contact.module').then((m) => m.ContactModule),
  },
  {
    path: 'user',
    loadChildren: () =>
      import('./modules/user/user.module').then((m) => m.UserModule),
  },
  {
    path: 'terms',
    loadChildren: () =>
      import('./modules/terms/terms.module').then((m) => m.TermsModule),
  },
  {
    path: 'changelog',
    loadChildren: () =>
      import('./modules/changelog/changelog.module').then(
        (m) => m.ChangelogModule
      ),
  },
  {
    path: 'privacy-policy',
    loadChildren: () =>
      import('./modules/privacy-policy/privacy-policy.module').then(
        (m) => m.PrivacyPolicyModule
      ),
  },
  {
    path: 'verify',
    loadChildren: () =>
      import('./modules/verify-account/verify-account.module').then(
        (m) => m.VerifyAccountModule
      ),
  },
  {
    path: 'reset-password',
    loadChildren: () =>
      import('./modules/reset-password/reset-password.module').then(
        (m) => m.ResetPasswordModule
      ),
  },
  {
    path: 'vtesdle',
    loadChildren: () =>
      import('./modules/vtesdle/vtesdle.module').then((m) => m.VtesdleModule),
  },
  { path: '**', component: PageNotFoundComponent }, // Wildcard route for a 404 page
];

@NgModule({
  declarations: [
    AppComponent,
    FooterComponent,
    HeaderComponent,
    NotificationListComponent,
  ],
  bootstrap: [AppComponent],
  exports: [RouterModule],
  imports: [
    CommonModule,
    SharedModule,
    NgbModule,
    RouterModule.forRoot(routes, { scrollPositionRestoration: 'disabled' }),
    BrowserAnimationsModule,
    environment.production ? [] : AkitaNgDevtools.forRoot(),
    AkitaNgRouterStoreModule,
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
  ],
  providers: [
    {
      provide: NG_ENTITY_SERVICE_CONFIG,
      useValue: { baseUrl: 'https://jsonplaceholder.typicode.com' },
    },
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
    {
      provide: 'persistStorage',
      useValue: persistState({
        include: ['library_v1', 'crypt_v1'],
      }),
    },
    provideHttpClient(withInterceptorsFromDi()),
  ],
})
export class AppModule {}
