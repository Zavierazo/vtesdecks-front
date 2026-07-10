import { NgClass } from '@angular/common'
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DoCheck,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { TranslocoDirective } from '@jsverse/transloco'
import {
  NgbDropdown,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
  NgbModal,
  NgbTooltip,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import {
  CLAN_LIST,
  Clan,
  DISCIPLINE_LIST,
  Discipline,
  getCaretCoordinates,
} from '@utils'
import { Subject, debounceTime, of, switchMap, tap } from 'rxjs'
import { MarkdownHelpModalComponent } from '../markdown-help-modal/markdown-help-modal.component'
import { MarkdownTextComponent } from '../markdown-text/markdown-text.component'
import {
  MarkdownSuggestion,
  MarkdownSuggestionService,
} from './markdown-suggestion.service'
import { SuggestionListComponent } from './suggestion-list/suggestion-list.component'
import { YoutubeLinkModalComponent } from './youtube-modal/youtube-link-modal.component'

const MARKDOWN_EXAMPLE = `
**bold**
[[card:Blood Doll]]
[[discipline:Animalism]]
[[clan:Ventrue]]
[link](https://vtesdecks.com)
![image](https://vtesdecks.com/assets/img/logo.png)
[[youtube:IxX_QHay02M]]
`
// Minimum container width to offer the side-by-side preview
const SPLIT_MIN_WIDTH = 700
const SPLIT_STORAGE_KEY = 'markdown-editor-split'
const MIN_SEARCH_LENGTH = 2
const SUGGESTION_DROPDOWN_WIDTH = 280
const PREVIEW_DEBOUNCE_TIME = 300

@UntilDestroy()
@Component({
  selector: 'app-markdown-textarea',
  templateUrl: './markdown-textarea.component.html',
  styleUrls: ['./markdown-textarea.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    ReactiveFormsModule,
    MarkdownTextComponent,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownItem,
    NgbTooltip,
    NgClass,
    SuggestionListComponent,
  ],
})
export class MarkdownTextareaComponent
  implements AfterViewInit, DoCheck, OnDestroy
{
  private readonly modalService = inject(NgbModal)
  private readonly suggestionService = inject(MarkdownSuggestionService)
  private readonly hostRef = inject(ElementRef)

  control = input.required<FormControl>()
  placeholder = input.required<string>()
  label = input.required<string>()
  allowSplit = input(true)

  disciplines: Discipline[] = DISCIPLINE_LIST
  clans: Clan[] = CLAN_LIST

  private readonly textAreaRef =
    viewChild<ElementRef<HTMLTextAreaElement>>('ref')
  private readonly cardSearchInputRef =
    viewChild<ElementRef<HTMLInputElement>>('cardSearchInput')
  private readonly cardDropdownRef = viewChild<NgbDropdown>('cardDropdown')

  // View modes
  previewMode = signal(false)
  containerWidth = signal(0)
  splitAvailable = computed(
    () => this.allowSplit() && this.containerWidth() >= SPLIT_MIN_WIDTH,
  )
  splitEnabled = signal(localStorage.getItem(SPLIT_STORAGE_KEY) !== 'false')
  isSplit = computed(() => this.splitAvailable() && this.splitEnabled())
  isPreviewOnly = computed(() => !this.isSplit() && this.previewMode())
  previewValue = signal<string | undefined>(undefined)
  private resizeObserver?: ResizeObserver
  private lastControlValue: string | undefined

  // Toolbar card search
  cardSearchControl = new FormControl('', { nonNullable: true })
  cardTerm = signal('')
  cardResults = signal<MarkdownSuggestion[]>([])
  cardActiveIndex = signal(0)
  cardEmptyKey = computed(() =>
    this.cardTerm().length < MIN_SEARCH_LENGTH ? 'type_to_search' : 'no_results',
  )

  // Inline [[ autocomplete
  inlineOpen = signal(false)
  inlineItems = signal<MarkdownSuggestion[]>([])
  inlineActiveIndex = signal(0)
  inlineTerm = signal('')
  inlineEmptyKey = signal('no_results')
  inlinePos = signal({ top: 0, left: 0 })
  private inlineTokenStart = 0
  private inlinePrefixItems: MarkdownSuggestion[] = []
  private inlineAwaitingCards = false
  private readonly inlineCardSearch$ = new Subject<string>()

  constructor() {
    this.cardSearchControl.valueChanges
      .pipe(
        untilDestroyed(this),
        tap((term) => this.cardTerm.set(term)),
        debounceTime(200),
        switchMap((term) =>
          term.length >= MIN_SEARCH_LENGTH
            ? this.suggestionService.searchCards(term, 10)
            : of([] as MarkdownSuggestion[]),
        ),
        tap((results) => {
          this.cardResults.set(results)
          this.cardActiveIndex.set(0)
        }),
      )
      .subscribe()

    this.inlineCardSearch$
      .pipe(
        untilDestroyed(this),
        debounceTime(200),
        switchMap((term) =>
          term.length >= MIN_SEARCH_LENGTH
            ? this.suggestionService.searchCards(term, 8)
            : of([] as MarkdownSuggestion[]),
        ),
        tap((cards) => {
          if (this.inlineOpen() && this.inlineAwaitingCards) {
            this.inlineItems.set([...this.inlinePrefixItems, ...cards])
            this.inlineActiveIndex.set(0)
          }
        }),
      )
      .subscribe()
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.resizeTextarea(), 500)
    this.lastControlValue = this.control()?.value
    this.previewValue.set(this.lastControlValue)
    this.control()
      .valueChanges.pipe(
        untilDestroyed(this),
        tap((value) => {
          this.lastControlValue = value
          this.resizeTextarea()
        }),
      )
      .subscribe()
    this.control()
      .valueChanges.pipe(
        untilDestroyed(this),
        debounceTime(PREVIEW_DEBOUNCE_TIME),
        tap((value) => this.previewValue.set(value)),
      )
      .subscribe()
    this.resizeObserver = new ResizeObserver((entries) =>
      this.containerWidth.set(entries[0].contentRect.width),
    )
    this.resizeObserver.observe(this.hostRef.nativeElement)
  }

  ngDoCheck(): void {
    // Catch programmatic value replacements done with { emitEvent: false }
    // (e.g. the deck builder patching the description once the deck loads),
    // which never reach the valueChanges subscriptions.
    const value = this.control()?.value
    if (value !== this.lastControlValue) {
      this.lastControlValue = value
      this.previewValue.set(value)
      this.resizeTextarea()
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect()
  }

  get placeholderWithExample(): string {
    return this.placeholder() + MARKDOWN_EXAMPLE
  }

  get textArea(): HTMLTextAreaElement | undefined {
    return this.textAreaRef()?.nativeElement
  }

  private resizeTextarea(): void {
    const textArea = this.textArea
    if (!textArea) {
      return
    }
    textArea.style.height = 'auto'
    textArea.style.height = textArea.scrollHeight + 'px'
  }

  onPreviewDescription(): void {
    this.previewMode.set(!this.previewMode())
    if (this.previewMode()) {
      this.closeInline()
      this.previewValue.set(this.control()?.value)
    } else {
      setTimeout(() => this.resizeTextarea(), 100)
    }
  }

  onToggleSplit(): void {
    this.splitEnabled.set(!this.splitEnabled())
    localStorage.setItem(SPLIT_STORAGE_KEY, String(this.splitEnabled()))
    if (this.splitEnabled()) {
      this.previewValue.set(this.control()?.value)
    }
  }

  onBold(): void {
    this.applyStyle('**', '**', 'strong')
  }

  onItalic(): void {
    this.applyStyle('_', '_', 'emphasized')
  }

  onStrikethrough(): void {
    this.applyStyle('~~', '~~', 'strikethrough')
  }

  onTitle(): void {
    this.applyStyle('# ', '\n', 'heading')
  }

  onLink(): void {
    this.applyStyle(
      '[',
      '](https://vtesdecks.com)',
      'enter link description here',
    )
  }

  onImage(): void {
    this.applyStyle(
      '![',
      '](https://vtesdecks.com/assets/img/logo.png)',
      'enter image description here',
    )
  }

  onList(numeric: boolean): void {
    const textArea = this.textArea
    if (!textArea) {
      return
    }

    const start = textArea.selectionStart
    const end = textArea.selectionEnd

    if (start === end) {
      const selected = `${numeric ? '1.' : '-'} list text here`
      this.insertAtCaret(selected, { select: true })
    } else {
      const selected = textArea.value.substring(start, end)
      const listLength = numeric ? 3 : 2
      this.insertAtCaret(`${numeric ? '1.' : '-'} ${selected}`)
      textArea.setSelectionRange(
        start + listLength,
        start + listLength + selected.length,
      )
    }
  }

  onCode(): void {
    this.applyStyle('```\n', '\n```', 'code text here')
  }

  onQuote(): void {
    this.applyStyle('> ', '', 'quote here')
  }

  onTable(): void {
    const table = `| Syntax      | Description |\n| ----------- | ----------- |\n| Header      | Title       |\n| Paragraph   | Text        |`
    this.insertAtCaret(table, { select: true })
  }

  onDiscipline(discipline: Discipline): void {
    this.insertAtCaret(`[[discipline:${discipline.name}]]`, { select: true })
  }

  onClan(clan: Clan): void {
    this.insertAtCaret(`[[clan:${clan.name}]]`, { select: true })
  }

  onYoutube(replaceFrom?: number, replaceTo?: number): void {
    const textArea = this.textArea
    if (!textArea) {
      return
    }
    // Capture the selection before the modal steals focus
    const from = replaceFrom ?? textArea.selectionStart
    const to = replaceTo ?? textArea.selectionEnd
    this.modalService
      .open(YoutubeLinkModalComponent, { centered: true })
      .result.then(
        (videoId: string) =>
          this.insertAtCaret(`[[youtube:${videoId}]]`, {
            replaceFrom: from,
            replaceTo: to,
          }),
        () => undefined,
      )
  }

  onHelp(): void {
    this.modalService.open(MarkdownHelpModalComponent, {
      size: 'lg',
      centered: true,
    })
  }

  // Toolbar card search
  onCardDropdownOpenChange(open: boolean): void {
    if (open) {
      setTimeout(() => this.cardSearchInputRef()?.nativeElement.focus())
    } else {
      this.cardSearchControl.setValue('')
      this.cardResults.set([])
      this.cardActiveIndex.set(0)
    }
  }

  onCardSearchKeydown(event: KeyboardEvent): void {
    if (event.isComposing) {
      return
    }
    const results = this.cardResults()
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        this.cardActiveIndex.set(
          (this.cardActiveIndex() + 1) % Math.max(results.length, 1),
        )
        break
      case 'ArrowUp':
        event.preventDefault()
        this.cardActiveIndex.set(
          (this.cardActiveIndex() - 1 + Math.max(results.length, 1)) %
            Math.max(results.length, 1),
        )
        break
      case 'Enter':
        event.preventDefault()
        if (results.length > 0) {
          this.onCardPick(results[this.cardActiveIndex()])
        }
        break
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        this.cardDropdownRef()?.close()
        this.textArea?.focus()
        break
    }
  }

  onCardPick(item: MarkdownSuggestion): void {
    this.cardDropdownRef()?.close()
    this.insertAtCaret(`[[${item.insert}]]`)
  }

  // Inline [[ autocomplete
  onTextareaInput(): void {
    this.updateInlineSuggestions()
  }

  onTextareaClick(): void {
    this.updateInlineSuggestions()
  }

  onTextareaKeyup(event: KeyboardEvent): void {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      this.updateInlineSuggestions()
    }
  }

  onTextareaBlur(): void {
    this.closeInline()
  }

  onTextareaKeydown(event: KeyboardEvent): void {
    if (event.isComposing) {
      return
    }
    if (this.inlineOpen()) {
      const items = this.inlineItems()
      switch (event.key) {
        case 'ArrowDown':
          if (items.length > 0) {
            event.preventDefault()
            this.inlineActiveIndex.set(
              (this.inlineActiveIndex() + 1) % items.length,
            )
          }
          return
        case 'ArrowUp':
          if (items.length > 0) {
            event.preventDefault()
            this.inlineActiveIndex.set(
              (this.inlineActiveIndex() - 1 + items.length) % items.length,
            )
          }
          return
        case 'Enter':
        case 'Tab':
          if (items.length > 0) {
            event.preventDefault()
            this.onInlinePick(items[this.inlineActiveIndex()])
          }
          return
        case 'Escape':
          // Stop propagation so a surrounding modal is not dismissed
          event.preventDefault()
          event.stopPropagation()
          this.closeInline()
          return
      }
    }
    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      switch (event.key.toLowerCase()) {
        case 'b':
          event.preventDefault()
          this.onBold()
          break
        case 'i':
          event.preventDefault()
          this.onItalic()
          break
        case 'k':
          event.preventDefault()
          this.onLink()
          break
      }
    }
  }

  onInlinePick(item: MarkdownSuggestion): void {
    const textArea = this.textArea
    if (!textArea) {
      return
    }
    const caret = textArea.selectionStart
    const from = this.inlineTokenStart - 2
    if (item.kind === 'prefix') {
      if (item.insert === 'youtube:') {
        this.closeInline()
        this.onYoutube(from, caret)
        return
      }
      this.insertAtCaret(`[[${item.insert}`, {
        replaceFrom: from,
        replaceTo: caret,
      })
      this.updateInlineSuggestions()
    } else {
      this.insertAtCaret(`[[${item.insert}]]`, {
        replaceFrom: from,
        replaceTo: caret,
      })
      this.closeInline()
    }
  }

  private updateInlineSuggestions(): void {
    const textArea = this.textArea
    if (!textArea) {
      return
    }
    const caret = textArea.selectionStart
    if (caret !== textArea.selectionEnd) {
      this.closeInline()
      return
    }
    const match = /\[\[([^[\]\n]*)$/.exec(textArea.value.substring(0, caret))
    if (!match) {
      this.closeInline()
      return
    }
    const token = match[1]
    this.inlineTokenStart = caret - token.length
    const colonIndex = token.indexOf(':')
    const type =
      colonIndex >= 0 ? token.substring(0, colonIndex).toLowerCase() : undefined
    const term = colonIndex >= 0 ? token.substring(colonIndex + 1) : token
    this.inlineTerm.set(term)
    this.inlineAwaitingCards = false

    if (type === undefined) {
      this.inlinePrefixItems = this.suggestionService.prefixSuggestions(token)
      this.openInline(this.inlinePrefixItems, 'no_results')
      if (token.length >= MIN_SEARCH_LENGTH) {
        this.inlineAwaitingCards = true
        this.inlineCardSearch$.next(token)
      }
    } else if (type === 'card') {
      this.inlinePrefixItems = []
      if (term.length >= MIN_SEARCH_LENGTH) {
        this.inlineAwaitingCards = true
        this.openInline(this.inlineItems(), 'no_results')
        this.inlineCardSearch$.next(term)
      } else {
        this.openInline([], 'type_to_search')
      }
    } else if (type === 'clan') {
      this.openInline(this.suggestionService.searchClans(term), 'no_results')
    } else if (type === 'discipline') {
      this.openInline(
        this.suggestionService.searchDisciplines(term),
        'no_results',
      )
    } else {
      this.closeInline()
    }
  }

  private openInline(items: MarkdownSuggestion[], emptyKey: string): void {
    const wasOpen = this.inlineOpen()
    this.inlineItems.set(items)
    this.inlineEmptyKey.set(emptyKey)
    if (!wasOpen || this.inlineActiveIndex() >= items.length) {
      this.inlineActiveIndex.set(0)
    }
    this.inlineOpen.set(true)
    this.updateInlinePosition()
  }

  private closeInline(): void {
    this.inlineOpen.set(false)
    this.inlineItems.set([])
    this.inlineActiveIndex.set(0)
    this.inlineAwaitingCards = false
  }

  private updateInlinePosition(): void {
    const textArea = this.textArea
    if (!textArea) {
      return
    }
    const coords = getCaretCoordinates(textArea, this.inlineTokenStart)
    const top =
      textArea.offsetTop + coords.top - textArea.scrollTop + coords.height
    const left = textArea.offsetLeft + coords.left
    const container =
      textArea.offsetParent instanceof HTMLElement
        ? textArea.offsetParent
        : textArea
    const maxLeft = Math.max(
      0,
      container.clientWidth - SUGGESTION_DROPDOWN_WIDTH,
    )
    this.inlinePos.set({ top, left: Math.max(0, Math.min(left, maxLeft)) })
  }

  private insertAtCaret(
    text: string,
    options: {
      replaceFrom?: number
      replaceTo?: number
      select?: boolean
    } = {},
  ): void {
    const textArea = this.textArea
    if (!textArea) {
      return
    }
    const from = options.replaceFrom ?? textArea.selectionStart
    const to = options.replaceTo ?? textArea.selectionEnd
    const value = textArea.value
    this.control()?.setValue(
      value.substring(0, from) + text + value.substring(to),
    )
    if (options.select) {
      textArea.setSelectionRange(from, from + text.length)
    } else {
      textArea.setSelectionRange(from + text.length, from + text.length)
    }
    textArea.focus()
  }

  private applyStyle(
    prefix: string,
    suffix: string,
    noSelectionText: string,
  ): void {
    const textArea = this.textArea
    if (!textArea) {
      return
    }

    const start = textArea.selectionStart
    const end = textArea.selectionEnd

    const prefixLength = prefix.length
    const suffixLength = suffix.length
    const currentPrefix = textArea.value.substring(start - prefixLength, start)
    const currentSuffix = textArea.value.substring(end, end + suffixLength)
    if (start === end) {
      const before = textArea.value.substring(0, start)
      const selected = noSelectionText
      const after = textArea.value.substring(end)
      this.control()?.setValue(`${before}${prefix}${selected}${suffix}${after}`)
      textArea.setSelectionRange(
        start + prefixLength,
        start + prefixLength + selected.length,
      )
    } else if (currentPrefix == prefix && currentSuffix == suffix) {
      const before = textArea.value.substring(0, start - prefixLength)
      const selected = textArea.value.substring(start, end)
      const after = textArea.value.substring(end + suffixLength)
      this.control()?.setValue(`${before}${selected}${after}`)
      textArea.setSelectionRange(
        start - prefixLength,
        start - prefixLength + selected.length,
      )
    } else {
      const before = textArea.value.substring(0, start)
      const selected = textArea.value.substring(start, end)
      const after = textArea.value.substring(end)
      this.control()?.setValue(`${before}${prefix}${selected}${suffix}${after}`)
      textArea.setSelectionRange(
        start + prefixLength,
        start + prefixLength + selected.length,
      )
    }
    textArea.focus()
  }
}
