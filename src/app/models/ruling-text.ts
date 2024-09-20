export interface RulingText {
  type: 'string' | 'card' | 'reference'
  text: string
  link?: string
  popoverImage?: string
}
