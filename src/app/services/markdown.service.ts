import { inject, Injectable } from '@angular/core'
import { CryptQuery } from '@state/crypt/crypt.query'
import { LibraryQuery } from '@state/library/library.query'
import { marked } from 'marked'
import { bracketsExtension } from '../marked-extension'

@Injectable({ providedIn: 'root' })
export class MarkdownService {
  constructor() {
    const cryptQuery = inject(CryptQuery)
    const libraryQuery = inject(LibraryQuery)
    marked.use(bracketsExtension(cryptQuery, libraryQuery))
  }

  parse(markdown: string): string {
    return marked.parse(markdown) as string
  }
}
