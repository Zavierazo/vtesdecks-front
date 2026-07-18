import { AsyncPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import { ApiFeatureFlag, FeatureFlagValue } from '@models'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { ToastService } from '@services'
import { FeatureFlagQuery } from '@state/feature-flag/feature-flag.query'
import { FeatureFlagService } from '@state/feature-flag/feature-flag.service'
import { Observable } from 'rxjs'

@UntilDestroy()
@Component({
  selector: 'app-feature-flags',
  templateUrl: './feature-flags.component.html',
  styleUrl: './feature-flags.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective, AsyncPipe],
})
export class FeatureFlagsComponent implements OnInit {
  private readonly featureFlagQuery = inject(FeatureFlagQuery)
  private readonly featureFlagService = inject(FeatureFlagService)
  private readonly toastService = inject(ToastService)
  private readonly translocoService = inject(TranslocoService)

  flags$!: Observable<ApiFeatureFlag[]>

  private readonly stringDrafts = new Map<string, string>()
  private readonly listDrafts = new Map<string, string[]>()

  ngOnInit(): void {
    this.flags$ = this.featureFlagQuery.selectAll()
    this.featureFlagService.load()
  }

  onToggle(flag: ApiFeatureFlag, event: Event): void {
    const input = event.target as HTMLInputElement
    this.save(flag.key, input.checked, {
      onError: () => (input.checked = flag.value === true),
    })
  }

  stringValue(flag: ApiFeatureFlag): string {
    return this.stringDrafts.get(flag.key) ?? (flag.value as string)
  }

  onStringInput(flag: ApiFeatureFlag, event: Event): void {
    const input = event.target as HTMLInputElement
    this.stringDrafts.set(flag.key, input.value)
  }

  isStringDirty(flag: ApiFeatureFlag): boolean {
    const draft = this.stringDrafts.get(flag.key)
    return draft !== undefined && draft !== flag.value
  }

  saveString(flag: ApiFeatureFlag): void {
    const draft = this.stringDrafts.get(flag.key)
    if (draft === undefined) {
      return
    }
    this.save(flag.key, draft, {
      onSuccess: () => this.stringDrafts.delete(flag.key),
    })
  }

  listValue(flag: ApiFeatureFlag): string[] {
    return this.listDrafts.get(flag.key) ?? (flag.value as string[])
  }

  addListItem(flag: ApiFeatureFlag, input: HTMLInputElement): void {
    const value = input.value.trim()
    if (!value) {
      return
    }
    this.listDrafts.set(flag.key, [...this.listValue(flag), value])
    input.value = ''
  }

  removeListItem(flag: ApiFeatureFlag, index: number): void {
    const list = [...this.listValue(flag)]
    list.splice(index, 1)
    this.listDrafts.set(flag.key, list)
  }

  isListDirty(flag: ApiFeatureFlag): boolean {
    const draft = this.listDrafts.get(flag.key)
    return (
      draft !== undefined && JSON.stringify(draft) !== JSON.stringify(flag.value)
    )
  }

  saveList(flag: ApiFeatureFlag): void {
    const draft = this.listDrafts.get(flag.key)
    if (draft === undefined) {
      return
    }
    this.save(flag.key, draft, {
      onSuccess: () => this.listDrafts.delete(flag.key),
    })
  }

  private save(
    key: string,
    value: FeatureFlagValue,
    callbacks: { onSuccess?: () => void; onError?: () => void } = {},
  ): void {
    this.featureFlagService
      .update(key, value)
      .pipe(untilDestroyed(this))
      .subscribe({
        next: () => {
          callbacks.onSuccess?.()
          this.toastService.show(
            this.translocoService.translate('admin.saved'),
            { classname: 'bg-success text-light', delay: 3000 },
          )
        },
        error: () => {
          callbacks.onError?.()
          this.toastService.show(
            this.translocoService.translate('admin.save_error'),
            { classname: 'bg-danger text-light', delay: 5000 },
          )
        },
      })
  }
}
