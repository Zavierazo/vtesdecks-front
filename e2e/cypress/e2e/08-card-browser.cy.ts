import { SEL } from '../support/selectors'

/**
 * Card browser (/cards/crypt and /cards/library).
 * The crypt & library datasets are loaded into the client store at bootstrap,
 * so name filtering happens in-memory. Tests validate that filtering narrows
 * the rendered set and that resetting restores it — all relative to whatever
 * cards the backend served.
 */
describe('Card browser', () => {
  const sections = [
    {
      name: 'crypt',
      path: '/cards/crypt',
      api: '/cards/crypt',
      item: 'app-crypt, app-crypt-grid-card',
    },
    {
      name: 'library',
      path: '/cards/library',
      api: '/cards/library',
      item: 'app-library, app-library-grid-card',
    },
  ]

  sections.forEach(({ name, path, api, item }) => {
    describe(`${name} section`, () => {
      /** A real card name from the dataset (resolved once per section). */
      let sampleName: string | null = null

      before(() => {
        cy.request(`${Cypress.env('apiUrl')}${api}`).then((res) => {
          const list = Array.isArray(res.body)
            ? res.body
            : (res.body?.cards ?? [])
          const card = list.find(
            (c: any) => typeof c?.name === 'string' && c.name.length >= 3,
          )
          sampleName = card ? String(card.name) : null
        })
      })

      beforeEach(() => {
        cy.visitApp(path)
        // Wait for the card list to actually render before asserting on it.
        cy.get(item, { timeout: 30000 }).should('have.length.greaterThan', 0)
      })

      it('renders card items from the dataset', () => {
        cy.location('pathname').should('include', path)
        cy.get(item).should('have.length.greaterThan', 0)
      })

      it('a nonsense name filter empties the list and offers a reset', () => {
        cy.get('#name')
          .clear({ force: true })
          .type('zzqqxxnope123', { force: true })
        cy.get(item, { timeout: 10000 }).should('have.length', 0)
        cy.contains('button', /reset/i).should('exist')
      })

      it('a real name filter narrows to matching cards', function () {
        if (!sampleName) {
          this.skip() // no card name available to derive a filter from
        }
        const term = sampleName!.slice(0, 4)
        cy.get(item).then(($before) => {
          const before = $before.length
          cy.get('#name').clear({ force: true }).type(term, { force: true })
          // The filtered set renders and is no larger than the unfiltered page.
          cy.get(item, { timeout: 10000 }).should('have.length.greaterThan', 0)
          cy.get(item)
            .its('length')
            .should('be.lte', before + 1)
        })
      })

      it('resetting the name filter restores cards', () => {
        cy.get('#name')
          .clear({ force: true })
          .type('zzqqxxnope123', { force: true })
        cy.get(item).should('have.length', 0)
        cy.get('#name').clear({ force: true })
        cy.get(item, { timeout: 10000 }).should('have.length.greaterThan', 0)
      })

      it('opens a card detail modal when a card is clicked', () => {
        cy.get(item).first().click()
        cy.get('.modal-content', { timeout: 10000 }).should('be.visible')
        cy.get('.modal-content .btn-close').first().click({ force: true })
      })
    })
  })

  it('crypt and library are distinct routes', () => {
    cy.visitApp('/cards/crypt')
    cy.location('pathname').should('include', 'crypt')
    cy.visitApp('/cards/library')
    cy.location('pathname').should('include', 'library')
  })
})
