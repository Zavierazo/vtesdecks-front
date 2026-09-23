import {
  authenticate,
  mockCatalogs,
  crypt,
  library,
} from '../support/offline-fixtures'

// Distinct borders make accidental exposure outside the art rectangle visible.
const image = `<svg xmlns="http://www.w3.org/2000/svg" width="358" height="500">
  <rect width="358" height="500" fill="#ff0055"/>
  <rect x="75" y="55" width="260" height="333" fill="#176b44"/>
  <rect x="75" y="58" width="259" height="225" fill="#246faa"/>
  <path d="M75 58L334 283M334 58L75 283" stroke="white" stroke-width="8"/>
</svg>`

describe('Full-card artwork backgrounds', { retries: 0 }, () => {
  it('preserves crop geometry, row layout and interactions without crop requests', () => {
    mockCatalogs()
    const cropRequests: string[] = []
    cy.intercept('**/img/cards/**', (req) => {
      if (req.url.includes('/crop/')) {
        cropRequests.push(req.url)
      }
      req.reply({
        body: image,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Access-Control-Allow-Origin': '*',
        },
      })
    })
    cy.intercept('GET', '**/user/decks/builder/art-test*', {
      body: {
        id: 'art-test',
        name: 'Artwork test',
        published: false,
        collection: false,
        cards: [
          { id: crypt.id, type: crypt.type, number: 2 },
          { id: library.id, type: library.type, number: 2 },
        ],
      },
    })
    cy.visit('/decks/builder?id=art-test', {
      onBeforeLoad(win) {
        authenticate(win)
        win.localStorage.setItem(
          'auth',
          JSON.stringify({
            ...JSON.parse(win.localStorage.getItem('auth')!),
            builderDisplayMode: 'list',
          }),
        )
      },
    })
    cy.get('#name').should('have.value', 'Artwork test')
    for (const width of [1440, 390]) {
      cy.viewport(width, 900)
      for (const compact of [false, true]) {
        for (const kind of ['crypt', 'library'] as const) {
          const selector = `app-builder app-${kind}`
          cy.get(selector)
            .first()
            .then(($row) => {
              const win = $row[0].ownerDocument
                .defaultView! as unknown as Window & {
                ng: {
                  getComponent(element: Element): {
                    compact: boolean
                    background: boolean
                  }
                  applyChanges(component: unknown): void
                }
              }
              const component = win.ng.getComponent($row[0])
              component.compact = compact
              win.ng.applyChanges(component)
            })
          cy.get(`${selector} app-card-art-background img`)
            .first()
            .should('have.css', 'visibility', 'visible')
          cy.get(selector)
            .first()
            .should(($row) => {
              const row = $row[0].querySelector('a')!
              const host = row.querySelector('app-card-art-background')!
              const crop = host.querySelector('.art-crop')!
              const img = host.querySelector('img')!
              const r = row.getBoundingClientRect()
              const h = host.getBoundingClientRect()
              const c = crop.getBoundingClientRect()
              const i = img.getBoundingClientRect()
              const cropWidth = kind === 'crypt' ? 260 : 259
              const cropHeight = kind === 'crypt' ? 333 : 225
              const scale = h.width / cropWidth
              expect(h.width).to.be.closeTo(row.clientWidth / 2, 0.6)
              expect(c.height).to.be.closeTo(cropHeight * scale, 0.6)
              expect(c.top - h.top).to.be.closeTo(
                (h.height - c.height) * 0.33,
                0.6,
              )
              expect(c.left - i.left).to.be.closeTo(75 * scale, 0.6)
              expect(c.top - i.top).to.be.closeTo(
                (kind === 'crypt' ? 55 : 58) * scale,
                0.6,
              )
              expect(i.width).to.be.closeTo(358 * scale, 0.6)
              expect(r.height).to.be.greaterThan(0)
              expect(getComputedStyle(host).pointerEvents).to.eq('none')
            })
          // Put a reference using the old cropped-background technique below
          // each live row, so screenshots compare both renderings directly.
          cy.get(selector)
            .first()
            .then(($row) => {
              const row = $row[0].querySelector('a')!
              const reference = row.cloneNode(true) as HTMLElement
              reference.querySelector('app-card-art-background')!.remove()
              reference.classList.remove('card-art-row')
              reference.dataset['artReference'] = 'true'
              const cropWidth = kind === 'crypt' ? 260 : 259
              const cropHeight = kind === 'crypt' ? 333 : 225
              const cropY = kind === 'crypt' ? 55 : 58
              const cropped = image.replace(
                'width="358" height="500"',
                `width="${cropWidth}" height="${cropHeight}" viewBox="75 ${cropY} ${cropWidth} ${cropHeight}"`,
              )
              reference.style.background = `url("data:image/svg+xml,${encodeURIComponent(cropped)}") right 33% / 50% no-repeat scroll`
              reference.style.borderTopWidth =
                getComputedStyle(row).borderTopWidth
              row.after(reference)
              expect(reference.getBoundingClientRect().height).to.eq(
                row.getBoundingClientRect().height,
              )
            })
        }
        cy.get('app-builder').screenshot(
          `art-${width}-${compact ? 'compact' : 'normal'}`,
        )
        cy.get('[data-art-reference]').then(($references) =>
          $references.remove(),
        )
      }
    }
    cy.viewport(1440, 900)
    cy.get('app-builder app-crypt a').first().trigger('mouseenter')
    cy.get('ngb-popover-window img').should('be.visible')
    cy.get('app-builder app-crypt a').first().trigger('mouseleave')
    cy.get('app-builder app-crypt .bi-plus-square').first().click()
    cy.get('app-builder app-crypt .deck_number')
      .first()
      .should('contain.text', '3')
    cy.get('app-builder app-crypt .bi-dash-square').first().click()
    cy.get('app-builder app-crypt .deck_number')
      .first()
      .should('contain.text', '2')
    cy.get('app-builder app-crypt')
      .first()
      .then(($row) => {
        const win = $row[0].ownerDocument.defaultView! as unknown as Window & {
          ng: {
            getComponent(element: Element): { background: boolean }
            applyChanges(component: unknown): void
          }
        }
        const component = win.ng.getComponent($row[0])
        component.background = false
        win.ng.applyChanges(component)
      })
    cy.get('app-builder app-crypt app-card-art-background').should('not.exist')
    cy.then(() => expect(cropRequests).to.deep.eq([]))
  })
})
