import { SEL } from '../support/selectors'

/**
 * Global search modal.
 *
 * The search input requires a minimum of 3 characters before it queries the
 * `/search` endpoint (debounced 300ms). To stay data-agnostic we derive a real
 * 3-character term from a card the backend currently serves, guaranteeing the
 * query is meaningful without hard-coding any value.
 *
 * Result behaviour differs by type: card results open a card modal, deck/user
 * results navigate. In every case the search modal closes — that is the stable,
 * data-independent assertion we lean on.
 */
describe('Global search', () => {
  let term: string | null = null

  before(() => {
    // Resolve a real ≥3-char search term from live crypt data once.
    cy.request({
      url: `${Cypress.env('apiUrl')}/cards/crypt`,
      failOnStatusCode: false,
    }).then((res) => {
      const list = Array.isArray(res.body) ? res.body : (res.body?.cards ?? [])
      const named = list.find(
        (c: any) => typeof c?.name === 'string' && c.name.length >= 3,
      )
      if (named) {
        const cleaned = String(named.name).replace(/[^a-zA-Z]/g, '')
        term = cleaned.length >= 3 ? cleaned.slice(0, 3) : null
      }
    })
  })

  beforeEach(() => {
    cy.visitApp('/')
  })

  it('opens and closes the search modal', () => {
    cy.openSearch()
    cy.get(SEL.modal).should('be.visible')
    cy.get('body').type('{esc}')
    cy.get(SEL.modal).should('not.exist')
  })

  it('does not query below the 3-character minimum', () => {
    cy.intercept('GET', '**/search**').as('search')
    cy.openSearch()
    cy.get(SEL.search.input).type('ab') // 2 chars — below threshold
    // Assert no request fired within the debounce window (bounded negative wait).
    cy.wait(700)
    cy.get('@search.all').should('have.length', 0)
  })

  it('returns a structured response and renders results for a real term', function () {
    if (!term) this.skip()
    cy.intercept('GET', '**/search**').as('search')
    cy.openSearch()
    cy.get(SEL.search.input).type(term!)
    cy.wait('@search', { timeout: 20000 }).then((interception) => {
      expect(interception.response?.statusCode).to.be.oneOf([200, 304])
      const body = interception.response?.body
      expect(body, 'search payload present').to.exist
      expect(body).to.satisfy(
        (b: any) => 'cards' in b || 'decks' in b || 'users' in b,
        'response groups results by type',
      )
    })
    // A term taken from a real card name must surface at least one result.
    cy.get(SEL.search.result, { timeout: 10000 }).should(
      'have.length.greaterThan',
      0,
    )
  })

  it('selecting a result closes the search modal (navigation or card modal)', function () {
    if (!term) this.skip()
    cy.intercept('GET', '**/search**').as('search')
    cy.openSearch()
    cy.get(SEL.search.input).type(term!)
    cy.wait('@search', { timeout: 20000 })
    cy.get(SEL.search.result, { timeout: 10000 }).should(
      'have.length.greaterThan',
      0,
    )
    // selectResult() always closes the search modal; card results then open a
    // card modal, deck/user results navigate. The search input disappearing is
    // the universal, data-independent outcome.
    cy.get(SEL.search.result).first().click()
    cy.get(SEL.search.input).should('not.exist')
  })

  it('updates results as the query is refined', function () {
    if (!term) this.skip()
    cy.intercept('GET', '**/search**').as('search')
    cy.openSearch()
    cy.get(SEL.search.input).type(term!)
    cy.wait('@search', { timeout: 20000 })
    // Refine with an unlikely suffix; the modal stays responsive (results or a
    // clear empty-state), never crashing.
    cy.get(SEL.search.input).type('qzx')
    cy.waitForIdle()
    cy.get(SEL.modal).should('be.visible')
  })
})
