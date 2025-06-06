import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  signal,
  ViewChild,
} from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { TranslocoDirective } from '@jsverse/transloco'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { MarkdownComponent } from 'ngx-markdown'
import { tap } from 'rxjs'

const MARKDOWN_EXAMPLE = `
# Heading
**bold**
*emphasized*
~~strikethrough~~
[link](https://vtesdecks.com)
![image](https://vtesdecks.com/assets/img/logo.png)
- list
`
@UntilDestroy()
@Component({
  selector: 'app-markdown-textarea',
  templateUrl: './markdown-textarea.component.html',
  styleUrls: ['./markdown-textarea.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, ReactiveFormsModule, MarkdownComponent],
})
export class MarkdownTextareaComponent implements AfterViewInit {
  control = input.required<FormControl>()
  placeholder = input.required<string>()
  label = input.required<string>()

  previewDescription = signal(false)
  @ViewChild('ref', { read: ElementRef }) textAreaRef!: ElementRef

  ngAfterViewInit(): void {
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
    return this.placeholder() + '\n' + MARKDOWN_EXAMPLE
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
    this.applyStyle('*', '*', 'emphasized')
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
}
