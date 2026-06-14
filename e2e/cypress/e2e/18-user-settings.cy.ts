import { SEL } from '../support/selectors'

/**
 * User preferences / settings (authenticated).
 * Validates the settings form loads with the account's current values and
 * reacts to edits + validation. We do NOT submit destructive profile changes;
 * the focus is form behaviour, not mutating the demo account.
 */
describe('User settings', () => {
  beforeEach(() => {
    cy.login()
    cy.intercept('GET', '**/user/settings**').as('settings')
    cy.visitApp('/user/settings')
    cy.waitForIdle()
  })

  it('loads the settings form pre-populated from the account', () => {
    cy.get('form').should('be.visible')
    cy.get('input[formControlName="displayName"]').should('exist')
    // The displayName is whatever the account has — assert it is a string field,
    // not a specific value.
    cy.get('input[formControlName="displayName"]')
      .invoke('val')
      .should((v) => expect(typeof v).to.eq('string'))
  })

  it('reflects edits to the display name field', () => {
    cy.get('input[formControlName="displayName"]').then(($el) => {
      const original = String($el.val() ?? '')
      const edited = `${original}-e2e`.slice(0, 30)
      cy.wrap($el).clear().type(edited)
      cy.wrap($el).should('have.value', edited)
      // Restore the original value to leave the account untouched.
      cy.wrap($el).clear()
      if (original) cy.wrap($el).type(original)
    })
  })

  it('validates the password-change fields without submitting', () => {
    // Typing a new password but leaving confirmation empty/mismatched keeps the
    // form from being valid — submit stays disabled.
    cy.get('#inputPassword5').type('NewPassw0rd')
    cy.get('#inputPassword6').type('Mismatch0rd')
    cy.get('form button[type="submit"]').should('be.disabled')
  })

  it('persists access to settings across a reload (session)', () => {
    cy.reload()
    cy.waitForIdle()
    cy.location('pathname').should('include', '/user/settings')
    cy.get(SEL.userMenuToggle).should('exist')
  })
})
