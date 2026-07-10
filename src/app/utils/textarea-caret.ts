export interface CaretCoordinates {
  top: number
  left: number
  height: number
}

// Style properties that affect text layout and must be mirrored
const MIRROR_PROPERTIES = [
  'direction',
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderStyle',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
] as const

/**
 * Returns the pixel coordinates of the given character position inside a
 * textarea, relative to the textarea's top-left corner (mirror div technique).
 */
export const getCaretCoordinates = (
  element: HTMLTextAreaElement,
  position: number,
): CaretCoordinates => {
  const mirror = document.createElement('div')
  document.body.appendChild(mirror)

  const style = mirror.style
  const computed = window.getComputedStyle(element)

  style.whiteSpace = 'pre-wrap'
  style.wordWrap = 'break-word'
  style.position = 'absolute'
  style.visibility = 'hidden'

  MIRROR_PROPERTIES.forEach((prop) => {
    style.setProperty(
      prop.replace(/([A-Z])/g, '-$1').toLowerCase(),
      computed.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase()),
    )
  })

  mirror.textContent = element.value.substring(0, position)

  const marker = document.createElement('span')
  // Marker needs content to get a valid position on empty lines
  marker.textContent = element.value.substring(position) || '.'
  mirror.appendChild(marker)

  const coordinates: CaretCoordinates = {
    top: marker.offsetTop + parseInt(computed.borderTopWidth, 10),
    left: marker.offsetLeft + parseInt(computed.borderLeftWidth, 10),
    height: parseInt(computed.lineHeight, 10) || parseInt(computed.fontSize, 10),
  }

  document.body.removeChild(mirror)

  return coordinates
}
