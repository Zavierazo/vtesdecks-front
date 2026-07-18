import { decksPage } from '../pages/DecksPage'
import { SEL } from '../support/selectors'

/**
 * Quick reactions on decks and comments.
 * All behavior is stub-based (cy.intercept) so the suite stays deterministic
 * regardless of the backend's reaction data: reads are injected into the deck
 * and comments GETs, writes are stubbed. Covers chip rendering, optimistic
 * toggle + rollback (HTTP error and `false` body), the anonymous login gate,
 * the compact comment variant with its popover picker, and graceful
 * degradation when the backend omits the `reactions` field.
 */
describe('Quick reactions', () => {
  const chip = 'app-quick-reactions button.reaction-chip:not(.reaction-chip--add)'
  const addTrigger = 'app-quick-reactions button.reaction-chip--add'
  const picker = 'ngb-popover-window .reaction-picker'

  const deckReactions = [
    { reaction: 'spicy', count: 2, reacted: false },
  ]

  const fakeComment = {
    id: 990001,
    deckId: '',
    created: '2026-01-01T10:00:00Z',
    modified: '2026-01-01T10:00:00Z',
    content: 'Nice deck!',
    fullName: 'Test User',
    username: 'testuser',
    profileImage: '/assets/img/default_user.png',
    createdBySupporter: false,
    createdByCurrentUser: false,
    reactions: [{ reaction: 'thumbs_up', count: 3, reacted: false }],
  }

  /**
   * Discover a real deck id from the decks list, register the read stubs and
   * open its detail page. Skips when the instance has no decks.
   */
  const openDeckWithReactions = (
    ctx: Mocha.Context,
    options: { reactions?: unknown; comments?: unknown[] },
    fn: (deckId: string) => void,
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
        const path = String(href).split(/[?#]/)[0]
        const deckId = path.replace('/deck/', '')
        cy.intercept('GET', `**/decks/${deckId}*`, (req) =>
          req.continue((res) => {
            if (options.reactions === undefined) {
              delete res.body.reactions
            } else {
              res.body.reactions = options.reactions
            }
          }),
        ).as('deck')
        if (options.comments) {
          cy.intercept('GET', `**/comments/decks/${deckId}*`, {
            body: options.comments,
          }).as('comments')
        }
        cy.visitApp(path)
        cy.waitForIdle()
        cy.get(SEL.deckDetail.root).should('be.visible')
        fn(deckId)
      })
  }

  it('renders all six deck chips with the injected counts', function () {
    openDeckWithReactions(this, { reactions: deckReactions }, () => {
      cy.get(chip).should('have.length', 6)
      // The injected "spicy" summary surfaces its count on its chip.
      cy.get(chip)
        .filter(':contains("🔥")')
        .should('contain.text', '2')
      // Zero-count chips show no count.
      cy.get(chip).filter(':contains("🩸")').should('not.contain.text', '1')
    })
  })

  it('optimistically toggles a reaction and posts the expected body', function () {
    cy.login()
    openDeckWithReactions(this, { reactions: [] }, (deckId) => {
      cy.intercept('POST', '**/user/decks/reaction*', { body: true }).as(
        'react',
      )
      cy.get(chip).first().as('first')
      cy.get('@first').should('not.have.class', 'btn-primary').click()
      // Optimistic: highlighted + count 1 before/without server confirmation.
      cy.get('@first').should('have.class', 'btn-primary')
      cy.get('@first').should('contain.text', '1')
      cy.wait('@react')
        .its('request.body')
        .should('deep.equal', {
          deck: deckId,
          reaction: 'would_play',
          active: true,
        })

      // Toggling off posts active=false and clears the highlight.
      cy.get('@first').click()
      cy.get('@first').should('not.have.class', 'btn-primary')
      cy.wait('@react')
        .its('request.body')
        .should('deep.equal', {
          deck: deckId,
          reaction: 'would_play',
          active: false,
        })
    })
  })

  it('rolls back the optimistic update when the API fails', function () {
    cy.login()
    openDeckWithReactions(this, { reactions: [] }, () => {
      // HTTP error → rollback + toast.
      cy.intercept('POST', '**/user/decks/reaction*', { statusCode: 500 }).as(
        'reactError',
      )
      cy.get(chip).first().as('first')
      cy.get('@first').click()
      cy.wait('@reactError')
      cy.get('@first').should('not.have.class', 'btn-primary')
      cy.get(SEL.toastContainer).should('be.visible')

      // `false` body (missing/deleted target) → same rollback.
      cy.intercept('POST', '**/user/decks/reaction*', { body: false }).as(
        'reactFalse',
      )
      cy.get('@first').click()
      cy.wait('@reactFalse')
      cy.get('@first').should('not.have.class', 'btn-primary')
    })
  })

  it('prompts anonymous users to log in instead of reacting', function () {
    openDeckWithReactions(this, { reactions: deckReactions }, () => {
      cy.intercept('POST', '**/user/decks/reaction*').as('react')
      cy.get(chip).first().click()
      cy.get(SEL.login.username).should('be.visible')
      cy.get('@react.all').should('have.length', 0)
    })
  })

  it('shows compact reactions on comments with a popover picker', function () {
    cy.login()
    openDeckWithReactions(
      this,
      { reactions: [], comments: [fakeComment] },
      () => {
        cy.intercept('POST', '**/user/comments/*/reaction*', {
          body: true,
        }).as('reactComment')
        // Compact: only the nonzero chip plus the add trigger are visible.
        cy.get('app-comment').within(() => {
          cy.get(chip).should('have.length', 1).and('contain.text', '3')
          cy.get(addTrigger).click()
        })
        // The picker (rendered in body) offers all seven comment reactions.
        cy.get(picker).should('be.visible').find('button').should('have.length', 7)
        // Pick "heart" (a reaction with no chip yet) so a second chip appears.
        cy.get(picker).find('button').eq(2).click()
        cy.wait('@reactComment')
          .its('request.body')
          .should('deep.equal', { reaction: 'heart', active: true })
        // Picker closes and the new chip appears in the comment.
        cy.get(picker).should('not.exist')
        cy.get('app-comment').find(chip).should('have.length', 2)
      },
    )
  })

  it('hides the reaction bar when the backend omits the reactions field', function () {
    openDeckWithReactions(this, { reactions: undefined }, () => {
      cy.get('app-quick-reactions').should('not.exist')
    })
  })
})
