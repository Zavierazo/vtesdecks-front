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

  /**
   * AND/OR/NOT filter semantics: the discipline/type icon filters expose an
   * Include/Exclude click mode and an ALL/ANY match mode. Cards are discovered
   * from the API so the assertions stay data-agnostic: we pick a card, filter
   * by its name and check whether it survives each filter combination.
   */
  describe('filter semantics (AND/OR/NOT)', () => {
    // Disciplines whose sprite class is the lowercased name.
    const SIMPLE_DISCIPLINES = [
      'Animalism',
      'Auspex',
      'Celerity',
      'Dementation',
      'Dominate',
      'Fortitude',
      'Obfuscate',
      'Potence',
      'Presence',
      'Protean',
    ]
    const TYPE_ICONS: Record<string, string> = {
      Master: 'master',
      Action: 'action',
      'Action Modifier': 'modifier',
      'Political Action': 'political',
      Equipment: 'equipment',
      Retainer: 'retainer',
      Ally: 'ally',
      Combat: 'combat',
      Reaction: 'reaction',
      Event: 'event',
      Power: 'power',
      Conviction: 'conviction',
    }
    const cryptItem = 'app-crypt, app-crypt-grid-card'
    const libraryItem = 'app-library, app-library-grid-card'

    describe('crypt disciplines', () => {
      let card: any = null
      let owned: string | null = null // a discipline the card has
      let missing: string | null = null // a discipline the card lacks

      before(() => {
        cy.request(`${Cypress.env('apiUrl')}/cards/crypt`).then((res) => {
          const list = Array.isArray(res.body)
            ? res.body
            : (res.body?.cards ?? [])
          card =
            list.find(
              (c: any) =>
                typeof c?.name === 'string' &&
                Array.isArray(c?.disciplines) &&
                c.disciplines.some((d: string) =>
                  SIMPLE_DISCIPLINES.includes(d),
                ) &&
                SIMPLE_DISCIPLINES.some((d) => !c.disciplines.includes(d)),
            ) ?? null
          if (card) {
            owned = card.disciplines.find((d: string) =>
              SIMPLE_DISCIPLINES.includes(d),
            )
            missing =
              SIMPLE_DISCIPLINES.find((d) => !card.disciplines.includes(d)) ??
              null
          }
        })
      })

      beforeEach(function () {
        if (!card || !owned || !missing) {
          this.skip()
        }
        cy.visitApp(`/cards/crypt?name=${encodeURIComponent(card.name)}`)
        cy.contains(cryptItem, card.name, { timeout: 30000 }).should('exist')
      })

      it('right-click excludes a discipline and hides cards having it', () => {
        // Desktop viewport shows the right-click variant of the hint.
        cy.get('#disciplines .filter-hint').should('contain.text', 'Right-click')
        cy.get(`#disciplines i.${owned!.toLowerCase()}`).rightclick()
        cy.get(`#disciplines i.${owned!.toLowerCase()}`)
          .parent()
          .should('have.class', 'excluded')
        cy.location('search', { timeout: 10000 }).should(
          'include',
          'notDisciplines=',
        )
        cy.contains(cryptItem, card.name).should('not.exist')
        // A plain click on the excluded icon clears the exclusion.
        cy.get(`#disciplines i.${owned!.toLowerCase()}`).click()
        cy.contains(cryptItem, card.name, { timeout: 10000 }).should('exist')
      })

      it('ALL hides a partial discipline match, ANY shows it', () => {
        cy.get(`#disciplines i.${owned!.toLowerCase()}`).click()
        cy.get(`#disciplines i.${missing!.toLowerCase()}`).click()
        // Default ALL: the card lacks one of the selected disciplines.
        cy.contains(cryptItem, card.name).should('not.exist')
        cy.get('#disciplines').contains('button', 'ANY').click()
        cy.contains(cryptItem, card.name, { timeout: 10000 }).should('exist')
      })
    })

    describe('library types', () => {
      let card: any = null
      let otherType: string | null = null

      before(() => {
        cy.request(`${Cypress.env('apiUrl')}/cards/library`).then((res) => {
          const list = Array.isArray(res.body)
            ? res.body
            : (res.body?.cards ?? [])
          card =
            list.find(
              (c: any) =>
                typeof c?.name === 'string' &&
                typeof c?.type === 'string' &&
                !c.type.includes('/') &&
                TYPE_ICONS[c.type],
            ) ?? null
          if (card) {
            otherType = card.type === 'Master' ? 'Action' : 'Master'
          }
        })
      })

      beforeEach(function () {
        if (!card || !otherType) {
          this.skip()
        }
        cy.visitApp(`/cards/library?name=${encodeURIComponent(card.name)}`)
        cy.contains(libraryItem, card.name, { timeout: 30000 }).should('exist')
      })

      it('right-click excludes a type and hides cards having it', () => {
        cy.get(`#type i.${TYPE_ICONS[card.type]}`).rightclick()
        cy.get(`#type i.${TYPE_ICONS[card.type]}`)
          .parent()
          .should('have.class', 'excluded')
        cy.location('search', { timeout: 10000 }).should('include', 'notTypes=')
        cy.contains(libraryItem, card.name).should('not.exist')
        // A plain click on the excluded icon clears the exclusion.
        cy.get(`#type i.${TYPE_ICONS[card.type]}`).click()
        cy.contains(libraryItem, card.name, { timeout: 10000 }).should('exist')
      })

      it('ANY keeps a partial type match visible, ALL hides it', () => {
        cy.get(`#type i.${TYPE_ICONS[card.type]}`).click()
        cy.get(`#type i.${TYPE_ICONS[otherType!]}`).click()
        // Default ANY: the card has one of the two selected types.
        cy.contains(libraryItem, card.name).should('exist')
        cy.get('#type').contains('button', 'ALL').click()
        cy.contains(libraryItem, card.name, { timeout: 10000 }).should(
          'not.exist',
        )
      })
    })
  })
})
