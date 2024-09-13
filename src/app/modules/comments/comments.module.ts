import { CommentComponent } from './comment/comment.component';
import { CommentsComponent } from './comments.component';
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { TranslocoModule } from '@ngneat/transloco';

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
