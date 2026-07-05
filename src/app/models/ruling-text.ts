export interface RulingText {
  type: 'string' | 'card' | 'reference' | 'discipline'
  text: string
  link?: string
  popoverImage?: string
}
