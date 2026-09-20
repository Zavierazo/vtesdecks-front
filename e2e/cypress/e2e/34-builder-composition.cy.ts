import {
  authenticate,
  mockCatalogs,
  crypt,
  library,
} from '../support/offline-fixtures'

describe('Card picker deck composition', { retries: 0 }, () => {
  for (const kind of ['crypt', 'library'] as const) {
    it(`keeps the ${kind} catalog usable while toggling and editing the deck`, () => {
      cy.viewport(1440, 1000)
      mockCatalogs()
      cy.intercept('POST', '**/user/decks/builder/suggested-cards*', {
        body: {
          keyCrypt: [{ id: 200001, min: 2, max: 4 }],
          keyLibrary: [{ id: 100001, min: 2, max: 4 }],
        },
      })
      const applicationErrors: unknown[] = []
      cy.intercept('POST', '**/api/1.0/error*', (req) => {
        applicationErrors.push(req.body)
        req.reply({ body: {} })
      })
      const cryptCards = Array.from({ length: 120 }, (_, index) => ({
        ...crypt,
        disciplines: ['Auspex', 'Celerity', 'Potence'],
        superiorDisciplines: ['Celerity', 'Potence'],
        disciplineIcons: ['auspex', 'celeritysup', 'potencesup'],
        id: 200001 + index,
        name: `Vampire ${String(index).padStart(3, '0')}`,
      }))
      const libraryCards = Array.from({ length: 120 }, (_, index) => ({
        ...library,
        type: 'Action',
        disciplines: ['Auspex', 'Dominate'],
        disciplineIcons: ['auspex', 'dominate'],
        id: 100001 + index,
        name: `Library ${String(index).padStart(3, '0')}`,
      }))
      cy.intercept('GET', '**/cards/crypt?*', { body: cryptCards })
      cy.intercept('GET', '**/cards/library?*', { body: libraryCards })
      cy.intercept('GET', '**/user/decks/builder/composition-test*', {
        body: {
          id: 'composition-test',
          name: 'Composition test',
          published: false,
          collection: false,
          cards: [...cryptCards.slice(0, 60), ...libraryCards.slice(0, 60)].map(
            (card) => ({ id: card.id, type: card.type, number: 1 }),
          ),
        },
      })
      cy.visit('/decks/builder?id=composition-test', {
        onBeforeLoad(win) {
          authenticate(win)
          win.localStorage.setItem(
            'auth',
            JSON.stringify({
              ...JSON.parse(win.localStorage.getItem('auth')!),
              builderDisplayMode: 'list',
            }),
          )
        },
      })
      cy.get('#name').should('have.value', 'Composition test')
      cy.get('app-builder .section-add-btn')
        .eq(kind === 'crypt' ? 0 : 1)
        .parent()
        .click()
      const picker = `app-${kind}-builder`
      const panel = `${picker} .deck-picker-panel`
      const browser = `${picker} .deck-picker-browser`
      const results = `${picker} .deck-picker-results`
      const filters = `${picker} .deck-picker-filters`
      const toggle = `${picker} button[aria-controls="${kind}-deck-composition"]`
      const other = kind === 'crypt' ? 'Library' : 'Crypt'
      cy.get(toggle).should('contain.text', 'Hide deck')
      cy.get(`${picker} .search-toolbar`)
        .find('button.deck-picker-toggle')
        .should('exist')
      cy.get(panel).should('be.visible')
      cy.get(`${browser} .deck-picker-filters`).should(($filters) => {
        expect($filters[0].getBoundingClientRect().width).to.be.at.least(300)
      })
      cy.get(`${picker} .deck-picker-layout`).should(($layout) => {
        expect($layout[0].scrollWidth).to.be.at.most($layout[0].clientWidth)
      })
      cy.get(panel).find('.composition-row:visible').should('have.length', 60)
      cy.get(panel)
        .find('app-recommended-badge:visible')
        .should('contain.text', '2\u20134')
      cy.get(browser)
        .find('app-recommended-badge')
        .should('contain.text', '2\u20134')
      cy.get(panel)
        .find('.compact-disciplines:visible')
        .first()
        .find('i')
        .should('have.length', kind === 'crypt' ? 3 : 2)
      cy.get(panel)
        .find('.compact-row:visible')
        .first()
        .should(($row) => {
          expect($row[0].getBoundingClientRect().height).to.be.lessThan(40)
          expect($row[0].scrollWidth).to.be.at.most($row[0].clientWidth)
        })
      cy.get(panel).find('.section-heading').should('have.length', 2)
      cy.get(`${browser} app-${kind}`).should('have.length', 50)
      cy.get(filters).scrollTo('bottom')
      cy.get(results).should('have.prop', 'scrollTop', 0)
      cy.get(`${browser} app-${kind}`).should('have.length', 50)
      cy.get(filters).scrollTo('top')
      cy.get(panel).scrollTo('bottom')
      cy.get(`${browser} app-${kind}`).should('have.length', 50)
      cy.get(results).scrollTo(0, 150)
      cy.get(toggle).click()
      cy.get(browser).should(($browser) => {
        const row = $browser[0].querySelector('.row')!
        const filters = row.querySelector('.deck-picker-filters')!
        const ratio =
          filters.getBoundingClientRect().width /
          row.getBoundingClientRect().width
        expect(ratio).to.be.closeTo(1 / 3, 0.01)
        expect($browser[0].getBoundingClientRect().width).to.be.closeTo(
          $browser[0].parentElement!.getBoundingClientRect().width,
          1,
        )
      })
      cy.get(toggle).should('contain.text', 'Show deck')
      cy.get(panel).should('not.be.visible')
      cy.get(results).should('have.prop', 'scrollTop', 150)
      cy.get(toggle).click()
      cy.get(results).should('have.prop', 'scrollTop', 150)
      cy.get(panel).scrollTo('top')
      cy.get(panel)
        .find('.composition-row:visible')
        .first()
        .find('.bi-plus-square')
        .click()
      cy.get(panel)
        .find('.composition-row:visible')
        .first()
        .find('.deck_number')
        .should('contain.text', '2')
      cy.get(panel)
        .find('.composition-row:visible')
        .first()
        .find('.bi-dash-square')
        .click()
      cy.get(panel)
        .find('.composition-row:visible')
        .first()
        .find('.deck_number')
        .should('contain.text', '1')
      cy.contains(`${panel} button`, other).click()
      cy.get(panel).find('.section-heading').should('have.length', 2)
      cy.get(`${picker} #name`).type('005')
      cy.get(`${browser} app-${kind}`).should('have.length', 1)
      cy.get(panel).find('.composition-row:visible').should('have.length', 120)
      cy.get(toggle).click()
      cy.get(`${picker} #name`).should('have.value', '005')
      cy.get(toggle).click()
      cy.get(`${picker} #name`).clear()
      cy.get(`${browser} app-${kind}`).should('have.length', 50)
      cy.get(results).scrollTo('bottom')
      cy.get(`${browser} app-${kind}`).should('have.length.greaterThan', 50)
      cy.get(results).scrollTo('top')
      cy.get(panel).scrollTo('top')
      cy.screenshot(`${kind}-composition-desktop`, {
        capture: 'viewport',
        scale: true,
      })
      cy.viewport(1024, 800)
      cy.get(panel).should('not.be.visible')
      cy.get(toggle).should('not.exist')
      cy.screenshot(`${kind}-composition-narrow`, {
        capture: 'viewport',
        scale: true,
      })
      cy.viewport(1440, 1000)
      cy.get(panel).should('be.visible')
      cy.get(toggle).click()
      cy.get(`${picker} > .modal-header .btn-close`).first().click()
      cy.get('app-builder .section-add-btn')
        .eq(kind === 'crypt' ? 1 : 0)
        .parent()
        .click()
      const otherPicker = `app-${kind === 'crypt' ? 'library' : 'crypt'}-builder`
      cy.get(`${otherPicker} .deck-picker-panel`).should('not.be.visible')
      cy.get(`${otherPicker} button.deck-picker-toggle`).click()
      cy.get(`${otherPicker} .deck-picker-panel .section-heading`).should(
        'have.length',
        2,
      )
      cy.get(`${otherPicker} app-toggle-icon button`).first().click()
      cy.get(
        `${otherPicker} .deck-picker-browser app-${kind === 'crypt' ? 'library' : 'crypt'}-grid-card`,
      ).should('exist')
      cy.get(
        `${otherPicker} .deck-picker-browser app-recommended-badge`,
      ).should('contain.text', '2\u20134')
      cy.screenshot(`${kind}-other-picker-grid`, {
        capture: 'viewport',
        scale: true,
      })
      cy.viewport(390, 844)
      cy.get(`${otherPicker} .deck-picker-panel`).should('not.be.visible')
      cy.get(`${otherPicker} button.deck-picker-toggle`).should('not.exist')
      cy.screenshot(`${kind}-composition-phone`, {
        capture: 'viewport',
        scale: true,
      })
      cy.then(() => expect(applicationErrors).to.deep.equal([]))
    })
  }
})
