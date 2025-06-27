import { NgClass } from '@angular/common'
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  signal,
  ViewChild,
} from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { TranslocoDirective } from '@jsverse/transloco'
import {
  NgbDropdown,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
  NgbModal,
} from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { tap } from 'rxjs'
import { Clan, CLAN_LIST } from '../../../utils/clans'
import { Discipline, DISCIPLINE_LIST } from '../../../utils/disciplines'
import { MarkdownHelpModalComponent } from '../markdown-help-modal/markdown-help-modal.component'
import { MarkdownTextComponent } from '../markdown-text/markdown-text.component'

const MARKDOWN_EXAMPLE = `
**bold**
[[card:Blood Doll]]
[[discipline:Animalism]]
[[clan:Ventrue]]
[link](https://vtesdecks.com)
![image](https://vtesdecks.com/assets/img/logo.png)
[[youtube:IxX_QHay02M]]
`
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
    NgClass,
  ],
})
export class MarkdownTextareaComponent implements AfterViewInit {
  private readonly modalService = inject(NgbModal)

  control = input.required<FormControl>()
  placeholder = input.required<string>()
  label = input.required<string>()

  disciplines: Discipline[] = DISCIPLINE_LIST
  clans: Clan[] = CLAN_LIST
  previewDescription = signal(false)
  @ViewChild('ref', { read: ElementRef }) textAreaRef!: ElementRef

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.textArea.style.height = 'auto'
      this.textArea.style.height = this.textArea.scrollHeight + 'px'
    }, 500)
    this.control()
      .valueChanges.pipe(
        untilDestroyed(this),
        tap(() => {
          this.textArea.style.height = 'auto'
          this.textArea.style.height = this.textArea.scrollHeight + 'px'
        }),
      )
      .subscribe()
  }

  get description(): string | undefined {
    return this.control()?.value
  }

  get placeholderWithExample(): string {
    return this.placeholder() + MARKDOWN_EXAMPLE
  }

  get textArea(): HTMLTextAreaElement {
    return this.textAreaRef.nativeElement
  }

  onPreviewDescription(): void {
    this.previewDescription.set(!this.previewDescription())
    if (!this.previewDescription()) {
      setTimeout(() => {
        this.textArea.style.height = 'auto'
        this.textArea.style.height = this.textArea.scrollHeight + 'px'
      }, 100)
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

    const start = textArea.selectionStart
    const end = textArea.selectionEnd

    if (start === end) {
      const before = textArea.value.substring(0, start)
      const selected = `${numeric ? '1.' : '-'} list text here`
      const after = textArea.value.substring(end)
      this.control()?.setValue(`${before}${selected}${after}`)
      textArea.setSelectionRange(start, start + selected.length)
    } else {
      const before = textArea.value.substring(0, start)
      const selected = textArea.value.substring(start, end)
      const after = textArea.value.substring(end)
      this.control()?.setValue(
        `${before}${numeric ? '1.' : '-'} ${selected}${after}`,
      )
      const listLength = numeric ? 3 : 2
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
    const textArea = this.textArea

    const start = textArea.selectionStart
    const end = textArea.selectionEnd

    const before = textArea.value.substring(0, start)
    const table = `| Syntax      | Description |\n| ----------- | ----------- |\n| Header      | Title       |\n| Paragraph   | Text        |`
    const after = textArea.value.substring(end)

    this.control()?.setValue(`${before}${table}${after}`)
    textArea.setSelectionRange(start, start + table.length)
  }

  onDiscipline(discipline: Discipline): void {
    const textArea = this.textArea

    const start = textArea.selectionStart
    const end = textArea.selectionEnd

    const before = textArea.value.substring(0, start)
    const disciplineText = `[[discipline:${discipline.name}]]`
    const after = textArea.value.substring(end)

    this.control()?.setValue(`${before}${disciplineText}${after}`)
    textArea.setSelectionRange(start, start + disciplineText.length)
  }

  onClan(clan: Clan): void {
    const textArea = this.textArea

    const start = textArea.selectionStart
    const end = textArea.selectionEnd

    const before = textArea.value.substring(0, start)
    const clanText = `[[clan:${clan.name}]]`
    const after = textArea.value.substring(end)

    this.control()?.setValue(`${before}${clanText}${after}`)
    textArea.setSelectionRange(start, start + clanText.length)
  }

  private applyStyle(
    prefix: string,
    suffix: string,
    noSelectionText: string,
  ): void {
    const textArea = this.textArea

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

  onHelp(): void {
    this.modalService.open(MarkdownHelpModalComponent, {
      size: 'lg',
      centered: true,
    })
  }
}
