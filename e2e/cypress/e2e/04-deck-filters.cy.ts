import { decksPage } from '../pages/DecksPage'
import { SEL } from '../support/selectors'

/**
 * Deck filtering & type selection.
 * Filters are validated by their *effect* (the result set changes / the request
 * carries the filter), never by an expected number of results.
 */
describe('Deck filters', () => {
  // Match the list endpoint only (not /decks/tags).
  const listApi = /\/decks\?/

  beforeEach(() => {
    decksPage.visit().waitForDecks()
  })

  it('changing deck type triggers a refreshed query and updates the URL/state', () => {
    cy.intercept('GET', listApi).as('filtered')

    decksPage.typeSelect().then(($sel) => {
      const options = [...$sel[0].querySelectorAll('option')]
        .map((o) => (o as HTMLOptionElement).value)
        .filter((v) => v && v !== 'ALL')
      expect(options.length, 'alternate type options exist').to.be.greaterThan(0)
      const target = options[0]
      decksPage.typeSelect().select(target)
      cy.wait('@filtered').its('request.url').should('match', /type=/i)
      cy.waitForIdle()
      decksPage.typeSelect().should('have.value', target)
      cy.location('search').should('include', `type=${target}`)
    })
  })

  it('a name filter narrows the result set and is reflected in the request', function () {
    if (decksPage.lastReportedTotal === 0) {
      this.skip()
    }
    // Derive a search term from real, currently-displayed data so the filter is
    // meaningful without hard-coding anything.
    decksPage.cards().first().find('h2').invoke('text').then((rawName) => {
      const term = rawName.trim().split(/\s+/)[0]?.replace(/[^a-zA-Z]/g, '').slice(0, 4)
      if (!term || term.length < 2) {
        this.skip() // could not derive a usable term from the data
      }
      cy.intercept('GET', listApi).as('named')
      decksPage.openFiltersIfMobile()
      cy.get(SEL.filters.name).first().scrollIntoView()
      cy.get(SEL.filters.name).first().clear({ force: true }).type(term, { force: true })
      // The request carries the typed name...
      cy.wait('@named').its('request.url').should('match', new RegExp(`name=${term}`, 'i'))
      cy.waitForIdle()
      // ...and the result set is bounded by the unfiltered total (a filter
      // cannot grow the list).
      cy.get('@named').its('response.body').then((body) => {
        const filtered = Array.isArray(body) ? body : body?.decks ?? []
        const filteredTotal = body?.total ?? filtered.length
        expect(Number(filteredTotal)).to.be.lte(decksPage.lastReportedTotal + 0)
      })
    })
  })

  it('resetting filters clears applied filter inputs', () => {
    // Ensure a filters panel is mounted: the desktop sidebar renders the field
    // directly; on smaller layouts open the offcanvas via the funnel button.
    cy.get('body').then(($b) => {
      if ($b.find(SEL.filters.author).length === 0) {
        const funnel = $b.find('button:has(i.bi-funnel-fill)').filter(':visible')
        if (funnel.length) cy.wrap(funnel.first()).click()
      }
    })

    cy.get(SEL.filters.author).should('exist')
    cy.get(SEL.filters.author).first().scrollIntoView()
    cy.get(SEL.filters.author).first().clear({ force: true }).type('zzqqxx', { force: true })
    cy.get(SEL.filters.author).first().should('have.value', 'zzqqxx')

    cy.get(SEL.filters.reset).first().click({ force: true })
    cy.waitForIdle()
    cy.get(SEL.filters.author).first().should('have.value', '')
  })

  it('an author filter that matches nothing yields a valid empty state', function () {
    if (decksPage.lastReportedTotal === 0) {
      this.skip()
    }
    cy.intercept('GET', listApi).as('authored')
    decksPage.openFiltersIfMobile()
    cy.get(SEL.filters.author).first().scrollIntoView()
    // A nonsense author is overwhelmingly unlikely to exist.
    cy.get(SEL.filters.author).first().clear({ force: true }).type('zzqqxxnope123', { force: true })
    cy.wait('@authored')
    cy.waitForIdle()
    // No cards, and the app offers a reset affordance rather than crashing.
    decksPage.cardCount().should('eq', 0)
    cy.contains('button', /reset/i).should('exist')
  })

  it('deep-links a pre-applied type filter from the URL', () => {
    decksPage.visit('?type=TOURNAMENT').waitForDecks()
    cy.get('@decksApi').its('request.url').should('match', /type=TOURNAMENT/i)
    decksPage.typeSelect().should('have.value', 'TOURNAMENT')
  })
})
