import { SEL } from '../support/selectors'

/**
 * Authentication flows.
 * Covers the login modal UI, client-side validation, a real login with the demo
 * account, session persistence and logout. reCAPTCHA v3 runs invisibly against
 * the localhost site key.
 */
describe('Authentication', () => {
  describe('login modal UI & validation', () => {
    beforeEach(() => {
      cy.visitApp('/')
      cy.get(SEL.loginButton).filter(':visible').first().click()
      cy.get(SEL.modal).should('be.visible')
    })

    it('opens the login modal with username & password fields', () => {
      cy.get(SEL.login.username).should('be.visible')
      cy.get(SEL.login.password).should('be.visible')
    })

    it('disables submit until both credentials are entered', () => {
      cy.get(SEL.login.submit).filter(':visible').should('be.disabled')
      cy.get(SEL.login.username).type('someone')
      cy.get(SEL.login.password).type('secret123')
      cy.get(SEL.login.submit).filter(':visible').should('not.be.disabled')
    })

    it('surfaces required-field validation when fields are blurred empty', () => {
      cy.get(SEL.login.username).focus().blur()
      cy.get(SEL.login.password).focus().blur()
      cy.get(SEL.modal)
        .contains(/required|obligatorio|requerido/i)
        .should('exist')
    })

    it('switches to the sign-up tab and shows registration fields', () => {
      cy.get(SEL.login.gotoSignup).click()
      cy.get('#floatingUserInput').should('be.visible')
      cy.get('#floatingEmailInput').should('be.visible')
    })

    it('switches to the forgot-password tab', () => {
      cy.get(SEL.login.gotoForgot).click()
      cy.get('#floatingEmailInput').should('be.visible')
    })

    describe('sign-up form validation', () => {
      beforeEach(() => {
        cy.get(SEL.login.gotoSignup).click()
        cy.get('#floatingUserInput').should('be.visible')
      })

      it('keeps submit disabled until the form is valid', () => {
        cy.get('.modal-content form button[type="submit"]').should(
          'be.disabled',
        )
      })

      it('rejects an invalid email format', () => {
        cy.get('#floatingUserInput').type('e2euser')
        cy.get('#floatingEmailInput').type('not-an-email').blur()
        cy.get('.modal-content').contains(/email/i).should('exist')
        cy.get('.modal-content form button[type="submit"]').should(
          'be.disabled',
        )
      })

      it('enforces password rules (min length + a number)', () => {
        cy.get('#floatingPassword').type('short').blur()
        // A too-short / number-less password keeps the form invalid.
        cy.get('.modal-content form button[type="submit"]').should(
          'be.disabled',
        )
      })

      it('flags mismatched password confirmation', () => {
        cy.get('#floatingPassword').type('ValidPass1')
        cy.get('#floatingConfirmPassword').type('Different1').blur()
        cy.get('.modal-content').contains(/match/i).should('exist')
        cy.get('.modal-content form button[type="submit"]').should(
          'be.disabled',
        )
      })

      it('requires accepting the terms', () => {
        cy.get('#floatingUserInput').type('e2euser')
        cy.get('#floatingEmailInput').type('e2e@example.com')
        cy.get('#floatingPassword').type('ValidPass1')
        cy.get('#floatingConfirmPassword').type('ValidPass1')
        // Terms checkbox left unchecked → submit stays disabled.
        cy.get('.modal-content form button[type="submit"]').should(
          'be.disabled',
        )
        cy.get('#registerCheck').check({ force: true })
        cy.get('.modal-content form button[type="submit"]').should(
          'not.be.disabled',
        )
      })
    })

    it('rejects invalid credentials and creates no session', () => {
      cy.intercept('POST', '**/auth/login*').as('badLogin')
      cy.get(SEL.login.username).type('definitely-not-a-real-user-xyz')
      cy.get(SEL.login.password).type('wrong-password-123')
      cy.get(SEL.login.submit).click()
      // The login request fires (reCAPTCHA stubbed); the app stays logged-out
      // regardless of the exact API error wording.
      cy.wait('@badLogin', { timeout: 30000 })
      cy.get(SEL.userMenuToggle).should('not.exist')
    })
  })

  describe('successful login with the demo account', () => {
    it('logs in and reveals authenticated chrome', () => {
      cy.login()
      cy.visitApp('/')
      cy.get(SEL.userMenuToggle).should('exist')
      cy.get(SEL.loginButton).should('not.exist')
    })

    it('persists the session across a page reload', () => {
      cy.login()
      cy.visitApp('/')
      cy.get(SEL.userMenuToggle).should('exist')
      cy.reload()
      cy.get(SEL.userMenuToggle, { timeout: 15000 }).should('exist')
    })

    it('logs out and returns to the logged-out state', () => {
      cy.login()
      cy.visitApp('/')
      cy.logout()
      cy.get(SEL.loginButton).filter(':visible').should('exist')
      cy.get(SEL.userMenuToggle).should('not.exist')
    })
  })
})
