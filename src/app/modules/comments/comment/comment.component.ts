import { AsyncPipe, NgClass } from '@angular/common'
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  inject,
} from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms'
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy'
import { filter, Observable, switchMap } from 'rxjs'
import { ApiComment } from '../../../models/api-comment'
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component'
import { DateAsAgoPipe } from '../../../shared/pipes/date-ago.pipe'
import { AuthQuery } from '../../../state/auth/auth.query'
import { CommentsService } from '../../../state/comments/comments.service'
@UntilDestroy()
@Component({
  selector: 'app-comment',
  templateUrl: './comment.component.html',
  styleUrls: ['./comment.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslocoDirective,
    NgClass,
    ReactiveFormsModule,
    AsyncPipe,
    DateAsAgoPipe,
  ],
})
export class CommentComponent implements OnInit {
  private readonly authQuery = inject(AuthQuery)
  private readonly commentsService = inject(CommentsService)
  private readonly modalService = inject(NgbModal)
  private readonly translocoService = inject(TranslocoService)

  @Input() comment!: ApiComment

  isAdmin$!: Observable<boolean>

  form!: FormGroup

  isEditing = false

  ngOnInit() {
    this.isAdmin$ = this.authQuery.selectAdmin()
    this.form = new FormGroup({
      comment: new FormControl(this.comment.content),
    })
  }

  get formComment() {
    return this.form.get('comment')
  }

  deleteComment(): void {
    const modalRef = this.modalService.open(ConfirmDialogComponent, {
      size: 'sm',
      centered: true,
    })
    modalRef.componentInstance.title = this.translocoService.translate(
      'comments.delete_modal_title',
    )
    modalRef.componentInstance.message = this.translocoService.translate(
      'comments.delete_modal_message',
    )
    modalRef.closed
      .pipe(
        untilDestroyed(this),
        filter((result) => result),
        switchMap(() => this.commentsService.deleteComment(this.comment.id)),
      )
      .subscribe()
  }
  switchEditComment(): void {
    this.isEditing = !this.isEditing
  }

  editComment(): void {
    if (this.form.invalid) {
      return
    }
    const commentValue = this.formComment?.value
    if (commentValue !== this.comment.content) {
      const comment = {
        id: this.comment.id,
        content: commentValue,
      } as ApiComment
      this.commentsService
        .editComment(comment)
        .pipe(untilDestroyed(this))
        .subscribe()
    }
    this.isEditing = false
  }
}
