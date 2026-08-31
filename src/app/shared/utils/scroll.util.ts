/**
 * Scrolls the results container back into view, but only when it actually
 * left the viewport.
 *
 * Filter changes re-run this on every chip added or removed. When the user is
 * already looking at the top of the list the container is still in view, so a
 * `scrollIntoView` there only produces a tiny jitter (the chip row changes the
 * sticky header height, the browser smooth-scrolls a few pixels and lands back
 * on the same content). Skipping those cases keeps the page still.
 */
const TOLERANCE_PX = 2

export function scrollContainerIntoView(
  document: Document,
  selector = '.scroll-container',
): void {
  // The chip row changes the sticky header height, which feeds the scroll
  // offset: wait for the render pass before measuring the target.
  requestAnimationFrame(() => {
    const element = document.querySelector(selector)
    if (!element) {
      return
    }
    const scrollMarginTop =
      parseFloat(getComputedStyle(element).scrollMarginTop) || 0
    // Distance between the container top and where scrollIntoView would park
    // it. Negative means the container scrolled above that line.
    const delta = element.getBoundingClientRect().top - scrollMarginTop
    if (delta >= -TOLERANCE_PX) {
      return
    }
    element.scrollIntoView({ behavior: 'smooth' })
  })
}
