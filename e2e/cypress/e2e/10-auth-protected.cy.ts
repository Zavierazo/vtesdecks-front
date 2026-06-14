import { SEL } from '../support/selectors'

/**
 * Permission-based UI & route guards.
 * Verifies that guarded routes redirect/deny when logged-out and become
 * accessible once authenticated, and that authenticated-only nav appears.
 */
describe('Protected routes & permission-based UI', () => {
  const GUARDED = ['/decks/builder', '/collection', '/user/settings']

  describe('logged-out behaviour', () => {
    GUARDED.forEach((path) => {
      it(`blocks ${path} for anonymous users (guard redirects / prompts login)`, () => {
        cy.visitApp(path)
        cy.waitForIdle()
        // CanActivateUser either redirects away or opens the login modal.
        cy.get('body').then(($b) => {
          const onGuarded = window.location.pathname.startsWith(path)
          const loginShown =
            $b.find(SEL.modal).length > 0 || $b.find(SEL.login.username).length > 0
          expect(
            !onGuarded || loginShown,
            'guarded route is not freely accessible',
          ).to.be.true
        })
      })
    })

    it('hides authenticated-only nav entries (Builder, Collection)', () => {
      cy.visitApp('/')
      cy.get('nav').then(($nav) => {
        // These links are gated behind *isLogged="true".
        expect($nav.find('a[routerLink="/decks/builder"]').length).to.eq(0)
      })
    })
  })

  describe('logged-in behaviour', () => {
    beforeEach(() => {
      cy.login()
    })

    GUARDED.forEach((path) => {
      it(`allows ${path} for authenticated users`, () => {
        cy.visitApp(path)
        cy.waitForIdle()
        cy.location('pathname').should('include', path.split('/')[1])
        cy.get(SEL.header).should('be.visible')
      })
    })

    it('reveals authenticated-only nav entries', () => {
      cy.visitApp('/')
      cy.get(SEL.userMenuToggle).should('exist')
      // Collection link is exposed somewhere in the authenticated chrome.
      cy.get('nav').find('a[routerLink="/collection"]').should('exist')
    })

    it('exposes the user dropdown with profile & settings links', () => {
      cy.visitApp('/')
      cy.get(SEL.userMenuToggle).click()
      cy.get(SEL.ngbDropdownMenu).should('be.visible')
      cy.get(SEL.ngbDropdownMenu).find('a[routerLink="/user/settings"]').should('exist')
    })
  })
})
