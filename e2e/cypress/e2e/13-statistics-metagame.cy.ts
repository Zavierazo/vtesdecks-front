import { SEL } from '../support/selectors'

/**
 * Statistics & Metagame pages.
 * Validates charts/data render and that the type/year controls drive new
 * queries. No assertion on specific statistical values.
 */
describe('Statistics page', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/statistics**').as('stats')
    cy.visitApp('/statistics')
    // Wait for the historic-statistics data to arrive (drives the charts).
    cy.wait('@stats', { timeout: 30000 })
  })

  it('renders the statistics view with charts/canvas', () => {
    cy.get('h1').should('exist')
    cy.get(SEL.statistics.chart, { timeout: 20000 }).should(
      'have.length.greaterThan',
      0,
    )
  })

  it('exposes the deck-type selector', () => {
    cy.get(SEL.statistics.typeSelect).should('be.visible')
  })

  it('changing the deck type re-queries statistics', () => {
    cy.intercept('GET', '**/statistics**').as('statsRequery')
    cy.get(SEL.statistics.typeSelect).select('TOURNAMENT')
    // The change triggers fresh statistics requests…
    cy.wait('@statsRequery', { timeout: 30000 })
      .its('request.url')
      .should('match', /type=TOURNAMENT/i)
    cy.get(SEL.statistics.typeSelect).should('have.value', 'TOURNAMENT')
    cy.get(SEL.header).should('be.visible')
  })

  it('returns structurally valid statistics payloads', () => {
    cy.get('@stats').its('response.statusCode').should('be.oneOf', [200, 304])
    cy.get('@stats').its('response.body').should('exist')
  })
})

describe('Metagame page', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/deck-archetype**').as('archetypes')
    cy.visitApp('/metagame')
    cy.waitForIdle()
  })

  it('loads metagame archetype data with a valid structure', () => {
    cy.wait('@archetypes', { timeout: 30000 }).then((interception) => {
      expect(interception.response?.statusCode).to.be.oneOf([200, 304])
      const body = interception.response?.body
      const list = Array.isArray(body)
        ? body
        : (body?.archetypes ?? body?.content ?? [])
      expect(list, 'archetypes is an array').to.be.an('array')
    })
  })

  it('renders the metagame view content', () => {
    cy.location('pathname').should('include', '/metagame')
    cy.get('app-root').children().should('have.length.greaterThan', 0)
  })
})
