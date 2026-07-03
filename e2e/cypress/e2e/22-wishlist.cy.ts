import { SEL } from '../support/selectors'

/**
 * Wishlist manager (authenticated) — new in 2.73.0.
 * Covers the private wishlist page: toolbar, add/edit/delete lifecycle,
 * type tabs, priority filter and the visibility toggle. All entries created
 * here are removed again (UI delete + API cleanup safety net), so the demo
 * account's data is left untouched.
 */

// A stable, uniquely-named crypt card used for the add/edit/delete lifecycle.
const TEST_CARD = 'Aabbt Kindred'

/** Read the persisted auth token the same way the app's JWT interceptor does. */
const withAuthToken = (fn: (token: string) => void) => {
  cy.window().then((win) => {
    const raw =
      win.sessionStorage.getItem('auth') ?? win.localStorage.getItem('auth')
    expect(raw, 'persisted auth state').to.not.be.null
    const token = JSON.parse(raw!).token as string
    expect(token, 'auth token').to.be.a('string').and.not.be.empty
    fn(token)
  })
}

/** Remove every wishlist row matching the test card (idempotent cleanup). */
const cleanupTestCard = () => {
  withAuthToken((token) => {
    const api = Cypress.env('apiUrl')
    cy.request({
      url: `${api}/user/wishlist/cards?page=0&size=100&sortBy=cardName&sortDirection=asc&cardName=${encodeURIComponent(TEST_CARD)}`,
      headers: { Authorization: token },
    }).then(({ body }) => {
      ;(body.content ?? []).forEach((card: { id: number }) => {
        cy.request({
          method: 'DELETE',
          url: `${api}/user/wishlist/cards/${card.id}`,
          headers: { Authorization: token },
        })
      })
    })
  })
}

