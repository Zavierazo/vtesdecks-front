import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  signal,
  ViewChild,
} from '@angular/core'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { TranslocoDirective } from '@jsverse/transloco'
import { MarkdownComponent } from 'ngx-markdown'

@Component({
  selector: 'app-markdown-textarea',
  templateUrl: './markdown-textarea.component.html',
  styleUrls: ['./markdown-textarea.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, ReactiveFormsModule, MarkdownComponent],
})
export class MarkdownTextareaComponent {
  formControl = input.required<FormControl>()
  placeholder = input.required<string>()
  label = input.required<string>()

  previewDescription = signal(false)
  @ViewChild('ref', { read: ElementRef }) textAreaRef!: ElementRef

  get description(): string | undefined {
    return this.formControl()?.value
  }

  onPreviewDescription(): void {
    this.previewDescription.set(!this.previewDescription())
  }

  onBold(): void {
    this.applyStyle('**', '**')
  }

  onItalic(): void {
    this.applyStyle('*', '*')
  }

  onStrikethrough(): void {
    this.applyStyle('~~', '~~')
  }

  onTitle(): void {
    this.applyStyle('# ', '\n')
  }

  onLink(): void {
    this.applyStyle('[', '](https://vtesdecks.com)')
  }

  onImage(): void {
    this.applyStyle('![', '](https://vtesdecks.com/assets/img/logo.png)')
  }

  onList(numeric: boolean): void {
    const textArea = this.textAreaRef.nativeElement

    const start = textArea.selectionStart
    const end = textArea.selectionEnd

    if (start === end) {
      const before = textArea.value.substring(0, start)
      const selected = `${numeric ? '1.' : '-'} list text here`
      const after = textArea.value.substring(end)
      this.formControl()?.setValue(`${before}${selected}${after}`)
      textArea.setSelectionRange(start, start + selected.length)
    } else {
      const before = textArea.value.substring(0, start)
      const selected = textArea.value.substring(start, end)
      const after = textArea.value.substring(end)
      this.formControl()?.setValue(
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
    this.applyStyle('```\n', '\n```')
  }

  onQuote(): void {
    this.applyStyle('> ', '')
  }

  onTable(): void {
    const textArea = this.textAreaRef.nativeElement

    const start = textArea.selectionStart
    const end = textArea.selectionEnd

    const before = textArea.value.substring(0, start)
    const table = `| Syntax      | Description |\n| ----------- | ----------- |\n| Header      | Title       |\n| Paragraph   | Text        |`
    const after = textArea.value.substring(end)

    this.formControl()?.setValue(`${before}${table}${after}`)
    textArea.setSelectionRange(start, start + table.length)
  }

  private applyStyle(prefix: string, suffix: string): void {
    const textArea = this.textAreaRef.nativeElement

    const start = textArea.selectionStart
    const end = textArea.selectionEnd

    if (start === end) {
      return
    }
    const prefixLength = prefix.length
    const suffixLength = suffix.length
    const currentPrefix = textArea.value.substring(start - prefixLength, start)
    const currentSuffix = textArea.value.substring(end, end + suffixLength)

    if (currentPrefix == prefix && currentSuffix == suffix) {
      const before = textArea.value.substring(0, start - prefixLength)
      const selected = textArea.value.substring(start, end)
      const after = textArea.value.substring(end + suffixLength)
      this.formControl()?.setValue(`${before}${selected}${after}`)
      textArea.setSelectionRange(
        start - prefixLength,
        start - prefixLength + selected.length,
      )
    } else {
      const before = textArea.value.substring(0, start)
      const selected = textArea.value.substring(start, end)
      const after = textArea.value.substring(end)
      this.formControl()?.setValue(
        `${before}${prefix}${selected}${suffix}${after}`,
      )
      textArea.setSelectionRange(
        start + prefixLength,
        start + prefixLength + selected.length,
      )
    }
    textArea.focus()
  }
}
