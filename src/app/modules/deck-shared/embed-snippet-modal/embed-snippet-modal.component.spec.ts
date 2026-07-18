import { Clipboard } from '@angular/cdk/clipboard'
import { TestBed } from '@angular/core/testing'
import { DomSanitizer } from '@angular/platform-browser'
import { TranslocoService } from '@jsverse/transloco'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { ToastService } from '@services'
import { describe, expect, it, vi } from 'vitest'
import { EmbedSnippetModalComponent } from './embed-snippet-modal.component'

describe('EmbedSnippetModalComponent', () => {
  function setup() {
    const copy = vi.fn()
    const show = vi.fn()
    TestBed.configureTestingModule({
      providers: [
        { provide: NgbActiveModal, useValue: { dismiss: vi.fn() } },
        { provide: Clipboard, useValue: { copy } },
        { provide: ToastService, useValue: { show } },
        {
          provide: TranslocoService,
          useValue: { translate: (key: string) => key },
        },
        {
          provide: DomSanitizer,
          useValue: {
            bypassSecurityTrustResourceUrl: (url: string) => url,
          },
        },
      ],
    })
    const component = TestBed.runInInjectionContext(
      () => new EmbedSnippetModalComponent(),
    )
    component.deckId = 'tournament-1'
    component.deckName = 'Test Deck'
    return { component, copy, show }
  }

  it('generates snippets with the default options', () => {
    const { component } = setup()
    expect(component.sections()).toBe('stats,crypt,library')
    expect(component.jsSnippet()).toContain('data-deck-id="tournament-1"')
    expect(component.jsSnippet()).toContain('data-theme="auto"')
    expect(component.jsSnippet()).toContain(
      'data-sections="stats,crypt,library"',
    )
    expect(component.jsSnippet()).toContain('/assets/js/embed.js')
    expect(component.embedUrl()).toContain(
      '/deck/tournament-1/embed?theme=auto&sections=stats,crypt,library',
    )
  })

  it('reflects theme and section changes in every output', () => {
    const { component } = setup()
    component.theme.set('dark')
    component.library.set(false)
    expect(component.sections()).toBe('stats,crypt')
    expect(component.embedUrl()).toContain('theme=dark&sections=stats,crypt')
    expect(component.jsSnippet()).toContain('data-theme="dark"')
    expect(component.jsSnippet()).toContain('data-sections="stats,crypt"')
    expect(component.previewUrl()).toContain('theme=dark&sections=stats,crypt')
  })

  it('omits size attributes on auto and emits them when specified', () => {
    const { component } = setup()
    expect(component.jsSnippet()).not.toContain('data-width')
    expect(component.jsSnippet()).not.toContain('data-height')

    component.widthAuto.set(false)
    component.widthSize.set('30rem')
    component.heightAuto.set(false)
    component.heightSize.set('600px')
    expect(component.jsSnippet()).toContain('data-width="30rem"')
    expect(component.jsSnippet()).toContain('data-height="600px"')

    // Quotes are stripped and blank values fall back to auto
    component.widthSize.set('50%" onload="x')
    expect(component.jsSnippet()).toContain('data-width="50% onload=x"')
    component.widthSize.set('   ')
    expect(component.jsSnippet()).not.toContain('data-width')
  })

  it('resizes the preview from embed resize messages of its own iframe', () => {
    const { component } = setup()
    const contentWindow = {} as Window
    component.previewFrame = {
      nativeElement: { contentWindow },
    } as never
    const handler = (
      component as unknown as {
        onPreviewMessage: (event: Partial<MessageEvent>) => void
      }
    ).onPreviewMessage
    handler({
      origin: window.location.origin,
      data: { type: 'vtesdecks-embed-resize', height: 512.4 },
      source: contentWindow as never,
    })
    expect(component.previewHeight()).toBe(513)
    // Messages from other windows are ignored
    handler({
      origin: window.location.origin,
      data: { type: 'vtesdecks-embed-resize', height: 100 },
      source: {} as never,
    })
    expect(component.previewHeight()).toBe(513)
  })

  it('copies the snippet and shows a toast', () => {
    const { component, copy, show } = setup()
    component.onCopy('snippet-content')
    expect(copy).toHaveBeenCalledWith('snippet-content')
    expect(show).toHaveBeenCalled()
  })
})
