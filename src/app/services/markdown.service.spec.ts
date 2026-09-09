import { SecurityContext } from '@angular/core'
import {
  DeferBlockBehavior,
  DeferBlockState,
  TestBed,
} from '@angular/core/testing'
import { DomSanitizer } from '@angular/platform-browser'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MarkdownTextComponent } from '../shared/components/markdown-text/markdown-text.component'
import { MarkdownRenderPipe } from '../shared/pipes/markdown-render.pipe'
import { MarkdownService } from './markdown.service'

describe('Markdown security boundary', () => {
  const crypt = { getAll: vi.fn((): { name: string; image: string }[] => []) }
  const library = { getAll: vi.fn((): { name: string; image: string }[] => []) }
  let service: MarkdownService

  beforeEach(() => {
    crypt.getAll.mockReset().mockReturnValue([])
    library.getAll.mockReset().mockReturnValue([])
    TestBed.configureTestingModule({
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        { provide: CryptQuery, useValue: crypt },
        { provide: LibraryQuery, useValue: library },
      ],
    })
    service = TestBed.inject(MarkdownService)
  })

  function render(markdown: string): HTMLDivElement {
    const container = document.createElement('div')
    container.innerHTML = service.parse(markdown)
    return container
  }

  it.each([
    '[click](javascript:alert(1))',
    '[click](JaVaScRiPt:alert(1))',
    '[click](javascript&#58;alert(1))',
    '[click][ref]\n\n[ref]: javascript:alert(1)',
    '<a href="java&#x09;script:alert(1)">click</a>',
    '<a href="vbscript:msgbox(1)">click</a>',
    '<a href="data:text/html,test">click</a>',
  ])('removes executable link destinations after parsing: %s', (markdown) => {
    const link = render(markdown).querySelector('a')!
    expect(link).not.toBeNull()
    expect(link.hasAttribute('href')).toBe(false)
  })

  it('removes active HTML, unsafe image URLs, and unapproved custom elements', () => {
    const container = render(
      '<script>alert(1)</script><img src="data:image/svg+xml,test" onerror="alert(1)">' +
        '<svg onload="alert(1)"></svg><object data="https://example.com"></object>' +
        '<app-other onclick="alert(1)">text</app-other>' +
        '<span style="position:fixed" id="location" data-test="x">text</span>',
    )
    expect(container.querySelector('script, svg, object, app-other')).toBeNull()
    expect(
      container.querySelector(
        '[onerror], [onload], [onclick], [style], [id], [data-test]',
      ),
    ).toBeNull()
    expect(container.querySelector('img')!.hasAttribute('src')).toBe(false)
  })

  it.each([
    'dQw4w9WgXcQ" onload="alert(1)',
    'dQw4w9WgXcQ&quot; onload=&quot;alert(1)',
    '../watch?v=dQw4w9WgXcQ',
    'dQw4w9WgXcQ?autoplay=1',
    'short',
  ])('keeps malformed YouTube syntax inert (negative regression): %s', (id) => {
    const container = render(`[[youtube:${id}]]`)
    expect(container.querySelector('iframe, [onload]')).toBeNull()
    expect(container.textContent?.trim()).toBe(`[[youtube:${id}]]`)
  })

  it('allows only exact YouTube embed URLs, without active attributes', () => {
    const container = render(
      '[[youtube:dQw4w9WgXcQ]]\n\n' +
        '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" srcdoc="<script>alert(1)</script>" onload="alert(1)"></iframe>' +
        '<iframe src="https://www.youtube.com.evil.test/embed/dQw4w9WgXcQ"></iframe>' +
        '<iframe src="https://example.com/"></iframe>' +
        '<iframe src="javascript:alert(1)"></iframe>',
    )
    expect(container.querySelectorAll('iframe')).toHaveLength(2)
    expect(container.querySelector('[srcdoc], [onload]')).toBeNull()
    expect(container.querySelector('iframe')!.getAttribute('src')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    )
  })

  it('preserves Markdown formatting, ordinary URLs, icons and task lists', () => {
    const container = render(
      '# Heading\n\n> **bold** and *italic*\n\n`<script>`\n\n' +
        '[site](https://example.com) [local](/decks) [email](mailto:test@example.com)\n\n' +
        '![image](https://example.com/card.jpg)\n\n- [x] done\n\n' +
        '| A | B |\n| --- | --- |\n| 1 | 2 |\n\n[[clan:Ventrue]] [[discipline:dom]]',
    )
    for (const selector of [
      'h1',
      'blockquote strong',
      'em',
      'code',
      'img[src]',
      'table',
      'i.vtes',
      'input[type="checkbox"][disabled]',
    ]) {
      expect(container.querySelector(selector)).not.toBeNull()
    }
    expect(
      [...container.querySelectorAll('a')].map((a) => a.getAttribute('href')),
    ).toEqual(['https://example.com', '/decks', 'mailto:test@example.com'])
    expect(container.querySelector('code')!.textContent).toBe('<script>')
  })

  it('encodes card attributes and preserves the required custom element', () => {
    const name = 'Card " onmouseover="alert(1) <test> & more'
    const image = '/img/cards/test" onerror="alert(1).jpg'
    crypt.getAll.mockReturnValue([{ name, image }])
    const container = render('[[card:Card]]')
    const card = container.querySelector('app-markdown-card')!
    expect(card.getAttribute('name')).toBe(name)
    expect(card.getAttribute('image')).toBe(image)
    expect(card.getAttributeNames().sort()).toEqual(['image', 'name'])
  })

  it('encodes unmatched extension content rather than interpreting it as HTML', () => {
    for (const extension of ['card', 'clan', 'discipline']) {
      const container = render(`[[${extension}:<img src=x onerror=alert(1)>]]`)
      expect(container.querySelector('img')).toBeNull()
      expect(container.textContent).toContain('<img src=x onerror=alert(1)>')
    }
  })

  it('sanitizes the actual component binding and legacy pipe output', async () => {
    const fixture = TestBed.createComponent(MarkdownTextComponent)
    fixture.componentRef.setInput('data', '[click](javascript:alert(1))')
    fixture.detectChanges()
    const blocks = await fixture.getDeferBlocks()
    await blocks[0].render(DeferBlockState.Complete)
    const link = (fixture.nativeElement as HTMLElement).querySelector('a')!
    expect(link.hasAttribute('href')).toBe(false)

    const pipe = TestBed.runInInjectionContext(() => new MarkdownRenderPipe())
    const html = TestBed.inject(DomSanitizer).sanitize(
      SecurityContext.HTML,
      pipe.transform('[click](javascript:alert(1))'),
    )!
    const container = document.createElement('div')
    container.innerHTML = html
    expect(container.querySelector('a')!.hasAttribute('href')).toBe(false)

    fixture.componentRef.setInput(
      'data',
      '[[youtube:dQw4w9WgXcQ" onload="alert(1)]]',
    )
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('iframe, [onload]')).toBeNull()
  })
})
