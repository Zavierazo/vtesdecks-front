/**
 * Public wishlist view — new in 2.73.0.
 * A user's wishlist is shareable at /collections/users/:username/wishlist when
 * their visibility is public. The spec seeds one row for the demo account via
 * the API, verifies the anonymous view, then removes the row again.
 */

const username = Cypress.env('username') as string
const SEED_CARD_ID = 200001 // Aabbt Kindred (crypt)

describe('Wishlist (public share view)', () => {
  let token: string

  before(() => {
    // Authenticate once directly against the API (the backend ignores
    // reCAPTCHA in this environment) and seed a single wishlist row.
    const form = new FormData()
    form.append('username', username)
    form.append('password', Cypress.env('password'))
    form.append('g-recaptcha-response', 'e2e')
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/auth/login`,
      body: form,
    }).then((res) => {
      // FormData bodies come back as ArrayBuffer — decode manually.
      const body = JSON.parse(new TextDecoder().decode(res.body))
      token = body.token
      expect(token, 'auth token').to.be.a('string').and.not.be.empty
      cy.request({
        method: 'PUT',
        url: `${Cypress.env('apiUrl')}/user/wishlist/visibility?publicVisibility=true`,
        headers: { Authorization: token },
        body: {},
      })
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/user/wishlist/cards`,
        headers: { Authorization: token },
        body: { cardId: SEED_CARD_ID, number: 1, language: 'EN' },
      })
    })
  })

  after(() => {
    // Remove the seeded row(s) so the demo account is left untouched.
    cy.request({
      url: `${Cypress.env('apiUrl')}/user/wishlist/cards?page=0&size=100&sortBy=cardName&sortDirection=asc`,
      headers: { Authorization: token },
    }).then(({ body }) => {
      ;(body.content ?? [])
        .filter((card: { cardId: number }) => card.cardId === SEED_CARD_ID)
        .forEach((card: { id: number }) => {
          cy.request({
            method: 'DELETE',
            url: `${Cypress.env('apiUrl')}/user/wishlist/cards/${card.id}`,
            headers: { Authorization: token },
          })
        })
    })
  })

  it('shows a public wishlist to anonymous visitors', () => {
    cy.intercept('GET', `**/collections/users/${username}/wishlist*`).as(
      'publicWishlist',
    )
    cy.visitApp(`/collections/users/${username}/wishlist`)
    cy.wait('@publicWishlist').its('response.statusCode').should('eq', 200)
    cy.waitForIdle()
    // Title interpolates the username; the read-only list renders below it.
    cy.get('h1').invoke('text').should('match', new RegExp(username, 'i'))
    cy.get('app-wishlist-cards-list').should('exist')
    cy.get('app-wishlist-cards-list tbody tr').should('exist')
    // Read-only: no row-action dropdown is rendered for visitors.
    cy.get('app-wishlist-cards-list i.bi-three-dots-vertical').should(
      'not.exist',
    )
  })

  it('shows the unavailable state for a missing or private wishlist', () => {
    cy.visitApp('/collections/users/__no_such_user__/wishlist')
    cy.waitForIdle()
    cy.contains(/private or not available/i, { timeout: 15000 }).should(
      'be.visible',
    )
    cy.get('app-wishlist-cards-list').should('not.exist')
  })

  it('links the public wishlist from the user profile', () => {
    cy.visitApp(`/user/${username}`)
    cy.waitForIdle()
    // The profile shows a wishlist shelf card when the wishlist is public and
    // non-empty (both guaranteed by the seed).
    cy.get(
      `a[href="/collections/users/${username}/wishlist"], a[routerLink="/collections/users/${username}/wishlist"]`,
      { timeout: 20000 },
    )
      .first()
      .click({ force: true })
    cy.location('pathname').should(
      'include',
      `/collections/users/${username}/wishlist`,
    )
  })
})
