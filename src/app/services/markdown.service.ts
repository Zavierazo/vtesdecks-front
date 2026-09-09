import { inject, Injectable } from '@angular/core'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { Marked } from 'marked'
import createDOMPurify from 'dompurify'
import { bracketsExtension } from '../marked-extension'

@Injectable({ providedIn: 'root' })
export class MarkdownService {
  private readonly sanitizer = inject(DomSanitizer)
  private readonly parser = new Marked()
  private readonly purifier = createDOMPurify()

  constructor() {
    const cryptQuery = inject(CryptQuery)
    const libraryQuery = inject(LibraryQuery)
    this.parser.use(bracketsExtension(cryptQuery, libraryQuery))
    this.purifier.addHook('uponSanitizeElement', (node, data) => {
      if (
        data.tagName === 'iframe' &&
        !/^https:\/\/www\.youtube\.com\/embed\/[A-Za-z0-9_-]{11}$/.test(
          (node as Element).getAttribute('src') ?? '',
        )
      ) {
        node.parentNode?.removeChild(node)
      }
    })
    this.purifier.addHook('uponSanitizeAttribute', (node, data) => {
      const tag = node.nodeName.toLowerCase()
      const attributes: Record<string, string[]> = {
        a: ['href', 'title'],
        img: ['src', 'alt', 'title', 'width', 'height'],
        code: ['class'],
        span: ['class'],
        i: ['class', 'title'],
        ol: ['start'],
        th: ['align'],
        td: ['align'],
        input: ['type', 'checked', 'disabled'],
        'app-markdown-card': ['name', 'image'],
        iframe: [
          'src',
          'width',
          'height',
          'loading',
          'frameborder',
          'allowfullscreen',
          'class',
        ],
      }
      data.keepAttr = attributes[tag]?.includes(data.attrName) ?? false
      if (['href', 'src', 'image'].includes(data.attrName)) {
        try {
          const url = new URL(data.attrValue, 'https://vtesdecks.com/')
          data.keepAttr &&= [
            'https:',
            'http:',
            ...(data.attrName === 'href' ? ['mailto:'] : []),
          ].includes(url.protocol)
        } catch {
          data.keepAttr = false
        }
      }
      if (tag === 'input' && data.attrName === 'type') {
        data.keepAttr &&= data.attrValue === 'checkbox'
      }
    })
    this.purifier.addHook('afterSanitizeAttributes', (node) => {
      if (node.nodeName.toLowerCase() === 'input')
        node.setAttribute('disabled', '')
    })
  }

  parse(markdown: string): string {
    return this.purifier.sanitize(
      this.parser.parse(markdown, { async: false }),
      {
        ALLOWED_TAGS: [
          'p',
          'br',
          'hr',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'blockquote',
          'pre',
          'code',
          'strong',
          'em',
          'del',
          's',
          'ul',
          'ol',
          'li',
          'a',
          'img',
          'table',
          'thead',
          'tbody',
          'tr',
          'th',
          'td',
          'span',
          'i',
          'input',
          'iframe',
        ],
        ALLOWED_ATTR: [
          'href',
          'src',
          'alt',
          'title',
          'width',
          'height',
          'class',
          'start',
          'align',
          'type',
          'checked',
          'disabled',
          'loading',
          'frameborder',
          'allowfullscreen',
        ],
        ALLOW_DATA_ATTR: false,
        ALLOW_ARIA_ATTR: false,
        CUSTOM_ELEMENT_HANDLING: {
          tagNameCheck: (tag) => tag === 'app-markdown-card',
          attributeNameCheck: (attribute, tag) =>
            tag === 'app-markdown-card' &&
            ['name', 'image'].includes(attribute),
          allowCustomizedBuiltInElements: false,
        },
      },
    )
  }

  render(markdown: string): SafeHtml {
    // Angular strips custom elements and iframes. Trust only our sanitized output.
    return this.sanitizer.bypassSecurityTrustHtml(this.parse(markdown))
  }
}
