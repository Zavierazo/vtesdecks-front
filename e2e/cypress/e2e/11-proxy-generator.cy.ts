import { SEL } from '../support/selectors'

/**
 * Proxy generator (print proxies).
 * Validates the real workflow: add a card via the typeahead → it appears in the
 * proxy list → printing triggers proxy generation. Cards are discovered from
 * the in-memory crypt dataset, so nothing is hard-coded.
 */
describe('Proxy generator', () => {
  beforeEach(() => {
    cy.visitApp('/proxy-generator')
    cy.get(SEL.proxy.root, { timeout: 30000 }).should('exist')
  })

  it('renders the tool with card-add inputs and a print action', () => {
    cy.get('app-print-proxy input[type="text"]').should('have.length.greaterThan', 0)
    cy.get(SEL.proxy.printButton).should('exist')
  })

  it('adds a crypt card via the typeahead (it appears in the proxy list)', () => {
    // The first text input is the "add crypt card" typeahead.
    cy.get('app-print-proxy input[type="text"]').first().type('the')
    cy.get('ngb-typeahead-window button.dropdown-item', { timeout: 10000 })
      .should('have.length.greaterThan', 0)
      .first()
      .click()
    // A crypt card row now renders inside the proxy tool.
    cy.get('app-print-proxy app-crypt, app-print-proxy app-library', { timeout: 10000 })
      .should('have.length.greaterThan', 0)
  })

  it('printing a non-empty proxy triggers proxy generation', () => {
    cy.intercept('POST', '**/proxy*').as('generate')
    // Add a card first so the proxy is non-empty.
    cy.get('app-print-proxy input[type="text"]').first().type('the')
    cy.get('ngb-typeahead-window button.dropdown-item', { timeout: 10000 }).first().click()
    cy.get('app-print-proxy app-crypt, app-print-proxy app-library', { timeout: 10000 })
      .should('have.length.greaterThan', 0)

    cy.get(SEL.proxy.printButton).should('be.visible').click()
    // The print action calls the proxy-generation endpoint.
    cy.wait('@generate', { timeout: 30000 }).its('request.method').should('eq', 'POST')
    // App stays healthy regardless of the PDF result.
    cy.get(SEL.header).should('be.visible')
  })
})
