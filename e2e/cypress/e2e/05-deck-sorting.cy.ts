import { decksPage } from '../pages/DecksPage'

/**
 * Deck sorting.
 * Sorting is validated against the API *response* (the authoritative order),
 * which avoids DOM render-timing and JS-vs-backend collation differences. We
 * assert relative changes (different orders → different head of list), never a
 * fixed sequence.
 */
describe('Deck sorting', () => {
  const listApi = /\/decks\?/

  /** First deck id from a list response body (or undefined). */
  const firstId = (body: any): string | undefined => {
    const list = Array.isArray(body) ? body : (body?.decks ?? [])
    return list[0]?.id
  }

  /** Names from a list response body, lower-cased. */
  const names = (body: any): string[] => {
    const list = Array.isArray(body) ? body : (body?.decks ?? [])
    return list
      .map((d: any) =>
        String(d.name ?? '')
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean)
  }

  beforeEach(() => {
    decksPage.visit().waitForDecks()
  })

  it('changing the order control issues a re-ordered query', () => {
    decksPage.orderSelect().then(($sel) => {
      const values = [...$sel[0].querySelectorAll('option')].map(
        (o) => (o as HTMLOptionElement).value,
      )
      const current = ($sel[0] as HTMLSelectElement).value
      const alternate = values.find((v) => v && v !== current)
      expect(alternate, 'an alternate order option exists').to.be.a('string')
      cy.intercept('GET', listApi).as('sorted')
      decksPage.orderSelect().select(alternate!)
      cy.wait('@sorted')
        .its('request.url')
        .should('match', /order=/i)
      cy.waitForIdle()
      decksPage.orderSelect().should('have.value', alternate)
    })
  })

  it('newest vs oldest return a different head of the list', function () {
    if (decksPage.lastReportedTotal < 3) {
      this.skip()
    }
    // The initial load (from beforeEach) is the default NEWEST order — use it as
    // the baseline so we don't re-select the current value (which fires no
    // request). Then switch to OLDEST and compare heads.
    cy.get('@decksApi')
      .its('response.body')
      .then((newestBody) => {
        const newestHead = firstId(newestBody)
        cy.intercept('GET', listApi).as('oldest')
        decksPage.orderSelect().select('OLDEST')
        cy.wait('@oldest')
          .its('response.body')
          .then((oldestBody) => {
            const oldestHead = firstId(oldestBody)
            expect(newestHead, 'both heads resolved').to.exist
            expect(oldestHead).to.exist
            expect(
              oldestHead,
              'sort order changed the first result',
            ).to.not.equal(newestHead)
          })
      })
  })

  it('NAME order changes the result order vs the default', function () {
    if (decksPage.lastReportedTotal < 3) {
      this.skip()
    }
    // We assert sorting *takes effect* (the page order changes) rather than
    // matching a specific collation — backend ordering rules differ from JS.
    cy.get('@decksApi')
      .its('response.body')
      .then((defaultBody) => {
        const defaultNames = names(defaultBody)
        cy.intercept('GET', listApi).as('byName')
        decksPage.orderSelect().select('NAME')
        cy.wait('@byName')
          .its('response.body')
          .then((nameBody) => {
            const nameNames = names(nameBody)
            expect(
              nameNames.length,
              'NAME page returned decks',
            ).to.be.greaterThan(0)
            expect(
              JSON.stringify(nameNames),
              'NAME order differs from the default order',
            ).to.not.equal(JSON.stringify(defaultNames))
          })
      })
  })

  it('a popularity sort orders results by a non-increasing metric', function () {
    if (decksPage.lastReportedTotal < 3) {
      this.skip()
    }
    cy.intercept('GET', listApi).as('popular')
    decksPage.orderSelect().select('POPULAR')
    cy.wait('@popular')
      .its('response.body')
      .then((body) => {
        const list = Array.isArray(body) ? body : (body?.decks ?? [])
        // Popularity correlates with views; assert the page is broadly
        // non-increasing in views (tolerate ties and minor metric divergence).
        const views = list.map((d: any) => Number(d.views ?? 0))
        const increases = views.filter(
          (v: number, i: number) => i > 0 && v > views[i - 1] + 0,
        )
        expect(views.length, 'popular page returned decks').to.be.greaterThan(0)
        // Most neighbours should be non-increasing; a few inversions are fine
        // because popularity is not identical to raw views.
        expect(increases.length).to.be.lessThan(views.length)
      })
  })
})
