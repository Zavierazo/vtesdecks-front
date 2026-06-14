import { SEL } from '../support/selectors'

/**
 * Collection manager (authenticated).
 * Exercises the collection toolbar workflows — modals, dropdowns, multi-select
 * and navigation — without destructively mutating the demo account's data.
 */
describe('Collection', () => {
  beforeEach(() => {
    cy.login()
    cy.visitApp('/collection')
    cy.waitForIdle()
  })

  it('renders the collection page with its toolbar', () => {
    cy.location('pathname').should('include', '/collection')
    cy.contains('button', /add card/i).should('be.visible')
    cy.get('app-collection-cards-list').should('exist')
  })

  it('opens the "add card" dialog and closes it', () => {
    cy.contains('button', /add card/i).click()
    cy.get(SEL.modal, { timeout: 10000 }).should('be.visible')
    cy.get(SEL.modalClose).first().click({ force: true })
    cy.get(SEL.modal).should('not.exist')
  })

  it('opens the binders dropdown', () => {
    cy.get('#bindersMenuButton').click()
    cy.get(SEL.ngbDropdownMenu).should('be.visible')
    // "View all" binders entry is always present.
    cy.get(SEL.ngbDropdownMenu)
      .find('a[routerLink="/collection/binders"]')
      .should('exist')
  })

  it('toggles multi-select mode (UI state change)', () => {
    // The toggle button swaps its icon between empty and filled check-square.
    cy.contains('button', /multiselect|multi-select|select/i)
      .find('i')
      .invoke('attr', 'class')
      .then((before) => {
        cy.contains('button', /multiselect|multi-select|select/i).click()
        cy.contains('button', /multiselect|multi-select|select/i)
          .find('i')
          .invoke('attr', 'class')
          .should('not.equal', before)
      })
  })

  it('navigates to the collection statistics view', () => {
    cy.get(
      'button[routerLink="/collection/stats"], a[routerLink="/collection/stats"]',
    )
      .first()
      .click({ force: true })
    cy.location('pathname').should('include', '/collection/stats')
  })

  it('opens the "more" menu with import/export/delete actions', () => {
    cy.get('#moreMenuButton').click()
    cy.get(SEL.ngbDropdownMenu).should('be.visible')
    cy.get(SEL.ngbDropdownMenu)
      .contains(/import/i)
      .should('exist')
    cy.get(SEL.ngbDropdownMenu)
      .contains(/export/i)
      .should('exist')
  })
})
