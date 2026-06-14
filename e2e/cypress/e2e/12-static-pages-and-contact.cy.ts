import { SEL } from '../support/selectors'

/**
 * Static content pages + the contact form (forms & validation).
 */
describe('Static pages', () => {
  const pages = ['/terms', '/privacy-policy', '/changelog']

  pages.forEach((path) => {
    it(`renders meaningful content at ${path}`, () => {
      cy.visitApp(path)
      cy.waitForIdle()
      cy.location('pathname').should('include', path)
      // The page has substantive text content, not just the empty shell.
      cy.get('app-root').invoke('text').its('length').should('be.greaterThan', 100)
    })
  })
})

describe('Contact form', () => {
  beforeEach(() => {
    cy.visitApp('/contact')
    cy.waitForIdle()
  })

  it('renders all form fields and a disabled submit while empty/invalid', () => {
    cy.get(SEL.contact.name).should('be.visible')
    cy.get(SEL.contact.email).should('be.visible')
    cy.get(SEL.contact.subject).should('be.visible')
    cy.get(SEL.contact.message).should('be.visible')
    cy.get(SEL.contact.submit).should('be.disabled')
  })

  it('validates email format and required fields', () => {
    cy.get(SEL.contact.email).type('not-an-email').blur()
    cy.get('body').contains(/email|correo/i).should('exist')
    cy.get(SEL.contact.submit).should('be.disabled')
  })

  it('enables submit once the form is completed validly', () => {
    cy.get(SEL.contact.name).type('Cypress Tester')
    cy.get(SEL.contact.email).type('cypress@example.com')
    cy.get(SEL.contact.subject).type('Automated check')
    cy.get(SEL.contact.message).type('This is an automated E2E validation message.')
    cy.get(SEL.contact.submit).should('not.be.disabled')
  })

  it('submits the form and shows the success outcome', () => {
    // The contact endpoint emails a real inbox, so we STUB it to validate the
    // submit workflow + success UI without sending an actual message on every
    // run. (Outward-facing action — deliberately not exercised for real.)
    cy.intercept('POST', '**/contact**', {
      statusCode: 200,
      body: { successful: true },
    }).as('contact')

    cy.get(SEL.contact.name).type('Cypress Tester')
    cy.get(SEL.contact.email).type('cypress@example.com')
    cy.get(SEL.contact.subject).type('Automated check')
    cy.get(SEL.contact.message).type('This is an automated E2E validation message.')
    cy.get(SEL.contact.submit).click()

    // The request is dispatched with the entered payload...
    cy.wait('@contact').its('request.body').should((body) => {
      // FormData/JSON either way — assert our subject made it into the request.
      expect(JSON.stringify(body)).to.contain('Automated check')
    })
    // ...and the success banner is shown.
    cy.get('body').find('.text-success').should('exist')
  })
})
