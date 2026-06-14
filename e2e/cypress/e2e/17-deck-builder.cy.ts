import { SEL } from '../support/selectors'

/**
 * Deck builder (authenticated) — CRUD-style interactions.
 *
 * We validate *relative* state changes (adding a card increases the crypt
 * counter; editing the name updates the field) rather than persisting specific
 * decks. Card data is discovered from whatever the builder modal shows, so the
 * test never depends on a particular card existing.
 *
 * To avoid polluting the demo account, the spec works on an in-memory draft and
 * does NOT click "Save", so nothing is written to the backend.
 */
describe('Deck builder', () => {
  beforeEach(() => {
    cy.login()
    cy.visitApp('/decks/builder')
    cy.waitForIdle()
    // A draft-recovery dialog may appear on entry — dismiss it if present.
    cy.get('body').then(($b) => {
      const close = $b.find(`${SEL.modal} ${SEL.modalClose}`)
      if (close.length) cy.wrap(close.first()).click()
    })
  })

  it('renders the builder with editable name & description', () => {
    cy.get('#name').should('be.visible')
    cy.get('app-markdown-textarea').should('exist')
  })

  it('updates the deck name field (edit reflects in the UI)', () => {
    const draftName = `E2E Draft ${Date.now()}`
    cy.get('#name').clear().type(draftName)
    cy.get('#name').should('have.value', draftName)
  })

  it('exposes the import options dropdown', () => {
    cy.get('#dropdownImport').click()
    cy.get(SEL.ngbDropdownMenu).should('be.visible')
    cy.get(SEL.ngbDropdownMenu)
      .contains(/amaranth/i)
      .should('exist')
    cy.get(SEL.ngbDropdownMenu).contains(/vdb/i).should('exist')
  })

  it('adding a crypt card increases the crypt counter (relative change)', () => {
    // Read the current crypt total (the circled number next to "Crypt").
    cy.get('span.circle_number')
      .first()
      .invoke('text')
      .then((before) => {
        const beforeN = parseInt(before.trim(), 10) || 0

        // Open the crypt builder modal via the section "+" button.
        cy.get('button[aria-label]')
          .filter((_, el) => /crypt/i.test(el.getAttribute('aria-label') || ''))
          .first()
          .click()

        cy.get(SEL.modal, { timeout: 20000 }).should('be.visible')
        // The crypt dataset is loaded, so the modal lists cards with "+" controls.
        cy.get(`${SEL.modal} i.bi-plus-square`, { timeout: 20000 })
          .should('have.length.greaterThan', 0)
          .first()
          .click({ force: true })

        // Close the modal and verify the crypt counter went up.
        cy.get(SEL.modalClose).first().click()
        cy.get(SEL.modal).should('not.exist')
        cy.get('span.circle_number')
          .first()
          .invoke('text')
          .then((after) => {
            const afterN = parseInt(after.trim(), 10) || 0
            expect(
              afterN,
              'crypt count increased after adding a card',
            ).to.be.greaterThan(beforeN)
          })
      })
  })

  it("lists the authenticated user's decks (type=USER)", () => {
    cy.intercept('GET', /\/decks\?/).as('myDecks')
    cy.visitApp('/decks?type=USER')
    cy.wait('@myDecks').then((interception) => {
      expect(interception.request.url).to.match(/type=USER/i)
      const body: any = interception.response?.body
      const decks: unknown[] = Array.isArray(body) ? body : (body?.decks ?? [])
      cy.waitForIdle()
      // The view is consistent with the response: cards when there are decks,
      // a reset affordance when the account has none. Both are valid states.
      if (decks.length === 0) {
        cy.contains('button', /reset/i).should('exist')
      } else {
        cy.get(SEL.decks.card).should('have.length.greaterThan', 0)
      }
    })
  })
})
