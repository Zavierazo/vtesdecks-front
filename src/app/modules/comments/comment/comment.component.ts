import { AuthQuery } from '../../../state/auth/auth.query';
import { ApiComment } from '../../../models/api-comment';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { Observable, tap, filter, switchMap } from 'rxjs';
import { CommentsService } from '../../../state/comments/comments.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FormControl, FormGroup } from '@angular/forms';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
@UntilDestroy()
@Component({
  selector: 'app-comment',
  templateUrl: './comment.component.html',
  styleUrls: ['./comment.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentComponent implements OnInit {
  @Input() comment!: ApiComment;

  isAdmin$!: Observable<boolean>;

  form!: FormGroup;

  isEditing = false;

  constructor(
    private authQuery: AuthQuery,
    private commentsService: CommentsService,
    private modalService: NgbModal
  ) {}

  ngOnInit() {
    this.isAdmin$ = this.authQuery.selectAdmin();
    this.form = new FormGroup({
      comment: new FormControl(this.comment.content),
    });
  }

  get formComment() {
    return this.form.get('comment');
  }

  deleteComment(): void {
    const modalRef = this.modalService.open(ConfirmDialogComponent, {
      size: 'sm',
      centered: true,
    });
    modalRef.componentInstance.title = 'Delete this comment?';
    modalRef.componentInstance.message = 'This can not be undone!';
    modalRef.closed
      .pipe(
        untilDestroyed(this),
        filter((result) => result),
        switchMap(() => this.commentsService.deleteComment(this.comment.id))
      )
      .subscribe();
  }
  switchEditComment(): void {
    this.isEditing = !this.isEditing;
  }

  editComment(): void {
    if (this.form.invalid) {
      return;
    }
    const commentValue = this.formComment?.value;
    if (commentValue !== this.comment.content) {
      const comment = {
        id: this.comment.id,
        content: commentValue,
      } as ApiComment;
      this.commentsService
        .editComment(comment)
        .pipe(untilDestroyed(this))
        .subscribe();
    }
    this.isEditing = false;
  }
}
