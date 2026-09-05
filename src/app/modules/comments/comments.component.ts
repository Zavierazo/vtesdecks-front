import { AsyncPipe } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  inject,
} from '@angular/core'
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms'
import { TranslocoDirective } from '@jsverse/transloco'
import { ApiComment } from '@models'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { LoadingComponent } from '@shared/components/loading/loading.component'
import { MarkdownTextareaComponent } from '@shared/components/markdown-textarea/markdown-textarea.component'
import { IsLoggedDirective } from '@shared/directives/is-logged.directive'
import { AuthQuery } from '@state/auth/auth.query'
import { CommentsQuery } from '@state/comments/comments.query'
import { CommentsService } from '@state/comments/comments.service'
import {
  distinctUntilChanged,
  Observable,
  ReplaySubject,
  switchMap,
} from 'rxjs'
import { CommentComponent } from './comment/comment.component'

@UntilDestroy()
@Component({
  selector: 'app-comments',
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    IsLoggedDirective,
    ReactiveFormsModule,
    CommentComponent,
    LoadingComponent,
    AsyncPipe,
    MarkdownTextareaComponent,
  ],
})
export class CommentsComponent implements OnInit, OnChanges {
  private readonly authQuery = inject(AuthQuery)
  private readonly commentsQuery = inject(CommentsQuery)
  private readonly commentsService = inject(CommentsService)
  private readonly deckId$ = new ReplaySubject<string>(1)

  @Input() deckId!: string

  isLoading$!: Observable<boolean>

  comments$!: Observable<ApiComment[]>

  profileImage$!: Observable<string | undefined>

  form!: FormGroup

  ngOnChanges(changes: SimpleChanges): void {
    const deckId = changes['deckId']?.currentValue
    if (deckId) {
      this.deckId$.next(deckId)
    }
  }

  ngOnInit() {
    this.deckId$
      .pipe(
        distinctUntilChanged(),
        switchMap((deckId) => this.commentsService.getComments(deckId)),
        untilDestroyed(this),
      )
      .subscribe()
    this.isLoading$ = this.commentsQuery.selectLoading()
    this.comments$ = this.commentsQuery.selectAll()
    this.profileImage$ = this.authQuery.selectProfileImage()
    this.form = new FormGroup({
      comment: new FormControl('', [
        Validators.required,
        Validators.minLength(3),
      ]),
    })
  }

  get commentControl(): FormControl<string> {
    return this.form.get('comment') as FormControl<string>
  }

  addComment(): void {
    if (this.form.invalid) {
      return
    }
    const comment = {
      deckId: this.deckId,
      content: this.commentControl?.value,
    } as ApiComment
    this.commentsService
      .addComment(comment)
      .pipe(untilDestroyed(this))
      .subscribe()
    this.form.reset()
  }
}
