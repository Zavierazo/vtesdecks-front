/**
 * Home custom ad driven by feature flags.
 * The feature-flag endpoint is stubbed so the suite stays independent of the
 * flag values currently stored in the backend.
 */
const AD_URL = 'https://www.youtube.com/@VTES_ES'
const AD_IMAGE = 'https://cdn.vtesdecks.com/img/sponsors/conclave/main.png'
const AD_IMAGE_MOBILE =
  'https://cdn.vtesdecks.com/img/sponsors/conclave/mobile.png'

function stubFlags(enabled: boolean, countries: string[] = []) {
  cy.intercept('GET', '**/feature-flag**', {
    statusCode: 200,
    body: [
      { key: 'home_ad', type: 'BOOLEAN', value: enabled },
      { key: 'home_ad_url', type: 'STRING', value: AD_URL },
      { key: 'home_ad_image', type: 'STRING', value: AD_IMAGE },
      { key: 'home_ad_image_mobile', type: 'STRING', value: AD_IMAGE_MOBILE },
      { key: 'home_ad_countries', type: 'LIST', value: countries },
    ],
  }).as('featureFlags')
}

describe('Home custom ad', () => {
  it('shows the custom ad instead of AdSense when enabled for everyone', () => {
    stubFlags(true)
    cy.visitApp('/')
    cy.wait('@featureFlags')
    cy.get('[data-cy="home-custom-ad"]').should('be.visible')
    cy.get('[data-cy="home-custom-ad"] a')
      .should('have.attr', 'href', AD_URL)
      .and('have.attr', 'target', '_blank')
    cy.get('[data-cy="home-custom-ad"] img').should('have.attr', 'src', AD_IMAGE)
    cy.get('[data-cy="home-custom-ad-badge"]')
      .should('be.visible')
      .and('not.be.empty')
    cy.get('app-home-custom-ad app-ad-sense').should('not.exist')
  })

  it('falls back to AdSense when the flag is disabled', () => {
    stubFlags(false)
    cy.visitApp('/')
    cy.wait('@featureFlags')
    cy.get('[data-cy="home-custom-ad"]').should('not.exist')
    cy.get('app-home-custom-ad app-ad-sense').should('exist')
  })

  it('shows the ad when the user country is in the allowed list', () => {
    stubFlags(true, ['ES', 'PT'])
    cy.intercept('GET', '**/auth/country**', {
      statusCode: 200,
      body: { countryCode: 'es' },
    }).as('country')
    cy.visitApp('/')
    cy.wait('@featureFlags')
    cy.get('[data-cy="home-custom-ad"]').should('be.visible')
  })

  it('hides the ad when the user country is not in the allowed list', () => {
    stubFlags(true, ['ES', 'PT'])
    cy.intercept('GET', '**/auth/country**', {
      statusCode: 200,
      body: { countryCode: 'US' },
    }).as('country')
    cy.visitApp('/')
    cy.wait('@featureFlags')
    cy.get('[data-cy="home-custom-ad"]').should('not.exist')
    cy.get('app-home-custom-ad app-ad-sense').should('exist')
  })
})
