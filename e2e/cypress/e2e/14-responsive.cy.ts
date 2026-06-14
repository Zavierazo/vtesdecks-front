import { SEL } from '../support/selectors'

/**
 * Responsive behaviour.
 * Verifies the layout adapts between mobile and desktop viewports: the burger
 * menu appears on small screens, the desktop nav on large ones.
 */
const VIEWPORTS: { label: string; w: number; h: number }[] = [
  { label: 'mobile', w: 375, h: 667 },
  { label: 'tablet', w: 768, h: 1024 },
  { label: 'desktop', w: 1280, h: 800 },
]

describe('Responsive behaviour', () => {
  VIEWPORTS.forEach(({ label, w, h }) => {
    it(`renders a usable header at ${label} (${w}x${h})`, () => {
      cy.viewport(w, h)
      cy.visitApp('/')
      cy.get(SEL.header).should('be.visible')
      cy.get(SEL.headerBrand).should('be.visible')

      if (w < 992) {
        // Bootstrap lg breakpoint — burger toggler is shown.
        cy.get(SEL.navToggler).should('be.visible')
      } else {
        cy.get(SEL.navToggler).should('not.be.visible')
        cy.get(SEL.decksDropdownToggle).should('be.visible')
      }
    })
  })

  it('expands the mobile nav menu when the burger is tapped', () => {
    cy.viewport(375, 667)
    cy.visitApp('/')
    cy.get(SEL.navToggler).click()
    // Nav links become reachable after expansion.
    cy.get('nav a[routerLink="/contact"]').should('be.visible')
  })

  it('exposes mobile quick-action search on small screens', () => {
    cy.viewport(375, 667)
    cy.visitApp('/')
    cy.get('nav .quick-actions-mobile').should('be.visible')
  })

  it('shows the desktop search button on large screens', () => {
    cy.viewport(1280, 800)
    cy.visitApp('/')
    cy.get(SEL.searchButtonDesktop).should('be.visible')
  })
})
