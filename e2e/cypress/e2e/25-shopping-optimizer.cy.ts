import { decksPage } from '../pages/DecksPage'
import { SEL } from '../support/selectors'

/**
 * Shopping optimizer ("How to buy") and "Add missing to Wishlist" — new in
 * 2.73.0. Both are launched from the deck detail page. The optimizer works for
 * anonymous visitors; the wishlist flow needs the collection tracker and a
 * logged-in session. Nothing is persisted: the wishlist modal is cancelled and
 * the collection-tracker toggle is restored.
 */
describe('Shopping optimizer & add-missing-to-wishlist (deck page)', () => {
  /** Resolve a real deck id from the current dataset (skip on empty data). */
  const withFirstDeckId = (ctx: Mocha.Context, fn: (id: string) => void) => {
    decksPage.visit().waitForDecks()
    cy.then(() => {
      if (decksPage.lastReportedTotal === 0) {
        ctx.skip()
      }
    })
    decksPage
      .cards()
      .first()
      .find('a[href^="/deck/"]')
      .first()
      .invoke('attr', 'href')
      .then((href) => {
        const id = String(href)
          .replace(/.*\/deck\//, '')
          .split(/[?#]/)[0]
        expect(id, 'derived deck id').to.not.be.empty
        fn(id)
      })
  }

  it('calculates a purchase plan for an anonymous visitor', function () {
    withFirstDeckId(this, (id) => {
      cy.intercept('POST', '**/shopping/optimize*').as('optimize')
      cy.visitApp(`/deck/${id}`)
      cy.waitForIdle()
      cy.contains('button', /how to buy/i)
        .scrollIntoView()
        .click()
      cy.wait('@optimize').its('response.statusCode').should('eq', 200)
      cy.get(SEL.modal, { timeout: 15000 }).should('be.visible')
      cy.get(SEL.modal).contains(/best way to buy these cards/i)
      // Whatever the dataset, a successful optimization renders the totals.
      cy.get(SEL.modal).contains(/optimized total/i)
      cy.get(SEL.modal).contains(/buying everything as singles/i)
      // Anonymous users never see the exclude-owned switch.
      cy.get(SEL.modal).find('#excludeOwned').should('not.exist')
      cy.get(SEL.modalClose).first().click({ force: true })
      cy.get(SEL.modal).should('not.exist')
    })
  })

  it('offers the exclude-owned switch to logged-in users', function () {
    cy.login()
    withFirstDeckId(this, (id) => {
      cy.intercept('POST', '**/shopping/optimize*').as('optimize')
      cy.visitApp(`/deck/${id}`)
      cy.waitForIdle()
      cy.contains('button', /how to buy/i)
        .scrollIntoView()
        .click()
      cy.get(SEL.modal, { timeout: 15000 }).should('be.visible')
      cy.get(SEL.modal).find('#excludeOwned').should('exist')
      // Toggling re-runs the optimization with the collection subtracted.
      cy.get(SEL.modal).find('#excludeOwned').click({ force: true })
      // Either a fresh result or the "all owned" notice — both are valid.
      cy.get(SEL.modal).contains(/optimized total|already own all/i, {
        timeout: 20000,
      })
      // Restore the persisted switch state for later runs.
      cy.get(SEL.modal).find('#excludeOwned').click({ force: true })
      cy.get(SEL.modal).contains(/optimized total/i, { timeout: 20000 })
      cy.get(SEL.modalClose).first().click({ force: true })
    })
  })

  it('previews the missing cards for the wishlist without saving', function () {
    cy.login()
    withFirstDeckId(this, (id) => {
      cy.visitApp(`/deck/${id}`)
      cy.waitForIdle()
      // The wishlist entry point only appears with the collection tracker on.
      cy.contains('button', /collection tracker/i)
        .scrollIntoView()
        .find('i')
        .invoke('attr', 'class')
        .then((before) => {
          const wasOn = /bi-check-square-fill/.test(String(before))
          if (!wasOn) {
            cy.contains('button', /collection tracker/i).click()
          }
          cy.intercept('GET', '**/user/collections/cards/**').as('owned')
          cy.contains('button', /add missing to wishlist/i)
            .scrollIntoView()
            .click()
          cy.get(SEL.modal, { timeout: 15000 }).should('be.visible')
          cy.get(SEL.modal).contains(/add missing cards to wishlist/i)
          // Either some cards are missing (table + priority select) or the
          // account owns the whole deck — assert whichever state rendered.
          cy.get(SEL.modal).contains(/missing|already own every card/i)
          // Cancel — this flow must not mutate the demo wishlist.
          cy.get(SEL.modal)
            .contains('button', /cancel/i)
            .click()
          cy.get(SEL.modal).should('not.exist')
          if (!wasOn) {
            // Restore the tracker to its original state.
            cy.contains('button', /collection tracker/i).click()
          }
        })
    })
  })
})
