/// <reference types="cypress" />
import './commands'

/**
 * Global support file — loaded before every spec.
 */

// The app integrates Google AdSense, reCAPTCHA, Google Analytics and Sentry.
// Those third-party scripts throw runtime errors in a headless/automation
// context that are unrelated to the behaviour under test. Swallow only those;
// let genuine application errors fail the test.
const IGNORED_ERROR_PATTERNS: RegExp[] = [
  /adsbygoogle/i,
  /grecaptcha/i,
  /recaptcha/i,
  /google.*accounts/i,
  /gtag/i,
  /ResizeObserver loop/i,
  /Failed to fetch.*sentry/i,
  /NG0/, // Angular hydration/runtime warnings from 3rd-party DOM mutation
]

Cypress.on('uncaught:exception', (err) => {
  if (IGNORED_ERROR_PATTERNS.some((re) => re.test(err.message))) {
    return false // prevent the error from failing the test
  }
  return true
})

// Keep tests independent: cookies/localStorage are cleared by Cypress between
// specs automatically, but we make logged-out the default starting state.
beforeEach(() => {
  // Stub the cookie-consent banner so it never blocks clicks; behaviour of the
  // banner itself is covered in its own spec.
  cy.setCookie('cookie_consent', 'allow', { log: false })
  // Make the un-runnable reCAPTCHA widget resolve so reCAPTCHA-gated forms
  // (login, register, forgot-password, contact) can submit in a headless run.
  cy.stubRecaptcha()
})
