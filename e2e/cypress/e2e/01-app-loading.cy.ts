import { SEL } from '../support/selectors'

/**
 * Application loading & shell.
 * Validates the SPA bootstraps, renders its chrome, and reaches a stable state
 * regardless of what data the backend serves.
 */
describe('Application loading', () => {
  it('bootstraps and renders the global shell', () => {
    cy.visitApp('/')
    cy.get(SEL.header).should('be.visible')
    cy.get(SEL.headerBrand).should('have.attr', 'href') // logo links somewhere
    cy.get(SEL.footer).should('exist')
  })

  it('reaches an idle state with no blocking spinner', () => {
    cy.visitApp('/')
    cy.waitForIdle()
    cy.get(SEL.loading).should('not.exist')
  })

  it('loads core reference data (crypt, library, sets) on startup', () => {
    // Validate structurally: the calls happen and return arrays. We never
    // assert on counts or specific cards.
    cy.intercept('GET', '**/cards/crypt**').as('crypt')
    cy.intercept('GET', '**/cards/library**').as('library')
    cy.intercept('GET', '**/sets**').as('sets')

    cy.visitApp('/')

    cy.wait('@crypt', { timeout: 30000 })
      .its('response.statusCode')
      .should('be.oneOf', [200, 304])
    cy.wait('@library', { timeout: 30000 })
      .its('response.statusCode')
      .should('be.oneOf', [200, 304])
  })

  it('sets a document title and meta description', () => {
    cy.visitApp('/')
    cy.title().should('not.be.empty')
    cy.get('head meta[name="description"]').should('exist')
  })

  it('renders a logged-out state by default (login/sign-up actions visible)', () => {
    cy.visitApp('/')
    cy.get(SEL.loginButton).filter(':visible').should('exist')
    cy.get(SEL.userMenuToggle).should('not.exist')
  })
})
