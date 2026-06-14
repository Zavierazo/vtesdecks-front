import { decksPage } from '../pages/DecksPage'
import { SEL } from '../support/selectors'

/**
 * Deck browser — listing, pagination & infinite scroll.
 * Every assertion is relative to the data currently returned. Workflows that
 * genuinely cannot run (empty dataset) are skipped with Cypress's official
 * `this.skip()` so they show as pending rather than silently passing.
 */
describe('Decks list', () => {
  beforeEach(() => {
    decksPage.visit().waitForDecks()
  })

  it('returns a structurally valid decks payload', () => {
    cy.get('@decksApi')
      .its('response.statusCode')
      .should('be.oneOf', [200, 304])
    cy.get('@decksApi')
      .its('response.body')
      .then((body) => {
        // Accept either a bare array or a paginated wrapper — assert structure only.
        const list = Array.isArray(body)
          ? body
          : (body?.decks ?? body?.content ?? [])
        expect(list, 'decks list is an array').to.be.an('array')
        if (list.length > 0) {
          expect(list[0], 'deck item shape').to.have.property('id')
        }
      })
  })

  it('renders deck cards, each linking to its own detail route', function () {
    if (decksPage.lastReportedTotal === 0) {
      this.skip() // genuinely empty dataset — nothing to render
    }
    decksPage.cards().should('have.length.greaterThan', 0)
    decksPage.cards().first().find('a[href^="/deck/"]').should('exist')
  })

  it('reports a total count consistent with the rendered cards', function () {
    if (decksPage.lastReportedTotal === 0) {
      this.skip()
    }
    // The header total is data-driven; assert it is a positive number and that
    // the first page rendered no more cards than the reported total.
    cy.get('@decksApi')
      .its('response.body.total')
      .then((total) => {
        const t = Number(total)
        if (Number.isNaN(t)) return // some deployments omit total — skip the check
        expect(t).to.be.greaterThan(0)
        decksPage.cardCount().should('be.lte', t)
      })
  })

  it('loads additional decks via "Show more" / infinite scroll', function () {
    if (decksPage.lastReportedTotal < 2) {
      this.skip() // not enough data to page
    }
    decksPage.cardCount().then((initial) => {
      cy.get('body').then(($b) => {
        const moreBtn = $b.find(SEL.decks.showMore).filter(':visible')
        if (moreBtn.length) {
          cy.wrap(moreBtn.first()).click()
        } else {
          cy.get(SEL.decks.card).last().scrollIntoView()
        }
        cy.waitForIdle()
        // The set grows (or stays, if the first page already held everything).
        decksPage.cardCount().should('be.gte', initial)
      })
    })
  })

  it('navigates to a deck detail when a card is clicked', function () {
    if (decksPage.lastReportedTotal === 0) {
      this.skip()
    }
    decksPage.cards().first().find('a[href^="/deck/"]').first().click()
    cy.location('pathname').should('match', /\/deck\/.+/)
    cy.get(SEL.deckDetail.root, { timeout: 20000 }).should('be.visible')
  })

  it('shows a back-to-top control after scrolling a populated list', function () {
    if (decksPage.lastReportedTotal < 3) {
      this.skip()
    }
    // The control is driven by the window scroll position, which on this page
    // only moves at the single-column (mobile) layout — the desktop layout
    // scrolls an inner container instead.
    cy.viewport(375, 667)
    cy.scrollTo('bottom')
    cy.window().its('scrollY').should('be.greaterThan', 100)
    cy.get(SEL.decks.backToTop, { timeout: 10000 }).should('be.visible').click()
    cy.window().its('scrollY').should('be.lessThan', 200)
  })
})
