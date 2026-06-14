/// <reference types="cypress" />
import { SEL } from './selectors'

/**
 * Custom commands shared across the suite. Everything here is data-agnostic:
 * helpers discover whatever the backend currently returns instead of assuming
 * fixed records.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Visit a route and wait until the Angular app has bootstrapped. */
      visitApp(path?: string): Chainable<void>

      /**
       * Log in through the real UI (header → login modal → submit) and cache
       * the resulting auth state with cy.session so it is reused across specs.
       * The backend ignores reCAPTCHA in this environment, so the real flow
       * completes end-to-end.
       */
      login(username?: string, password?: string): Chainable<void>

      /** Log out via the user dropdown if a session is present. */
      logout(): Chainable<void>

      /** True if the visible user-menu (logged-in marker) is present. */
      isLoggedIn(): Chainable<boolean>

      /** Open the global search modal from the header. */
      openSearch(): Chainable<void>

      /**
       * Run `fn` only when `selector` matches at least one element, otherwise
       * log a skip reason to the terminal. Keeps empty-state runs green.
       */
      ifExists(
        selector: string,
        reason: string,
        fn: (els: JQuery<HTMLElement>) => void,
      ): Chainable<void>

      /** Wait for the app's loading indicators to disappear. */
      waitForIdle(): Chainable<void>

      /**
       * Serve a working stub for Google reCAPTCHA v3. The real widget cannot
       * initialise in a headless run (the dev origin isn't an authorised domain
       * for the v3 key, so grecaptcha.execute() never resolves and the login
       * POST is never sent). Stubbing the third-party script lets the real login
       * UI + real backend complete end-to-end. The backend ignores the token.
       */
      stubRecaptcha(): Chainable<void>
    }
  }
}

Cypress.Commands.add('stubRecaptcha', () => {
  // Neutralise the real api.js so, once it "loads", it cannot overwrite the
  // grecaptcha stub injected via onBeforeLoad. Readiness + execute() are driven
  // entirely by the stub (see installRecaptchaStub).
  const noop = {
    statusCode: 200,
    headers: { 'content-type': 'application/javascript' },
    body: '',
  }
  cy.intercept('GET', 'https://www.google.com/recaptcha/**', noop)
  cy.intercept('GET', 'https://www.recaptcha.net/recaptcha/**', noop)
  cy.intercept('GET', 'https://www.gstatic.com/recaptcha/**', noop)
})

/**
 * Install a working grecaptcha stub before the app's JS runs. ng-recaptcha-2
 * appends the real api.js and resolves readiness only when the global
 * `ng2recaptchaloaded` callback fires — which never happens in a headless run
 * (the dev origin isn't authorised for the v3 key). We define `grecaptcha` up
 * front and fire that callback the instant the library registers it, so
 * `execute()` resolves immediately. The backend ignores the returned token.
 */
function installRecaptchaStub(win: Window): void {
  const grecaptcha = {
    execute: () => Promise.resolve('e2e-recaptcha-bypass-token'),
    ready: (cb: () => void) => {
      if (typeof cb === 'function') cb()
    },
    render: () => 'e2e-recaptcha-widget',
    reset: () => undefined,
    getResponse: () => 'e2e-recaptcha-bypass-token',
  }
  // IMPORTANT: do NOT pre-assign win.grecaptcha. If grecaptcha already exists
  // the loader skips wiring its `ng2recaptchaloaded` callback, so execute()
  // would backlog forever. Instead, install grecaptcha the moment the loader
  // registers that callback, then fire it so the ready-subject emits.
  let callback: (() => void) | undefined
  Object.defineProperty(win, 'ng2recaptchaloaded', {
    configurable: true,
    get: () => callback,
    set: (fn: () => void) => {
      callback = fn
      ;(win as any).grecaptcha = grecaptcha
      if (typeof fn === 'function') setTimeout(() => fn(), 0)
    },
  })
}

