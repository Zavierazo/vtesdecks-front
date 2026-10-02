/// <reference types="cypress" />

// Isolated management fixtures: no mutation is sent to a real account.
const api = 'http://localhost:8080/api/1.0'
const ids = Array.from({ length: 1000 }, (_, i) => `managed-${i}`)
const makeDeck = (id: string) => ({
  id,
  name: `Management deck ${id}`,
  type: 'COMMUNITY',
  owner: true,
  published: false,
  collection: false,
  author: 'Manager',
  views: 0,
  comments: 0,
  creationDate: '2026-10-01T00:00:00',
  modifyDate: '2026-10-01T00:00:00',
  clanIcons: [],
  disciplineIcons: [],
  tags: [],
  stats: { crypt: 12, library: 60 },
})

function visitManagement(publishable = true) {
  const user = {
    user: 'manager',
    displayName: 'Manager',
    roles: [],
    token: `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ sub: 'manager', exp: 4102444800 }))}.test`,
  }
  let active = [...ids]
  // Every API request is stubbed, including startup and authentication.
  cy.intercept(`${api}/**`, (req) => {
    const url = new URL(req.url)
    const path = url.pathname.replace('/api/1.0', '')
    if (path === '/user/refresh') {
      req.reply(user)
      return
    }
    if (path === '/auth/country') {
      req.reply({ countryCode: 'ES' })
      return
    }
    if (path === '/decks') {
      const offset = Number(url.searchParams.get('offset') ?? 0)
      const limit = Number(url.searchParams.get('limit') ?? 20)
      req.reply({
        decks: active.slice(offset, offset + limit).map(makeDeck),
        total: active.length,
        offset,
        currency: 'EUR',
        restorableDecks: [],
      })
      return
    }
    if (path.endsWith('/publishable')) {
      req.alias = 'publishable'
      req.reply({ body: publishable })
      return
    }
    if (
      path.endsWith('/visibility') ||
      (req.method === 'PATCH' && path.startsWith('/user/decks/builder/'))
    ) {
      req.alias = 'toggle'
      req.reply({ body: true })
      return
    }
    if (req.method === 'DELETE') {
      req.alias = 'singleDelete'
      active = active.filter((id) => id !== path.split('/').pop())
      req.reply({ body: true })
      return
    }
    if (path.endsWith('/unread-count')) {
      req.reply({ body: 0 })
      return
    }
    req.reply([])
  })
  cy.visit('/decks?type=USER', {
    onBeforeLoad(win) {
      win.localStorage.setItem('auth', JSON.stringify(user))
      win.localStorage.setItem('language', 'en')
      Object.defineProperty(win.navigator, 'share', {
        configurable: true,
        value: cy.stub().resolves().as('share'),
      })
    },
  })
  cy.get('.deck-management-actions').should('have.length', 20)
}

describe('My decks management (isolated API)', () => {
  it('integrates quick actions inside cards without selection or bulk controls', () => {
    visitManagement()
    cy.get('.deck-management-toolbar').should('not.exist')
    cy.get('.deck-management-actions input').should('not.exist')
    cy.get('.deck-card')
      .first()
      .find('.deck-management-actions')
      .should('exist')
    cy.get('.deck-management-actions').first().closest('a').should('not.exist')
    cy.get('.deck-card h2').first().should('have.css', 'text-align', 'center')
    cy.screenshot('deck-quick-actions-desktop', { capture: 'viewport' })
  })

  it('applies quick actions without navigating and confirms individual deletion', () => {
    visitManagement()
    cy.get('.deck-management-actions')
      .first()
      .within(() => {
        cy.get('button[aria-label="Publish"]').click()
      })
    cy.get('ngb-modal-window').contains('button', 'Publish').click()
    cy.wait('@toggle').its('request.body').should('eq', true)
    cy.get(
      '.deck-management-actions button[aria-label="Unpublish"]',
    ).should('exist')
    cy.get(
      '.deck-management-actions button[aria-label="Enable collection tracker"]',
    )
      .first()
      .click()
    cy.wait('@toggle')
    cy.get(
      '.deck-management-actions button[aria-label="Disable collection tracker"]',
    ).should('exist')
    cy.get('.deck-management-actions button[aria-label="Share"]')
      .first()
      .click()
    cy.get('@share').should('have.been.calledOnce')
    cy.get('.deck-management-actions button[aria-label="Delete"]')
      .first()
      .click()
    cy.get('ngb-modal-window')
      .should('be.visible')
      .contains('button', 'Cancel')
      .click()
    cy.get('.deck-management-actions').should('have.length', 20)
    cy.location('pathname').should('eq', '/decks')
  })

  it('keeps mobile quick actions inside the card and deletes only that deck', () => {
    cy.viewport(390, 844)
    visitManagement()
    cy.get('.deck-card')
      .first()
      .find('.deck-management-actions button')
      .should('have.length', 4)
    cy.get('.deck-card').first().then(($card) => {
      const card = $card[0]
      const rail = card.querySelector('.deck-management-actions')!.getBoundingClientRect()
      const preview = card.querySelector('.deck-card-tools')!.getBoundingClientRect()
      const link = card.querySelector('.deck-card-link')!.getBoundingClientRect()
      expect(rail.left).to.be.at.least(link.right - 1)
      expect(Math.abs(preview.right - rail.left)).to.be.lessThan(2)
      const buttons = [...card.querySelectorAll('.deck-management-actions button')]
      buttons.forEach((button, i) => {
        const rect = button.getBoundingClientRect()
        expect(rect.height).to.be.at.least(44)
        expect(rect.width).to.be.at.least(44)
        if (i > 0) {
          expect(rect.top).to.be.at.least(buttons[i - 1].getBoundingClientRect().bottom)
        }
      })
    })
    cy.get('.deck-management-actions').first().find('.bi-incognito').should('exist')
    cy.screenshot('deck-quick-actions-mobile', { capture: 'viewport' })
    cy.get('.deck-management-actions button[aria-label="Delete"]')
      .first()
      .click()
    cy.get('ngb-modal-window button.btn-primary').click()
    cy.wait('@singleDelete').its('request.url').should('contain', '/managed-0')
    cy.get('#managed-0').should('not.exist')
    cy.get('#managed-1').should('exist')
    cy.location('pathname').should('eq', '/decks')
  })
  it('rejects an invalid deck without opening the publish confirmation', () => {
    visitManagement(false)
    cy.get('.deck-management-actions button[aria-label="Publish"]')
      .first()
      .click()
    cy.wait('@publishable')
    cy.get('ngb-modal-window').should('not.exist')
    cy.get(
      '.deck-management-actions button[aria-label="Unpublish"]',
    ).should('not.exist')
  })
})
