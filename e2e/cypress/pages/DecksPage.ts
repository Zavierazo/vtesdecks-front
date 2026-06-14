import { SEL } from '../support/selectors'

/**
 * Page Object for the deck browser (/decks).
 *
 * All getters return live Cypress chainables; no data is hard-coded. Helpers
 * that need "the current list" read whatever the backend rendered.
 */
export class DecksPage {
  /** Grand total of matching decks the most recent list response reported. */
  lastReportedTotal = 0

  /** Number of deck items in the most recent list response page. */
  lastPageCount = 0

  /**
   * Intercept the *list* endpoint only. The list URL is `/decks?…`; the filter
   * panel also calls `/decks/tags?…`, so a plain `**\/decks**` glob would match
   * the wrong request. The regex matches `/decks?` but not `/decks/tags`.
   */
  visit(query = '') {
    cy.intercept('GET', /\/decks\?/).as('decksApi')
    cy.visitApp(`/decks${query}`)
    return this
  }

  /**
   * Wait for the list response, then wait for the cards to actually render when
   * the backend returned any (zoneless change detection paints just after the
   * response resolves, so reading the DOM immediately is unreliable).
   */
  waitForDecks() {
    cy.wait('@decksApi', { timeout: 30000 }).then((interception) => {
      const body: any = interception.response?.body
      const decks: unknown[] = Array.isArray(body) ? body : body?.decks ?? []
      this.lastPageCount = decks.length
      // Prefer the grand total when the API exposes it; fall back to page size.
      const total = Number(body?.total)
      this.lastReportedTotal = Number.isNaN(total) ? decks.length : total
      if (decks.length > 0) {
        cy.get(SEL.decks.card, { timeout: 20000 }).should('have.length.greaterThan', 0)
      }
    })
    cy.waitForIdle()
    return this
  }

  cards() {
    return cy.get('body').find(SEL.decks.card)
  }

  /** Count of currently rendered deck cards (0 for empty state). */
  cardCount() {
    return cy.get('body').then(($b) => $b.find(SEL.decks.card).length)
  }

  typeSelect() {
    return cy.get(SEL.decks.typeSelect)
  }

  orderSelect() {
    return cy.get(SEL.decks.orderSelect)
  }

  /** Read the ordered list of visible deck names (lower-cased, trimmed). */
  visibleNames() {
    return this.cards().then(($cards) =>
      Cypress._.map($cards.toArray(), (el) =>
        Cypress.$(el).find('h2').text().trim().toLowerCase(),
      ).filter(Boolean),
    )
  }

  openFiltersIfMobile() {
    cy.get('body').then(($b) => {
      const btn = $b.find(SEL.decks.filtersToggleMobile).filter(':visible')
      if (btn.length && $b.find(SEL.filters.root).filter(':visible').length === 0) {
        cy.wrap(btn.first()).click()
      }
    })
    return this
  }
}

export const decksPage = new DecksPage()
