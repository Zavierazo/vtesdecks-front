import { SEL } from '../support/selectors'

/**
 * Vtesdle — the daily card-guessing game.
 * The secret card is non-deterministic, so we assert only on workflow & state
 * transitions (a guess changes the revealed card image), never on a specific
 * answer. A fresh Cypress browser starts with clean localStorage, so the daily
 * game is always playable.
 */
describe('Vtesdle game', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/vtesdle/**').as('todayCard')
    cy.visitApp('/vtesdle')
    // The guess input renders once the day's card has loaded.
    cy.get(SEL.vtesdle.guessInput, { timeout: 30000 }).should('be.visible')
  })

  it('renders the game with its title and a guess input', () => {
    cy.get(SEL.vtesdle.title).should('contain.text', 'VTESDLE')
    cy.get(SEL.vtesdle.guessInput).should('be.visible')
    // The masked card image is shown while the game is in progress.
    cy.get('img.card-image').should('be.visible')
  })

  it('a guess reveals more of the card (state change)', () => {
    // Capture the masked image URL, make a (near-certainly wrong) guess, and
    // assert the revealed image changed — lives decremented or the game ended.
    cy.get('img.card-image').invoke('attr', 'src').then((before) => {
      cy.get(SEL.vtesdle.guessInput).type('a')
      cy.get(SEL.vtesdle.typeaheadResult, { timeout: 10000 }).first().click()
      cy.waitForIdle()
      // Either the card image changed, or a win alert appeared (lucky guess).
      cy.get('body').then(($b) => {
        if ($b.find(SEL.vtesdle.winAlert).length) {
          cy.get(SEL.vtesdle.winAlert).should('be.visible')
        } else {
          cy.get('img.card-image').invoke('attr', 'src').should('not.equal', before)
        }
      })
    })
  })

  it('the guess typeahead suggests cards from the crypt dataset', () => {
    cy.get(SEL.vtesdle.guessInput).type('the')
    cy.get(SEL.vtesdle.typeaheadResult, { timeout: 10000 })
      .should('have.length.greaterThan', 0)
  })

  it('switches to infinite mode and stays playable', () => {
    // The infinite-mode toggle carries the infinity icon. Switching swaps the
    // header controls (a reset/counter-clockwise button appears) and keeps the
    // game playable.
    cy.get('button:has(i.bi-infinity)').first().click()
    cy.get('button:has(i.bi-arrow-counterclockwise)', { timeout: 10000 }).should('be.visible')
    cy.get(SEL.vtesdle.title).should('contain.text', 'VTESDLE')
    cy.get(SEL.vtesdle.guessInput).should('be.visible')
  })
})
