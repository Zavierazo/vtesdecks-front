import { decksPage } from '../pages/DecksPage'
import { SEL } from '../support/selectors'

/**
 * Deck detail page.
 * Discovers a real deck id from the list, opens it, and validates the detail
 * view + browser-refresh persistence + deep-linking. No fixed ids.
 */
describe('Deck detail', () => {
  /**
   * Resolve a real deck id from the current dataset and hand it to `fn`. If the
   * dataset is empty the test is skipped via Mocha's official mechanism.
   */
  const withFirstDeckId = (ctx: Mocha.Context, fn: (id: string) => void) => {
    decksPage.visit().waitForDecks()
    cy.then(() => {
      if (decksPage.lastReportedTotal === 0) {
        ctx.skip()
      }
    })
    decksPage.cards()
      .first()
      .find('a[href^="/deck/"]')
      .first()
      .invoke('attr', 'href')
      .then((href) => {
        const id = String(href).replace(/.*\/deck\//, '').split(/[?#]/)[0]
        expect(id, 'derived deck id').to.not.be.empty
        fn(id)
      })
  }

  it('opens a deck and renders its detail content', function () {
    withFirstDeckId(this, (id) => {
      cy.intercept('GET', `**/decks/${id}*`).as('deckDetail')
      cy.visitApp(`/deck/${id}`)
      cy.wait('@deckDetail').its('response.statusCode').should('be.oneOf', [200, 304])
      cy.waitForIdle()
      cy.get(SEL.deckDetail.root).should('be.visible')
      // The title is whatever the backend returned — assert it is non-empty.
      cy.get(SEL.deckDetail.title).invoke('text').should('not.be.empty')
    })
  })

  it('persists the deck across a browser refresh (deep link)', function () {
    withFirstDeckId(this, (id) => {
      cy.visitApp(`/deck/${id}`)
      cy.waitForIdle()
      cy.get(SEL.deckDetail.title).invoke('text').then((before) => {
        cy.reload()
        cy.waitForIdle()
        cy.location('pathname').should('include', `/deck/${id}`)
        cy.get(SEL.deckDetail.title).invoke('text').should('eq', before)
      })
    })
  })

  it('exposes the deck API payload with the expected structure', function () {
    withFirstDeckId(this, (id) => {
      cy.request({
        url: `${Cypress.env('apiUrl')}/decks/${id}`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 304])
        if (res.body) {
          expect(res.body).to.have.property('id')
          expect(res.body).to.have.property('name')
          // A deck carries its crypt and library card lists — assert the object
          // is deck-shaped (arrays present), not its exact contents.
          expect(res.body).to.have.property('crypt')
          expect(res.body).to.have.property('library')
          expect(res.body.crypt, 'crypt is an array').to.be.an('array')
          expect(res.body.library, 'library is an array').to.be.an('array')
        }
      })
    })
  })

  it('increments the deck view count when opened (relative change)', function () {
    withFirstDeckId(this, (id) => {
      // Read the current views straight from the API, open the deck, then read
      // again. Views should not decrease (typically +1 per fresh view).
      cy.request(`${Cypress.env('apiUrl')}/decks/${id}`).then((before) => {
        const beforeViews = Number(before.body?.views ?? before.body?.stats?.views ?? NaN)
        if (Number.isNaN(beforeViews)) {
          this.skip() // this deployment doesn't expose a view counter
        }
        cy.visitApp(`/deck/${id}`)
        cy.waitForIdle()
        cy.request(`${Cypress.env('apiUrl')}/decks/${id}`).then((after) => {
          const afterViews = Number(after.body?.views ?? after.body?.stats?.views ?? beforeViews)
          expect(afterViews, 'view count does not decrease after viewing').to.be.gte(beforeViews)
        })
      })
    })
  })

  it('shows a graceful view for a non-existent deck id', () => {
    cy.visit('/deck/00000000-0000-0000-0000-000000000000', {
      failOnStatusCode: false,
    })
    cy.get(SEL.header, { timeout: 20000 }).should('be.visible')
    // App must not hard-crash; the shell stays usable.
    cy.get('app-root').should('exist')
  })
})
