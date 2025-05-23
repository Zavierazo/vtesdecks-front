import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core'
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { Observable } from 'rxjs'
import { ApiComment } from '../../models/api-comment'
import { AuthQuery } from '../../state/auth/auth.query'
import { CommentsQuery } from '../../state/comments/comments.query'
import { CommentsService } from '../../state/comments/comments.service'
import { TranslocoDirective } from '@jsverse/transloco';
import { IsLoggedDirective } from '../../shared/directives/is-logged.directive';
import { NgIf, NgFor, AsyncPipe } from '@angular/common';
import { CommentComponent } from './comment/comment.component';
import { LoadingComponent } from '../../shared/components/loading/loading.component';

@UntilDestroy()
@Component({
    selector: 'app-comments',
    templateUrl: './comments.component.html',
    styleUrls: ['./comments.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TranslocoDirective, IsLoggedDirective, ReactiveFormsModule, NgIf, NgFor, CommentComponent, LoadingComponent, AsyncPipe]
})
export class CommentsComponent implements OnInit {
  @Input() deckId!: string

  isLoading$!: Observable<boolean>

  comments$!: Observable<ApiComment[]>

  profileImage$!: Observable<string | undefined>

  form!: FormGroup

  constructor(
    private authQuery: AuthQuery,
    private commentsQuery: CommentsQuery,
    private commentsService: CommentsService,
  ) {}

  ngOnInit() {
    this.commentsService
      .getComments(this.deckId)
      .pipe(untilDestroyed(this))
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

  get comment() {
    return this.form.get('comment')
  }

  addComment(): void {
    if (this.form.invalid) {
      return
    }
    const comment = {
      deckId: this.deckId,
      content: this.comment?.value,
    } as ApiComment
    this.commentsService
      .addComment(comment)
      .pipe(untilDestroyed(this))
      .subscribe()
    this.form.reset()
  }
}
