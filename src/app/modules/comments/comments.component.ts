import { AuthQuery } from '../../state/auth/auth.query';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { CommentsService } from '../../state/comments/comments.service';
import { CommentsQuery } from '../../state/comments/comments.query';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { Observable } from 'rxjs';
import { ApiComment } from '../../models/api-comment';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Order } from '@datorama/akita';

@UntilDestroy()
@Component({
  selector: 'app-comments',
  templateUrl: './comments.component.html',
  styleUrls: ['./comments.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentsComponent implements OnInit {
  @Input() deckId!: string;

  isLoading$!: Observable<boolean>;

  comments$!: Observable<ApiComment[]>;

  profileImage$!: Observable<string | undefined>;

  form!: FormGroup;

  constructor(
    private authQuery: AuthQuery,
    private commentsQuery: CommentsQuery,
    private commentsService: CommentsService
  ) {}

  ngOnInit() {
    this.commentsService
      .getComments(this.deckId)
      .pipe(untilDestroyed(this))
      .subscribe();
    this.isLoading$ = this.commentsQuery.selectLoading();
    this.comments$ = this.commentsQuery.selectAll({
      sortBy: 'created',
      sortByOrder: Order.DESC,
    });
    this.profileImage$ = this.authQuery.selectProfileImage();
    this.form = new FormGroup({
      comment: new FormControl('', [
        Validators.required,
        Validators.minLength(3),
      ]),
    });
  }

  get comment() {
    return this.form.get('comment');
  }

  addComment(): void {
    if (this.form.invalid) {
      return;
    }
    const comment = {
      deckId: this.deckId,
      content: this.comment?.value,
    } as ApiComment;
    this.commentsService
      .addComment(comment)
      .pipe(untilDestroyed(this))
      .subscribe();
    this.form.reset();
  }
}
