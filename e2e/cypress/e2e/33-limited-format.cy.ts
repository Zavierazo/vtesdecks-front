import { authenticate, mockCatalogs } from '../support/offline-fixtures'

describe('Limited Format selector', () => {
  it('shows asynchronously loaded formats without clicking None', () => {
    mockCatalogs()
    const format = {
      id: 42,
      name: 'Delayed format',
      sets: { Jyhad: true },
      allowed: { crypt: {}, library: {} },
      banned: { crypt: {}, library: {} },
    }
    cy.intercept('GET', '**/limitedFormats*', {
      body: [format],
      delay: 800,
    }).as('formats')
    cy.visit('/decks/builder', { onBeforeLoad: authenticate })
    cy.get('#name').should('be.enabled')
    cy.contains('app-builder button', 'Limited Format').click()
    cy.wait('@formats')
    cy.contains('app-limited-format-modal label', format.name).should(
      'be.visible',
    )
    cy.get('#format-42').check()
    cy.get('#format-42').should('be.checked')
  })
})
