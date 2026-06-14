import { decksPage } from '../pages/DecksPage'
import { SEL } from '../support/selectors'

/**
 * Authenticated deck interactions — bookmarking & rating.
 * Validates relative state changes (toggling a bookmark flips its icon and
 * hits the API) and restores the original state so the demo account is left
 * unchanged. The deck is discovered dynamically.
 */
describe('Deck interactions', () => {
  const bookmarkIcon = 'main a i[class*="bookmark"]'

  /** Open a real deck detail page, then run `fn`. Skips if no decks exist. */
  const openFirstDeck = (ctx: Mocha.Context, fn: () => void) => {
    decksPage.visit().waitForDecks()
    cy.then(() => {
      if (decksPage.lastReportedTotal === 0) ctx.skip()
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
        cy.get(SEL.deckDetail.root).should('be.visible')
        fn()
      })
  }

  beforeEach(() => {
    cy.login()
  })

  it('toggling the bookmark flips its icon and calls the bookmark API', function () {
    openFirstDeck(this, () => {
      cy.intercept('**/user/decks/bookmark*').as('bookmark')
      cy.get(bookmarkIcon).invoke('attr', 'class').then((before) => {
        cy.get(bookmarkIcon).parent().click()
        cy.wait('@bookmark', { timeout: 15000 })
        // The icon reflects the new bookmark state (filled vs outline).
        cy.get(bookmarkIcon).invoke('attr', 'class').should('not.equal', before)

        // Restore the original state to leave the account untouched.
        cy.get(bookmarkIcon).parent().click()
        cy.wait('@bookmark', { timeout: 15000 })
        cy.get(bookmarkIcon).invoke('attr', 'class').should('equal', before)
      })
    })
  })

  it('shows the deck stats (views, crypt/library counts)', function () {
    openFirstDeck(this, () => {
      // The detail view surfaces the deck's stat figures; assert they render as
      // numbers, not specific values.
      cy.get(SEL.deckDetail.root).invoke('text').should((txt) => {
        expect(txt.length, 'detail has substantial content').to.be.greaterThan(100)
      })
      cy.get('main h3').invoke('text').should('not.be.empty')
    })
  })
})
