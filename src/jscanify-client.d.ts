declare module 'jscanify/client' {
  class jscanify {
    constructor()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findPaperContour(img: any): any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getCornerPoints(contour: any): {
      topLeftCorner?: { x: number; y: number }
      topRightCorner?: { x: number; y: number }
      bottomLeftCorner?: { x: number; y: number }
      bottomRightCorner?: { x: number; y: number }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extractPaper(
      image: any,
      width: number,
      height: number,
    ): HTMLCanvasElement | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    highlightPaper(image: any): HTMLCanvasElement
  }
  export default jscanify
}