Cypress.Commands.add('visitApp', (path = '/') => {
  cy.visit(path, { onBeforeLoad: installRecaptchaStub })
  // The header renders once Angular has bootstrapped — a reliable readiness gate.
  cy.get(SEL.header, { timeout: 30000 }).should('be.visible')
})

Cypress.Commands.add('waitForIdle', () => {
  // Give Angular a tick, then ensure no spinner/skeleton is left on screen.
  cy.get('body').then(($body) => {
    if ($body.find(SEL.loading).length) {
      cy.get(SEL.loading, { timeout: 30000 }).should('not.exist')
    }
  })
})

Cypress.Commands.add(
  'login',
  (username = Cypress.env('username'), password = Cypress.env('password')) => {
    cy.session(
      ['login', username],
      () => {
        // The HTTP interceptor appends ?locale=&version= query params, so the
        // pattern needs a trailing wildcard to match the real request URL.
        cy.intercept('POST', '**/auth/login*').as('authLogin')
        cy.visitApp('/')

        // Open the login modal from the header (logged-out state).
        cy.get(SEL.loginButton).filter(':visible').first().click()
        cy.get(SEL.modal).should('be.visible')

        cy.get(SEL.login.username).clear().type(username)
        cy.get(SEL.login.password).clear().type(password, { log: false })
        cy.get(SEL.login.submit).filter(':visible').first().click()

        // Validate the response *structurally* — never assert on a specific
        // token value, only that auth succeeded and produced a token.
        cy.wait('@authLogin', { timeout: 30000 })
          .its('response')
          .then((res) => {
            expect(res?.statusCode, 'login HTTP status').to.eq(200)
            expect(res?.body, 'login payload').to.have.property('token')
            expect(res?.body.token, 'token').to.be.a('string').and.not.be.empty
          })

        // Modal closes and the user menu appears on success.
        cy.get(SEL.modal).should('not.exist')
        cy.get(SEL.userMenuToggle, { timeout: 15000 }).should('exist')
      },
      {
        validate() {
          // Session is valid as long as an auth token is persisted.
          cy.window().then((win) => {
            const ls = win.localStorage
            const ss = win.sessionStorage
            const hasToken = Object.keys(ls)
              .concat(Object.keys(ss))
              .some((k) => /auth|token|user/i.test(k))
            expect(hasToken, 'persisted auth state').to.be.true
          })
        },
        cacheAcrossSpecs: true,
      },
    )
  },
)

Cypress.Commands.add('logout', () => {
  cy.get('body').then(($body) => {
    if ($body.find(SEL.userMenuToggle).length === 0) {
      return // already logged out
    }
    cy.get(SEL.userMenuToggle).click()
    cy.get(SEL.ngbDropdownMenu)
      .contains(/logout|cerrar sesión/i)
      .click()
    cy.get(SEL.loginButton, { timeout: 15000 }).should('exist')
  })
})

Cypress.Commands.add('isLoggedIn', () => {
  return cy
    .get('body')
    .then(($body) => $body.find(SEL.userMenuToggle).length > 0)
})

Cypress.Commands.add('openSearch', () => {
  cy.get('body').then(($body) => {
    const desktopBtn = $body.find(SEL.searchButtonDesktop).filter(':visible')
    if (desktopBtn.length) {
      cy.wrap(desktopBtn.first()).click()
    } else {
      // Mobile quick-action search button.
      cy.get('nav .quick-actions-mobile button').first().click()
    }
  })
  cy.get(SEL.search.input, { timeout: 15000 }).should('be.visible')
})

Cypress.Commands.add('ifExists', (selector, reason, fn) => {
  cy.get('body').then(($body) => {
    const els = $body.find(selector)
    if (els.length === 0) {
      cy.task('log', `⏭  SKIP: ${reason} (no "${selector}" present)`)
      return
    }
    fn(els as JQuery<HTMLElement>)
  })
})

export {}