describe('Wishlist (private)', () => {
  beforeEach(() => {
    cy.login()
    cy.visitApp('/wishlist')
    cy.waitForIdle()
  })

  afterEach(() => {
    cleanupTestCard()
  })

  it('renders the wishlist page with its toolbar', () => {
    cy.location('pathname').should('include', '/wishlist')
    cy.contains('button', /add card/i).should('be.visible')
    cy.contains('button', /how to buy/i).should('be.visible')
    // Visibility toggle shows either state, depending on the account's data.
    cy.contains('button', /public|private/i).should('be.visible')
    cy.get('app-wishlist-cards-list').should('exist')
  })

  it('is reachable from the header navigation', () => {
    cy.visitApp('/')
    cy.get('nav a[routerLink="/wishlist"]').filter(':visible').first().click()
    cy.location('pathname').should('include', '/wishlist')
  })

  it('adds a card, edits its quantity inline and deletes it', () => {
    cy.intercept('POST', '**/user/wishlist/cards*').as('addCard')
    cy.intercept('PUT', '**/user/wishlist/cards/*').as('updateCard')
    cy.intercept('DELETE', '**/user/wishlist/cards/*').as('deleteCard')

    // --- Add through the modal (typeahead search over the local card store).
    cy.contains('button', /add card/i).click()
    cy.get(SEL.modal, { timeout: 10000 }).should('be.visible')
    cy.get(`${SEL.modal} input#search`).type(TEST_CARD.slice(0, 8))
    cy.get('ngb-typeahead-window button', { timeout: 10000 }).first().click()
    // force: the (aria-hidden) cookie-consent overlay sits over the footer.
    cy.contains(`${SEL.modal} button`, /save & close/i).click({ force: true })
    cy.wait('@addCard').its('response.statusCode').should('eq', 200)
    cy.get(SEL.modal).should('not.exist')

    // The new row is prepended to the list by the store.
    cy.contains('app-wishlist-cards-list td', TEST_CARD, {
      timeout: 10000,
    }).should('be.visible')

    // --- Inline quantity edit (click the qty cell, type, press enter).
    cy.contains('app-wishlist-cards-list td', TEST_CARD)
      .parent('tr')
      .find('td')
      .first()
      .click()
    cy.get('app-wishlist-cards-list input[type="number"]')
      .clear()
      .type('3{enter}')
    cy.wait('@updateCard').its('response.statusCode').should('eq', 200)
    cy.contains('app-wishlist-cards-list td', TEST_CARD)
      .parent('tr')
      .find('td')
      .first()
      .should('contain.text', '3')

    // --- Delete through the row actions dropdown (no confirm for single rows).
    cy.contains('app-wishlist-cards-list td', TEST_CARD)
      .parent('tr')
      .find('i.bi-three-dots-vertical')
      .parents('button')
      .first()
      .click()
    cy.get(SEL.ngbDropdownMenu)
      .contains(/delete/i)
      .click()
    cy.wait('@deleteCard').its('response.statusCode').should('eq', 200)
    cy.contains('app-wishlist-cards-list td', TEST_CARD).should('not.exist')
  })

  it('switches between the All / Crypt / Library tabs', () => {
    // Regex-scoped: a broad glob would also match the page's initial load.
    cy.intercept('GET', /user\/wishlist\/cards\?.*cardType=crypt/).as(
      'getCards',
    )
    cy.get('app-wishlist-cards-list .nav-tabs').within(() => {
      cy.contains('button', /^\s*crypt\s*$/i).click()
    })
    cy.wait('@getCards').its('response.statusCode').should('eq', 200)
    cy.get('app-wishlist-cards-list .nav-tabs')
      .contains('button', /^\s*crypt\s*$/i)
      .should('have.class', 'active')
    cy.get('app-wishlist-cards-list .nav-tabs').within(() => {
      cy.contains('button', /^\s*all\s*$/i).click()
    })
    cy.get('app-wishlist-cards-list .nav-tabs')
      .contains('button', /^\s*all\s*$/i)
      .should('have.class', 'active')
  })

  it('filters by priority through the toolbar select', () => {
    // Regex-scoped: a broad glob would also match the page's initial load.
    cy.intercept('GET', /user\/wishlist\/cards\?.*priority=HIGH/).as(
      'getCards',
    )
    cy.get('app-wishlist-cards-list select#priority').select('High')
    cy.wait('@getCards').its('response.statusCode').should('eq', 200)
    // The filter is reflected in the URL for deep-linking.
    cy.location('search').should('include', 'priority=HIGH')
  })

  it('toggles the wishlist visibility and restores it', () => {
    cy.intercept('PUT', '**/user/wishlist/visibility*').as('setVisibility')
    cy.contains('button', /^\s*(public|private)\s*$/i)
      .invoke('text')
      .then((before) => {
        cy.contains('button', /^\s*(public|private)\s*$/i).click()
        cy.wait('@setVisibility').its('response.statusCode').should('eq', 200)
        cy.contains('button', /^\s*(public|private)\s*$/i)
          .invoke('text')
          .should('not.equal', before)
        // Restore the original state so the run leaves no trace.
        cy.contains('button', /^\s*(public|private)\s*$/i).click()
        cy.wait('@setVisibility').its('response.statusCode').should('eq', 200)
        cy.contains('button', /^\s*(public|private)\s*$/i)
          .invoke('text')
          .should('equal', before)
      })
  })

  it('opens the shopping optimizer from "How to buy"', () => {
    // Seed one wishlist row through the API so the button is enabled even when
    // the demo wishlist is empty.
    withAuthToken((token) => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/user/wishlist/cards`,
        headers: { Authorization: token },
        body: { cardId: 200001, number: 1, language: 'EN' },
      })
    })
    cy.reload()
    cy.waitForIdle()

    cy.intercept('POST', '**/shopping/optimize*').as('optimize')
    cy.contains('button', /how to buy/i)
      .should('not.be.disabled')
      .click()
    cy.wait('@optimize').its('response.statusCode').should('eq', 200)
    cy.get(SEL.modal, { timeout: 15000 }).should('be.visible')
    cy.get(SEL.modal).contains(/best way to buy these cards/i)
    // The result always renders the totals block (data-agnostic).
    cy.get(SEL.modal).contains(/optimized total/i)
    cy.get(SEL.modalClose).first().click({ force: true })
    cy.get(SEL.modal).should('not.exist')
  })
})
