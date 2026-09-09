const origin = 'https://vtesdecks.com'

function expectPublic(path: string) {
  cy.get('head link[rel="canonical"]')
    .should('have.length', 1)
    .and('have.attr', 'href', origin + path)
  cy.get('head meta[property="og:url"]').should(
    'have.attr',
    'content',
    origin + path,
  )
  cy.get('head meta[name="robots"]').should(
    'have.attr',
    'content',
    'index, follow',
  )
  cy.get('head meta[name="description"]')
    .invoke('attr', 'content')
    .should('not.be.empty')
    .and('not.contain', 'seo.')
  cy.get('head script[data-seo]')
    .should('have.length', 1)
    .invoke('text')
    .then((text) => {
      expect(JSON.parse(text)['@context']).to.equal('https://schema.org')
    })
}

describe('Client-rendered SEO', () => {
  it('omits the shared homepage canonical, then applies page metadata and all four languages', () => {
    cy.request('/decks')
      .its('body')
      .should('not.match', /<link[^>]+rel=["']canonical/)
    cy.visitApp('/decks?name=Ventrue')
    expectPublic('/decks')
    cy.get('h1').should('not.exist')
    for (const [code, label, title] of [
      ['en', 'English', 'Decks'],
      ['es', 'Español', 'Mazos'],
      ['fr', 'Français', 'Decks'],
      ['pt', 'Português', 'Decks'],
    ]) {
      cy.get('[data-cy="lang-selector-toggle"]').click()
      cy.get('.language-selector .dropdown-menu')
        .contains('button', label)
        .click()
      cy.get('html').should('have.attr', 'lang', code)
      cy.title().should('eq', `VTES Decks - ${title}`)
      cy.location('pathname').should('eq', '/decks')
      expectPublic('/decks')
    }
    cy.get('head link[hreflang]').should('not.exist')
    cy.get('head meta[property="og:image"]').should(
      'have.attr',
      'content',
      origin + '/assets/img/og-image.png',
    )
    cy.get('head meta[property="og:image:width"]').should(
      'have.attr',
      'content',
      '1200',
    )
  })

  it('keeps resolved deck metadata in sync through existing navigation without adding breadcrumbs', () => {
    cy.request(`${Cypress.env('apiUrl')}/decks?limit=1&offset=0`).then(
      ({ body }) => {
        const deck = body.decks[0]
        expect(deck).to.have.property('id')
        const path = `/deck/${deck.id}`
        cy.visitApp(path)
        expectPublic(path)
        cy.title().should('eq', `VTES Decks - ${deck.name}`)
        cy.get('h1.deck-title').should('contain', deck.name)
        cy.get('app-seo-breadcrumbs').should('not.exist')
        cy.get('head script[data-seo]')
          .invoke('text')
          .should('not.contain', 'BreadcrumbList')
        cy.get('#navbarDropdownDecks').click()
        cy.get(
          '[aria-labelledby="navbarDropdownDecks"] a[href="/decks"]',
        ).click()
        expectPublic('/decks')
        cy.title().should('not.contain', deck.name)
        cy.visit(`/deck/${deck.id}/embed`)
        cy.get('head meta[name="robots"]').should(
          'have.attr',
          'content',
          'noindex, follow',
        )
        cy.get('head script[data-seo]').should('not.exist')
      },
    )
  })

  it('loads public profiles and archetypes with unique metadata', () => {
    cy.request(`${Cypress.env('apiUrl')}/deck-archetype`).then(({ body }) => {
      const archetype = body.find(
        (item: { id?: number; enabled: boolean }) => item.id && item.enabled,
      )
      expect(archetype).to.have.property('name')
      cy.visitApp(`/metagame/${archetype.id}`)
      expectPublic(`/metagame/${archetype.id}`)
      cy.title().should('contain', archetype.name)
    })
    cy.intercept(
      { method: 'GET', pathname: /\/public\/user\/seo-reader$/ },
      {
        user: 'seo-reader',
        displayName: 'SEO Reader',
        profileImage: '',
        roles: [],
        followers: [],
        following: [],
      },
    )
    cy.visitApp('/user/seo-reader')
    expectPublic('/user/seo-reader')
    cy.title().should('contain', 'SEO Reader')
    cy.get('h1').should('contain', 'SEO Reader')
  })

  it('indexes confirmed public wishlists and binders, and removes metadata for missing resources', () => {
    const emptyPage = { content: [], totalElements: 0, totalPages: 0 }
    cy.intercept(
      'POST',
      '**/collections/users/seo-reader/wishlist/search*',
      emptyPage,
    )
    cy.visitApp('/collections/users/seo-reader/wishlist')
    expectPublic('/collections/users/seo-reader/wishlist')
    cy.title().should('eq', 'VTES Decks - seo-reader - Wishlist')
    cy.intercept(
      { method: 'GET', pathname: /\/collections\/binders\/seo-public$/ },
      {
        id: 987654,
        name: 'SEO shared binder',
        publicVisibility: true,
        publicHash: 'seo-public',
      },
    )
    cy.intercept(
      'POST',
      '**/collections/binders/seo-public/cards/search*',
      emptyPage,
    )
    cy.visitApp('/collection/binders/seo-public')
    expectPublic('/collection/binders/seo-public')
    cy.title().should('eq', 'VTES Decks - SEO shared binder - Binder')
    cy.intercept('POST', '**/collections/users/seo-private/wishlist/search*', {
      statusCode: 200,
      body: '',
    })
    cy.visitApp('/collections/users/seo-private/wishlist')
    cy.get('head meta[name="robots"]').should(
      'have.attr',
      'content',
      'noindex, follow',
    )
    cy.get('head script[data-seo]').should('not.exist')
    cy.intercept(
      { method: 'GET', pathname: /\/collections\/binders\/seo-missing$/ },
      { statusCode: 404 },
    )
    cy.visitApp('/collection/binders/seo-missing')
    cy.get('head meta[name="robots"]').should(
      'have.attr',
      'content',
      'noindex, follow',
    )
    cy.title().should('not.contain', 'SEO shared binder')
    cy.location('pathname').should('eq', '/collection/binders/seo-missing')
    cy.get('app-binder app-page-not-found h1').should('have.text', '404')
    cy.get('app-binder app-page-not-found a').click()
    expectPublic('/')
  })

  it('preserves the requested missing URL and clears noindex when returning home', () => {
    cy.intercept(
      { method: 'GET', pathname: /\/decks\/seo-missing$/ },
      { statusCode: 404 },
    )
    cy.visitApp('/deck/seo-missing')
    cy.location('pathname').should('eq', '/deck/seo-missing')
    cy.get('app-page-not-found').should('be.visible')
    cy.get('head meta[name="robots"]').should(
      'have.attr',
      'content',
      'noindex, follow',
    )
    cy.get('app-page-not-found a[href="/"]').click()
    expectPublic('/')
    cy.visitApp('/seo-missing-route')
    cy.get('head meta[name="robots"]').should(
      'have.attr',
      'content',
      'noindex, follow',
    )
    cy.get('app-page-not-found a[href="/"]').click()
    expectPublic('/')
  })
})
