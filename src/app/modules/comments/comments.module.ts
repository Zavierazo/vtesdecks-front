import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { ReactiveFormsModule } from '@angular/forms'
import { TranslocoModule } from '@jsverse/transloco'
import { NgbModule } from '@ng-bootstrap/ng-bootstrap'
import { SharedModule } from '../../shared/shared.module'
import { CommentComponent } from './comment/comment.component'
import { CommentsComponent } from './comments.component'

@NgModule({
  declarations: [CommentsComponent, CommentComponent],
  imports: [
    CommonModule,
    NgbModule,
    SharedModule,
    ReactiveFormsModule,
    TranslocoModule,
  ],
  exports: [CommentsComponent],
})
export class CommentsModule {}
