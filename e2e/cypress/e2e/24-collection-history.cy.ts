import { SEL } from '../support/selectors'

/**
 * Collection History view — new in 2.73.0.
 * A chronological log of collection changes, reachable for the whole
 * collection (more-menu), a single binder and a single card. Read-only, so the
 * spec never mutates the demo account's collection.
 */
describe('Collection history', () => {
  beforeEach(() => {
    cy.login()
    cy.visitApp('/collection')
    cy.waitForIdle()
  })

  it('opens the whole-collection history from the more menu', () => {
    cy.intercept('GET', '**/user/collections/cards/history*').as('history')
    cy.get('#moreMenuButton').click()
    cy.get(SEL.ngbDropdownMenu)
      .contains(/collection history/i)
      .click()
    cy.wait('@history').its('response.statusCode').should('eq', 200)
    cy.get(SEL.modal, { timeout: 10000 }).should('be.visible')
    cy.get(SEL.modal).contains(/collection history/i)
    // Data-agnostic: either the empty state or the grouped table renders.
    cy.get(SEL.modal).then(($modal) => {
      const hasTable = $modal.find('table tbody tr').length > 0
      if (hasTable) {
        cy.get(SEL.modal)
          .find('table thead')
          .contains(/action/i)
      } else {
        cy.get(SEL.modal).contains(/no changes recorded yet/i)
      }
    })
    cy.get(SEL.modalClose).first().click({ force: true })
    cy.get(SEL.modal).should('not.exist')
  })

  it('opens a single-card history from the row actions (when rows exist)', () => {
    cy.ifExists(
      'app-collection-cards-list tbody tr i.bi-three-dots-vertical',
      'collection has no card rows to open a history for',
      () => {
        cy.intercept('GET', '**/user/collections/cards/history*').as(
          'cardHistory',
        )
        cy.get('app-collection-cards-list tbody tr i.bi-three-dots-vertical')
          .first()
          .parents('button')
          .first()
          .click()
        cy.get(SEL.ngbDropdownMenu)
          .contains(/view history/i)
          .click()
        // The request is scoped to the clicked card.
        cy.wait('@cardHistory').its('request.url').should('include', 'cardId=')
        cy.get(SEL.modal, { timeout: 10000 }).should('be.visible')
        cy.get(SEL.modal).contains(/collection history/i)
        cy.get(SEL.modalClose).first().click({ force: true })
        cy.get(SEL.modal).should('not.exist')
      },
    )
  })
})
