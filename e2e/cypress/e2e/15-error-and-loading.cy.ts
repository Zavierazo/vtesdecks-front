import { decksPage } from '../pages/DecksPage'
import { SEL } from '../support/selectors'

/**
 * Error handling & loading states.
 * Uses network interception to *simulate* backend conditions (slow, empty,
 * failing). Stubs are scoped to the API origin via `apiUrl` so they never
 * accidentally match the SPA document route (e.g. localhost:4200/decks).
 * Even when shaping responses we only do so structurally (empty array / error
 * status), never with specific records.
 */
const apiDecks = () => `${Cypress.env('apiUrl')}/decks**`

describe('Loading states', () => {
  it('shows a loading indicator while a re-query is in flight', () => {
    // Load the page normally first so the component is mounted...
    decksPage.visit().waitForDecks()
    // ...then delay the next API response and trigger a re-query (order change)
    // so the in-component loading indicator is deterministically observable.
    cy.intercept('GET', apiDecks(), (req) => {
      req.on('response', (res) => {
        res.setDelay(1000)
      })
    }).as('slowDecks')
    decksPage.orderSelect().select('OLDEST')
    cy.get(SEL.loading).should('exist') // spinner appears during the delay
    cy.wait('@slowDecks')
    cy.waitForIdle()
  })
})

describe('Error handling', () => {
  it('handles an empty decks dataset gracefully', () => {
    // Empty the real response while preserving its shape (the API wraps decks
    // in a paginated object), so the component parses it as a true empty state.
    cy.intercept('GET', apiDecks(), (req) => {
      req.continue((res) => {
        if (res.body && typeof res.body === 'object' && Array.isArray(res.body.decks)) {
          res.body.decks = []
          if ('total' in res.body) res.body.total = 0
        } else if (Array.isArray(res.body)) {
          res.body = []
        }
      })
    }).as('emptyDecks')
    cy.visitApp('/decks')
    cy.wait('@emptyDecks')
    cy.waitForIdle()
    // No deck cards, no crash, and a recovery affordance (reset) is offered.
    decksPage.cardCount().should('eq', 0)
    cy.contains('button', /reset/i).should('be.visible')
    cy.get(SEL.header).should('be.visible')
  })

  it('survives a server error on the decks endpoint', () => {
    cy.intercept('GET', apiDecks(), { statusCode: 500, body: 'Server error' }).as('boom')
    cy.visitApp('/decks')
    cy.waitForIdle()
    // The app shell remains usable even when the API fails.
    cy.get(SEL.header).should('be.visible')
    cy.get(SEL.headerBrand).should('be.visible')
  })

  it('remains usable when a detail request 404s', () => {
    cy.intercept('GET', `${Cypress.env('apiUrl')}/decks/*`, {
      statusCode: 404,
      body: {},
    }).as('missing')
    cy.visit('/deck/some-missing-id', { failOnStatusCode: false })
    cy.get(SEL.header, { timeout: 20000 }).should('be.visible')
  })

  it('keeps navigation working after an API failure (recovery)', () => {
    cy.intercept('GET', apiDecks(), { statusCode: 503 }).as('down')
    cy.visitApp('/decks')
    cy.waitForIdle()
    // Navigate away to a healthy route — app recovers.
    cy.get(SEL.headerBrand).click()
    cy.location('pathname').should('eq', '/')
    cy.get(SEL.header).should('be.visible')
  })
})
