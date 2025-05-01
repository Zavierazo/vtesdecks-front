import { Component, OnInit } from '@angular/core'
import { WebcamImage, WebcamModule } from 'ngx-webcam'
import { createWorker, Worker } from 'tesseract.js'
import { CameraComponent } from './camera/camera.component'

@Component({
  selector: 'app-card-detector',
  templateUrl: './card-detector.component.html',
  styleUrls: ['./card-detector.component.scss'],
  imports: [WebcamModule, CameraComponent],
})
export class CardDetectorComponent implements OnInit {
  // latest snapshot
  public webcamImage: WebcamImage | null = null

  private worker!: Worker

  ngOnInit() {
    this.initOCR()
  }

  async initOCR() {
    await createWorker('eng').then((worker) => (this.worker = worker))
  }

  handleImage(webcamImage: WebcamImage) {
    this.webcamImage = webcamImage
    this.worker
      .recognize(webcamImage.imageAsDataUrl)
      .then(({ data: { text } }) => {
        console.log('OCR Result:', this.removeAngleBrackets(text))
      })
      .catch((err) => {
        console.error('OCR Error:', err)
      })
  }
  removeAngleBrackets(text: string): string {
    return text.replace(/[<>]/g, ' ')
  }
}
