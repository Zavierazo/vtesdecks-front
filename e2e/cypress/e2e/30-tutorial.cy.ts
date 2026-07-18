/**
 * Interactive tutorial ("Learn to Play").
 * Fully client-side feature: no backend stubs needed. Covers the menu page,
 * advancing through chapter 1, resume-after-reload, chapter replay from the
 * menu, the resources page links, and a mobile viewport smoke test.
 */
describe('Interactive tutorial', () => {
  const narratorText = '[data-cy="tutorial-narrator-text"]'
  const next = '[data-cy="tutorial-next"]'
  const progress = '[data-cy="tutorial-progress"]'

  it('renders the menu with all chapters and a start button', () => {
    cy.visitApp('/tutorial')
    cy.get('[data-cy="tutorial-menu"]').should('be.visible')
    cy.get('[data-cy^="tutorial-chapter-"]').should('have.length', 13)
    cy.get('[data-cy="tutorial-start"]').should('be.visible')
  })

  it('walks chapter 1 and advances to chapter 2', () => {
    cy.visitApp('/tutorial')
    cy.get('[data-cy="tutorial-start"]').click()
    cy.location('pathname').should('include', '/tutorial/play')
    cy.get(progress).should('contain.text', '1/13')

    cy.get(narratorText)
      .invoke('text')
      .then((firstText) => {
        cy.get(next).click()
        cy.get(narratorText).invoke('text').should('not.eq', firstText)
      })

    // Finish the remaining chapter 1 steps (6 next-steps in total)
    for (let i = 0; i < 5; i++) {
      cy.get(next).click()
    }
    // A chapter intro interstitial appears between chapters
    cy.get('[data-cy="tutorial-chapter-start"]').click()
    cy.get(progress).should('contain.text', '2/13')
  })

  it('resumes where the player left off after a reload', () => {
    cy.visitApp('/tutorial/play')
    cy.get(next).click()
    cy.get(next).click()
    cy.get(progress)
      .invoke('text')
      .then((before) => {
        cy.reload()
        cy.get(progress).should('have.text', before)
      })
  })

  it('replays a chapter from the menu and interacts with the board', () => {
    cy.visitApp('/tutorial')
    cy.get('[data-cy="tutorial-chapter-ch3"]').click()
    cy.location('pathname').should('include', '/tutorial/play')
    cy.get(progress).should('contain.text', '3/13')
    cy.get(next).click()
    // Zone tour: clicking the highlighted crypt pile advances the step
    cy.get(narratorText)
      .invoke('text')
      .then((before) => {
        cy.get('[data-cy="you-crypt"]').click()
        cy.get(narratorText).invoke('text').should('not.eq', before)
      })
  })

  it('lists the resources with external links and the decks CTA', () => {
    cy.visitApp('/tutorial/resources')
    cy.get('[data-cy="tutorial-resources"]').should('be.visible')
    cy.get('[data-cy="tutorial-resource-link"]').should(
      'have.length.at.least',
      6,
    )
    cy.get('a[data-cy="tutorial-resource-link"][target="_blank"]').each(
      ($link) => {
        expect($link.attr('rel')).to.contain('noopener')
        expect($link.attr('href')).to.match(/^https:\/\//)
      },
    )
  })

  it('renders the board and narrator on a mobile viewport', () => {
    cy.viewport(375, 812)
    cy.visitApp('/tutorial/play')
    cy.get('[data-cy="tutorial-narrator"]').should('be.visible')
    cy.get(next).should('be.visible')
  })

  it('is reachable from the header tools menu', () => {
    cy.viewport(1280, 800)
    cy.visitApp('/')
    cy.get('#navbarDropdownTools').click()
    cy.get('[data-cy="tutorial-link"]').click()
    cy.location('pathname').should('eq', '/tutorial')
  })
})
