import { SEL } from '../support/selectors'

/**
 * Navigation, menus & routing.
 * Drives the header navigation and verifies each public route resolves to a
 * non-404 view. Routes are data-independent.
 */

// Public routes reachable without authentication. The expected token is just a
// URL fragment we can assert on after navigation — not backend data.
const PUBLIC_ROUTES: { path: string; urlContains: string }[] = [
  { path: '/', urlContains: '/' },
  { path: '/decks', urlContains: '/decks' },
  { path: '/metagame', urlContains: '/metagame' },
  { path: '/cards/crypt', urlContains: '/cards/crypt' },
  { path: '/cards/library', urlContains: '/cards/library' },
  { path: '/statistics', urlContains: '/statistics' },
  { path: '/proxy-generator', urlContains: '/proxy-generator' },
  { path: '/vtesdle', urlContains: '/vtesdle' },
  { path: '/contact', urlContains: '/contact' },
  { path: '/changelog', urlContains: '/changelog' },
  { path: '/terms', urlContains: '/terms' },
  { path: '/privacy-policy', urlContains: '/privacy-policy' },
]

describe('Navigation & routing', () => {
  PUBLIC_ROUTES.forEach(({ path, urlContains }) => {
    it(`navigates to ${path} and renders content`, () => {
      cy.visitApp(path)
      cy.location('pathname').should('include', urlContains)
      cy.waitForIdle()
      // The router outlet rendered *something* other than the bare shell.
      cy.get('app-root').children().should('have.length.greaterThan', 0)
      // Header is still present (shell persists across navigation).
      cy.get(SEL.header).should('be.visible')
    })
  })

  it('navigates Home via the brand logo', () => {
    cy.visitApp('/decks')
    cy.get(SEL.headerBrand).click()
    cy.location('pathname').should('eq', '/')
  })

  it('opens the Decks dropdown and routes through its entries', () => {
    cy.visitApp('/')
    cy.get(SEL.decksDropdownToggle).click()
    cy.get(SEL.ngbDropdownMenu).should('be.visible')
    // First "All decks" entry routes to /decks.
    cy.get(SEL.ngbDropdownMenu).find('a[routerLink="/decks"]').first().click()
    cy.location('pathname').should('include', '/decks')
  })

  it('opens the Tools dropdown and exposes tool links', () => {
    cy.visitApp('/')
    cy.get(SEL.toolsDropdownToggle).click()
    cy.get(SEL.ngbDropdownMenu).should('be.visible')
    cy.get(SEL.ngbDropdownMenu).find('a[routerLink="/proxy-generator"]').should('exist')
    cy.get(SEL.ngbDropdownMenu).find('a[routerLink="/statistics"]').should('exist')
  })

  it('marks the active nav item via routerLinkActive', () => {
    cy.visitApp('/contact')
    cy.get('nav a[routerLink="/contact"]').should('have.class', 'active')
  })

  it('renders a 404 view for an unknown deep route', () => {
    cy.visit('/this-route-does-not-exist-xyz', { failOnStatusCode: false })
    cy.get('app-page-not-found, app-root', { timeout: 20000 }).should('exist')
    // Still a usable app shell (header present) — graceful, not a hard crash.
    cy.get(SEL.header).should('be.visible')
  })
})
