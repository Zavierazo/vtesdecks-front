import {
  authenticate,
  mockCatalogs,
  crypt,
  library,
} from '../support/offline-fixtures'

describe('Builder direct entry', () => {
  it('loads an existing deck when catalogs arrive late, then survives a reload', () => {
    mockCatalogs(2000)
    const deck = {
      id: 'cold-entry',
      name: 'Direct entry deck',
      description: 'Loaded from server',
      published: true,
      collection: false,
      cards: [
        { id: crypt.id, number: 12 },
        { id: library.id, number: 60 },
      ],
    }
    cy.intercept('GET', '**/user/decks/builder/cold-entry*', { body: deck }).as(
      'deck',
    )
    // A fresh browser context has no in-memory catalogs or prior navigation.
    cy.visit('/decks/builder?id=cold-entry', {
      onBeforeLoad(win) {
        authenticate(win)
        win.indexedDB.deleteDatabase('vtesdecks')
      },
    })
    cy.wait('@deck')
    cy.get('#name').should('have.value', deck.name)
    cy.get('#published').should('be.checked')
    cy.get('app-builder')
      .should('contain.text', crypt.name)
      .and('contain.text', library.name)
    cy.contains('app-builder', 'NaN').should('not.exist')
    cy.reload()
    cy.get('#name').should('have.value', deck.name)
    cy.get('#published').should('be.checked')
    cy.get('app-builder')
      .should('contain.text', crypt.name)
      .and('contain.text', library.name)
    cy.get('app-local-drafts-modal').should('not.exist')
  })
  it('offers saved-deck edits only on that deck and restores its identity', () => {
    mockCatalogs()
    const deck = {
      id: 'saved-deck',
      name: 'Server version',
      published: true,
      collection: false,
      cards: [],
    }
    cy.intercept('GET', '**/user/decks/builder/saved-deck*', { body: deck })
    cy.intercept('GET', '**/user/decks/builder/other-deck*', {
      body: { ...deck, id: 'other-deck' },
    })
    cy.visit('/decks/builder?id=saved-deck', { onBeforeLoad: authenticate })
    cy.get('#name')
      .should('have.value', 'Server version')
      .clear()
      .type('Local changes')
    cy.get('#published').uncheck()
    cy.get('app-header a[href="/cards/crypt"]')
      .filter(':visible')
      .first()
      .click()
    cy.contains(
      'app-leave-builder-modal button',
      'Keep draft and leave',
    ).click()
    cy.visit('/decks/builder')
    cy.get('#name').should('be.enabled').and('have.value', '')
    cy.get('app-local-drafts-modal').should('not.exist')
    cy.visit('/decks/builder?id=other-deck')
    cy.get('#name').should('have.value', 'Server version')
    cy.get('app-draft-recovery-modal').should('not.exist')
    cy.visit('/decks/builder?id=saved-deck')
    cy.get('app-draft-recovery-modal button.btn-primary').click()
    cy.get('#name').should('have.value', 'Local changes')
    cy.get('#published').should('not.be.checked')
    cy.get('app-builder a[href="/deck/saved-deck"]').should('exist')
    cy.get('#name').clear().type('Local changes again')
    cy.window().then((win) => {
      const drafts = JSON.parse(win.localStorage.getItem('namedDeckDrafts_v1')!)
      expect(drafts).to.have.length(1)
      expect(drafts[0].sourceDeckId).to.eq('saved-deck')
    })
    cy.reload()
    cy.get('app-draft-recovery-modal button.btn-secondary').click()
    cy.get('#name').should('have.value', 'Server version')
    cy.window().then((win) =>
      expect(
        JSON.parse(win.localStorage.getItem('namedDeckDrafts_v1')!),
      ).to.have.length(0),
    )
  })
})
