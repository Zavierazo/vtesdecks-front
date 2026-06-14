import { decksPage } from '../pages/DecksPage'
import { SEL } from '../support/selectors'

/**
 * Browser-refresh persistence & deep-linking.
 * Confirms that query-param state and routes survive reloads and direct entry,
 * independent of the underlying dataset.
 */
describe('Deep links & refresh persistence', () => {
  it('preserves decks query params across a reload', () => {
    decksPage.visit('?type=COMMUNITY&order=POPULAR').waitForDecks()
    cy.location('search').should('include', 'type=COMMUNITY')
    cy.reload()
    cy.waitForIdle()
    cy.location('search').should('include', 'type=COMMUNITY')
    cy.location('search').should('include', 'order=POPULAR')
    // The request issued after reload still carries the params.
    cy.get('@decksApi').its('request.url').should('match', /type=COMMUNITY/i)
  })

  it('deep-links directly into a filtered decks view', () => {
    cy.intercept('GET', '**/decks**').as('decks')
    cy.visitApp('/decks?type=TOURNAMENT')
    cy.wait('@decks').its('request.url').should('match', /type=TOURNAMENT/i)
    cy.location('pathname').should('include', '/decks')
  })

  it('deep-links into a card browser route and renders it directly', () => {
    cy.visitApp('/cards/crypt')
    cy.waitForIdle()
    cy.location('pathname').should('include', '/cards/crypt')
    cy.get(SEL.header).should('be.visible')
  })

  it('restores a deck detail deep link on cold load', function () {
    // Discover a real id, then enter it via a fresh visit (cold deep link).
    decksPage.visit().waitForDecks()
    cy.then(() => {
      if (decksPage.lastReportedTotal === 0) {
        this.skip()
      }
    })
    decksPage.cards()
      .first()
      .find('a[href^="/deck/"]')
      .first()
      .invoke('attr', 'href')
      .then((href) => {
        const path = String(href).split(/[?#]/)[0]
        cy.visitApp(path)
        cy.waitForIdle()
        cy.location('pathname').should('eq', path)
        cy.get(SEL.deckDetail.root).should('be.visible')
      })
  })

  it('keeps the logged-out state after reloading a public page', () => {
    cy.visitApp('/')
    cy.get(SEL.loginButton).filter(':visible').should('exist')
    cy.reload()
    cy.get(SEL.loginButton).filter(':visible').should('exist')
    cy.get(SEL.userMenuToggle).should('not.exist')
  })
})
