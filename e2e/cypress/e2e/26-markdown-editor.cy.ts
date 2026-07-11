import { SEL } from '../support/selectors'

/**
 * Markdown editor (authenticated) — inline autocomplete, toolbar card search,
 * YouTube link modal and the side-by-side live preview.
 *
 * The spec works on the deck-builder description draft and never clicks
 * "Save", so nothing is written to the backend.
 */
describe('Markdown editor', () => {
  const TEXTAREA = 'app-markdown-textarea textarea'
  const SUGGESTIONS = '.markdown-suggestions'

  beforeEach(() => {
    cy.login()
    cy.visitApp('/decks/builder')
    cy.waitForIdle()
    // A draft-recovery dialog may appear on entry — dismiss it if present.
    cy.get('body').then(($b) => {
      const close = $b.find(`${SEL.modal} ${SEL.modalClose}`)
      if (close.length) cy.wrap(close.first()).click()
    })
  })

  it('opens prefix suggestions on [[ and inserts a card via keyboard', () => {
    cy.get(TEXTAREA).click()
    cy.get(TEXTAREA).type('[[')
    cy.get(SUGGESTIONS).should('be.visible')
    cy.get(SUGGESTIONS).should('contain.text', 'card:')
    cy.get(SUGGESTIONS).should('contain.text', 'youtube:')

    // Typing a name searches the crypt+library stores (debounced).
    cy.get(TEXTAREA).type('blood do')
    cy.get(`${SUGGESTIONS} .dropdown-item`, { timeout: 20000 }).should(
      ($items) => {
        expect($items.text()).to.match(/blood/i)
      },
    )
    cy.get(TEXTAREA).type('{enter}')
    cy.get(TEXTAREA)
      .invoke('val')
      .should('match', /\[\[card:[^\]]+\]\]/)
    cy.get(SUGGESTIONS).should('not.exist')
  })

  it('closes the inline suggestions with Escape without losing text', () => {
    cy.get(TEXTAREA).click()
    cy.get(TEXTAREA).type('[[')
    cy.get(SUGGESTIONS).should('be.visible')
    cy.get(TEXTAREA).type('{esc}')
    cy.get(SUGGESTIONS).should('not.exist')
    cy.get(TEXTAREA).invoke('val').should('contain', '[[')
  })

  it('filters clans after the clan: prefix', () => {
    cy.get(TEXTAREA).click()
    cy.get(TEXTAREA).type('[[clan:tor')
    cy.get(`${SUGGESTIONS} .dropdown-item`).should('contain.text', 'Toreador')
    cy.get(TEXTAREA).type('{enter}')
    cy.get(TEXTAREA).invoke('val').should('contain', '[[clan:Toreador]]')
  })

  it('inserts a card from the toolbar search dropdown', () => {
    cy.get('#cardDropdownToggle').click()
    cy.get('.markdown-card-search input').should('be.focused')
    cy.get('.markdown-card-search input').type('ashur tab')
    cy.get('.markdown-card-search .dropdown-item', { timeout: 20000 }).should(
      ($items) => {
        expect($items.text()).to.match(/ashur/i)
      },
    )
    cy.get('.markdown-card-search input').type('{enter}')
    cy.get(TEXTAREA).invoke('val').should('contain', '[[card:')
  })

  it('extracts the video ID from a pasted YouTube URL', () => {
    cy.get('app-markdown-textarea i.bi-youtube').first().click()
    cy.get(SEL.modal).should('be.visible')
    cy.get('#youtubeUrl').type(
      'https://www.youtube.com/watch?v=IxX_QHay02M&t=10s',
    )
    cy.get(SEL.modal)
      .contains('button', /insert/i)
      .click()
    cy.get(TEXTAREA).invoke('val').should('contain', '[[youtube:IxX_QHay02M]]')
  })

  it('offers to embed a pasted YouTube URL', () => {
    const url = 'https://youtu.be/IxX_QHay02M'
    cy.get(TEXTAREA).click()
    cy.get(TEXTAREA).type('Watch this: ')
    // Synthetic paste: fire the paste event, then apply the text + input event
    // the way the browser would (Cypress cannot perform a native paste).
    cy.get(TEXTAREA).then(($ta) => {
      const textArea = $ta[0] as HTMLTextAreaElement
      const dataTransfer = new DataTransfer()
      dataTransfer.setData('text/plain', url)
      textArea.dispatchEvent(
        new ClipboardEvent('paste', {
          clipboardData: dataTransfer,
          bubbles: true,
          cancelable: true,
        }),
      )
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value',
      )!.set!
      setter.call(textArea, textArea.value + url)
      textArea.setSelectionRange(
        textArea.value.length,
        textArea.value.length,
      )
      textArea.dispatchEvent(new Event('input', { bubbles: true }))
    })
    cy.get(SUGGESTIONS).should('be.visible')
    cy.get(`${SUGGESTIONS} .dropdown-item`).should(($items) => {
      expect($items.text()).to.match(/embed/i)
    })
    cy.get(TEXTAREA).type('{enter}')
    cy.get(TEXTAREA)
      .invoke('val')
      .should('eq', 'Watch this: [[youtube:IxX_QHay02M]]')
    cy.get(SUGGESTIONS).should('not.exist')
  })

  it('keeps a pasted YouTube URL as plain text when dismissed', () => {
    const url = 'https://youtu.be/IxX_QHay02M'
    cy.get(TEXTAREA).click()
    cy.get(TEXTAREA).then(($ta) => {
      const textArea = $ta[0] as HTMLTextAreaElement
      const dataTransfer = new DataTransfer()
      dataTransfer.setData('text/plain', url)
      textArea.dispatchEvent(
        new ClipboardEvent('paste', {
          clipboardData: dataTransfer,
          bubbles: true,
          cancelable: true,
        }),
      )
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value',
      )!.set!
      setter.call(textArea, url)
      textArea.setSelectionRange(url.length, url.length)
      textArea.dispatchEvent(new Event('input', { bubbles: true }))
    })
    cy.get(SUGGESTIONS).should('be.visible')
    cy.get(TEXTAREA).type('{esc}')
    cy.get(SUGGESTIONS).should('not.exist')
    cy.get(TEXTAREA).invoke('val').should('eq', url)
  })

  it('rejects an invalid YouTube URL', () => {
    cy.get('app-markdown-textarea i.bi-youtube').first().click()
    cy.get(SEL.modal).should('be.visible')
    cy.get('#youtubeUrl').type('not a valid url')
    cy.get(SEL.modal)
      .contains('button', /insert/i)
      .should('be.disabled')
    cy.get(SEL.modal).find('.text-danger').should('be.visible')
    cy.get(SEL.modalClose).first().click()
  })

  it('shows the live side-by-side preview on wide screens', () => {
    cy.viewport(1400, 900)
    cy.get(TEXTAREA).click()
    cy.get(TEXTAREA).type('**live bold**')
    // Preview pane renders next to the textarea and updates after the debounce.
    cy.get('.markdown-preview-split', { timeout: 10000 }).should('be.visible')
    cy.get('.markdown-preview-split strong', { timeout: 10000 }).should(
      'contain.text',
      'live bold',
    )
  })

  it('falls back to the preview toggle on small screens', () => {
    cy.viewport(375, 812)
    cy.get('.markdown-preview-split').should('not.exist')
    cy.get('app-markdown-textarea')
      .contains('button', /preview/i)
      .click()
    cy.get(TEXTAREA).should('not.exist')
    cy.get('.markdown-preview').should('be.visible')
    // Toggle back to write mode.
    cy.get('app-markdown-textarea')
      .contains('button', /preview/i)
      .click()
    cy.get(TEXTAREA).should('exist')
  })
})
