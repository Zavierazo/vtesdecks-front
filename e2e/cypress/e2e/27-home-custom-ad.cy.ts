/**
 * Home custom ad driven by feature flags.
 * The feature-flag endpoint is stubbed so the suite stays independent of the
 * flag values currently stored in the backend.
 */
const AD_URL = 'https://www.youtube.com/@VTES_ES'
const AD_IMAGE = 'https://cdn.vtesdecks.com/img/sponsors/conclave/main.png'
const AD_IMAGE_MOBILE =
  'https://cdn.vtesdecks.com/img/sponsors/conclave/mobile.png'

function stubFlags(enabled: boolean, countries: string[] = [], delay = 0) {
  cy.intercept('GET', '**/feature-flag**', {
    statusCode: 200,
    delay,
    body: [
      { key: 'home_ad', type: 'BOOLEAN', value: enabled },
      { key: 'home_ad_url', type: 'STRING', value: AD_URL },
      { key: 'home_ad_image', type: 'STRING', value: AD_IMAGE },
      { key: 'home_ad_image_mobile', type: 'STRING', value: AD_IMAGE_MOBILE },
      { key: 'home_ad_countries', type: 'LIST', value: countries },
    ],
  }).as('featureFlags')
}

// Record slot IDs at initialization time, not just the final rendered DOM.
const AD_STUB = `
  var queuedAds = window.adsbygoogle || [];
  window.__adSlots = [];
  window.__adErrors = [];
  window.adsbygoogle = {
    push: function () {
      var slot = document.querySelector('ins.adsbygoogle:not([data-adsbygoogle-status])');
      if (!slot) {
        window.__adErrors.push('No available slot');
        throw new Error('adsbygoogle: No available slot');
      }
      window.__adSlots.push(slot.getAttribute('data-ad-slot'));
      slot.setAttribute('data-adsbygoogle-status', 'done');
    }
  };
  queuedAds.forEach(function (request) { window.adsbygoogle.push(request); });
`

function expectMainInitializations(count: number) {
  cy.window().should((win) => {
    const ads = win as unknown as { __adSlots: string[]; __adErrors: string[] }
    expect(ads.__adErrors).to.deep.equal([])
    expect(
      ads.__adSlots.filter((slot) => slot === '6580167823'),
    ).to.have.length(count)
    expect(
      ads.__adSlots.filter((slot) => slot === '7683446640'),
    ).to.have.length(1)
  })
}

describe('Home custom ad', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/pagead/js/adsbygoogle.js*', {
      statusCode: 200,
      headers: { 'content-type': 'application/javascript' },
      body: AD_STUB,
    }).as('adScript')
  })

  it('never initializes the replaced main slot while flags and country are delayed', () => {
    stubFlags(true, ['ES'], 700)
    cy.intercept('GET', '**/auth/country**', {
      statusCode: 200,
      delay: 1400,
      body: { countryCode: 'ES' },
    }).as('country')
    cy.visitApp('/')
    cy.wait(['@adScript', '@featureFlags', '@country'])
    cy.get('[data-cy="home-custom-ad"]').should('be.visible')
    expectMainInitializations(0)
  })

  it('initializes the fallback once after a country mismatch', () => {
    stubFlags(true, ['ES'], 500)
    cy.intercept('GET', '**/auth/country**', {
      statusCode: 200,
      delay: 1000,
      body: { countryCode: 'US' },
    }).as('country')
    cy.visitApp('/')
    cy.wait(['@adScript', '@featureFlags', '@country'])
    cy.get('app-home-custom-ad ins').should(
      'have.attr',
      'data-adsbygoogle-status',
      'done',
    )
    expectMainInitializations(1)
  })

  it('initializes both home slots when the original AdSense script loads late', () => {
    stubFlags(false, [], 500)
    cy.intercept('GET', '**/pagead/js/adsbygoogle.js*', {
      statusCode: 200,
      delay: 2000,
      headers: { 'content-type': 'application/javascript' },
      body: AD_STUB,
    }).as('lateAdScript')
    cy.visitApp('/')
    cy.wait(['@featureFlags', '@lateAdScript'])
    expectMainInitializations(1)
  })

  it('shows the custom ad instead of AdSense when enabled for everyone', () => {
    stubFlags(true)
    cy.visitApp('/')
    cy.wait('@featureFlags')
    cy.get('[data-cy="home-custom-ad"]').should('be.visible')
    cy.get('[data-cy="home-custom-ad"] a')
      .should('have.attr', 'href', AD_URL)
      .and('have.attr', 'target', '_blank')
    cy.get('[data-cy="home-custom-ad"] img').should(
      'have.attr',
      'src',
      AD_IMAGE,
    )
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
