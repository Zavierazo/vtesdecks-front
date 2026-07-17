import { decksPage } from '../pages/DecksPage'

/**
 * Embeddable deck widget.
 * The /deck/:id/embed route renders a chromeless compact widget meant to be
 * loaded inside third-party iframes. Data-agnostic: the deck is discovered
 * dynamically from the decks list.
 */
describe('Deck embed widget', () => {
  // The full deck page loads ancillary data (e.g. comments) we don't test
  // here; don't let one of those endpoints failing break the embed spec.
  Cypress.on('uncaught:exception', (err) => {
    if (/Http failure/.test(err.message)) {
      return false
    }
    return undefined
  })

  /** Discover a real deck id, then run `fn(path)`. Skips if no decks exist. */
  const withFirstDeckPath = (
    ctx: Mocha.Context,
    fn: (path: string) => void,
  ) => {
    decksPage.visit().waitForDecks()
    cy.then(() => {
      if (decksPage.lastReportedTotal === 0) ctx.skip()
    })
    decksPage
      .cards()
      .first()
      .find('a[href^="/deck/"]')
      .first()
      .invoke('attr', 'href')
      .then((href) => {
        fn(String(href).split(/[?#]/)[0])
      })
  }

  it('renders chromeless with the requested sections and theme', function () {
    withFirstDeckPath(this, (path) => {
      // Plain cy.visit: the embed route is chromeless, so visitApp's
      // header-based readiness gate does not apply.
      cy.visit(`${path}/embed?theme=dark&sections=stats,crypt`)
      cy.get('app-deck-embed .embed-card', { timeout: 30000 }).should(
        'be.visible',
      )
      // No app chrome inside the widget page
      cy.get('app-header').should('not.exist')
      cy.get('app-footer').should('not.exist')
      // Theme applied from the query param, not user preference
      cy.get('body').should('have.attr', 'data-bs-theme', 'dark')
      // noindex so embed pages stay out of search engines
      cy.get('head meta[name="robots"]')
        .invoke('attr', 'content')
        .should('contain', 'noindex')
      // Requested sections render; the omitted one does not
      cy.get('.embed-stats').should('exist')
      cy.get('.embed-group').should('not.exist')
      // Stats: one line for crypt info, one line for library info
      cy.get('.embed-stat-line').should('have.length', 2)
    })
  })

  it('defaults to every section and links back to the deck page', function () {
    withFirstDeckPath(this, (path) => {
      cy.visit(`${path}/embed?theme=light`)
      cy.get('app-deck-embed .embed-card', { timeout: 30000 }).should(
        'be.visible',
      )
      cy.get('body').should('have.attr', 'data-bs-theme', 'light')
      cy.get('.embed-stats').should('exist')
      // Header always links out to the deck page in a new tab
      cy.get('.embed-name')
        .should('have.attr', 'target', '_blank')
        .invoke('attr', 'href')
        .should('contain', path)
    })
  })

  it('shows the card image while hovering a list row', function () {
    withFirstDeckPath(this, (path) => {
      cy.visit(`${path}/embed`)
      cy.get('app-deck-embed .embed-list li', { timeout: 30000 })
        .first()
        .trigger('mouseenter', { clientX: 100, clientY: 100 })
      // 'exist' rather than 'be.visible': Cypress misjudges fixed-position
      // pointer-events:none overlays as covered by the content behind them
      cy.get('.embed-hover-image')
        .should('exist')
        .invoke('attr', 'src')
        .should('match', /^https?:\/\//)
      cy.get('app-deck-embed .embed-list li').first().trigger('mouseleave')
      cy.get('.embed-hover-image').should('not.exist')
    })
  })

  it('opens the embed generator from the export menu', function () {
    withFirstDeckPath(this, (path) => {
      cy.visitApp(path)
      cy.waitForIdle()
      // Embed lives in the Export dropdown, not as a primary action
      cy.get('main .bi-code-square').should('not.exist')
      // The menu opens on a later change-detection tick (zoneless) and a
      // stray re-render can close it again — check state before clicking
      const ensureExportMenuOpen = (attempt = 0) => {
        cy.get('body').then(($body) => {
          if ($body.find('.dropdown-menu.show i.bi-code-square').length) {
            return
          }
          if (attempt >= 4) {
            return
          }
          cy.get('main button i.bi-download').parent().click()
          cy.wait(500)
          ensureExportMenuOpen(attempt + 1)
        })
      }
      ensureExportMenuOpen()
      cy.get('.dropdown-menu.show [ngbdropdownitem] i.bi-code-square')
        .parent()
        .click()
      cy.get('app-embed-snippet-modal').should('be.visible')
      // Only the embed.js snippet is offered — a single code block
      cy.get('app-embed-snippet-modal textarea').should('have.length', 1)
      cy.get('app-embed-snippet-modal textarea')
        .first()
        .invoke('val')
        .should('contain', 'vtesdecks-deck')
        .and('contain', 'data-sections="stats,crypt,library"')
        .and('not.contain', '<iframe')
      // The live preview resizes itself from embed resize messages. Real
      // cross-frame postMessage never fires under Cypress (it patches
      // window.parent), so dispatch a synthetic MessageEvent instead.
      cy.window().then((win) => {
        const frame = win.document.querySelector(
          'app-embed-snippet-modal iframe',
        ) as HTMLIFrameElement
        win.dispatchEvent(
          new win.MessageEvent('message', {
            origin: win.location.origin,
            data: { type: 'vtesdecks-embed-resize', deckId: 'x', height: 640 },
            source: frame.contentWindow,
          }),
        )
      })
      cy.get('app-embed-snippet-modal iframe')
        .invoke('attr', 'style')
        .should('contain', 'height: 640px')
      // Toggling a section updates the generated snippet
      cy.get('#embed-section-library').click()
      cy.get('app-embed-snippet-modal textarea')
        .first()
        .invoke('val')
        .should('contain', 'data-sections="stats,crypt"')
      // Size defaults to auto (no attributes); custom CSS sizes emit them
      cy.get('app-embed-snippet-modal textarea')
        .first()
        .invoke('val')
        .should('not.contain', 'data-width')
        .and('not.contain', 'data-height')
      cy.get('#embed-width-auto').click()
      cy.get('#embed-width-size').clear()
      cy.get('#embed-width-size').type('50%')
      cy.get('#embed-height-auto').click()
      cy.get('app-embed-snippet-modal textarea')
        .first()
        .invoke('val')
        .should('contain', 'data-width="50%"')
        .and('contain', 'data-height="600px"')
    })
  })
})
