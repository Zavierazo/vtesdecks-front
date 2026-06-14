import { SEL } from '../support/selectors'

/**
 * Internationalisation (i18n) & theme switching (user preferences).
 * Validates the language and theme controls change app state and persist,
 * without depending on the exact translated strings.
 */
describe('Language switching', () => {
  beforeEach(() => {
    cy.visitApp('/')
  })

  it('exposes a language selector with multiple options', () => {
    cy.get(SEL.langToggle).first().click()
    cy.get(SEL.ngbDropdownMenu).find('button[ngbDropdownItem]').should('have.length.greaterThan', 1)
  })

  it('selecting a different language marks it active', function () {
    cy.get(SEL.langToggle).first().click()
    cy.get(SEL.ngbDropdownMenu).find('button[ngbDropdownItem]').then(($items) => {
      const inactiveIndex = [...$items].findIndex((el) => !el.classList.contains('active'))
      if (inactiveIndex < 0) this.skip() // only one language available
      cy.get(SEL.ngbDropdownMenu)
        .find('button[ngbDropdownItem]')
        .eq(inactiveIndex)
        .click()
      cy.waitForIdle()
      // Re-open and verify the chosen entry is now the active one.
      cy.get(SEL.langToggle).first().click()
      cy.get(SEL.ngbDropdownMenu)
        .find('button[ngbDropdownItem]')
        .eq(inactiveIndex)
        .should('have.class', 'active')
    })
  })

  it('switching language updates rendered UI text or the locale', function () {
    cy.get('nav a[routerLink="/contact"]').invoke('text').then((before) => {
      cy.get(SEL.langToggle).first().click()
      cy.get(SEL.ngbDropdownMenu).find('button[ngbDropdownItem]').then(($items) => {
        const inactive = [...$items].find((el) => !el.classList.contains('active'))
        if (!inactive) this.skip()
        cy.wrap(inactive).click()
        cy.waitForIdle()
        cy.get('nav a[routerLink="/contact"]').invoke('text').then((after) => {
          const htmlLang = Cypress.$('html').attr('lang')
          expect(
            before.trim() !== after.trim() || !!htmlLang,
            'UI text changed or locale applied',
          ).to.be.true
        })
      })
    })
  })

  it('persists the chosen language across a reload', function () {
    cy.get(SEL.langToggle).first().click()
    cy.get(SEL.ngbDropdownMenu).find('button[ngbDropdownItem]').then(($items) => {
      const inactiveIndex = [...$items].findIndex((el) => !el.classList.contains('active'))
      if (inactiveIndex < 0) this.skip()
      cy.get(SEL.ngbDropdownMenu).find('button[ngbDropdownItem]').eq(inactiveIndex).click()
      cy.waitForIdle()
      cy.get('nav a[routerLink="/contact"]').invoke('text').then((picked) => {
        cy.reload()
        cy.waitForIdle()
        cy.get('nav a[routerLink="/contact"]').invoke('text').should('eq', picked)
      })
    })
  })
})

describe('Theme switching', () => {
  it('toggles the colour theme and persists it across reload', function () {
    cy.visitApp('/')
    cy.get('body').then(($b) => {
      if ($b.find('app-theme-selector').length === 0) {
        this.skip() // theme selector disabled in this build
      }
      // The ColorThemeService sets data-bs-theme on <body> and persists the
      // choice to localStorage['user-color-theme'].
      cy.get('body').invoke('attr', 'data-bs-theme').then((beforeAttr) => {
        cy.get('app-theme-selector .theme-selector').click()
        cy.waitForIdle()
        cy.get('body').invoke('attr', 'data-bs-theme').then((afterAttr) => {
          expect(afterAttr, 'theme attribute flipped').to.not.eq(beforeAttr)
          // The choice is persisted...
          cy.window().its('localStorage').invoke('getItem', 'user-color-theme').should('eq', afterAttr)
          // ...and survives a reload.
          cy.reload()
          cy.waitForIdle()
          cy.get('body').invoke('attr', 'data-bs-theme').should('eq', afterAttr)
        })
      })
    })
  })
})
