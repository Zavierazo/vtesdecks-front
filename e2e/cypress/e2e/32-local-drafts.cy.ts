import { authenticate, mockCatalogs } from '../support/offline-fixtures'

function drafts() {
  return cy
    .window()
    .then((win) =>
      JSON.parse(win.localStorage.getItem('namedDeckDrafts_v1') ?? '[]'),
    )
}
function leave(choice: string) {
  cy.get('app-header a[href="/cards/crypt"]').filter(':visible').first().click()
  cy.get('app-leave-builder-modal').should('contain.text', 'stored as a draft')
  cy.contains('app-leave-builder-modal button', choice).click()
  cy.get('app-leave-builder-modal').should('not.exist')
}
function restore(name: string) {
  cy.contains('app-local-drafts-modal .border', name)
    .find('button.btn-primary')
    .click()
  cy.get('#name').should('have.value', name)
}
describe('Automatic local drafts', () => {
  it('keeps independent drafts, restores visibility, and supports discard and deletion', () => {
    let offline = false
    cy.on('window:before:load', (win) => {
      Object.defineProperty(win.navigator, 'onLine', { get: () => !offline })
    })
    mockCatalogs()
    cy.intercept({ url: '**/api/1.0/**', middleware: true }, (req) => {
      if (offline) {
        req.destroy()
      }
    })
    cy.visit('/decks/builder', { onBeforeLoad: authenticate })
    cy.get('#name').should('be.enabled')
    cy.window().then((win) => {
      offline = true
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('#name').type('First deck')
    cy.get('#published').should('be.checked')
    cy.get('.draft-sync-icon').should('have.class', 'is-syncing')
    cy.get('.draft-sync-icon').should('have.class', 'bi-check2')
    leave('Continue editing')
    cy.location('pathname').should('eq', '/decks/builder')
    leave('Keep draft and leave')
    cy.location('pathname').should('eq', '/cards/crypt')
    cy.visit('/decks/builder')
    cy.contains('app-local-drafts-modal button', 'Start a new deck').click()
    cy.get('#name').type('Second deck')
    drafts().should('have.length', 2)
    leave('Discard draft and leave')
    drafts().should('have.length', 1)
    cy.visit('/decks/builder')
    restore('First deck')
    cy.get('#published').should('be.checked').uncheck()
    cy.get('#name').clear().type('First deck revised')
    cy.reload()
    restore('First deck revised')
    cy.get('#published').should('not.be.checked')
    leave('Keep draft and leave')
    cy.visit('/decks/builder')
    cy.contains('app-local-drafts-modal .border', 'First deck revised').within(
      () => {
        cy.get('button.btn-outline-danger').click()
        cy.get('button.btn-danger').click()
      },
    )
    drafts().should('have.length', 0)
  })
  it('restores Collection Tracker and refreshes ownership data', () => {
    mockCatalogs()
    cy.intercept('POST', '**/user/collections/cards/search*', {
      body: { content: [] },
    }).as('collection')
    cy.visit('/decks/builder', { onBeforeLoad: authenticate })
    cy.get('#name').should('be.enabled').type('Tracked draft')
    cy.contains('app-builder button', 'Collection Tracker')
      .click()
      .should('have.class', 'btn-primary')
    cy.wait('@collection')
    cy.reload()
    restore('Tracked draft')
    cy.contains('app-builder button', 'Collection Tracker').should(
      'have.class',
      'btn-primary',
    )
    cy.wait('@collection')
    cy.contains('app-builder button', 'Collection Tracker')
      .click()
      .should('have.class', 'btn-outline-primary')
    cy.reload()
    restore('Tracked draft')
    cy.contains('app-builder button', 'Collection Tracker').should(
      'have.class',
      'btn-outline-primary',
    )
  })
})
